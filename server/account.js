// Core per la cancellazione dell'account (e di tutti i dati dell'utente).
// Usato dalla serverless function Vercel (api/account.js) e dal middleware dev.
//
// Sicurezza:
//  - Richiede un token Supabase valido (l'utente cancella SOLO sé stesso).
//  - Usa la SERVICE ROLE key (solo server) per chiamare l'admin API.
//  - Cancellando l'utente auth, i dati applicativi spariscono in cascata
//    (FK `on delete cascade` verso auth.users in tutte le tabelle).
import { createClient } from "@supabase/supabase-js";

export async function handleDeleteAccount({ authHeader, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { status: 500, json: { error: "Configurazione Supabase mancante sul server." } };
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 500, json: { error: "Cancellazione non disponibile: SUPABASE_SERVICE_ROLE_KEY non configurata sul server." } };
  }

  const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, json: { error: "Non autenticato." } };

  // Verifica chi è l'utente dal suo token.
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { data: userData, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !userData?.user) {
    return { status: 401, json: { error: "Sessione non valida o scaduta." } };
  }

  // Cancella l'utente con la service role: i dati vanno via in cascata.
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { error: delErr } = await admin.auth.admin.deleteUser(userData.user.id);
  if (delErr) {
    return { status: 500, json: { error: "Impossibile eliminare l'account.", detail: String(delErr.message || delErr) } };
  }

  return { status: 200, json: { ok: true } };
}
