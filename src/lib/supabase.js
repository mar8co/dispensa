// Client Supabase condiviso. URL e anon key arrivano dalle env var Vite
// (VITE_*), quindi sono incluse nel bundle client: va bene, la anon key è
// pubblica e protetta dalle Row Level Security policy lato database.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Messaggio chiaro in console se manca la configurazione locale.
  console.error(
    "Configurazione Supabase mancante: imposta VITE_SUPABASE_URL e " +
    "VITE_SUPABASE_ANON_KEY in .env.local (vedi .env.example)."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
