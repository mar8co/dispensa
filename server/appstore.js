// Helper per l'App Store Server API (verifica degli abbonamenti) e per
// decodificare i JWS firmati da Apple. Nessuna dipendenza nuova: JWT ES256
// firmato a mano come server/apns.js, e `fetch` globale (Node 18+).
//
// Env richieste (Vercel):
//   APPSTORE_KEY_ID       id della chiave (In-App Purchase o App Store Connect API)
//   APPSTORE_ISSUER_ID    issuer id associato alla chiave
//   APPSTORE_KEY_P8       contenuto del file .p8 (BEGIN PRIVATE KEY...)
//   APPSTORE_BUNDLE_ID    bundle id dell'app (default com.mar8co.dispensa)
//   APPSTORE_ENVIRONMENT  "sandbox" per provare prima la sandbox (default production)
import { sign, createPrivateKey } from "node:crypto";

const b64url = (v) => Buffer.from(v).toString("base64url");

const HOSTS = {
  production: "https://api.storekit.itunes.apple.com",
  sandbox: "https://api.storekit-sandbox.itunes.apple.com",
};

export function appStoreConfigured(env) {
  return !!(env.APPSTORE_KEY_ID && env.APPSTORE_ISSUER_ID && env.APPSTORE_KEY_P8);
}

// JWT ES256 per l'App Store Server API. Rispetto ad APNs il payload richiede
// aud "appstoreconnect-v1" e il bundle id (`bid`); la firma è R||S grezza
// (`ieee-p1363`), non DER — l'errore classico se si firma a mano.
export function makeJwt(env) {
  const key = createPrivateKey(env.APPSTORE_KEY_P8.replace(/\\n/g, "\n"));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: env.APPSTORE_KEY_ID, typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: env.APPSTORE_ISSUER_ID,
    iat: now,
    exp: now + 600, // 10 minuti (Apple consente fino a 60)
    aud: "appstoreconnect-v1",
    bid: env.APPSTORE_BUNDLE_ID || "com.mar8co.dispensa",
  }));
  const input = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" });
  return `${input}.${b64url(signature)}`;
}

// Decodifica il payload di un JWS Apple SENZA verificarne la firma. È sicuro nei
// nostri usi: i JWS che decodifichiamo arrivano dall'API Apple su TLS
// autenticato (pull), oppure servono solo a capire QUALE sottoscrizione
// ricontrollare (le notifiche non vengono mai credute sulla parola: la verità
// la riprendiamo sempre dall'API — vedi server/receipt.js).
export function decodeJws(jws) {
  const part = String(jws).split(".")[1];
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

// Ordine degli ambienti da provare. In TestFlight/Sandbox le transazioni vivono
// in sandbox, in produzione in production: proviamo l'ambiente preferito e, se
// la transazione lì non c'è (404), l'altro. Così lo stesso codice funziona in
// TestFlight e dopo il rilascio senza cambiare configurazione.
function envOrder(env, preferSandbox) {
  const first = preferSandbox || env.APPSTORE_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
  return first === "sandbox" ? ["sandbox", "production"] : ["production", "sandbox"];
}

// GET /inApps/v1/subscriptions/{originalTransactionId} (Get All Subscription
// Statuses). Ritorna il JSON Apple, o lancia se in nessun ambiente si trova.
export async function getSubscriptionStatuses(env, originalTransactionId, preferSandbox = false) {
  const jwt = makeJwt(env);
  let lastErr;
  for (const name of envOrder(env, preferSandbox)) {
    const url = `${HOSTS[name]}/inApps/v1/subscriptions/${encodeURIComponent(originalTransactionId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    if (res.ok) return res.json();
    if (res.status === 404) { lastErr = new Error(`Non trovata in ${name}`); continue; } // prova l'altro ambiente
    const text = await res.text().catch(() => "");
    throw new Error(`App Store Server API ${res.status}: ${text.slice(0, 200)}`);
  }
  throw lastErr || new Error("Sottoscrizione non trovata.");
}

// Riduce lo stato numerico Apple (1-5) + la transazione al nostro modello.
// `grace` (4) resta "Premium acceso": carta scaduta ma Apple riprova nel
// periodo di tolleranza. `billing retry` senza grace (3) è già scaduto.
export function classify(statusNum, tx, renewal) {
  const isoOrNull = (ms) => (ms ? new Date(ms).toISOString() : null);
  if (tx?.revocationDate) return { status: "refunded", expires_at: isoOrNull(tx.revocationDate) };
  switch (statusNum) {
    case 1: return { status: "active", expires_at: isoOrNull(tx?.expiresDate) };
    case 4: return { status: "grace", expires_at: isoOrNull(renewal?.gracePeriodExpiresDate || tx?.expiresDate) };
    case 5: return { status: "refunded", expires_at: isoOrNull(tx?.expiresDate) };
    // 2 = expired, 3 = billing retry (senza grace) → accesso scaduto
    default: return { status: "expired", expires_at: isoOrNull(tx?.expiresDate) };
  }
}
