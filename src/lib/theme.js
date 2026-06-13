// Tema dell'app: "auto" (segue il sistema, default), "light" o "dark".
// La scelta è per-dispositivo (localStorage), così telefono e PC possono
// avere temi diversi e il tema vale anche sulla schermata di login.
const KEY = "dispensa-theme";
const COLORS = { light: "#f7f6f1", dark: "#121211" };

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

// Applica il tema al documento: data-theme sul <html> pilota le variabili
// CSS di index.css; i meta theme-color tengono allineata la barra di stato.
export function applyTheme(t) {
  const root = document.documentElement;
  if (t === "light" || t === "dark") root.dataset.theme = t;
  else delete root.dataset.theme;

  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    const media = m.getAttribute("media") || "";
    if (t === "auto") m.setAttribute("content", media.includes("dark") ? COLORS.dark : COLORS.light);
    else m.setAttribute("content", COLORS[t]);
  });
}

export function setTheme(t) {
  try {
    if (t === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch { /* niente persistenza */ }
  applyTheme(t);
}
