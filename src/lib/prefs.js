// Esigenze alimentari scritte a mano nel Profilo ("no peperoni e no melanzane",
// "vegetariano, senza glutine") → regole che l'app sa applicare DA SOLA alle
// ricette del ricettario: il piano della settimana e "Puoi farle con quello che
// hai" non passano dall'AI, quindi il testo libero va capito qui. (All'AI il
// testo arriva intero, nei prompt: lì non serve.)
//
// Si capiscono tre cose:
//  - i CIBI esclusi, dopo "no", "niente", "senza", "non mangio", "non mi
//    piace/piacciono", "allergico a", "intollerante a", "evito", "odio"…, anche
//    in elenco ("niente peperoni, melanzane e funghi");
//  - i GRUPPI: carne, pesce, latticini/lattosio, formaggi, glutine, uova,
//    maiale, frutta secca, crostacei/molluschi/frutti di mare, alcol, soia;
//  - le DIETE: vegetariano, vegano, pescetariano, celiaco.
// Quello che non rientra qui ("pochi fritti", "poco sale") resta solo all'AI.
import { CATALOG_NAMES } from "../constants.js";
import { findMatch, matchWords, guessCategory } from "./pantry.js";

// Espressioni che aprono un'esclusione (le più lunghe prima).
const MARKERS = [
  ["non", "posso", "mangiare"], ["non", "possiamo", "mangiare"],
  ["non", "mi", "piacciono"], ["non", "mi", "piace"], ["non", "ci", "piacciono"], ["non", "ci", "piace"],
  ["non", "mangio"], ["non", "mangiamo"], ["non", "voglio"], ["non", "vogliamo"], ["non", "digerisco"], ["non", "tollero"],
  ["allergico"], ["allergica"], ["allergici"], ["allergia"], ["allergie"],
  ["intollerante"], ["intolleranti"], ["intolleranza"], ["intolleranze"],
  ["niente"], ["senza"], ["evito"], ["evitiamo"], ["evitare"], ["odio"], ["escludi"], ["escludere"], ["no"],
];
// Tra un cibo e l'altro di un elenco.
const SEPARATORS = new Set([",", "e", "ed", "o", "oppure", "né", "nè", "ne"]);
// Parole che non fanno parte del nome del cibo.
const FILLER = new Set([
  "a", "al", "allo", "alla", "ai", "agli", "alle", "all", "il", "lo", "la", "i", "gli", "le", "l", "un", "uno", "una",
  "di", "del", "dello", "della", "dei", "degli", "delle", "d", "tutto", "tutti", "tutta", "tutte", "qualsiasi", "ogni",
  "tipo", "tipi", "proprio", "assolutamente", "mai",
]);
// Parole che chiudono l'elenco delle esclusioni: da lì in poi si parla d'altro.
const STOPPERS = new Set([
  "mi", "ci", "amo", "adoro", "adoriamo", "preferisco", "preferiamo", "vorrei", "voglio", "si", "sì", "piace", "piacciono",
  "mangio", "mangiamo", "poco", "poca", "pochi", "poche", "piu", "più", "meno", "tanto", "tanta", "tanti", "tante",
  "molto", "molta", "molti", "molte", "solo", "ma", "pero", "però", "perche", "perché", "sono", "siamo", "dieta", "cucina",
]);
const DIET_WORD = /^(vegetarian[oaie]|vegan[oaie]|pescetarian[oaie]|celiac[oaih]e?|celiachia)$/;

// Come l'utente può chiamare un gruppo → gruppo. Le chiavi sono già "ridotte"
// da matchWords (singolari noti, senza preposizioni).
const GROUP_KEYS = {
  carne: "carne", pesce: "pesce",
  latticini: "latticini", latticino: "latticini", lattosio: "latticini", "latte derivati": "latticini",
  formaggio: "formaggi", formaggi: "formaggi",
  glutine: "glutine", uovo: "uova", uova: "uova",
  maiale: "maiale", suino: "maiale", "carne maiale": "maiale",
  "frutta secca": "frutta secca", "frutta guscio": "frutta secca",
  crostacei: "crostacei e molluschi", molluschi: "crostacei e molluschi", "frutti mare": "crostacei e molluschi",
  alcol: "alcol", alcool: "alcol", alcolici: "alcol", soia: "soia",
};
const DIETS = [
  [/\bvegan[oaie]\b/, ["carne", "pesce", "latticini", "uova", "miele"]],
  [/\bvegetarian[oaie]\b/, ["carne", "pesce"]],
  [/\bpescetarian[oaie]\b/, ["carne"]],
  [/\bceliac[oaih]e?\b|\bceliachia\b/, ["glutine"]],
];

// Parole (come le produce matchWords) che fanno appartenere un ingrediente a un gruppo.
const W = (s) => new Set(s.split(" "));
const MEAT = W("pollo manzo maiale vitello tacchino agnello bovino carne salsiccia salsicce macinato hamburger bistecca bistecche fettina fettine spezzatino arrosto lonza tagliata costina costine scaloppina scaloppine braciola braciole ossobuco fegato carpaccio straccetti prosciutto salame mortadella speck bresaola pancetta wurstel guanciale lardo porchetta nduja ragù ragu");
const FISH = W("pesce salmone merluzzo gambero gamberi gamberetti calamaro calamari vongola vongole cozza cozze branzino orata baccalà baccala seppia seppie polpo sgombro tonno trota sogliola platessa nasello alice alici acciuga acciughe sardina sardine scampo scampi totano totani surimi granchio moscardini");
const DAIRY = W("feta besciamella gelato");
const NOT_CHEESE = W("latte burro panna yogurt kefir");
const GLUTEN = W("pasta pane pancarré pancarre piadina panini panino baguette focaccia grissini cracker farina pangrattato semola cous couscous farro orzo tagliatelle lasagne tortellini ravioli gnocchi pastina biscotto biscotti savoiardi sfoglia birra seitan bulgur tortillas pizza besciamella muesli avena");
const PORK = W("maiale salsiccia salsicce pancetta guanciale prosciutto speck mortadella lonza costina costine wurstel salame lardo porchetta nduja braciola braciole");
const NUTS = W("noce noci mandorla mandorle nocciola nocciole pistacchio pistacchi pinoli anacardi arachide arachidi");
const SHELL = W("gambero gamberi gamberetti scampo scampi granchio cozza cozze vongola vongole calamaro calamari seppia seppie polpo totano totani moscardini");
const ALCOHOL = W("vino birra vodka prosecco spumante rum marsala liquore brandy");
const SOY = W("soia tofu edamame");

