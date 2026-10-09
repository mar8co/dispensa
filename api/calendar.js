// Serverless function Vercel: Calendario Alimentare in abbonamento.
// La logica vera è in ../server/calendar.js.
//   POST (con il token dell'utente) → { path } indirizzo personale del calendario
//   GET  ?u=<utente>&k=<firma>       → file .ics letto dall'app Calendario
// Variabili d'ambiente: SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY (facoltativa: CALENDAR_SECRET per la firma).
import { handleCalendarLink, handleCalendarFeed } from "../server/calendar.js";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const out = await handleCalendarLink({ authHeader: req.headers.authorization, env: process.env });
    res.status(out.status).json(out.json);
    return;
  }
  if (req.method === "GET") {
    const out = await handleCalendarFeed({ query: req.query, env: process.env });
    res.setHeader("Content-Type", out.status === 200 ? "text/calendar; charset=utf-8" : "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(out.status).send(out.text);
    return;
  }
  res.status(405).json({ error: "Metodo non consentito." });
}
