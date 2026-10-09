// Richieste AI rimaste OGGI (piano gratuito). Il conto vero lo tiene il server
// (server/claude.js): a ogni risposta riuscita ci dice quante ne hai usate e
// qual è il tetto, e qui ce lo ricordiamo per mostrarlo ("ti restano N
// richieste") invece di farlo scoprire con un errore. Per dispositivo, in
// localStorage; vale solo per il giorno in cui è stato letto.
import { useSyncExternalStore } from "react";

const KEY = "dispensa-ai-left";
const today = () => new Date().toDateString();

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v && v.day === today() && typeof v.left === "number" ? v.left : null;
  } catch { return null; }
}

let left = load();
const listeners = new Set();
function set(v) {
  left = v;
  try { localStorage.setItem(KEY, JSON.stringify({ day: today(), left: v })); } catch { /* niente */ }
  for (const l of listeners) l();
}

// Dal proxy: { used, limit } dopo una risposta riuscita.
export function setAiUsage(usage) {
  const used = Number(usage?.used), limit = Number(usage?.limit);
  if (Number.isFinite(used) && Number.isFinite(limit)) set(Math.max(0, limit - used));
}
// Limite raggiunto (errore "daily_limit"): per oggi non ne restano.
export function setAiExhausted() { set(0); }

// null = non lo sappiamo ancora (nessuna richiesta oggi da questo dispositivo).
export function useAiLeft() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => left,
    () => left,
  );
}
