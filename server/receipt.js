// Core della verifica ricevute Apple (FASE 3), condiviso da Vercel
// (api/receipt.js, api/appstore-notify.js) e dal middleware dev.
//
// Due ingressi:
//  1) handleReceipt — chiamato dal CLIENT dopo un acquisto (token utente):
//     verifica con Apple e scrive l'entitlement per QUELL'utente.
//  2) handleAppStoreNotification — App Store Server Notifications V2 (Apple →
//     noi): rinnovi, rimborsi, scadenze. Non c'è token utente.
//
// Sicurezza / design:
//  - La tabella `entitlements` ha SOLO policy di SELECT (migration-13): qui
//    scriviamo col SERVICE ROLE, dopo aver verificato con Apple. Il client non
//    può auto-assegnarsi il Premium.
//  - Non ci fidiamo MAI del contenuto grezzo di una notifica: la usiamo solo
//    per sapere quale sottoscrizione ricontrollare, poi la verità la riprendiamo
//    dall'App Store Server API (canale autenticato con la nostra chiave). Così
//    una notifica falsa non può iniettare stato.
//  - Anti-furto di ricevuta: l'acquisto lega l'uid Supabase come
//    `appAccountToken`, rifirmato da Apple; qui verifichiamo che combaci.
import { createClient } from "@supabase/supabase-js";
import { appStoreConfigured, getSubscriptionStatuses, decodeJws, classify } from "./appstore.js";

// --- Ingresso 1: verifica su richiesta del client -------------------------
export async function handleReceipt({ authHeader, body, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 500, json: { error: "Configurazione Supabase mancante sul server." } };
  }
  if (!appStoreConfigured(env)) {
    return { status: 500, json: { error: "App Store Server API non configurata sul server." } };
  }

  const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, json: { error: "Non autenticato." } };

  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { data: userData, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !userData?.user) {
    return { status: 401, json: { error: "Sessione non valida o scaduta." } };
  }
  const userId = userData.user.id;

  const originalTransactionId = String(body?.originalTransactionId || "").trim();
  if (!originalTransactionId) return { status: 400, json: { error: "Transazione mancante." } };

  let info;
  try {
    info = await resolveSubscription(env, originalTransactionId);
  } catch (e) {
    return { status: 502, json: { error: "Verifica con Apple fallita.", detail: e.message } };
  }
  if (!info) return { status: 404, json: { error: "Transazione non trovata presso Apple." } };

  // Anti-furto: se la transazione porta un appAccountToken, deve essere l'uid di
  // chi la presenta. (Le transazioni comprate prima di questa build potrebbero
  // non averlo: in quel caso ci fidiamo dell'utente autenticato.)
  if (info.appAccountToken && info.appAccountToken.toLowerCase() !== userId.toLowerCase()) {
    return { status: 403, json: { error: "Questa transazione appartiene a un altro account." } };
  }

  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  await upsertEntitlement(admin, userId, info);
  return { status: 200, json: { ok: true, status: info.status } };
}

// --- Ingresso 2: App Store Server Notifications V2 ------------------------
export async function handleAppStoreNotification({ body, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !appStoreConfigured(env)) {
    return { status: 500, json: { error: "Server non configurato." } };
  }

  const signedPayload = body?.signedPayload;
  if (!signedPayload) return { status: 400, json: { error: "Payload mancante." } };

  // Solo per capire QUALE sottoscrizione ricontrollare e in quale ambiente: il
  // contenuto non viene creduto, la verità la riprendiamo dall'API.
  let originalTransactionId;
  let preferSandbox;
  try {
    const payload = decodeJws(signedPayload);
    preferSandbox = payload?.data?.environment === "Sandbox";
    const txInfo = payload?.data?.signedTransactionInfo
      ? decodeJws(payload.data.signedTransactionInfo)
      : null;
    originalTransactionId = String(
      txInfo?.originalTransactionId || payload?.data?.originalTransactionId || ""
    ).trim();
  } catch {
    return { status: 400, json: { error: "Notifica illeggibile." } };
  }
  // 200 anche quando ignoriamo: Apple non deve riprovare all'infinito per una
  // notifica che non ci riguarda o che non sappiamo mappare a un utente.
  if (!originalTransactionId) return { status: 200, json: { ignored: true } };

  let info;
  try {
    info = await resolveSubscription(env, originalTransactionId, preferSandbox);
  } catch (e) {
    return { status: 502, json: { error: "Verifica con Apple fallita.", detail: e.message } };
  }
  if (!info) return { status: 200, json: { ignored: true } };

  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  // A chi appartiene? Preferiamo l'appAccountToken (firmato da Apple); in
  // mancanza, la riga già esistente con quell'original_transaction_id.
  let userId = info.appAccountToken || null;
  if (!userId) {
    const { data } = await admin
      .from("entitlements").select("user_id")
      .eq("original_transaction_id", originalTransactionId).maybeSingle();
    userId = data?.user_id || null;
  }
  if (!userId) return { status: 200, json: { ignored: true, reason: "utente sconosciuto" } };

  await upsertEntitlement(admin, userId, info);
  return { status: 200, json: { ok: true, status: info.status } };
}

// --- Helper ---------------------------------------------------------------

// Interroga Apple per l'originalTransactionId e riduce al nostro modello.
async function resolveSubscription(env, originalTransactionId, preferSandbox = false) {
  const res = await getSubscriptionStatuses(env, originalTransactionId, preferSandbox);
  const group = res?.data?.[0];
  const list = group?.lastTransactions || [];
  const last = list.find((t) => t.originalTransactionId === originalTransactionId) || list[0];
  if (!last?.signedTransactionInfo) return null;

  const tx = decodeJws(last.signedTransactionInfo);
  const renewal = last.signedRenewalInfo ? decodeJws(last.signedRenewalInfo) : null;
  const { status, expires_at } = classify(last.status, tx, renewal);
  return {
    status,
    expires_at,
    product_id: tx.productId || null,
    original_transaction_id: tx.originalTransactionId || originalTransactionId,
    appAccountToken: tx.appAccountToken || null,
  };
}

async function upsertEntitlement(admin, userId, info) {
  // Non declassiamo un Premium omaggio (source 'comp', migration-13): è un
  // regalo a vita e in pratica quegli utenti non vedono nemmeno il paywall.
  const { data: existing } = await admin
    .from("entitlements").select("source").eq("user_id", userId).maybeSingle();
  if (existing?.source === "comp") return;

  const { error } = await admin.from("entitlements").upsert(
    {
      user_id: userId,
      source: "apple",
      product_id: info.product_id,
      status: info.status,
      expires_at: info.expires_at,
      original_transaction_id: info.original_transaction_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
}
