import { useState, useEffect, useRef } from "react";
import {
  Plus, Minus, Trash2, Pencil, Camera, Check, X, Loader2, Package,
  ChefHat, ArrowLeft, Clock, Gauge, Play, Pause, RotateCcw, Timer,
  ChevronDown, ChevronRight, Utensils, GripVertical,
} from "lucide-react";

const CATEGORIES = [
  "Pasta e Cereali", "Legumi e Conserve", "Frutta Secca", "Condimenti e Oli",
  "Latticini e Formaggi", "Fresco e Verdure", "Carne", "Pesce", "Congelato",
  "Spezie ed Erbe", "Bevande", "Altro",
];

const CAT_ICON = {
  "Pasta e Cereali": "🌾", "Legumi e Conserve": "🥫", "Frutta Secca": "🥜",
  "Condimenti e Oli": "🫙", "Latticini e Formaggi": "🧀", "Fresco e Verdure": "🥬",
  "Carne": "🥩", "Pesce": "🐟", "Congelato": "🧊", "Spezie ed Erbe": "🌿",
  "Bevande": "🥤", "Altro": "📦",
};

const MODES = [
  { id: "Pranzo veloce", icon: "⚡", desc: "Pronto in massimo 20 minuti" },
  { id: "Cucina italiana", icon: "🍝", desc: "Tradizione e sapore di casa" },
  { id: "Cucina etnica", icon: "🌍", desc: "Sapori dal mondo" },
  { id: "Leggero & sano", icon: "🥗", desc: "Equilibrato e nutriente" },
  { id: "Comfort food", icon: "🍲", desc: "Avvolgente e goloso" },
  { id: "Svuota dispensa", icon: "♻️", desc: "Usa ciò che già hai" },
  { id: "Colazione & brunch", icon: "🥐", desc: "Per iniziare la giornata" },
  { id: "Pesce e mare", icon: "🐟", desc: "Sapore di mare" },
  { id: "Vegetariano", icon: "🥦", desc: "Senza carne né pesce" },
  { id: "Aperitivo", icon: "🥂", desc: "Stuzzichini e finger food" },
  { id: "Una pentola sola", icon: "🍳", desc: "Pochi piatti da lavare" },
  { id: "Dolci & dessert", icon: "🍰", desc: "Per concludere in dolcezza" },
];

const RECEIPT_PROMPT = `Sei un assistente per la gestione della dispensa italiana.
Analizza lo scontrino e identifica tutti gli alimenti.
Per ogni alimento estrai SOLO il nome del prodotto, rimuovendo la marca, il tipo di confezione (PET, lattina, bottiglia, busta, conf.) e le parole promozionali, ma mantenendo le qualità rilevanti (es. "greco", "integrale", "fresco", "di pera", "in scatola").
Metti l'eventuale peso o formato nel campo "qty" (es. "500 g"), altrimenti la quantità acquistata o "1".
Il nome deve avere la prima lettera maiuscola e il resto minuscolo.
Esempi: "Yoga Succo di Pera PET" -> name "Succo di pera"; "PAST.BARILL.500G" -> name "Pasta", qty "500 g"; "Meteora yogurt greco 500g" -> name "Yogurt greco", qty "500 g".
Ignora prodotti non alimentari.
Rispondi SOLO con JSON valido senza markdown:
{"items":[{"name":"...","qty":"...","category":"..."}]}
Categorie possibili: Pasta e Cereali, Legumi e Conserve, Frutta Secca,
Condimenti e Oli, Latticini e Formaggi, Fresco e Verdure,
Carne, Pesce, Congelato, Spezie ed Erbe, Bevande, Altro`;

const STORAGE_KEY = "dispensa-v1";
const COLLAPSE_KEY = "dispensa-collapsed-v1";
const ORDER_KEY = "dispensa-order-v1";
const MODE_ORDER_KEY = "dispensa-mode-order-v1";
const MODEL = "claude-sonnet-4-20250514";

