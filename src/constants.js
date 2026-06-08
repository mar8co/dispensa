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
Ignora prodotti non alimentari. Se non riconosci alcun alimento, restituisci una lista vuota.
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
