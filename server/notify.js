// Notifica "X ha aggiunto alla lista": parte quando un membro della dispensa
// condivisa mette prodotti nella lista della spesa, e arriva agli ALTRI
// membri. La chiama il client (src/lib/listNotice.js), che raggruppa le
// aggiunte ravvicinate in una richiesta sola.
//
// Sicurezza: serve il token dell'utente; i destinatari li ricava il server dai
// nuclei di cui l'utente fa parte (il client non può scegliere a chi scrivere).
// I nomi dei prodotti sono testo dell'utente: accorciati e in numero limitato.
import { createClient } from "@supabase/supabase-js";
import { fetchSubscriptions, createPushSender } from "./push.js";

export async function handleListNotify({ authHeader, body, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 500, json: { error: "Configurazione Supabase mancante sul server." } };
  }
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return { status: 500, json: { error: "Chiavi VAPID mancanti sul server." } };
  }
  const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, json: { error: "Non autenticato." } };
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { data: userData, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !userData?.user) return { status: 401, json: { error: "Sessione non valida o scaduta." } };
  const uid = userData.user.id;

  const names = (Array.isArray(body?.names) ? body.names : [])
    .map((n) => String(n || "").trim().slice(0, 40)).filter(Boolean).slice(0, 30);
  if (!names.length) return { status: 400, json: { error: "Nessun prodotto." } };

  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: mine } = await admin.from("household_members").select("household_id, username").eq("user_id", uid);
  const hhIds = (mine || []).map((m) => m.household_id).filter(Boolean);
  if (!hhIds.length) return { status: 200, json: { sent: 0 } };
  const { data: others } = await admin.from("household_members").select("user_id").in("household_id", hhIds).neq("user_id", uid);
  const userIds = [...new Set((others || []).map((m) => m.user_id))];
  if (!userIds.length) return { status: 200, json: { sent: 0 } }; // dispensa non condivisa

  const { subs } = await fetchSubscriptions(admin, userIds);
  if (!subs.length) return { status: 200, json: { sent: 0 } };

  const who = (mine || []).map((m) => m.username).find(Boolean) || "Qualcuno";
  const shown = names.slice(0, 4).join(", ") + (names.length > 4 ? ` e altri ${names.length - 4}` : "");
  const payload = {
    title: `${who} ha aggiunto alla lista 🛒`,
    body: shown,
    url: "/?view=spesa",
    tag: "dispensa-lista-aggiunta",
  };
  const sender = createPushSender(env, admin, subs);
  for (const s of subs) await sender.send(s, payload);
  sender.close();
  return { status: 200, json: sender.stats };
}
