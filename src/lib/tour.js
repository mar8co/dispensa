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
  title: "Pasta zucchine e pomodorini",
  servings: 2,
  time: "20 min",
  ingredients: [
    { name: "Spaghetti", qty: "160 g" },
    { name: "Zucchine", qty: "2" },
    { name: "Pomodorini", qty: "200 g" },
    { name: "Parmigiano", qty: "40 g" },
    { name: "Olio EVO", qty: "20 ml" },
  ],
  steps: [
    { text: "Porta a bollore l'acqua e salala. Intanto taglia le zucchine a rondelle e i pomodorini a metà.", timer: null },
    { text: "Scotta le verdure in padella con un filo d'olio, a fuoco vivace.", timer: 1 },
    { text: "Cuoci la pasta al dente, scolala e saltala in padella con le verdure e una spolverata di parmigiano.", timer: null },
  ],
};

// Card "proposta" mostrata nella scheda Ricette durante il tutorial.
export const TOUR_IDEA = {
  title: TOUR_RECIPE.title,
  description: "Veloce e fresca, con quello che hai già in dispensa.",
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
    title: "Imposta la scadenza", text: "Tocca l'icona calendario per aggiungere una data di scadenza: i prodotti vicini alla scadenza vengono segnalati.",
    advance: "next",
  },
  {
    id: "add-open", view: "dispensa", overlay: "spotlight", target: '[data-tour="add-fab"]',
    title: "Aggiungi un prodotto", text: "Tocca il “+” per aggiungere qualcosa di nuovo.",
    advance: "add-menu-opened", hint: true,
  },
  {
    id: "add-modes", view: "dispensa", overlay: "spotlight", target: '[data-tour="add-manual-option"]',
    title: "Quattro modi per aggiungere", text: "A mano, a voce, col codice a barre o fotografando scontrino e spesa. Proviamo “A mano”.",
    advance: "add-manual-chosen", hint: true,
  },
  {
    id: "add-manual", view: "dispensa", overlay: "banner", target: '[data-tour="manual-add"]',
    title: "Scrivi e aggiungi", text: "Scrivi il nome di un prodotto e tocca Aggiungi: finisce nel reparto giusto in automatico.",
    advance: "product-added", hint: true,
  },
  {
    id: "go-spesa", view: "dispensa", overlay: "spotlight", target: '[data-tour="tab-spesa"]',
    title: "La lista della spesa", text: "Ora la spesa: tocca la scheda Spesa.",
    advance: "view-spesa", hint: true,
  },
  {
    id: "shopping-add", view: "spesa", overlay: "spotlight", target: '[data-tour="shopping-input"]',
    title: "Aggiungi alla lista", text: "Scrivi cosa ti manca e tocca Aggiungi. Al supermercato spunti i prodotti man mano che li prendi.",
    advance: "shopping-added", hint: true,
  },
  {
    id: "go-ricette", view: "spesa", overlay: "spotlight", target: '[data-tour="tab-ricette"]',
    title: "Le ricette", text: "Vediamo le ricette: tocca la scheda Ricette.",
    advance: "view-ricette", hint: true,
  },
  {
    id: "open-recipe", view: "ricette", overlay: "spotlight", target: '[data-tour="recipe-idea"]',
    title: "Apri una ricetta", text: "L'app propone piatti con quello che hai. Apri questa ricetta d'esempio.",
    advance: "recipe-opened", hint: true,
  },
  {
    id: "save-recipe", view: "ricette", overlay: "spotlight", target: '[data-tour="recipe-heart"]',
    title: "Salva nei preferiti", text: "Tocca il cuore per salvarla nel tuo ricettario e ritrovarla quando vuoi.",
    advance: "recipe-saved", hint: true,
  },
  {
    id: "timer", view: "ricette", overlay: "spotlight", target: '[data-tour="step-timer"]',
    title: "Avvia un timer", text: "Ogni passaggio con un tempo ha un timer integrato: avvialo. Suona anche se cambi scheda.",
    advance: "timer-started", hint: true,
  },
  {
    id: "receipt", view: "ricette", overlay: "card",
    title: "Fotografa scontrino o spesa", text: "Dopo la spesa fotografa lo scontrino oppure direttamente i prodotti o i sacchetti: l'app riconosce gli alimenti e li aggiunge per te. Ecco un esempio:",
    advance: "next", demo: "scan",
  },
  {
    id: "delete", view: "dispensa", overlay: "spotlight", target: '[data-tour="pantry-first-item"]',
    title: "Eliminare un prodotto", text: "Per eliminare un prodotto, aprilo e tocca il cestino 🗑️. Ci siamo quasi.",
    advance: "next",
  },
  {
    id: "empty", view: "dispensa", overlay: "card",
    title: "Svuotiamo la dispensa demo", text: "Hai visto tutto! Cancello i prodotti di esempio così parti da una dispensa tutta tua. (Potrai svuotarla anche da Profilo › Svuota dispensa.)",
    advance: "empty", cta: "Svuota e inizia",
  },
  {
    id: "done", view: "dispensa", overlay: "card",
    title: "Tutto pronto! 🎉", text: "Hai usato concretamente le funzioni principali. La dispensa ora è vuota e tua. Puoi rivedere questo tutorial quando vuoi da Profilo › Rivedi il tutorial.",
    advance: "finish", cta: "Inizia a usare l'app",
  },
];

// In replay (non primo accesso) non si tocca la dispensa reale: niente passo
// "svuota demo".
export function visibleSteps(firstRun) {
  return firstRun ? STEPS : STEPS.filter((s) => s.id !== "empty");
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
