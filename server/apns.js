// Invio notifiche all'app iOS nativa tramite APNs (Apple Push Notification
// service). Nel guscio Capacitor le Web Push non esistono: il telefono
// registra un device token e le notifiche passano da qui.
//
// Nessuna dipendenza nuova: bastano `http2` e `crypto` di Node. L'autenticazione
// APNs "token based" vuole un JWT ES256 firmato con la chiave .p8 scaricata dal
// portale Apple — poche righe, molto meno di una libreria intera.
//
// Env richieste (Vercel):
//   APNS_KEY_ID      id della chiave .p8 (es. ABC123DEFG)
//   APNS_TEAM_ID     Team ID dell'account Apple Developer
//   APNS_KEY_P8      contenuto del file .p8 (BEGIN PRIVATE KEY…)
//   APNS_BUNDLE_ID   bundle id dell'app (default com.mar8co.dispensa)
//   APNS_PRODUCTION  "1" per l'ambiente di produzione; altrimenti sandbox
import http2 from "node:http2";
import { sign, createPrivateKey } from "node:crypto";

const b64url = (v) => Buffer.from(v).toString("base64url");

// JWT ES256 per APNs. Attenzione: la firma dev'essere R||S grezza (64 byte),
// non DER — da qui `dsaEncoding: "ieee-p1363"`, che è l'errore classico se si
// firma "a mano".
function makeJwt(env) {
  const key = createPrivateKey(env.APNS_KEY_P8.replace(/\\n/g, "\n"));
  const header = b64url(JSON.stringify({ alg: "ES256", kid: env.APNS_KEY_ID }));
  const payload = b64url(JSON.stringify({
    iss: env.APNS_TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
  }));
  const input = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" });
  return `${input}.${b64url(signature)}`;
}

export function apnsConfigured(env) {
  return !!(env.APNS_KEY_ID && env.APNS_TEAM_ID && env.APNS_KEY_P8);
}

// Apre UNA connessione HTTP/2 riusata per tutti i token del giro (APNs
// preferisce così, ed è molto più veloce che riaprirla ogni volta).
export function createApnsSender(env) {
  const host = env.APNS_PRODUCTION === "1"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";
  const topic = env.APNS_BUNDLE_ID || "com.mar8co.dispensa";
  const jwt = makeJwt(env);
  const client = http2.connect(host);
  // Senza questo, un errore di rete sulla sessione diventerebbe un'eccezione
  // non gestita che abbatte l'intera funzione serverless.
  client.on("error", (e) => console.error("APNs: sessione in errore", e.message));

  function send(token, payload) {
    return new Promise((resolve) => {
      const body = JSON.stringify({
        aps: {
          alert: { title: payload.title, body: payload.body },
          sound: "default",
          "thread-id": payload.tag,
        },
        url: payload.url, // letto dall'app al tocco per il deep link
      });
      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        "apns-topic": topic,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      });
      let status = 0, data = "";
      req.on("response", (h) => { status = Number(h[":status"]) || 0; });
      req.on("data", (c) => { data += c; });
      req.on("error", (e) => resolve({ ok: false, status: 0, reason: e.message }));
      req.on("end", () => {
        let reason = "";
        try { reason = JSON.parse(data || "{}").reason || ""; } catch { /* corpo vuoto = ok */ }
        resolve({ ok: status === 200, status, reason });
      });
      req.end(body);
    });
  }

  return { send, close: () => { try { client.close(); } catch { /* già chiusa */ } } };
}

// Il token non è più valido e va cancellato dal database: app disinstallata o
// token ruotato. Sono gli equivalenti APNs del 404/410 delle Web Push.
export function isDeadToken(res) {
  return res.status === 410
    || res.reason === "Unregistered"
    || res.reason === "BadDeviceToken";
}
