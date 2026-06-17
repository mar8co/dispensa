// Tutorial interattivo del primo accesso (e ripetibile dal Profilo).
//
// A differenza di una sequenza di schede informative, questo tour PILOTA azioni
// reali: l'utente apre un prodotto, ne cambia quantità/unità, ne aggiunge uno
// nuovo, va in lista spesa, apre una ricetta, la salva, avvia un timer… Ogni
// passo evidenzia l'elemento giusto (spotlight), blocca il resto e avanza da
// solo quando l'azione viene eseguita.
//
// Store esterno (useSyncExternalStore): qualunque componente può emettere un
// "segnale" con tourSignal(nome); il passo corrente avanza solo se aspetta
// proprio quel segnale, altrimenti è un no-op innocuo.
import { useSyncExternalStore } from "react";

// --- Contenuti demo (nessuna chiamata AI durante il tutorial) ---

// Occasione fittizia per l'intestazione della schermata proposte.
export const TOUR_MODE = { id: "Su misura per te", icon: "✨", desc: "" };

// Ricetta d'esempio: usa i prodotti di DEMO_DATA (così risultano "ce l'hai")
// e ha un passaggio con timer, per mostrare il timer di cottura.
export const TOUR_RECIPE = {
  title: "Pasta zucchine, pomodorini e feta",
  servings: 2,
  time: "20 min",
  ingredients: [
    { name: "Spaghetti", qty: "160 g" },
    { name: "Zucchine", qty: "2" },
    { name: "Pomodorini", qty: "200 g" },
    { name: "Feta", qty: "100 g" },
    { name: "Olio EVO", qty: "20 ml" },
  ],
  steps: [
    { text: "Porta a bollore l'acqua e salala. Intanto taglia le zucchine a rondelle e i pomodorini a metà, e sbriciola la feta.", timer: null },
    { text: "Scotta le verdure in padella con un filo d'olio, a fuoco vivace.", timer: 1 },
    { text: "Cuoci la pasta al dente, scolala e saltala con le verdure; aggiungi la feta sbriciolata a fine cottura.", timer: null },
  ],
};

// Card "proposta" mostrata nella scheda Ricette durante il tutorial.
export const TOUR_IDEA = {
  title: TOUR_RECIPE.title,
  description: "Veloce e fresca, con zucchine, pomodorini e feta.",
  time: "20 min",
  difficulty: "Facile",
};

// Esempio di prodotti "riconosciuti" da una foto (passo dimostrativo): possono
// venire da uno scontrino oppure dagli alimenti/sacchetti della spesa.
export const TOUR_SCAN = [
  { name: "Latte", qty: "1 l", emoji: "🥛" },
  { name: "Pasta", qty: "500 g", emoji: "🍝" },
  { name: "Pomodori", qty: "6", emoji: "🍅" },
  { name: "Banane", qty: "4", emoji: "🍌" },
  { name: "Uova", qty: "6", emoji: "🥚" },
];

