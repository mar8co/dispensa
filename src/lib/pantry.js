// Helper puri per la dispensa: id, categorizzazione, correzione nomi,
// normalizzazione/merge/scaling delle quantità (unità metriche g/kg/ml),
// e matching ingrediente<->prodotto. Logica identica a dispensa-ui.jsx.

import { CATEGORIES, SEED_DATA } from "../constants.js";

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function seed() {
  return SEED_DATA.map(([name, qty, category]) => ({ id: uid(), name, qty, category }));
}

const CATEGORY_KEYWORDS = {
  "Verdura": ["pomodoro", "pomodori", "pomodorini", "insalata", "lattuga", "zucchine", "zucchina", "melanzane", "melanzana", "peperoni", "peperone", "carote", "carota", "cipolla", "cipolle", "aglio", "patate", "patata", "verdura", "verdure", "zucca", "finocchi", "sedano", "funghi", "avocado", "broccoli", "spinaci", "cavolfiore", "cavolo", "verza", "porri", "asparagi", "rucola", "radicchio", "bietole", "fagiolini", "cetrioli", "cetriolo", "ravanelli", "scalogno", "carciofi", "carciofo", "songino", "cime di rapa", "catalogna", "puntarelle"],
  "Frutta": ["limone", "limoni", "arancia", "arance", "mela", "mele", "banana", "banane", "frutta fresca", "fragole", "pere", "pera", "pesche", "pesca", "kiwi", "uva", "anguria", "cocomero", "melone", "ananas", "mandarini", "mandaranci", "clementine", "albicocche", "albicocca", "ciliegie", "ciliegia", "prugne", "prugna", "fichi", "mirtilli", "mirtillo", "lamponi", "lampone", "pompelmo", "frutti di bosco", "cachi", "melograno"],
  "Carne": ["pollo", "manzo", "maiale", "tacchino", "vitello", "salsicc", "macinato", "bistecca", "bovino", "agnello", "carne", "fettine", "hamburger", "burger di", "polpett", "cotolett", "spezzatino", "arrosto", "coscia", "sovracosc", "petto", "lonza", "tagliata", "costine", "scaloppine", "braciole", "ossobuco", "fegato", "spiedini"],
  "Salumi": ["prosciutto", "salame", "salami", "mortadella", "speck", "bresaola", "pancetta", "wurstel", "wurst", "coppa", "porchetta", "salumi", "affettati", "guanciale", "lardo", "culatello", "lonzino"],
  "Pesce": ["pesce", "salmone", "merluzzo", "gamber", "calamar", "vongole", "cozze", "branzino", "orata", "baccala", "spigola", "seppi", "polpo", "sgombro", "tonno fresco", "trota", "sogliola", "platessa", "nasello", "spada", "alici fresche", "scampi", "totani", "tilapia", "pangasio", "frutti di mare", "filetto di pesce", "surimi", "granchio"],
  "Latticini": ["latte", "formaggio", "parmigiano", "pecorino", "mozzarella", "yogurt", "burro", "panna", "ricotta", "mascarpone", "grana", "gorgonzola", "stracchino", "philadelphia", "scamorza", "provola", "fontina", "crescenza", "kefir", "burrata", "caciotta", "caciocavallo", "emmental", "asiago", "taleggio", "robiola", "squacquerone"],
  "Pane e Forno": ["pane", "piadina", "piadine", "cracker", "grissini", "pancarre", "pancarrè", "focaccia", "taralli", "panini", "baguette", "tortillas", "pita", "friselle", "pan bauletto"],
  "Pasta, Riso e Cereali": ["pasta", "spaghetti", "spaghettoni", "spaghettini", "penne", "pennette", "fusilli", "rigatoni", "tortiglioni", "farfalle", "conchiglie", "conchiglioni", "orecchiette", "linguine", "bavette", "tagliatelle", "tagliolini", "pappardelle", "fettuccine", "lasagne", "lasagna", "cannelloni", "paccheri", "mezze maniche", "ditalini", "ditaloni", "sedanini", "bucatini", "vermicelli", "capellini", "maccheroni", "gnocchetti", "trofie", "casarecce", "caserecce", "gemelli", "mafalde", "reginette", "anellini", "stelline", "risoni", "pastina", "tortellini", "tortelloni", "ravioli", "agnolotti", "cappelletti", "strozzapreti", "pici", "fregola", "riso", "risotto", "basmati", "carnaroli", "arborio", "cous", "couscous", "farina", "avena", "cereali", "cornflakes", "corn flakes", "orzo", "farro", "polenta", "gnocchi", "pangrattato", "pan grattato", "grano", "quinoa", "bulgur", "semola", "lievito"],
  "Legumi": ["fagioli", "cannellini", "borlotti", "ceci", "lenticchie", "piselli secchi", "legumi", "fave", "lupini", "soia", "edamame", "cicerchie"],
  "Conserve": ["tonno", "pelati", "passata", "passata di pomodoro", "pomodori pelati", "in scatola", "barattolo", "acciughe", "sardine", "olive", "conserva", "mais in scatola", "sottoli", "sottaceti", "capperi", "concentrato di pomodoro", "polpa di pomodoro", "carciofini", "pesto in barattolo"],
  "Condimenti e Salse": ["olio", "aceto", "salsa", "soia", "maionese", "ketchup", "senape", "pesto", "sugo", "condimento", "tahina", "brodo", "dado", "besciamella", "tabasco", "worcester"],
  "Spezie ed Erbe": ["sale", "pepe", "paprika", "curcuma", "cumino", "origano", "basilico", "rosmarino", "timo", "prezzemolo", "cannella", "zenzero", "peperoncino", "noce moscata", "spezie", "aglio in polvere", "curry", "zafferano", "alloro", "salvia", "erba cipollina", "menta", "vaniglia", "cardamomo"],
  "Frutta Secca": ["mandorle", "noci", "nocciole", "pistacchi", "pinoli", "anacardi", "arachidi", "uvetta", "datteri", "semi di", "noccioline", "frutta secca"],
  "Dolci": ["biscotti", "cioccolato", "cioccolata", "merendine", "marmellata", "miele", "zucchero", "torta", "crostata", "ciambellone", "plumcake", "panettone", "pandoro", "colomba", "torrone", "meringhe", "caramelle", "crema spalmabile", "nutella", "muesli", "fette biscottate", "brioche", "croissant", "wafer", "budino", "gelatina", "cacao", "savoiardi", "pan di spagna", "granella"],
  "Surgelati": ["surgelat", "congelat", "gelato", "bastoncini", "sofficini", "ghiaccioli", "in freezer"],
  "Bevande": ["acqua", "caffe", "caffè", "succo", "vino", "birra", "bibita", "cola", "aranciata", "tisana", "spremuta", "camomilla", "tè", "the verde", "energy drink", "tonica", "prosecco", "spumante"],
};

