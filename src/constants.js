// Costanti dell'app: categorie, icone, occasioni di ricetta, prompt AI,
// chiavi di persistenza e dati iniziali. Identiche all'originale dispensa-ui.jsx.

export const CATEGORIES = [
  "Pasta e Cereali", "Legumi e Conserve", "Frutta Secca", "Condimenti e Oli",
  "Latticini e Formaggi", "Fresco e Verdure", "Carne", "Pesce", "Congelato",
  "Spezie ed Erbe", "Bevande", "Altro",
];

export const CAT_ICON = {
  "Pasta e Cereali": "🌾", "Legumi e Conserve": "🥫", "Frutta Secca": "🥜",
  "Condimenti e Oli": "🫙", "Latticini e Formaggi": "🧀", "Fresco e Verdure": "🥬",
  "Carne": "🥩", "Pesce": "🐟", "Congelato": "🧊", "Spezie ed Erbe": "🌿",
  "Bevande": "🥤", "Altro": "📦",
};

export const MODES = [
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

export const RECEIPT_PROMPT = `Sei un assistente per la gestione della dispensa italiana.
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

export const STORAGE_KEY = "dispensa-v1";
export const COLLAPSE_KEY = "dispensa-collapsed-v1";
export const ORDER_KEY = "dispensa-order-v1";
export const MODE_ORDER_KEY = "dispensa-mode-order-v1";
export const MODEL = "claude-sonnet-4-20250514";

export const SEED_DATA = [
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