const any = (words, set) => words.some((w) => set.has(w));
// L'ingrediente (nome, parole, categoria) rientra nel gruppo?
const IN_GROUP = {
  carne: (n, w, cat) => cat === "Carne" || cat === "Salumi" || any(w, MEAT),
  pesce: (n, w, cat) => cat === "Pesce" || any(w, FISH),
  latticini: (n, w, cat) => cat === "Latticini" || any(w, DAIRY),
  formaggi: (n, w, cat) => (cat === "Latticini" && !any(w, NOT_CHEESE)) || w.includes("feta"),
  glutine: (n, w) => !/senza glutine/.test(n) && any(w, GLUTEN),
  uova: (n, w) => w.includes("uovo") || w.includes("uova"),
  maiale: (n, w) => any(w, PORK),
  "frutta secca": (n, w) => any(w, NUTS),
  "crostacei e molluschi": (n, w) => any(w, SHELL),
  alcol: (n, w) => any(w, ALCOHOL),
  soia: (n, w) => any(w, SOY),
  miele: (n, w) => w.includes("miele"),
};

const CATALOG_ITEMS = CATALOG_NAMES.map((name) => ({ name }));
// Un cibo che l'app conosce (così nel Profilo si mostra solo ciò che si può applicare davvero).
const knownFood = (term) => !!guessCategory(term) || !!findMatch(term, CATALOG_ITEMS);

// Testo libero → { terms: cibi esclusi, groups: gruppi esclusi, labels: cosa è
// stato capito (per mostrarlo nel Profilo) }.
export function parsePrefs(text) {
  const raw = String(text || "").toLowerCase();
  const toks = raw
    .replace(/[’'`]/g, " ")
    .replace(/[.;:!?()\n\r]/g, " | ")
    .replace(/,/g, " , ")
    .split(/\s+/).filter(Boolean);

  // 1) Gli elenchi dopo un'espressione di esclusione.
  const found = [];
  let scope = false, cur = [];
  const flush = () => { if (cur.length) found.push(cur.join(" ")); cur = []; };
  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    if (t === "|") { flush(); scope = false; i += 1; continue; }
    const marker = MARKERS.find((m) => m.every((w, k) => toks[i + k] === w));
    if (marker) { flush(); scope = true; i += marker.length; continue; }
    if (!scope) { i += 1; continue; }
    if (SEPARATORS.has(t)) { flush(); i += 1; continue; }
    if (FILLER.has(t)) { i += 1; continue; }
    if (STOPPERS.has(t) || DIET_WORD.test(t)) { flush(); scope = false; i += 1; continue; }
    cur.push(t);
    // Più di tre parole non è il nome di un cibo: non era un elenco.
    if (cur.length > 3) { cur = []; scope = false; }
    i += 1;
  }
  flush();

  // 2) Ogni voce è un gruppo oppure un cibo.
  const groups = new Set();
  const terms = [];
  const labels = [];
  for (const term of found) {
    const group = GROUP_KEYS[matchWords(term).join(" ")];
    if (group) {
      if (!groups.has(group)) { groups.add(group); labels.push(group); }
    } else if (!terms.includes(term)) {
      terms.push(term);
      if (knownFood(term)) labels.push(term);
    }
  }
  // 3) Le diete, ovunque compaiano nel testo.
  for (const [re, list] of DIETS) {
    if (!re.test(raw)) continue;
    for (const g of list) if (!groups.has(g)) { groups.add(g); labels.push(g); }
  }
  return { terms, groups, labels };
}

// La ricetta contiene qualcosa di escluso? Si guardano gli ingredienti (tutti,
// anche quelli "q.b.") e il titolo, col confronto usato per "ce l'hai".
export function violatesPrefs(recipe, rules) {
  if (!rules.terms.length && !rules.groups.size) return false;
  const ings = (recipe.ingredients || []).filter((ing) => ing?.name).map((ing) => ({ name: ing.name }));
  const title = [{ name: recipe.title || "" }];
  for (const term of rules.terms) {
    if (findMatch(term, ings) || findMatch(term, title)) return true;
  }
  if (!rules.groups.size) return false;
  // Il tipo della ricetta basta per carne e pesce ("Lasagne al ragù" è un primo, ma "Bistecca" è carne).
  if (rules.groups.has("carne") && recipe.tipo === "carne") return true;
  if (rules.groups.has("pesce") && recipe.tipo === "pesce") return true;
  for (const { name } of ings) {
    const n = name.toLowerCase();
    const words = matchWords(name);
    const cat = guessCategory(name);
    for (const g of rules.groups) if (IN_GROUP[g]?.(n, words, cat)) return true;
  }
  return false;
}

// Filtro pronto all'uso: (ricetta) → true se rispetta le esigenze scritte.
export function allowedBy(text) {
  const rules = parsePrefs(text);
  return (recipe) => !violatesPrefs(recipe, rules);
}
