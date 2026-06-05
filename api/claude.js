// Serverless function Vercel: proxy verso l'API AI (Google Gemini).
// La logica vera è in ../server/claude.js (condivisa col dev locale).
// Variabili d'ambiente richieste su Vercel:
//   GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
//   (opzionale: GEMINI_MODEL)
import { handleClaudeRequest } from "../server/claude.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo non consentito." });
    return;
  }

  const out = await handleClaudeRequest({
    authHeader: req.headers.authorization,
    body: req.body, // Vercel fa già il parse del JSON body
    env: process.env,
  });

  res.status(out.status).json(out.json);
}
