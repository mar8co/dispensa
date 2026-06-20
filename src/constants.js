// Costanti dell'app: categorie, icone, occasioni di ricetta, prompt AI,
// chiavi di persistenza e dati iniziali. Identiche all'originale dispensa-ui.jsx.

// Ordine di default = frequenza d'uso: il fresco che compri spesso in alto,
// condimenti e spezie (acquisti rari) in fondo. Resta riordinabile a mano.
export const CATEGORIES = [
  "Verdura", "Frutta", "Carne", "Salumi", "Pesce", "Latticini",
  "Pane e Forno", "Pasta, Riso e Cereali", "Legumi", "Conserve",
  "Surgelati", "Bevande", "Dolci", "Frutta Secca",
  "Condimenti e Salse", "Spezie ed Erbe", "Altro",
];

// Ordine dei reparti come si incontrano in un supermercato tipico:
// frutta/verdura all'ingresso, banchi freschi, scaffali, surgelati e
// bevande verso le casse. Usato dalla lista della spesa "Per reparto".
export const AISLE_ORDER = [
  "Verdura", "Frutta", "Pane e Forno", "Carne", "Salumi", "Pesce",
  "Latticini", "Pasta, Riso e Cereali", "Legumi", "Conserve",
  "Condimenti e Salse", "Spezie ed Erbe", "Frutta Secca", "Dolci",
  "Surgelati", "Bevande", "Altro",
];

// Ordine delle chips nel selettore categoria dei pannelli: "Altro" sale
// accanto a "Frutta Secca" per non occupare una riga da solo in fondo.
export const PICKER_CATS = (() => {
  const arr = CATEGORIES.filter((c) => c !== "Altro");
  arr.splice(arr.indexOf("Frutta Secca") + 1, 0, "Altro");
  return arr;
})();

export const CAT_ICON = {
  "Verdura": "🥬", "Frutta": "🍎", "Carne": "🥩", "Salumi": "🥓",
  "Pesce": "🐟", "Latticini": "🧀", "Pane e Forno": "🍞",
  "Pasta, Riso e Cereali": "🌾", "Legumi": "🫘", "Conserve": "🥫",
  "Surgelati": "🧊", "Bevande": "🥤", "Dolci": "🍪", "Frutta Secca": "🥜",
  "Condimenti e Salse": "🫙", "Spezie ed Erbe": "🌿", "Altro": "📦",
};

export const MODES = [
  { id: "Pranzo veloce", icon: "⚡", desc: "Pronto in massimo 20 minuti" },
  { id: "Schiscetta", icon: "🍱", desc: "Da preparare e portare via" },
  { id: "Cucina italiana", icon: "🍝", desc: "Tradizione e sapore di casa" },
  { id: "Cucina etnica", icon: "🌍", desc: "Sapori dal mondo" },
  { id: "Leggero & sano", icon: "🥗", desc: "Equilibrato e nutriente" },
  { id: "Comfort food", icon: "🍲", desc: "Avvolgente e goloso" },
  { id: "Colazione & brunch", icon: "🥐", desc: "Per iniziare la giornata" },
  { id: "Pesce e mare", icon: "🐟", desc: "Sapore di mare" },
  { id: "Vegetariano", icon: "🥦", desc: "Senza carne né pesce" },
  { id: "Aperitivo", icon: "🥂", desc: "Stuzzichini e finger food" },
  { id: "Una pentola sola", icon: "🍳", desc: "Pochi piatti da lavare" },
  { id: "Dolci & dessert", icon: "🍰", desc: "Per concludere in dolcezza" },
];

