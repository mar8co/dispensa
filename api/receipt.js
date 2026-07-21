// Serverless function Vercel: verifica di una ricevuta d'acquisto (StoreKit 2).
// La logica vera è in ../server/receipt.js (condivisa col dev locale).
// Chiamata dal client dopo l'acquisto, con il token Supabase dell'utente.
// Variabili d'ambiente richieste su Vercel:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//   APPSTORE_KEY_ID, APPSTORE_ISSUER_ID, APPSTORE_KEY_P8,
//   APPSTORE_BUNDLE_ID (opz.), APPSTORE_ENVIRONMENT (opz.)
import { handleReceipt } from "../server/receipt.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo non consentito." });
    return;
  }

  const out = await handleReceipt({
    authHeader: req.headers.authorization,
    body: req.body, // Vercel fa già il parse del JSON body
    env: process.env,
  });

  res.status(out.status).json(out.json);
}
