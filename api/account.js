// Serverless function Vercel: cancellazione account + dati dell'utente.
// La logica vera è in ../server/account.js (condivisa col dev locale).
// Variabili d'ambiente richieste su Vercel:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { handleDeleteAccount } from "../server/account.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo non consentito." });
    return;
  }

  const out = await handleDeleteAccount({
    authHeader: req.headers.authorization,
    env: process.env,
  });

  res.status(out.status).json(out.json);
}