export function guessCategory(name) {
  const n = String(name).toLowerCase();
  if (!n.trim()) return null;
  // Il freezer vince su tutto: "gelato al pistacchio" è un surgelato,
  // non frutta secca; "spinaci surgelati" idem.
  for (const w of CATEGORY_KEYWORDS["Surgelati"]) {
    if (n.includes(w)) return "Surgelati";
  }
  let best = null, bestLen = 0;
  for (const cat in CATEGORY_KEYWORDS) {
    for (const w of CATEGORY_KEYWORDS[cat]) {
      if (w.length > bestLen && n.includes(w)) { best = cat; bestLen = w.length; }
    }
  }
  return best;
}

// Categoria finale di un alimento: il dizionario locale (deterministico,
// curato, senza quota AI) ha la PRECEDENZA quando riconosce il prodotto;
// così varianti note — es. i formati di pasta — finiscono sempre nella
// categoria giusta a prescindere da cosa propone l'AI. Se il dizionario non
// sa nulla, si usa la categoria suggerita dall'AI (solo se valida), altrimenti
// "Altro". Usata nei flussi di import (scontrino/voce/barcode) prima della
// revisione, così l'utente vede già la categoria corretta e può comunque
// modificarla.
export function categorize(name, aiCategory) {
  const guess = guessCategory(name);
  if (guess) return guess;
  return CATEGORIES.includes(aiCategory) ? aiCategory : "Altro";
}

