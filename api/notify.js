// Serverless function Vercel: notifica "X ha aggiunto alla lista" agli altri
// membri della dispensa condivisa. La logica vera è in ../server/notify.js.
// Variabili d'ambiente: SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (+ APNs).
import { handleListNotify } from "../server/notify.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo non consentito." });
    return;
  }
  const out = await handleListNotify({ authHeader: req.headers.authorization, body: req.body, env: process.env });
  res.status(out.status).json(out.json);
}