// --- Definizione dei passi ---
// overlay: "card" (riquadro centrale), "banner" (striscia in alto, sopra le
//   modali) oppure "spotlight" (buco luminoso su un elemento).
// target: selettore [data-tour="…"] da evidenziare (solo spotlight).
// advance: "next"/"finish"/"empty" (pulsante) oppure il nome di un segnale
//   che fa avanzare quando l'azione viene eseguita davvero.
export const STEPS = [
  {
    id: "welcome", view: "dispensa", overlay: "card",
    title: "Benvenuto! 👋",
    text: "Facciamo un giro insieme: ti mostro come utilizzare le funzioni principali. Bastano un paio di minuti.",
    advance: "next", cta: "Iniziamo",
  },
  {
    id: "pantry", view: "dispensa", overlay: "banner",
    title: "Questa è la tua dispensa",
    text: "Qui puoi aggiungere e trovare tutti i prodotti che hai a casa. Ora l'ho riempita con qualche prodotto di esempio, raggruppato per reparto. Alla fine la svuotiamo, così parti da zero.",
    advance: "next",
  },
  {
    id: "open-product", view: "dispensa", overlay: "spotlight", target: '[data-tour="pantry-first-item"]',
    title: "Apri un prodotto", text: "Tocca un prodotto per modificarlo.",
    advance: "product-opened", hint: true,
  },
  {
    id: "qty", view: "dispensa", overlay: "spotlight", target: '[data-tour="qty-stepper"]',
    title: "Cambia la quantità", text: "Tocca − o + per aggiornare le quantità. Si salva da solo, senza pulsanti.",
    advance: "qty-changed", hint: true,
  },
  {
    id: "unit", view: "dispensa", overlay: "spotlight", target: '[data-tour="unit-chips"]',
    title: "Scegli l'unità", text: "Pezzi, grammi, chili o litri: scegli l'unità di misura.",
    advance: "unit-changed", hint: true,
  },
  {
    id: "expiry", view: "dispensa", overlay: "spotlight", target: '[data-tour="expiry-field"]',
    title: "Imposta la scadenza", text: "Tocca l'icona calendario per aggiungere una data di scadenza: ti segnalo i prodotti che stanno per scadere.",
    advance: "next",
  },
  {
    id: "add-open", view: "dispensa", overlay: "spotlight", target: '[data-tour="add-fab"]',
    title: "Aggiungi un prodotto", text: "Tocca il “+” per aggiungere la tua spesa.",
    advance: "add-menu-opened", hint: true,
  },
  {
    id: "add-modes", view: "dispensa", overlay: "spotlight", target: '[data-tour="add-manual-option"]',
    title: "Quattro modi per aggiungere", text: "A mano, fotografando lo scontrino o la spesa, a voce, col codice a barre. Proviamo “A mano”.",
    advance: "add-manual-chosen", hint: true,
  },
  {
    id: "add-manual", view: "dispensa", overlay: "banner", target: '[data-tour="manual-add"]',
    title: "Scrivi e aggiungi", text: "Scrivi il nome di un prodotto e tocca Aggiungi: lo metto nel reparto giusto in automatico.",
    advance: "product-added", hint: true,
  },
  {
    id: "go-spesa", view: "dispensa", overlay: "spotlight", target: '[data-tour="tab-spesa"]',
    title: "La lista della spesa", text: "Tocca la scheda Spesa: qui tieni la lista di tutto quello che ti manca.",
    advance: "view-spesa", hint: true,
  },
  {
    id: "shopping-add", view: "spesa", overlay: "spotlight", target: '[data-tour="shopping-input"]',
    title: "Aggiungi alla lista", text: "Scrivi o dì cosa ti manca, al supermercato spunti i prodotti man mano che li prendi.",
    advance: "shopping-added", hint: true,
  },
  {
    id: "go-ricette", view: "spesa", overlay: "spotlight", target: '[data-tour="tab-ricette"]',
    title: "Le ricette", text: "Tocca la scheda Ricette: ti propongo piatti con quello che hai in casa.",
    advance: "view-ricette", hint: true,
  },
  {
    id: "recipe-search", view: "ricette", overlay: "spotlight", target: '[data-tour="recipe-search"]',
    title: "Ricette su misura", text: "Scrivi cosa ti va di cucinare e ti preparo le ricette apposta, es. “zucchine pomodori e feta”.",
    advance: "next",
  },
  {
    id: "open-recipe", view: "ricette", overlay: "spotlight", target: '[data-tour="recipe-idea"]',
    title: "Apri una ricetta", text: "Ti propongo piatti solo con quello che hai in dispensa. Apri questa ricetta.",
    advance: "recipe-opened", hint: true,
  },
  {
    id: "save-recipe", view: "ricette", overlay: "spotlight", target: '[data-tour="recipe-heart"]',
    title: "Salva nei preferiti", text: "Tocca il cuore ❤️ per salvarla nel tuo ricettario personale e ritrovarla quando vuoi.",
    advance: "recipe-saved", hint: true,
  },
  {
    id: "receipt", view: "ricette", overlay: "card",
    title: "Fotografa scontrino o spesa", text: "Dopo la spesa fotografa lo scontrino oppure direttamente i prodotti: riconosco gli alimenti e li aggiungo per te. Ecco un esempio:",
    advance: "next", demo: "scan",
  },
  {
    id: "delete", view: "dispensa", overlay: "spotlight", target: '[data-tour="pantry-first-item"]',
    title: "Eliminare un prodotto", text: "Per eliminare un prodotto, aprilo e tocca il cestino 🗑️.",
    advance: "next",
  },
  {
    id: "empty-open-profile", view: "dispensa", overlay: "spotlight", target: '[data-tour="tab-profilo"]',
    title: "Svuotiamo la dispensa demo", text: "Per ripartire da una dispensa tutta tua, apri il Profilo.",
    advance: "profile-opened", hint: true,
  },
  {
    id: "empty-clear", view: "dispensa", overlay: "spotlight", target: '[data-tour="clear-pantry"]',
    title: "Svuota la dispensa", text: "Tocca “Svuota dispensa”: cancello i prodotti di esempio così parti da zero.",
    advance: "pantry-cleared", hint: true,
  },
  {
    id: "done", view: "dispensa", overlay: "card",
    title: "Tutto pronto! 🎉", text: "Ci siamo, sai già tutto! Ora la dispensa è tutta tua: inizia ad aggiungere quello che hai in casa. Vuoi rifare il giro? Lo ritrovi in Profilo › Rivedi il tutorial.",
    advance: "finish", cta: "Inizia a usare l'app",
  },
];

// In replay (non primo accesso) non si tocca la dispensa reale: niente passo
// "svuota demo".
export function visibleSteps(firstRun) {
  return firstRun ? STEPS : STEPS.filter((s) => s.id !== "empty-open-profile" && s.id !== "empty-clear");
}

// --- Store ---
let state = { active: false, index: 0, firstRun: true };
const listeners = new Set();
function setState(patch) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}
function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
function getSnapshot() { return state; }

export function useTourState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function startTour(firstRun = true) { setState({ active: true, index: 0, firstRun }); }
export function stopTour() { setState({ active: false, index: 0 }); }

// Avanza di un passo. Restituisce false se eravamo già all'ultimo (fine tour).
export function tourGoNext() {
  if (!state.active) return false;
  const steps = visibleSteps(state.firstRun);
  if (state.index < steps.length - 1) { setState({ index: state.index + 1 }); return true; }
  return false;
}

// Segnale emesso dall'app quando l'utente compie un'azione: fa avanzare solo
// se il passo corrente aspetta proprio quel segnale.
export function tourSignal(name) {
  if (!state.active) return;
  const steps = visibleSteps(state.firstRun);
  const step = steps[state.index];
  if (step && step.advance === name && state.index < steps.length - 1) {
    setState({ index: state.index + 1 });
  }
}
