// Serverless function Vercel: endpoint del cron notifiche push.
// La logica vera è in ../server/push.js. Invocata SOLO dal cron pg_cron
// (migration-10) con l'header `x-cron-secret`; non è un endpoint utente.
// Variabili d'ambiente richieste su Vercel:
//   CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { handlePushCron } from "../server/push.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo non consentito." });
    return;
  }

  const out = await handlePushCron({ headers: req.headers, env: process.env });
  res.status(out.status).json(out.json);
}