const SEED_DATA = [
  ["Pasta (vari formati)", "4 pacchi", "Pasta e Cereali"],
  ["Cous cous", "1 conf.", "Pasta e Cereali"],
  ["Riso basmati", "1 kg", "Pasta e Cereali"],
  ["Riso carnaroli", "1 conf.", "Pasta e Cereali"],
  ["Fiocchi di avena", "1 conf.", "Pasta e Cereali"],
  ["Farina", "1 conf.", "Pasta e Cereali"],
  ["Pan grattato", "1 conf.", "Pasta e Cereali"],
  ["Piadina", "1", "Pasta e Cereali"],
  ["Tonno in scatola", "12", "Legumi e Conserve"],
  ["Ceci", "2 barattoli", "Legumi e Conserve"],
  ["Fagioli", "1 barattolo", "Legumi e Conserve"],
  ["Pomodori pelati", "1 barattolo", "Legumi e Conserve"],
  ["Mandorle", "1 conf.", "Frutta Secca"],
  ["Pistacchi", "1 conf.", "Frutta Secca"],
  ["Pinoli", "poca quantità", "Frutta Secca"],
  ["Noci sgusciate", "poca quantità", "Frutta Secca"],
  ["Olio EVO", "1 bottiglia", "Condimenti e Oli"],
  ["Salsa di soia", "1 bottiglia", "Condimenti e Oli"],
  ["Aceto balsamico", "1 bottiglia", "Condimenti e Oli"],
  ["Aceto di mele", "1 bottiglia", "Condimenti e Oli"],
  ["Parmigiano grattugiato", "1 conf.", "Latticini e Formaggi"],
  ["Pecorino romano", "1 pezzo", "Latticini e Formaggi"],
  ["Pomodorini", "1 vaschetta", "Fresco e Verdure"],
  ["Limone", "1", "Fresco e Verdure"],
  ["Fish burger di merluzzo", "2", "Congelato"],
  ["Sovracoscie di pollo (marinata al rosmarino)", "2", "Congelato"],
  ["Bocconcini di pollo al curry", "1,5 porzioni", "Congelato"],
  ["Fettine di pollo yogurt e paprika", "1 conf.", "Congelato"],
  ["Fettine di bovino", "1 conf.", "Congelato"],
  ["Spinaci", "1 conf.", "Congelato"],
  ["Minestrone", "1 conf.", "Congelato"],
  ["Broccoli", "1 conf.", "Congelato"],
  ["Piselli", "1 conf.", "Congelato"],
  ["Paprika dolce", "1 barattolo", "Spezie ed Erbe"],
  ["Paprika piccante", "1 barattolo", "Spezie ed Erbe"],
  ["Pepe", "1 barattolo", "Spezie ed Erbe"],
  ["Rosmarino", "1 barattolo", "Spezie ed Erbe"],
  ["Aglio in polvere", "1 barattolo", "Spezie ed Erbe"],
  ["Cumino", "1 barattolo", "Spezie ed Erbe"],
  ["Curcuma", "1 barattolo", "Spezie ed Erbe"],
  ["Caffè", "3 pacchetti da 250g", "Bevande"],
];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function seed() {
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

function guessCategory(name) {
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

function correctName(raw) {
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
function normalizeWeight(qty) {
  const m = String(qty).trim().match(/^(\d+(?:[.,]\d+)?)\s*(gr|g|grammi)$/i);
  if (m) {
    const g = parseFloat(m[1].replace(",", "."));
    if (g >= 1000) return formatKg(g / 1000);
  }
  return qty;
}

function mergeQty(a, b) {
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

function scaleQty(qty, factor) {
  if (!factor || factor === 1) return qty;
  return String(qty).replace(/\d+(?:[.,]\d+)?/g, (m) => {
    const n = parseFloat(m.replace(",", ".")) * factor;
    const out = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
    return String(out).replace(".", ",");
  });
}

function subtractQty(stock, used) {
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

function findMatch(ingName, items) {
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

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(new Error("Lettura file fallita"));
    r.readAsDataURL(file);
  });
}

async function callClaude(content, maxTokens = 1000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error("API " + res.status);
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start(); o.stop(ctx.currentTime + 0.5);
  } catch {}
}

function StepTimer({ minutes }) {
  const total = Math.max(1, Math.round(minutes * 60));
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (running && left > 0) {
      ref.current = setTimeout(() => setLeft((l) => l - 1), 1000);
    } else if (running && left === 0) {
      setRunning(false);
      beep();
    }
    return () => clearTimeout(ref.current);
  }, [running, left]);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const done = left === 0;

  return (
    <div
      className={`mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
        done ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-stone-50"
      }`}
    >
      <Timer className={`h-4 w-4 ${done ? "text-emerald-600" : "text-stone-500"}`} />
      <span className={`font-mono text-sm tabular-nums ${done ? "text-emerald-700" : "text-stone-700"}`}>
        {fmt(left)}
      </span>
      <div className="ml-auto flex items-center gap-1">
        {!done && (
          <button
            onClick={() => setRunning((r) => !r)}
            className="rounded-md p-1.5 text-stone-500 hover:bg-stone-200"
            aria-label={running ? "Pausa" : "Avvia"}
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}
        <button
          onClick={() => { setRunning(false); setLeft(total); }}
          className="rounded-md p-1.5 text-stone-500 hover:bg-stone-200"
          aria-label="Reimposta"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dispensa");
  const [collapsed, setCollapsed] = useState({});
  const [catOrder, setCatOrder] = useState(CATEGORIES);
  const [dragCat, setDragCat] = useState(null);
  const dragCatRef = useRef(null);
  const cardRefs = useRef({});

  const [modeOrder, setModeOrder] = useState(MODES.map((m) => m.id));
  const [dragMode, setDragMode] = useState(null);
  const dragModeRef = useRef(null);
  const modeCardRefs = useRef({});

  // form aggiunta
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [grams, setGrams] = useState(false);
  const [adding, setAdding] = useState(false);

  // modifica
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editCat, setEditCat] = useState(CATEGORIES[0]);

  // scontrino
  const [processing, setProcessing] = useState(false);
  const [receiptMsg, setReceiptMsg] = useState("");
  const [receiptErr, setReceiptErr] = useState("");
  const fileRef = useRef(null);

  // ricette
  const [mode, setMode] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [servings, setServings] = useState(1);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipeErr, setRecipeErr] = useState("");

  // "Ho cucinato questo"
  const [cookOpen, setCookOpen] = useState(false);
  const [cookRows, setCookRows] = useState([]);
  const [cookDone, setCookDone] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        const parsed = r && r.value ? JSON.parse(r.value) : null;
        if (Array.isArray(parsed) && parsed.length) setItems(parsed);
        else setItems(seed());
      } catch {
        setItems(seed());
      }
      try {
        const c = await window.storage.get(COLLAPSE_KEY);
        if (c && c.value) {
          const cp = JSON.parse(c.value);
          if (cp && typeof cp === "object") setCollapsed(cp);
        }
      } catch {}
      try {
        const o = await window.storage.get(ORDER_KEY);
        if (o && o.value) {
          const op = JSON.parse(o.value);
          if (Array.isArray(op)) {
            setCatOrder([
              ...op.filter((c) => CATEGORIES.includes(c)),
              ...CATEGORIES.filter((c) => !op.includes(c)),
            ]);
          }
        }
      } catch {}
      try {
        const mo = await window.storage.get(MODE_ORDER_KEY);
        if (mo && mo.value) {
          const mp = JSON.parse(mo.value);
          const ids = MODES.map((m) => m.id);
          if (Array.isArray(mp)) {
            setModeOrder([
              ...mp.filter((id) => ids.includes(id)),
              ...ids.filter((id) => !mp.includes(id)),
            ]);
          }
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await window.storage.set(STORAGE_KEY, JSON.stringify(items)); }
      catch (e) { console.error("Errore salvataggio:", e); }
    })();
  }, [items, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await window.storage.set(COLLAPSE_KEY, JSON.stringify(collapsed)); }
      catch (e) { console.error("Errore salvataggio:", e); }
    })();
  }, [collapsed, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await window.storage.set(ORDER_KEY, JSON.stringify(catOrder)); }
      catch (e) { console.error("Errore salvataggio:", e); }
    })();
  }, [catOrder, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await window.storage.set(MODE_ORDER_KEY, JSON.stringify(modeOrder)); }
      catch (e) { console.error("Errore salvataggio:", e); }
    })();
  }, [modeOrder, loaded]);

  const pantryStr = items.map((i) => `${i.name} (${i.qty})`).join(", ");

  async function addManual() {
    const raw = newName.trim();
    if (!raw || adding) return;
    const n = String(newQty).trim() || "1";
    const qty = normalizeWeight(grams ? `${n} gr` : n);
    setAdding(true);
    let name = correctName(raw);
    let category = guessCategory(name) || "Altro";
    try {
      const prompt =
        `Sei un assistente per una dispensa italiana. Dall'input dell'utente estrai SOLO il nome dell'alimento, ` +
        `togliendo marca, grammature, formati e parole promozionali, ma mantenendo le qualità rilevanti ` +
        `(es. "greco", "integrale", "fresco", "in scatola"). ` +
        `Esempi: "Meteora yogurt greco 500g" -> "Yogurt greco"; "ceci la fiammante 400g" -> "Ceci". ` +
        `Assegna una categoria tra: ${CATEGORIES.join(", ")}. Input: "${raw}". ` +
        `Rispondi SOLO con JSON valido senza markdown: {"name":"...","category":"..."}`;
      const parsed = await callClaude([{ type: "text", text: prompt }], 200);
      if (parsed && parsed.name) {
        const s = String(parsed.name).trim();
        name = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        category = CATEGORIES.includes(parsed.category) ? parsed.category : (guessCategory(name) || "Altro");
      }
    } catch (e) {
      console.error(e);
    }
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.name.trim().toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: normalizeWeight(mergeQty(next[idx].qty, qty)) };
        return next;
      }
      return [...prev, { id: uid(), name, qty, category }];
    });
    setNewName(""); setNewQty("1"); setAdding(false);
  }
  function removeItem(id) { setItems((prev) => prev.filter((x) => x.id !== id)); }
  function clearPantry() { setItems([]); setConfirmClear(false); }
  function startEdit(it) {
    setEditId(it.id); setEditName(it.name); setEditQty(it.qty); setEditCat(it.category);
  }
  function saveEdit() {
    setItems((prev) => prev.map((x) =>
      x.id === editId
        ? { ...x, name: editName.trim() || x.name, qty: editQty.trim(), category: editCat }
        : x
    ));
    setEditId(null);
  }
  function mergeItems(incoming) {
    setItems((prev) => {
      const next = [...prev];
      for (const raw of incoming) {
        const name = String(raw.name || "").trim();
        if (!name) continue;
        const qty = normalizeWeight(String(raw.qty || "1").trim());
        const cat = CATEGORIES.includes(raw.category) ? raw.category : "Altro";
        const idx = next.findIndex((x) => x.name.trim().toLowerCase() === name.toLowerCase());
        if (idx >= 0) next[idx] = { ...next[idx], qty: normalizeWeight(mergeQty(next[idx].qty, qty)) };
        else next.push({ id: uid(), name, qty, category: cat });
      }
      return next;
    });
  }

  // --- Trascinamento categorie ---
  function onDragStart(e, cat) {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    dragCatRef.current = cat;
    setDragCat(cat);
  }
  function onDragMove(e) {
    if (!dragCatRef.current) return;
    const y = e.clientY;
    for (const cat in cardRefs.current) {
      const el = cardRefs.current[cat];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) {
        if (cat !== dragCatRef.current) moveInOrder(setCatOrder, dragCatRef.current, cat);
        break;
      }
    }
  }
  function onDragEnd() {
    dragCatRef.current = null;
    setDragCat(null);
  }

  // --- Trascinamento tipologie di ricette ---
  function onModeDragStart(e, id) {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    dragModeRef.current = id;
    setDragMode(id);
  }
  function onModeDragMove(e) {
    if (!dragModeRef.current) return;
    const x = e.clientX, y = e.clientY;
    for (const id in modeCardRefs.current) {
      const el = modeCardRefs.current[id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        if (id !== dragModeRef.current) moveInOrder(setModeOrder, dragModeRef.current, id);
        break;
      }
    }
  }
  function onModeDragEnd() {
    dragModeRef.current = null;
    setDragMode(null);
  }

  // Riordino generico usato sia per categorie che per ricette
  function moveInOrder(setOrder, dragged, target) {
    setOrder((order) => {
      const arr = [...order];
      const fromIdx = arr.indexOf(dragged);
      const toIdxOrig = arr.indexOf(target);
      if (fromIdx < 0 || toIdxOrig < 0) return order;
      arr.splice(fromIdx, 1);
      let insertAt = arr.indexOf(target);
      if (fromIdx < toIdxOrig) insertAt += 1;
      arr.splice(insertAt, 0, dragged);
      return arr;
    });
  }

  async function handleReceipt(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setReceiptErr(""); setReceiptMsg(""); setProcessing(true);
    try {
      const data64 = await fileToBase64(file);
      const media_type = file.type || "image/jpeg";
      const parsed = await callClaude([
        { type: "image", source: { type: "base64", media_type, data: data64 } },
        { type: "text", text: RECEIPT_PROMPT },
      ], 1000);
      const list = Array.isArray(parsed.items) ? parsed.items : [];
      if (!list.length) setReceiptErr("Nessun alimento riconosciuto nello scontrino.");
      else { mergeItems(list); setReceiptMsg(`${list.length} prodotti aggiunti dallo scontrino.`); }
    } catch (err) {
      console.error(err);
      setReceiptErr("Impossibile leggere lo scontrino. Riprova con una foto più nitida.");
    } finally {
      setProcessing(false);
      input.value = "";
    }
  }

  async function chooseMode(m) {
    setMode(m); setRecipe(null); setIdeas([]); setRecipeErr(""); setLoadingIdeas(true);
    const fast = m.id === "Pranzo veloce" ? "Ogni ricetta deve essere pronta entro 20 minuti. " : "";
    const prompt =
      `Sei uno chef esperto di cucina casalinga. Questi sono gli alimenti nella mia dispensa: ${pantryStr}. ` +
      `Voglio idee per la categoria "${m.id}". Proponi esattamente 4 ricette diverse che usino principalmente ` +
      `ingredienti della mia dispensa (puoi assumere disponibili sale, acqua e olio). ${fast}` +
      `Rispondi SOLO con JSON valido senza markdown: ` +
      `{"recipes":[{"title":"...","description":"breve, max 14 parole","time":"es. 15 min","difficulty":"Facile|Media|Elaborata"}]}`;
    try {
      const parsed = await callClaude([{ type: "text", text: prompt }], 1000);
      setIdeas(Array.isArray(parsed.recipes) ? parsed.recipes : []);
    } catch (err) {
      console.error(err);
      setRecipeErr("Errore nel generare le proposte. Riprova.");
    } finally {
      setLoadingIdeas(false);
    }
  }

  async function openRecipe(title) {
    setRecipe(null); setRecipeErr(""); setLoadingRecipe(true); setCookDone("");
    const prompt =
      `Sei uno chef esperto. Dammi la ricetta completa e dettagliata per "${title}". ` +
      `Usa principalmente gli ingredienti della mia dispensa: ${pantryStr}. ` +
      `Indica le grammature per il numero di porzioni nel campo "servings". ` +
      `IMPORTANTISSIMO: usa SOLO unità di misura metriche (g, kg, ml, l) — mai cups, oz, tbsp, tsp. ` +
      `Per ogni passaggio che richiede attesa o cottura indica i minuti nel campo "timer" (numero), altrimenti null. ` +
      `Rispondi SOLO con JSON valido senza markdown: ` +
      `{"title":"...","servings":2,"time":"...","ingredients":[{"name":"...","qty":"120 g"}],"steps":[{"text":"...","timer":10}]}`;
    try {
      const parsed = await callClaude([{ type: "text", text: prompt }], 1500);
      setRecipe(parsed);
      setServings(1);
    } catch (err) {
      console.error(err);
      setRecipeErr("Errore nel generare la ricetta. Riprova.");
    } finally {
      setLoadingRecipe(false);
    }
  }

  function backToModes() { setMode(null); setIdeas([]); setRecipe(null); setRecipeErr(""); setCookDone(""); }
  function backToIdeas() { setRecipe(null); setRecipeErr(""); setCookDone(""); }

  const grouped = catOrder
    .map((c) => ({ cat: c, list: items.filter((x) => x.category === c) }))
    .filter((g) => g.list.length > 0);
  const total = items.length;
  const orderedModes = modeOrder.map((id) => MODES.find((m) => m.id === id)).filter(Boolean);

  const baseServings = recipe ? (Number(recipe.servings) || 2) : 1;
  const factor = servings / baseServings;

  function openCookModal() {
    if (!recipe) return;
    const rows = [];
    const seen = new Set();
    for (const ing of (recipe.ingredients || [])) {
      const match = findMatch(ing.name, items);
      if (!match || seen.has(match.id)) continue;
      seen.add(match.id);
      const used = scaleQty(ing.qty, factor);
      const sub = subtractQty(match.qty, used);
      rows.push({
        itemId: match.id, name: match.name, used,
        before: match.qty, after: sub.ok ? sub.value : match.qty, auto: sub.ok,
      });
    }
    setCookRows(rows);
    setCookOpen(true);
  }
  function setRowAfter(idx, val) {
    setCookRows((rows) => rows.map((r, i) => (i === idx ? { ...r, after: val } : r)));
  }
  function removeRow(idx) {
    setCookRows((rows) => rows.filter((_, i) => i !== idx));
  }
  function applyCooked() {
    const updates = {};
    const removals = new Set();
    for (const r of cookRows) {
      const v = String(r.after).trim();
      const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
      const isZero = m && parseFloat(m[0]) === 0;
      if (v === "" || isZero) removals.add(r.itemId);
      else updates[r.itemId] = v;
    }
    setItems((prev) =>
      prev
        .filter((x) => !removals.has(x.id))
        .map((x) => (updates[x.id] !== undefined ? { ...x, qty: updates[x.id] } : x))
    );
    setCookOpen(false);
    const n = Object.keys(updates).length + removals.size;
    setCookDone(n ? `Dispensa aggiornata: ${n} prodotti.` : "");
  }

  const inputCls =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200";

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <div className="mx-auto max-w-md px-4 pt-6 pb-8">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4.5" y="3.5" width="15" height="15" rx="1.6" fill="white" fillOpacity="0.18" />
              <line x1="4.5" y1="6.8" x2="19.5" y2="6.8" />
              <line x1="12" y1="6.8" x2="12" y2="18.5" />
              <circle cx="10.6" cy="12.5" r="0.75" fill="white" stroke="none" />
              <circle cx="13.4" cy="12.5" r="0.75" fill="white" stroke="none" />
              <line x1="6.8" y1="18.5" x2="6.8" y2="20.3" />
              <line x1="17.2" y1="18.5" x2="17.2" y2="20.3" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">La Mia Dispensa</h1>
            <p className="text-xs text-stone-500">{total} prodotti · {grouped.length} categorie</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-stone-200/70 p-1">
          <button
            onClick={() => setView("dispensa")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
              view === "dispensa" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"
            }`}
          >
            <Package className="h-4 w-4" /> Dispensa
          </button>
          <button
            onClick={() => setView("ricette")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
              view === "ricette" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"
            }`}
          >
            <ChefHat className="h-4 w-4" /> Ricette
          </button>
        </div>

        {/* ===================== DISPENSA ===================== */}
        {view === "dispensa" && (
          <>
            <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 ${processing ? "opacity-60" : ""}`}>
                {processing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Analisi in corso…</>)
                  : (<><Camera className="h-4 w-4" /> Carica foto scontrino</>)}
                <input type="file" accept="image/*" className="hidden" onChange={handleReceipt} disabled={processing} />
              </label>
              {receiptMsg && <p className="mt-2 text-center text-xs font-medium text-emerald-700">{receiptMsg}</p>}
              {receiptErr && <p className="mt-2 text-center text-xs font-medium text-red-600">{receiptErr}</p>}
            </div>

            {grouped.length === 0 && (
              <p className="py-10 text-center text-sm text-stone-400">Dispensa vuota. Aggiungi un prodotto qui sotto.</p>
            )}

            <div className="space-y-4">
              {grouped.map(({ cat, list }) => (
                <div
                  key={cat}
                  ref={(el) => { cardRefs.current[cat] = el; }}
                  className={`rounded-2xl border bg-white shadow-sm transition ${dragCat === cat ? "border-emerald-400 opacity-90 shadow-lg ring-2 ring-emerald-200" : "border-stone-200"}`}
                >
                  <div className={`flex w-full items-center gap-1 px-3 py-3 ${!collapsed[cat] ? "border-b border-stone-100" : ""}`}>
                    <button
                      onClick={() => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="text-lg">{CAT_ICON[cat]}</span>
                      <h2 className="truncate text-sm font-semibold text-stone-700">{cat}</h2>
                      <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{list.length}</span>
                      {collapsed[cat]
                        ? <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                        : <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" />}
                    </button>
                    <button
                      onPointerDown={(e) => onDragStart(e, cat)}
                      onPointerMove={onDragMove}
                      onPointerUp={onDragEnd}
                      onPointerCancel={onDragEnd}
                      style={{ touchAction: "none" }}
                      className="shrink-0 cursor-grab rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 active:cursor-grabbing"
                      aria-label="Trascina per riordinare"
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                  </div>
                  {!collapsed[cat] && (
                  <ul className="divide-y divide-stone-100">
                    {list.map((it) =>
                      editId === it.id ? (
                        <li key={it.id} className="space-y-2 px-4 py-3">
                          <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" />
                          <div className="flex gap-2">
                            <input className={inputCls} value={editQty} onChange={(e) => setEditQty(e.target.value)} placeholder="Quantità" />
                            <select className={inputCls} value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-900">
                              <Check className="h-4 w-4" /> Salva
                            </button>
                            <button onClick={() => setEditId(null)} className="flex items-center justify-center rounded-lg border border-stone-300 px-3 py-2 text-stone-500 hover:bg-stone-50">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ) : (
                        <li key={it.id} className="flex items-center justify-between gap-2 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-stone-800">{it.name}</p>
                            <p className="text-xs text-stone-500">{it.qty}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button onClick={() => startEdit(it)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Modifica">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => removeItem(it.id)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label="Elimina">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                  )}
                </div>
              ))}
            </div>

            {grouped.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
                className="mx-auto mt-6 block text-xs text-stone-300 transition hover:text-stone-500"
              >
                Svuota dispensa
              </button>
            )}

            {/* Form aggiunta (in flusso, resta in fondo) */}
            <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
              <input
                className={inputCls}
                placeholder="Nome alimento"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
              />
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-stone-300 bg-white">
                  <button
                    onClick={() => setNewQty((q) => String(Math.max(1, (parseFloat(String(q).replace(",", ".")) || 1) - 1)))}
                    className="flex h-11 w-11 items-center justify-center rounded-l-lg text-stone-600 transition hover:bg-stone-100"
                    aria-label="Meno"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value.replace(/[^0-9.,]/g, ""))}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => e.key === "Enter" && addManual()}
                    className="w-16 border-0 bg-transparent text-center text-lg font-semibold text-stone-800 outline-none"
                  />
                  <button
                    onClick={() => setNewQty((q) => String((parseFloat(String(q).replace(",", ".")) || 0) + 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-r-lg text-stone-600 transition hover:bg-stone-100"
                    aria-label="Più"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => setGrams((g) => !g)}
                  aria-pressed={grams}
                  className={`h-11 rounded-lg border px-4 text-sm font-semibold transition ${grams ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-stone-500 hover:bg-stone-50"}`}
                >
                  gr
                </button>
                <button
                  onClick={addManual}
                  disabled={adding}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-800 px-4 py-3 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60"
                >
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Aggiungi</>}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===================== RICETTE ===================== */}
        {view === "ricette" && (
          <>
            {!mode && (
              <>
                <p className="mb-3 text-sm text-stone-500">Cosa ti va di cucinare? Le ricette useranno gli ingredienti della tua dispensa.</p>
                <div className="grid grid-cols-2 gap-3">
                  {orderedModes.map((m) => (
                    <div
                      key={m.id}
                      ref={(el) => { modeCardRefs.current[m.id] = el; }}
                      onClick={() => chooseMode(m)}
                      className={`relative cursor-pointer rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-stone-400 hover:shadow ${dragMode === m.id ? "border-emerald-400 opacity-90 shadow-lg ring-2 ring-emerald-200" : "border-stone-200"}`}
                    >
                      <div className="mb-2 text-2xl">{m.icon}</div>
                      <div className="pr-5 text-sm font-semibold text-stone-800">{m.id}</div>
                      <div className="mt-0.5 text-xs text-stone-500">{m.desc}</div>
                      <button
                        onPointerDown={(e) => { e.stopPropagation(); onModeDragStart(e, m.id); }}
                        onPointerMove={onModeDragMove}
                        onPointerUp={onModeDragEnd}
                        onPointerCancel={onModeDragEnd}
                        onClick={(e) => e.stopPropagation()}
                        style={{ touchAction: "none" }}
                        className="absolute right-1.5 top-1.5 cursor-grab rounded-md p-1 text-stone-300 transition hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing"
                        aria-label="Trascina per riordinare"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {mode && !recipe && !loadingRecipe && (
              <>
                <button onClick={backToModes} className="mb-3 flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
                  <ArrowLeft className="h-4 w-4" /> Occasioni
                </button>
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-2xl">{mode.icon}</span>
                  <h2 className="text-lg font-semibold">{mode.id}</h2>
                </div>

                {loadingIdeas && (
                  <div className="flex flex-col items-center gap-2 py-12 text-stone-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm">Preparo le proposte…</p>
                  </div>
                )}
                {recipeErr && !loadingIdeas && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
                    {recipeErr}
                    <button onClick={() => chooseMode(mode)} className="mt-2 block w-full rounded-lg bg-red-600 py-2 text-white">Riprova</button>
                  </div>
                )}

                <div className="space-y-3">
                  {ideas.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => openRecipe(r.title)}
                      className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-stone-400 hover:shadow"
                    >
                      <h3 className="text-base font-semibold text-stone-800">{r.title}</h3>
                      <p className="mt-1 text-sm text-stone-500">{r.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.time && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                            <Clock className="h-3 w-3" /> {r.time}
                          </span>
                        )}
                        {r.difficulty && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                            <Gauge className="h-3 w-3" /> {r.difficulty}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {mode && loadingRecipe && (
              <div className="flex flex-col items-center gap-2 py-16 text-stone-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Scrivo la ricetta completa…</p>
              </div>
            )}

            {recipe && !loadingRecipe && (
              <>
                <button onClick={backToIdeas} className="mb-3 flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
                  <ArrowLeft className="h-4 w-4" /> Altre proposte
                </button>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-semibold text-stone-900">{recipe.title}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {recipe.time && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                        <Clock className="h-3.5 w-3.5" /> {recipe.time}
                      </span>
                    )}
                    <div className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-1 py-0.5">
                      <button
                        onClick={() => setServings((s) => Math.max(1, s - 1))}
                        disabled={servings <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 disabled:opacity-30"
                        aria-label="Meno porzioni"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-24 text-center text-xs font-medium text-stone-700">
                        {servings} {servings === 1 ? "porzione" : "porzioni"}
                      </span>
                      <button
                        onClick={() => setServings((s) => s + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100"
                        aria-label="Più porzioni"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-stone-400">Ingredienti</h3>
                  <ul className="divide-y divide-stone-100 rounded-xl bg-stone-50">
                    {(recipe.ingredients || []).map((ing, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="text-stone-700">{ing.name}</span>
                        <span className="shrink-0 font-medium text-stone-900">{scaleQty(ing.qty, factor)}</span>
                      </li>
                    ))}
                  </ul>

                  <h3 className="mb-3 mt-5 text-sm font-semibold uppercase tracking-wide text-stone-400">Procedimento</h3>
                  <ol className="space-y-4">
                    {(recipe.steps || []).map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-semibold text-white">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed text-stone-700">{s.text}</p>
                          {s.timer ? <StepTimer minutes={Number(s.timer)} /> : null}
                        </div>
                      </li>
                    ))}
                  </ol>

                  <button
                    onClick={openCookModal}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
                  >
                    <Utensils className="h-4 w-4" /> Ho cucinato questo
                  </button>
                  {cookDone && <p className="mt-2 text-center text-xs font-medium text-emerald-700">{cookDone}</p>}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Conferma svuota dispensa */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmClear(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-stone-900">Svuotare la dispensa?</h3>
            <p className="mt-1 text-sm text-stone-500">Verranno eliminati tutti i prodotti dalla dispensa. L'azione non è reversibile.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmClear(false)} className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
                Annulla
              </button>
              <button onClick={clearPantry} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700">
                Elimina tutto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale "Ho cucinato questo" */}
      {cookOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setCookOpen(false)}
        >
          <div
            className="flex max-h-screen w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <h3 className="text-base font-semibold">Aggiorna la dispensa</h3>
              <button onClick={() => setCookOpen(false)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto px-4 py-3">
              {cookRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-stone-500">
                  Nessun ingrediente di questa ricetta corrisponde a un prodotto in dispensa.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-stone-500">
                    Controlla la quantità che rimane di ogni prodotto. Lascia vuoto o 0 per rimuoverlo dalla dispensa.
                  </p>
                  <ul className="space-y-3">
                    {cookRows.map((r, i) => (
                      <li key={r.itemId} className="rounded-xl border border-stone-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-stone-800">{r.name}</p>
                            <p className="mt-0.5 text-xs text-stone-500">Usato: {r.used} · Prima: {r.before}</p>
                          </div>
                          <button onClick={() => removeRow(i)} className="rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500" aria-label="Ignora">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="shrink-0 text-xs text-stone-500">Rimane:</span>
                          <input
                            className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                            value={r.after}
                            onChange={(e) => setRowAfter(i, e.target.value)}
                          />
                          {!r.auto && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              da verificare
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="flex gap-2 border-t border-stone-100 px-4 py-3">
              <button onClick={() => setCookOpen(false)} className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
                Annulla
              </button>
              <button
                onClick={applyCooked}
                disabled={cookRows.length === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
