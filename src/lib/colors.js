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

// Classi per il CONTENUTO di un foglio nero (i due fogli del Piano Alimentare e
// "Aggiorna la dispensa": `Sheet panelClass="bg-ink"`): testo e bordi crema, azione principale gialla
// (un bottone nero sul nero sparirebbe), come nelle fotocamere.
export const FOGLIO_NERO =
  "text-crema [&_.border-ink]:border-crema [&_.bottone-chiaro]:border-crema [&_.bottone-chiaro]:text-crema " +
  "[&_.bottone]:bg-giallo [&_.bottone]:text-ink [&_.campo]:border-crema [&_.campo]:placeholder:text-crema/50 " +
  "[&_.divide-riga>*]:border-crema/20 [&_.micro]:text-crema/70 [&_.text-ink]:text-crema [&_.text-tenue]:text-crema/70 " +
  "[&_.tondo]:border-crema [&_.tondo]:text-crema [&_.pillola]:border-crema [&_.pillola]:text-crema [&_.cartellino]:border-crema/60";

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
  // Sul verde il testo secondario (nero al 60%) non regge il contrasto: più scuro.
  document.documentElement.style.setProperty("--tenue-a", hex === PALETTE.verde ? "0.8" : "0.6");
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
  }
  meta.content = hex;
}
