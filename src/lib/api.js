// Base URL dei proxy `/api/*`.
//
// Sul WEB (PWA su Vercel) i fetch restano RELATIVI, esattamente come prima:
// `VITE_API_BASE` è vuota e `apiUrl("/api/claude")` torna "/api/claude".
//
// Nel guscio NATIVO (Capacitor, fase 3) la webview non è servita da Vercel ma
// da `capacitor://localhost`: un fetch relativo cercherebbe l'endpoint dentro
// il bundle dell'app e fallirebbe. Lì la build passa
// `VITE_API_BASE=https://la-dispensa-omega.vercel.app` e le stesse chiamate
// puntano al dominio di produzione.
//
// Nota: la base NON deve finire con "/" (altrimenti si formerebbe "//api/...").
const RAW = import.meta.env.VITE_API_BASE || "";
const API_BASE = RAW.replace(/\/+$/, "");

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
