// "Qualcuno ha aggiunto alla lista": quando metti prodotti nella lista della
// spesa, gli ALTRI membri della dispensa condivisa ricevono una notifica.
// Qui si raccolgono i nomi per qualche secondo, così dieci aggiunte di fila
// (o i mancanti di un'intera settimana) fanno UNA notifica sola; "Annulla"
// entro quel tempo li toglie. A chi mandarla lo decide il server
// (server/notify.js): se la dispensa non è condivisa non parte nulla.
import { supabase } from "./supabase.js";
import { apiUrl } from "./api.js";

const ATTESA_MS = 12000;
let pending = [];
let timer = null;

async function flush() {
  timer = null;
  const names = pending;
  pending = [];
  if (!names.length || !navigator.onLine) return;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    await fetch(apiUrl("/api/notify"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ names }),
    });
  } catch { /* una notifica mancata non è un errore da mostrare */ }
}

export function queueListNotice(names) {
  const clean = (names || []).map((n) => String(n || "").trim()).filter(Boolean);
  if (!clean.length) return;
  pending.push(...clean);
  clearTimeout(timer);
  timer = setTimeout(flush, ATTESA_MS);
}

export function cancelListNotice(names) {
  for (const n of names || []) {
    const i = pending.indexOf(String(n || "").trim());
    if (i >= 0) pending.splice(i, 1);
  }
}
