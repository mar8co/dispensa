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
  "Pasta e Cereali": ["pasta", "spaghetti", "penne", "fusilli", "riso", "cous", "couscous", "farina", "avena", "cereali", "orzo", "farro", "pane", "piadina", "cracker", "polenta", "gnocchi", "pangrattato", "pan grattato", "grano"],
  "Legumi e Conserve": ["fagioli", "ceci", "lenticchie", "tonno", "pelati", "passata", "in scatola", "barattolo", "legumi", "acciughe", "sardine", "olive", "conserva", "mais in scatola"],
  "Frutta Secca": ["mandorle", "noci", "nocciole", "pistacchi", "pinoli", "anacardi", "arachidi", "uvetta", "datteri"],
  "Condimenti e Oli": ["olio", "aceto", "salsa", "soia", "maionese", "ketchup", "senape", "pesto", "sugo", "condimento", "tahina", "brodo"],
  "Latticini e Formaggi": ["latte", "formaggio", "parmigiano", "pecorino", "mozzarella", "yogurt", "burro", "panna", "ricotta", "mascarpone", "grana", "gorgonzola", "stracchino", "philadelphia"],
  "Fresco e Verdure": ["pomodoro", "pomodorini", "insalata", "lattuga", "zucchine", "melanzane", "peperoni", "carote", "cipolla", "aglio", "patate", "limone", "arancia", "mela", "banana", "frutta", "verdura", "zucca", "finocchi", "sedano", "funghi", "avocado", "broccoli", "spinaci"],
  "Carne": ["pollo", "manzo", "maiale", "tacchino", "vitello", "salsicc", "macinato", "bistecca", "prosciutto", "salam", "wurst", "bovino", "agnello", "carne", "fettine", "hamburger", "burger", "speck", "bresaola", "pancetta", "polpett", "cotolett", "spezzatino", "arrosto", "coscia", "sovracosc", "petto", "lonza", "tagliata", "porchetta", "mortadella", "coppa"],
  "Pesce": ["pesce", "salmone", "merluzzo", "gamber", "calamar", "vongole", "cozze", "branzino", "orata", "baccala", "spigola", "seppi", "polpo", "sgombro", "tonno fresco", "trota", "sogliola", "platessa", "nasello", "spada", "alici", "scampi", "totani", "tilapia", "pangasio", "frutti di mare", "filetto di pesce", "bastoncini di pesce"],
  "Congelato": ["surgelat", "congelat", "gelato", "minestrone", "bastoncini"],
  "Spezie ed Erbe": ["sale", "pepe", "paprika", "curcuma", "cumino", "origano", "basilico", "rosmarino", "timo", "prezzemolo", "cannella", "zenzero", "peperoncino", "noce moscata", "spezie", "aglio in polvere", "curry", "zafferano", "alloro", "salvia"],
  "Bevande": ["acqua", "caffe", "caffè", "succo", "vino", "birra", "bibita", "cola", "aranciata", "tisana", "spremuta", "camomilla"],
};

export function guessCategory(name) {
  const n = String(name).toLowerCase();
  if (!n.trim()) return null;
  let best = null, bestLen = 0;
  for (const cat in CATEGORY_KEYWORDS) {
    for (const w of CATEGORY_KEYWORDS[cat]) {
      if (w.length > bestLen && n.includes(w)) { best = cat; bestLen = w.length; }
    }
  }
  return best;
}

const FOOD_DICTIONARY = ["pasta", "spaghetti", "penne", "fusilli", "rigatoni", "riso", "farina", "pane", "piadina", "gnocchi", "couscous", "orzo", "farro", "avena", "cracker", "grissini", "fagioli", "ceci", "lenticchie", "piselli", "tonno", "sgombro", "acciughe", "sardine", "passata", "mais", "olive", "mandorle", "noci", "nocciole", "pistacchi", "pinoli", "anacardi", "arachidi", "uvetta", "datteri", "olio", "aceto", "sale", "zucchero", "maionese", "ketchup", "senape", "pesto", "latte", "formaggio", "parmigiano", "pecorino", "mozzarella", "yogurt", "burro", "panna", "ricotta", "mascarpone", "gorgonzola", "stracchino", "pomodori", "pomodorini", "insalata", "lattuga", "zucchine", "melanzane", "peperoni", "carote", "cipolla", "aglio", "patate", "limone", "arancia", "mela", "banana", "zucca", "finocchi", "sedano", "funghi", "avocado", "broccoli", "spinaci", "cavolfiore", "fragole", "pere", "pesche", "pollo", "manzo", "maiale", "tacchino", "vitello", "salsicce", "salsiccia", "macinato", "bistecca", "prosciutto", "salame", "wurstel", "bresaola", "pancetta", "polpette", "cotolette", "mortadella", "speck", "salmone", "merluzzo", "gamberi", "gamberetti", "calamari", "vongole", "cozze", "branzino", "orata", "baccala", "spigola", "seppie", "polpo", "trota", "sogliola", "platessa", "nasello", "alici", "scampi", "paprika", "curcuma", "cumino", "origano", "basilico", "rosmarino", "timo", "prezzemolo", "cannella", "zenzero", "peperoncino", "zafferano", "alloro", "salvia", "pepe", "curry", "acqua", "caffè", "succo", "vino", "birra", "aranciata", "tisana", "camomilla", "uova", "uovo", "biscotti", "cioccolato", "marmellata", "miele", "cereali", "muesli"];

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

function formatKg(kg) {
  const r = Math.round(kg * 100) / 100;
  return String(r).replace(".", ",") + " kg";
}

export function normalizeWeight(qty) {
  const m = String(qty).trim().match(/^(\d+(?:[.,]\d+)?)\s*(gr|g|grammi)$/i);
  if (m) {
    const g = parseFloat(m[1].replace(",", "."));
    if (g >= 1000) return formatKg(g / 1000);
  }
  return qty;
}

export function mergeQty(a, b) {
  const sa = String(a), sb = String(b);
  const ma = sa.replace(",", ".").match(/-?\d+(\.\d+)?/);
  const mb = sb.replace(",", ".").match(/-?\d+(\.\d+)?/);
  const unitA = sa.replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
  const unitB = sb.replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
  if (ma && mb && unitA === unitB) {
    const sum = parseFloat(ma[0]) + parseFloat(mb[0]);
    const sumStr = Number.isInteger(sum) ? String(sum) : String(sum).replace(".", ",");
    const unit = sa.replace(/-?\d+([.,]\d+)?/, "").trim();
    return `${sumStr}${unit ? " " + unit : ""}`.trim();
  }
  return `${sa} + ${sb}`;
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
  const ms = String(stock).replace(",", ".").match(/-?\d+(\.\d+)?/);
  const mu = String(used).replace(",", ".").match(/-?\d+(\.\d+)?/);
  const unitS = String(stock).replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
  const unitU = String(used).replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
  if (ms && mu && (unitS === unitU || unitU === "")) {
    let n = parseFloat(ms[0]) - parseFloat(mu[0]);
    if (n < 0) n = 0;
    const numStr = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace(".", ",");
    const unit = String(stock).replace(/-?\d+([.,]\d+)?/, "").trim();
    return { ok: true, value: `${numStr}${unit ? " " + unit : ""}`.trim() };
  }
  return { ok: false, value: stock };
}

function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-zàèéìòù0-9 ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