// Regole condivise per ottenere il NOME GENERICO dell'alimento (usate da
// scontrino/foto, scansione barcode e aggiunta manuale).
export const NAME_RULES = `Restituisci solo il NOME GENERICO dell'alimento, il più semplice possibile.
TOGLI SEMPRE: la marca e il nome commerciale, il peso/grammatura/volume e la quantità, il formato e la confezione (PET, lattina, bottiglia, busta, vaschetta, conf., multipack), le parole promozionali, e le descrizioni di preparazione o taglio (grattugiato, a fette, affettato, a cubetti, frullato, in tranci).
MANTIENI SOLO le qualità che identificano un alimento davvero diverso (es. greco, integrale, fresco, senza lattosio, senza glutine, piccante, decaffeinato, basmati, oppure la parte come petto/coscia).
Il nome deve avere la prima lettera maiuscola e il resto minuscolo.
Esempi: "Rosa Blu acqua naturale 1,5L" -> "Acqua"; "Parmigiano Reggiano grattugiato 100g" -> "Parmigiano"; "Yoga Succo di Pera PET" -> "Succo di pera"; "Meteora yogurt greco 0% 500g" -> "Yogurt greco"; "Barilla spaghetti n.5 500g" -> "Spaghetti"; "Petto di pollo a fette 400g" -> "Petto di pollo".`;

export const RECEIPT_PROMPT = `Sei un assistente per la gestione della dispensa italiana.
L'immagine può essere di tre tipi: (a) uno scontrino della spesa, (b) uno screenshot con una lista di prodotti (es. riepilogo ordine di un'app), oppure (c) una foto di alimenti reali (sul tavolo, nel frigo, nella busta della spesa). Identifica TUTTI gli alimenti presenti.
- Se è uno scontrino o un testo: leggi i nomi dei prodotti dal testo.
- Se è una foto di prodotti reali: riconosci visivamente ogni alimento che vedi.
Per ogni alimento applica queste regole sul nome:
${NAME_RULES}
Metti l'eventuale peso o formato nel campo "qty" (es. "500 g") — MAI nel nome. Se non è indicato ma riesci a contare gli oggetti nella foto, usa quel numero (es. "3" per tre mele); altrimenti "1". Usa SOLO unità metriche (g, kg, ml, l) — mai cups/oz.
IMPORTANTISSIMO: AGGREGA i prodotti uguali in UNA SOLA voce sommando le quantità, anche se compaiono in righe non consecutive. Esempio: "Yogurt greco", "Pane", "Yogurt greco", "Yogurt greco" -> {"name":"Yogurt greco","qty":"3"} e {"name":"Pane","qty":"1"}. Non ripetere mai lo stesso prodotto su più righe.
Ignora prodotti non alimentari. Se non riconosci alcun alimento, restituisci una lista vuota.
Rispondi SOLO con JSON valido senza markdown:
{"items":[{"name":"...","qty":"...","category":"..."}]}
Categorie possibili: Verdura, Frutta, Carne, Salumi, Pesce, Latticini,
Pane e Forno, Pasta, Riso e Cereali (unica categoria), Legumi, Conserve, Surgelati,
Bevande, Dolci, Frutta Secca, Condimenti e Salse, Spezie ed Erbe, Altro.
NB: i prodotti congelati/surgelati vanno SEMPRE in "Surgelati"; le uova in "Altro"; TUTTI i formati di pasta (spaghetti, penne, rigatoni, fusilli, farfalle, tagliatelle, tortellini, ecc.) vanno in "Pasta, Riso e Cereali".`;

// Prodotti demo per l'onboarding (1-2 per categoria): popolano la dispensa
// durante il tutorial e vengono eliminati alla fine, per un avvio pulito.
export const DEMO_DATA = [
  ["Zucchine", "3", "Verdura"],
  ["Pomodorini", "500 g", "Verdura"],
  ["Menta", "1 vaso", "Verdura"],
  ["Mele", "4", "Frutta"],
  ["Limoni", "2", "Frutta"],
  ["Petto di pollo", "500 g", "Carne"],
  ["Prosciutto crudo", "100 g", "Salumi"],
  ["Tonno fresco", "300 g", "Pesce"],
  ["Parmigiano", "200 g", "Latticini"],
  ["Feta", "200 g", "Latticini"],
  ["Yogurt greco", "4", "Latticini"],
  ["Pane", "1", "Pane e Forno"],
  ["Spaghetti", "500 g", "Pasta, Riso e Cereali"],
  ["Cous cous", "1 conf.", "Pasta, Riso e Cereali"],
  ["Riso", "1 kg", "Pasta, Riso e Cereali"],
  ["Ceci", "1 barattolo", "Legumi"],
  ["Pomodori pelati", "1 barattolo", "Conserve"],
  ["Tonno in scatola", "3", "Conserve"],
  ["Piselli", "1 conf.", "Surgelati"],
  ["Acqua", "6", "Bevande"],
  ["Caffè", "250 g", "Bevande"],
  ["Biscotti", "1", "Dolci"],
  ["Mandorle", "1 conf.", "Frutta Secca"],
  ["Olio EVO", "1 l", "Condimenti e Salse"],
  ["Sale", "1", "Spezie ed Erbe"],
];

