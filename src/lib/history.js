// Storico degli acquisti (per utente, in localStorage): alimenta i
// suggerimenti e i "frequenti" nella lista della spesa.
// Forma: { [nomeNormalizzato]: { name, count, last } }
import { norm } from "./pantry.js";

const keyFor = (uid) => `dispensa-shophist-${uid}`;
const MAX_ENTRIES = 300;

export function loadHistory(uid) {
  try {
    const h = JSON.parse(localStorage.getItem(keyFor(uid)));
    return h && typeof h === "object" ? h : {};
  } catch {
    return {};
  }
}

export function saveHistory(uid, hist) {
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(hist));
  } catch { /* niente persistenza */ }
}

// Restituisce una copia dello storico con i nomi indicati incrementati.
export function bumpedHistory(hist, names) {
  const next = { ...hist };
  for (const raw of names || []) {
    const name = String(raw || "").trim();
    const k = norm(name);
    if (!k) continue;
    const cur = next[k];
    next[k] = { name: cur?.name || name, count: (cur?.count || 0) + 1, last: Date.now() };
  }
  // Tetto alle voci: si scartano le più vecchie.
  const keys = Object.keys(next);
  if (keys.length > MAX_ENTRIES) {
    keys.sort((a, b) => (next[a].last || 0) - (next[b].last || 0));
    for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete next[k];
  }
  return next;
}

// Nomi ordinati per frequenza (poi recenza): per chip e completamenti.
export function sortedNames(hist) {
  return Object.values(hist)
    .sort((a, b) => (b.count - a.count) || (b.last - a.last))
    .map((x) => x.name);
}
