// Colori della veste "manifesto" (uguali ai token di tailwind.config.js) e
// colore pieno di ogni schermata. Sopra i colori pieni si scrive sempre in
// nero; il bianco solo sul rosso azione.

export const PALETTE = {
  arancio: "#ff7a1a", // Impostazioni (fino al 01/10 era il marchio)
  giallo: "#ffd60a",
  verde: "#22b35e",
  rosa: "#ffb5d0",
  sabbia: "#dcceb3", // beige del marchio: Dispensa, accesso, avvio, icona
  blu: "#3572e8", // avatar e pannello Profilo
  grigio: "#c9c5bd",
  rosso: "#ff3b1c",
};
export const WHITE = "#ffffff";
export const INK = "#0a0a0a";

// Colore pieno di ogni schermata: fondo della pagina e barra di stato.
export const PAGE_COLOR = {
  dispensa: PALETTE.sabbia,
  spesa: WHITE, // dal 01/10 (prima giallo)
  ricette: PALETTE.verde, // Idee, proposte e Piano Alimentare
  ricetta: PALETTE.verde, // ricetta aperta: verde come tutto ciò che è Ricette (dal 09/10, prima bianca)
  accesso: PALETTE.sabbia, // login e caricamento
};

// Schermata della vista corrente (la ricetta aperta ha la sua voce, oggi verde).
export function pageColorFor(view, recipeOpen = false) {
  if (view === "ricette" && recipeOpen) return PAGE_COLOR.ricetta;
  return PAGE_COLOR[view] || PAGE_COLOR.dispensa;
}

// Imposta il colore della pagina: variabile --sfondo (terna RGB, così vale
// anche con le opacità Tailwind, es. bg-sfondo/95) + <meta theme-color>, che
// colora la barra di stato di iOS. Nessuna transizione sul fondo: il cambio
// di scheda è già dentro la View Transition (e ridisegnare tutta la pagina
// animando il colore costerebbe su iPhone).
export function setPageColor(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const rgb = `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  document.documentElement.style.setProperty("--sfondo", rgb);
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
  }
  meta.content = hex;
}