export const STORAGE_KEY = "dispensa-v1";
export const COLLAPSE_KEY = "dispensa-collapsed-v1";
export const ORDER_KEY = "dispensa-order-v1";
export const MODE_ORDER_KEY = "dispensa-mode-order-v1";
export const MODEL = "claude-sonnet-4-20250514";

export const SEED_DATA = [
  ["Pasta (vari formati)", "4 pacchi", "Pasta, Riso e Cereali"],
  ["Cous cous", "1 conf.", "Pasta, Riso e Cereali"],
  ["Riso basmati", "1 kg", "Pasta, Riso e Cereali"],
  ["Riso carnaroli", "1 conf.", "Pasta, Riso e Cereali"],
  ["Fiocchi di avena", "1 conf.", "Pasta, Riso e Cereali"],
  ["Farina", "1 conf.", "Pasta, Riso e Cereali"],
  ["Pan grattato", "1 conf.", "Pasta, Riso e Cereali"],
  ["Piadina", "1", "Pane e Forno"],
  ["Tonno in scatola", "12", "Conserve"],
  ["Pomodori pelati", "1 barattolo", "Conserve"],
  ["Ceci", "2 barattoli", "Legumi"],
  ["Fagioli", "1 barattolo", "Legumi"],
  ["Mandorle", "1 conf.", "Frutta Secca"],
  ["Pistacchi", "1 conf.", "Frutta Secca"],
  ["Pinoli", "poca quantità", "Frutta Secca"],
  ["Noci sgusciate", "poca quantità", "Frutta Secca"],
  ["Olio EVO", "1 bottiglia", "Condimenti e Salse"],
  ["Salsa di soia", "1 bottiglia", "Condimenti e Salse"],
  ["Aceto balsamico", "1 bottiglia", "Condimenti e Salse"],
  ["Aceto di mele", "1 bottiglia", "Condimenti e Salse"],
  ["Parmigiano grattugiato", "1 conf.", "Latticini"],
  ["Pecorino romano", "1 pezzo", "Latticini"],
  ["Pomodorini", "1 vaschetta", "Verdura"],
  ["Limone", "1", "Frutta"],
  ["Fish burger di merluzzo", "2", "Surgelati"],
  ["Sovracoscie di pollo (marinata al rosmarino)", "2", "Surgelati"],
  ["Bocconcini di pollo al curry", "1,5 porzioni", "Surgelati"],
  ["Fettine di pollo yogurt e paprika", "1 conf.", "Surgelati"],
  ["Fettine di bovino", "1 conf.", "Surgelati"],
  ["Spinaci", "1 conf.", "Surgelati"],
  ["Minestrone", "1 conf.", "Surgelati"],
  ["Broccoli", "1 conf.", "Surgelati"],
  ["Piselli", "1 conf.", "Surgelati"],
  ["Paprika dolce", "1 barattolo", "Spezie ed Erbe"],
  ["Paprika piccante", "1 barattolo", "Spezie ed Erbe"],
  ["Pepe", "1 barattolo", "Spezie ed Erbe"],
  ["Rosmarino", "1 barattolo", "Spezie ed Erbe"],
  ["Aglio in polvere", "1 barattolo", "Spezie ed Erbe"],
  ["Cumino", "1 barattolo", "Spezie ed Erbe"],
  ["Curcuma", "1 barattolo", "Spezie ed Erbe"],
  ["Caffè", "3 pacchetti da 250g", "Bevande"],
];
