// Riconoscimento LOCALE (senza AI) di ciò che arriva "sporco":
//  - i nomi commerciali letti da un codice a barre (Open Food Facts);
//  - una frase dettata a voce ("due pacchi di pasta, il latte e sei uova").
// Regole + catalogo dei prodotti comuni: istantaneo, funziona offline e non
// consuma richieste. Quando non basta lo dice (`resolved: false` / `unknown`),
// e il chiamante ripiega sull'AI solo per quello che è rimasto fuori.
import { CATALOG_NAMES } from "../constants.js";
import { matchKey, guessCategory, correctName } from "./pantry.js";

// Chiave di confronto tollerante: singolare/plurale uniti (matchKey) e senza
// accenti, così "caffe" trova "Caffè".
const fold = (s) => matchKey(s).normalize("NFD").replace(/\p{Diacritic}/gu, "");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Alimenti comuni che il dizionario delle categorie non conosce (finiscono in
// "Altro"), ma che sono comunque nomi validi.
const EXTRA_FOODS = new Set(["uovo", "tofu", "seitan", "tempeh", "hummus"].map(fold));

const CATALOG = CATALOG_NAMES.map((name) => ({ name, key: fold(name) }));

// Il prodotto del catalogo con cui INIZIA il testo (il più lungo): in italiano
// il nome viene prima delle specifiche ("yogurt greco bianco 0%"). Un match più
// avanti nella frase non vale: "crema di nocciole" non è "Nocciole".
export function catalogAtStart(text) {
  const t = `${fold(text)} `;
  let best = null;
  for (const c of CATALOG) {
    if (t.startsWith(`${c.key} `) && (!best || c.key.length > best.key.length)) best = c;
  }
  return best ? best.name : null;
}

// True se il nome è un alimento che sappiamo riconoscere da soli.
function known(name) {
  return !!catalogAtStart(name) || !!guessCategory(name) || EXTRA_FOODS.has(fold(name));
}

// ---------- Codice a barre ----------

// Parole di formato/confezione e promozionali che non fanno parte del nome.
const NOISE = new Set([
  "pet", "lattina", "lattine", "bottiglia", "bottiglie", "conf", "confezione", "confezioni",
  "multipack", "vaschetta", "busta", "brick", "tetrapak", "pz", "pezzi", "x", "bio", "biologico",
  "biologica", "offerta", "promo", "formato", "famiglia", "maxi", "mini", "new", "nuovo", "nuova",
]);

// Nome commerciale → { name, category, resolved }. Toglie marca, pesi e
// formati; se ciò che resta comincia con un prodotto del catalogo usa quello,
// altrimenti tiene il nome ripulito quando il dizionario ne conosce la
// categoria. `resolved: false` = non ne siamo sicuri (decida l'AI o l'utente).
export function cleanBarcodeName(raw, brands = "") {
  let s = ` ${String(raw || "").toLowerCase()} `;
  // pesi/volumi/percentuali/moltiplicatori: "500 g", "1,5l", "0%", "6x"
  s = s.replace(/\d+(?:[.,]\d+)?\s*(?:kg|gr|g|ml|cl|dl|lt|l|%|x|pz)(?=[^a-zà-ù]|$)/gi, " ");
  s = s.replace(/[^a-zà-ù' ]/gi, " ");
  for (const b of String(brands || "").toLowerCase().split(",")) {
    const brand = b.replace(/[^a-zà-ù' ]/gi, " ").replace(/\s+/g, " ").trim();
    if (brand) s = s.split(` ${brand} `).join(" ");
  }
  const words = s.split(/\s+/).filter((w) => w && !NOISE.has(w));
  const cleaned = words.join(" ").trim();
  if (!cleaned) return { name: "", category: null, resolved: false };
  const hit = catalogAtStart(cleaned);
  if (hit) {
    const name = correctName(hit); // le marche-sinonimo ("Macine") diventano il generico
    return { name, category: guessCategory(name) || null, resolved: true };
  }
  const category = guessCategory(cleaned);
  return { name: cap(cleaned), category: category || null, resolved: !!category };
}

// ---------- Voce ----------

const NUMBERS = {
  un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8,
  nove: 9, dieci: 10, undici: 11, dodici: 12, mezzo: 0.5, mezza: 0.5,
};
// Unità dette a voce → [unità dell'app, moltiplicatore]. `null` = confezione
// (pacco, bottiglia…): conta i pezzi, la parola non entra nella quantità.
const UNITS = {
  g: ["g", 1], gr: ["g", 1], grammo: ["g", 1], grammi: ["g", 1],
  etto: ["g", 100], etti: ["g", 100],
  kg: ["kg", 1], chilo: ["kg", 1], chili: ["kg", 1], kilo: ["kg", 1], chilogrammo: ["kg", 1], chilogrammi: ["kg", 1],
  ml: ["ml", 1], millilitri: ["ml", 1],
  l: ["l", 1], litro: ["l", 1], litri: ["l", 1],
};
const PACKS = new Set([
  "pacco", "pacchi", "pacchetto", "pacchetti", "confezione", "confezioni", "bottiglia", "bottiglie",
  "lattina", "lattine", "barattolo", "barattoli", "scatola", "scatole", "scatoletta", "scatolette",
  "vasetto", "vasetti", "busta", "buste", "vaschetta", "vaschette", "cartone", "cartoni", "pezzo", "pezzi",
]);
const FILLERS = new Set([
  "anche", "il", "lo", "la", "i", "gli", "le", "l", "del", "dello", "della", "dei", "degli", "delle",
  "dell", "di", "d", "po", "pò", "qualche", "ancora", "mi", "serve", "servono", "manca", "mancano",
  "compra", "comprare", "prendi", "prendere", "aggiungi", "ho", "preso", "comprato", "abbiamo",
]);

const fmt = (n) => String(Math.round(n * 100) / 100).replace(".", ",");

// Un pezzo della frase ("due pacchi di pasta") → { name, qty } oppure null.
function parseFragment(frag) {
  let words = frag.replace(/'/g, " ").split(/\s+/).filter(Boolean);
  while (words.length && FILLERS.has(words[0])) words.shift();
  let n = null;
  if (words.length) {
    const w = words[0];
    if (w in NUMBERS) { n = NUMBERS[w]; words.shift(); }
    else if (/^\d+(?:[.,]\d+)?$/.test(w)) { n = parseFloat(w.replace(",", ".")); words.shift(); }
  }
  let unit = null;
  if (words.length && (words[0] in UNITS || PACKS.has(words[0]))) {
    unit = words[0] in UNITS ? UNITS[words[0]] : null;
    words.shift();
    if (n === null) n = 1; // "mezzo chilo" ha già il numero; "chilo di…" vale 1
  }
  // "un chilo e mezzo di patate": il mezzo arriva dopo l'unità
  if (words[0] === "§mezzo") { n = (n ?? 1) + 0.5; words.shift(); }
  while (words.length && FILLERS.has(words[0])) words.shift();
  const name = words.filter((w) => w !== "§mezzo").join(" ").trim();
  if (!name) return null;
  let qty = "1";
  if (unit) {
    let [u, mult] = unit;
    let v = (n ?? 1) * mult;
    if (u === "kg" && v < 1) { u = "g"; v *= 1000; }   // "mezzo chilo" → 500 g
    if (u === "l" && v < 1) { u = "ml"; v *= 1000; }   // "mezzo litro" → 500 ml
    qty = `${fmt(v)} ${u}`;
  } else if (n !== null) {
    qty = fmt(n);
  }
  return { name, qty };
}

// Chi detta spesso NON fa pause: il telefono restituisce "una pera due
// zucchine quattro pesce", senza virgole. Un NUMERO in mezzo alla frase apre
// un prodotto nuovo ("…pera | due zucchine | quattro pesce"). Non vale per i
// numeri che fanno parte del nome ("farina 00", "spaghetti numero 5").
const isNumber = (w) => w in NUMBERS || /^\d+(?:[.,]\d+)?$/.test(w);
function splitAtNumbers(frag) {
  const words = frag.replace(/'/g, " ").split(/\s+/).filter(Boolean);
  const pieces = [];
  let cur = [];
  let hasName = false; // nel pezzo corrente c'è già una parola che fa da nome
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const inName = w === "00" || w === "0" || prev === "numero" || prev === "n" || prev === "tipo";
    if (isNumber(w) && !inName && hasName) {
      pieces.push(cur.join(" "));
      cur = [];
      hasName = false;
    }
    cur.push(w);
    if (!isNumber(w) && !(w in UNITS) && !PACKS.has(w) && !FILLERS.has(w) && w !== "§mezzo") hasName = true;
  });
  if (cur.length) pieces.push(cur.join(" "));
  return pieces;
}

// Stessa cosa senza numeri: "pane latte uova". Se il nome comincia con un
// prodotto del catalogo e ciò che segue è A SUA VOLTA un prodotto del
// catalogo, sono due prodotti. "Tonno fresco" o "latte di mandorla" restano
// interi (ciò che segue non è un prodotto, o comincia con "di").
function splitAtCatalog(name) {
  const out = [];
  let words = name.split(/\s+/).filter(Boolean);
  while (words.length > 1) {
    const hit = catalogAtStart(words.join(" "));
    if (!hit) break;
    const n = hit.split(/\s+/).length;
    const rest = words.slice(n);
    if (!rest.length || FILLERS.has(rest[0]) || !(catalogAtStart(rest.join(" ")) || EXTRA_FOODS.has(fold(rest[0])))) break;
    out.push(words.slice(0, n).join(" "));
    words = rest;
  }
  out.push(words.join(" "));
  return out;
}

// Frase dettata → { items: [{ name, qty, category }], unknown }. `unknown` è
// il numero di voci che non abbiamo riconosciuto come alimenti noti (restano
// comunque in `items`, in "Altro"): se è > 0 conviene chiedere all'AI.
export function parseSpokenList(transcript) {
  const text = String(transcript || "")
    .toLowerCase()
    .replace(/\be mezz[oa]\b/g, " §mezzo ")
    .replace(/[.;:!?]/g, ",");
  const fragments = text.split(/\s*(?:,|\be\b|\bpoi\b|\bpiù\b|\boppure\b)\s*/).flatMap(splitAtNumbers);
  const items = [];
  let unknown = 0;
  for (const frag of fragments) {
    const parsed = parseFragment(frag.trim());
    if (!parsed) continue;
    // La quantità detta vale per il primo; gli altri prodotti trovati nello
    // stesso pezzo ("pane latte uova") contano uno.
    splitAtCatalog(parsed.name).forEach((said, k) => {
      const hit = catalogAtStart(said);
      // Catalogo: si usa il suo nome solo se copre TUTTO il detto ("pasta
      // integrale"), altrimenti si tiene quello dell'utente, corretto.
      // Una parola che il dizionario conosce già NON si "corregge": prima
      // "pesce" diventava "Pesche".
      const name = hit && fold(hit) === fold(said) ? hit : guessCategory(said) ? cap(said) : correctName(said);
      if (!known(name)) unknown += 1;
      items.push({ name, qty: k === 0 ? parsed.qty : "1", category: guessCategory(name) || "Altro" });
    });
  }
  return { items, unknown };
}