const FOOD_DICTIONARY = ["pasta", "spaghetti", "penne", "pennette", "fusilli", "rigatoni", "tortiglioni", "farfalle", "conchiglie", "orecchiette", "linguine", "tagliatelle", "pappardelle", "fettuccine", "lasagne", "paccheri", "bucatini", "tortellini", "tortelloni", "ravioli", "riso", "risotto", "farina", "pane", "piadina", "gnocchi", "couscous", "orzo", "farro", "avena", "cracker", "grissini", "fagioli", "ceci", "lenticchie", "piselli", "tonno", "sgombro", "acciughe", "sardine", "passata", "mais", "olive", "mandorle", "noci", "nocciole", "pistacchi", "pinoli", "anacardi", "arachidi", "uvetta", "datteri", "olio", "aceto", "sale", "zucchero", "maionese", "ketchup", "senape", "pesto", "latte", "formaggio", "parmigiano", "pecorino", "mozzarella", "yogurt", "burro", "panna", "ricotta", "mascarpone", "gorgonzola", "stracchino", "pomodori", "pomodorini", "insalata", "lattuga", "zucchine", "melanzane", "peperoni", "carote", "cipolla", "aglio", "patate", "limone", "arancia", "mela", "banana", "zucca", "finocchi", "sedano", "funghi", "avocado", "broccoli", "spinaci", "cavolfiore", "fragole", "pere", "pesche", "pollo", "manzo", "maiale", "tacchino", "vitello", "salsicce", "salsiccia", "macinato", "bistecca", "prosciutto", "salame", "wurstel", "bresaola", "pancetta", "polpette", "cotolette", "mortadella", "speck", "salmone", "merluzzo", "gamberi", "gamberetti", "calamari", "vongole", "cozze", "branzino", "orata", "baccala", "spigola", "seppie", "polpo", "trota", "sogliola", "platessa", "nasello", "alici", "scampi", "paprika", "curcuma", "cumino", "origano", "basilico", "rosmarino", "timo", "prezzemolo", "cannella", "zenzero", "peperoncino", "zafferano", "alloro", "salvia", "pepe", "curry", "acqua", "caffè", "succo", "vino", "birra", "aranciata", "tisana", "camomilla", "uova", "uovo", "biscotti", "cioccolato", "marmellata", "miele", "cereali", "muesli"];

function lev(a, b) {
  const m = a.length, n = b.length;
  const d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  return d[m][n];
}

