// Serverless function Vercel: proxy foto ricette (Pexels). La logica è in
// ../server/photo.js. Env richieste: PEXELS_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.
import { handlePhotoRequest } from "../server/photo.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo non consentito." });
    return;
  }
  const out = await handlePhotoRequest({
    authHeader: req.headers.authorization,
    body: req.body,
    env: process.env,
  });
  res.status(out.status).json(out.json);
}
