// Cache locale dei dati (per utente) in localStorage, così la dispensa è
// consultabile anche senza rete. Non sostituisce Supabase: è uno specchio
// di sola lettura aggiornato a ogni modifica andata a buon fine.
//
// Forma: { items, shopping, settings, ts }

const keyFor = (userId) => `dispensa-cache-${userId}`;

export function loadCache(userId) {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCache(userId, data) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ ...data, ts: Date.now() }));
  } catch (e) {
    console.error("Errore salvataggio cache:", e);
  }
}