export function correctName(raw) {
  const words = raw.trim().toLowerCase().split(/\s+/);
  const fixed = words.map((w) => {
    if (w.length < 3) return w;
    let best = null, bestD = Infinity;
    for (const cand of FOOD_DICTIONARY) {
      const d = lev(w, cand);
      if (d < bestD) { bestD = d; best = cand; }
    }
    const thresh = w.length >= 6 ? 2 : 1;
    if (best && bestD > 0 && bestD <= thresh) return best;
    return w;
  });
  const joined = fixed.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

// --- Quantità: parsing e normalizzazione delle unità ---
// Famiglie: peso (g/hg/kg…), volume (ml/cl/dl/l), conteggio (pezzi, pacchi,
// confezioni, barattoli…) e "altro" (unità libere non riconosciute).
// Pesi e volumi vengono convertiti in g/ml, così "1 kg" − "300 g" funziona;
// i sinonimi di conteggio si sommano/sottraggono tra loro.
const WEIGHT_UNITS = { g: 1, gr: 1, grammo: 1, grammi: 1, hg: 100, etto: 100, etti: 100, kg: 1000 };
const VOLUME_UNITS = { ml: 1, cl: 10, dl: 100, l: 1000, lt: 1000, litro: 1000, litri: 1000 };
const COUNT_PAIRS = [
  ["pezzo", "pezzi"], ["pacco", "pacchi"], ["confezione", "confezioni"],
  ["scatola", "scatole"], ["scatoletta", "scatolette"], ["barattolo", "barattoli"],
  ["bottiglia", "bottiglie"], ["lattina", "lattine"], ["vasetto", "vasetti"],
  ["sacchetto", "sacchetti"], ["busta", "buste"], ["panetto", "panetti"],
  ["tavoletta", "tavolette"], ["rotolo", "rotoli"], ["mazzo", "mazzi"],
];
const COUNT_UNITS = new Set(["", "pz", "conf", ...COUNT_PAIRS.flat()]);

export function parseQty(s) {
  const str = String(s ?? "").trim();
  const m = str.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  const unit = str.replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
  if (unit in WEIGHT_UNITS) return { family: "weight", base: n * WEIGHT_UNITS[unit], unit };
  if (unit in VOLUME_UNITS) return { family: "volume", base: n * VOLUME_UNITS[unit], unit };
  if (COUNT_UNITS.has(unit)) return { family: "count", base: n, unit };
  return { family: "other", base: n, unit };
}

function fmtNum(n) {
  const r = Math.round(n * 100) / 100;
  return String(r).replace(".", ",");
}
export function fmtWeight(g) {
  return g >= 1000 ? `${fmtNum(g / 1000)} kg` : `${fmtNum(g)} g`;
}
export function fmtVolume(ml) {
  return ml >= 1000 ? `${fmtNum(ml / 1000)} l` : `${fmtNum(ml)} ml`;
}
// Parola di conteggio nel numero giusto ("1 pacco" / "3 pacchi").
function countWord(unit, n) {
  for (const [sing, plur] of COUNT_PAIRS) {
    if (unit === sing || unit === plur) return n === 1 ? sing : plur;
  }
  return unit; // pz, conf e parole ignote restano invariate
}
function fmtCount(n, unit) {
  const u = countWord(unit, n);
  return `${fmtNum(n)}${u ? " " + u : ""}`;
}

// "1500 g" -> "1,5 kg", "1000 ml" -> "1 l"; il resto resta com'è.
export function normalizeWeight(qty) {
  const p = parseQty(qty);
  if (p?.family === "weight" && p.base >= 1000) return fmtWeight(p.base);
  if (p?.family === "volume" && p.base >= 1000) return fmtVolume(p.base);
  return qty;
}

export function mergeQty(a, b) {
  const pa = parseQty(a), pb = parseQty(b);
  if (pa && pb && pa.family === pb.family) {
    const sum = pa.base + pb.base;
    if (pa.family === "weight") return fmtWeight(sum);
    if (pa.family === "volume") return fmtVolume(sum);
    if (pa.family === "count") return fmtCount(sum, pa.unit || pb.unit);
    if (pa.unit === pb.unit) return `${fmtNum(sum)}${pa.unit ? " " + pa.unit : ""}`;
  }
  return `${String(a)} + ${String(b)}`;
}

export function scaleQty(qty, factor) {
  if (!factor || factor === 1) return qty;
  return String(qty).replace(/\d+(?:[.,]\d+)?/g, (m) => {
    const n = parseFloat(m.replace(",", ".")) * factor;
    const out = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
    return String(out).replace(".", ",");
  });
}

export function subtractQty(stock, used) {
  const ps = parseQty(stock), pu = parseQty(used);
  if (ps && pu) {
    // Stessa famiglia (peso−peso anche tra g e kg, conteggio−conteggio anche
    // tra sinonimi), oppure ricetta senza unità su prodotto contato
    // ("2 uova" − "2"). Pacchi−grammi resta irrisolvibile qui: ci pensa l'AI.
    const compatible =
      ps.family === pu.family || (pu.unit === "" && ps.family === "count");
    if (compatible) {
      const left = Math.max(0, ps.base - pu.base);
      if (ps.family === "weight") return { ok: true, value: fmtWeight(left) };
      if (ps.family === "volume") return { ok: true, value: fmtVolume(left) };
      if (ps.family === "count") return { ok: true, value: fmtCount(left, ps.unit) };
      if (ps.unit === pu.unit) {
        return { ok: true, value: `${fmtNum(left)}${ps.unit ? " " + ps.unit : ""}` };
      }
    }
  }
  return { ok: false, value: stock };
}

export function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-zàèéìòù0-9 ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Passo dello stepper in base all'unità: pezzi ±1, grammi ±50,
// kg e litri ±0,25 (ml ±250). Scelte dell'utente.
export function qtyStep(qty) {
  const unit = String(qty).replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
  if (unit in WEIGHT_UNITS) return WEIGHT_UNITS[unit] >= 1000 ? 0.25 : 50;
  if (unit in VOLUME_UNITS) return VOLUME_UNITS[unit] >= 1000 ? 0.25 : 250;
  return 1;
}

// Passo per i pezzi/confezioni (famiglia "count"): interi sopra l'unità, ma
// sotto si può avere il MEZZO pezzo (½) — utile per "mezza cipolla". Sequenza
// scendendo: … 3, 2, 1, 0,5, 0 (finito). Salendo si torna a interi: 0,5 → 1 → 2.
function adjustCount(n, delta) {
  if (delta > 0) return n < 1 ? 1 : Math.floor(n) + 1; // 0/0,5 -> 1, 1 -> 2, 1,5 -> 2
  if (n > 1) return Math.ceil(n) - 1;                  // 3 -> 2, 2 -> 1, 1,5 -> 1
  if (n > 0.5) return 0.5;                             // 1 -> 0,5
  return 0;                                            // 0,5 -> 0 (finito)
}

// Incrementa/decrementa il primo numero in una quantità mantenendo l'unità.
// Pesi/volumi: passo da qtyStep, agganciato ai multipli (es. "0,3 kg" +1 -> "0,5 kg").
// Pezzi/confezioni: passo intero con il mezzo (½) come quantità minima (vedi
// adjustCount). delta = ±1 passi. Senza numero (es. "poca quantità") invariato.
export function adjustQty(qty, delta) {
  const s = String(qty);
  const m = s.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return qty;
  const cur = parseFloat(m[0].replace(",", "."));
  const p = parseQty(qty);
  let next;
  if (p && p.family === "count") {
    next = adjustCount(cur, delta);
  } else {
    const step = qtyStep(qty);
    next = cur + delta * step;
    next = Math.round(next / step) * step;
    if (next < 0) next = 0;
    next = Math.round(next * 1000) / 1000;
  }
  return s.replace(m[0], String(next).replace(".", ","));
}

// True se un ulteriore "−" porterebbe a zero o sotto: dove c'è il floor (spesa,
// revisione) il "−" si ferma quindi al minimo — 0,5 pz, 50 g, 0,25 kg/l.
export function atMinQty(qty) {
  const next = adjustQty(qty, -1);
  const m = String(next).replace(",", ".").match(/-?\d+(\.\d+)?/);
  return !m || parseFloat(m[0]) <= 0;
}

// Resa per la UI del mezzo pezzo: mostra il glifo ½ al posto di "0,5".
// SOLO display — il valore salvato resta "0,5" (così la matematica regge) — e
// SOLO per pezzi/confezioni (famiglia count), non per pesi/volumi (es. "0,5 kg").
export function formatQtyDisplay(qty) {
  const p = parseQty(qty);
  if (p && p.family === "count" && p.base === 0.5) {
    return String(qty).replace("0,5", "½").replace("0.5", "½");
  }
  return String(qty);
}

// --- Scadenze (date in formato "YYYY-MM-DD") ---

export function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

// Stato: null (nessuna data) | "scaduto" | "oggi" | "presto" (<=3gg) |
// "settimana" (<=7gg) | "ok".
export function expiryStatus(dateStr) {
  const days = daysUntilExpiry(dateStr);
  if (days === null) return null;
  if (days < 0) return "scaduto";
  if (days === 0) return "oggi";
  if (days <= 3) return "presto";
  if (days <= 7) return "settimana";
  return "ok";
}

// Etichetta breve per il badge (es. "Scaduto", "Scade oggi", "Tra 2 gg", "12/06").
export function formatExpiry(dateStr) {
  const days = daysUntilExpiry(dateStr);
  if (days === null) return "";
  if (days < 0) return `Scaduto`;
  if (days === 0) return "Scade oggi";
  if (days === 1) return "Scade domani";
  if (days <= 7) return `Tra ${days} gg`;
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

export function findMatch(ingName, items) {
  const a = norm(ingName);
  if (!a) return null;
  const aw = a.split(" ").filter((w) => w.length >= 4);
  let weak = null;
  for (const it of items) {
    const b = norm(it.name);
    if (!b) continue;
    if (a === b || a.includes(b) || b.includes(a)) return it;
    const bw = b.split(" ").filter((w) => w.length >= 4);
    if (aw.some((w) => bw.includes(w))) weak = weak || it;
  }
  return weak;
}
