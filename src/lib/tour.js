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
  title: "Cous cous con tonno, zucchine e feta",
  servings: 2,
  time: "15 min",
  ingredients: [
    { name: "Cous cous", qty: "160 g" },
    { name: "Tonno", qty: "160 g" },
    { name: "Zucchine", qty: "2" },
    { name: "Pomodorini", qty: "200 g" },
    { name: "Feta", qty: "100 g" },
    { name: "Menta", qty: "1 ciuffo" },
  ],
  steps: [
    { text: "Versa il cous cous in una ciotola, coprilo con acqua bollente salata e un filo d'olio, poi lascialo gonfiare e sgranalo con una forchetta.", timer: 5 },
    { text: "Intanto taglia le zucchine a cubetti e saltale in padella; taglia i pomodorini a metà e sbriciola la feta.", timer: null },
    { text: "Unisci al cous cous le zucchine, i pomodorini, il tonno sgocciolato e la feta. Profuma con la menta fresca e servi.", timer: null },
  ],
};

// Card "proposta" mostrata nella scheda Ricette durante il tutorial.
export const TOUR_IDEA = {
  title: TOUR_RECIPE.title,
  description: "Fresca e veloce, con tonno, zucchine, feta e menta.",
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
    text: "Facciamo un giro insieme: ti mostro come utilizzare le funzioni principali.",
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
    id: "expiry-open", view: "dispensa", overlay: "spotlight", target: '[data-tour="expiry-field"]',
    title: "Imposta la scadenza", text: "Tocca l'icona calendario per aggiungere una data di scadenza.",
    advance: "expiry-opened", hint: true,
  },
  {
    id: "cook-with", view: "dispensa", overlay: "spotlight", target: '[data-tour="cook-with"]',
    title: "Cucina con questo", text: "Da ogni prodotto puoi selezionare\n“Cucina con questo” e ti propongo una ricetta con ogni ingrediente che vuoi.",
    advance: "next",
  },
  {
    id: "add-open", view: "dispensa", overlay: "spotlight", target: '[data-tour="add-fab"]',
    title: "Aggiungi un prodotto", text: "Tocca il “+” per aggiungere la tua spesa.",
    advance: "add-menu-opened", hint: true, noSkip: true,
  },
  {
    id: "add-modes", view: "dispensa", overlay: "banner", pos: "bottom",
    title: "4 modi per aggiungere la spesa", text: "A mano, fotografando lo scontrino o la spesa, col codice a barre o a voce: scegli come preferisci.",
    advance: "next",
  },
  {
    id: "go-spesa", view: "dispensa", overlay: "spotlight", target: '[data-tour="tab-spesa"]',
    title: "La lista della spesa", text: "Tocca la scheda Spesa: qui tieni la lista di tutto quello che ti manca.",
    advance: "view-spesa", hint: true,
  },
  {
    id: "spesa-info", view: "spesa", overlay: "banner",
    title: "La tua spesa", text: "Qui hai la lista di cosa ti manca: scrivila o dettala a voce. Quando fai la spesa spunta i prodotti che prendi, poi tocca “Sposta in dispensa” per salvarli.",
    advance: "next",
  },
  {
    id: "go-ricette", view: "spesa", overlay: "spotlight", target: '[data-tour="tab-ricette"]',
    title: "Le ricette", text: "Tocca la scheda Ricette: ti propongo piatti con quello che hai in casa.",
    advance: "view-ricette", hint: true,
  },
  {
    id: "ricette-info", view: "ricette", overlay: "banner",
    title: "Le tue ricette", text: "Qui ti propongo piatti con quello che hai. Scegli un'occasione o scrivi un'idea. Apri una ricetta per vedere ingredienti, passaggi e salva le tue preferite.",
    advance: "next",
  },
  {
    id: "done", view: "dispensa", overlay: "card",
    title: "Tutto pronto! 🎉", text: "Aggiungi gli ingredienti che hai in casa e ti aiuterò a trovare ricette e idee per sfruttarli al meglio.\n\nVuoi rivedere il tutorial? Lo trovi sempre in Profilo → Rivedi tutorial.",
    advance: "finish", cta: "Inizia ora",
  },
];

// Stessi passi al primo accesso e in replay. La pulizia dei dati demo (solo al
// primo accesso) avviene a fine tutorial in Dispensa.jsx (tourComplete).
export function visibleSteps() {
  return STEPS;
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
