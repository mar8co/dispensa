// Proxy per le foto delle ricette (Pexels). La API key vive solo lato server.
// Riceve una lista di query e restituisce un URL foto per ciascuna.
import { createClient } from "@supabase/supabase-js";

export async function handlePhotoRequest({ authHeader, body, env }) {
  if (!env.PEXELS_API_KEY) {
    return { status: 500, json: { error: "PEXELS_API_KEY non configurata sul server." } };
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { status: 500, json: { error: "Configurazione Supabase mancante sul server." } };
  }

  // Autenticazione: token Supabase dell'utente.
  const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, json: { error: "Non autenticato." } };
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { data: userData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userData?.user) {
    return { status: 401, json: { error: "Sessione non valida o scaduta." } };
  }

  const queries = Array.isArray(body?.queries) ? body.queries.slice(0, 8) : [];
  const urls = await Promise.all(
    queries.map(async (q) => {
      const query = String(q || "").trim() || "food dish";
      try {
        const r = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
          { headers: { Authorization: env.PEXELS_API_KEY } }
        );
        if (!r.ok) return null;
        const d = await r.json();
        const p = d?.photos?.[0];
        return p?.src?.large || p?.src?.medium || null;
      } catch {
        return null;
      }
    })
  );

  return { status: 200, json: { urls } };
}
