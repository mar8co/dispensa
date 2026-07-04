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

// Catalogo prodotti comuni (nomi puliti, pronti da mostrare) per i suggerimenti
// della lista della spesa. Raggruppato per reparto solo per leggerezza di
// manutenzione: l'emoji della chip la decide comunque `catForShopping` (così è
// sempre coerente col reparto in cui finirà il prodotto). Storico acquisti e
// dispensa restano prioritari; questo è la base "cold start" quando non bastano.
export const PRODUCT_CATALOG = {
  "Verdura": [
    "Pomodori", "Pomodorini", "Pomodori ciliegino", "Pomodori San Marzano",
    "Insalata", "Insalata iceberg", "Insalata mista", "Lattuga", "Valeriana",
    "Zucchine", "Zucchine trombetta", "Melanzane", "Peperoni", "Peperoni rossi",
    "Peperoni gialli", "Carote", "Cipolle", "Cipolla rossa", "Cipolla di Tropea",
    "Cipollotti", "Aglio", "Patate", "Patate dolci", "Patate novelle", "Zucca",
    "Finocchi", "Sedano", "Funghi", "Funghi champignon", "Funghi porcini",
    "Avocado", "Broccoli", "Spinaci", "Cavolfiore", "Cavolo", "Cavolo cappuccio",
    "Cavolo nero", "Verza", "Porri", "Asparagi", "Rucola", "Radicchio",
    "Bietole", "Fagiolini", "Cetrioli", "Ravanelli", "Scalogno", "Carciofi",
    "Songino", "Cime di rapa", "Indivia", "Scarola", "Germogli di soia",
    "Piselli freschi", "Fave fresche", "Mais dolce", "Limoni", "Lime",
    "Zenzero fresco", "Peperoncino fresco", "Prezzemolo", "Basilico", "Menta",
    "Erba cipollina", "Timo fresco", "Rosmarino fresco",
  ],
  "Frutta": [
    "Arance", "Arance rosse", "Arance bionde", "Mele", "Mele Golden",
    "Mele Renette", "Mele Fuji", "Banane", "Fragole", "Pere", "Pere abate",
    "Pesche", "Pesche noci", "Kiwi", "Uva", "Uva bianca", "Uva nera",
    "Anguria", "Melone", "Ananas", "Mandarini", "Clementine", "Albicocche",
    "Ciliegie", "Prugne", "Susine", "Fichi", "Mirtilli", "Lamponi",
    "Pompelmo", "Frutti di bosco", "Cachi", "Melograno", "More", "Papaya",
    "Mango", "Cocco", "Nespole", "Macedonia",
  ],
  "Carne": [
    "Pollo", "Pollo intero", "Petto di pollo", "Cosce di pollo",
    "Sovracosce di pollo", "Fusi di pollo", "Ali di pollo", "Manzo", "Maiale",
    "Tacchino", "Fesa di tacchino", "Petto di tacchino", "Vitello",
    "Salsicce", "Salsiccia di pollo", "Macinato", "Macinato di manzo",
    "Macinato misto", "Bistecche", "Hamburger", "Hamburger di manzo",
    "Cotolette", "Cotoletta alla milanese", "Spezzatino", "Arrosto",
    "Costine", "Scaloppine", "Braciole", "Ossobuco", "Fegato", "Spiedini",
    "Polpette", "Lonza", "Tagliata", "Filetto di manzo", "Straccetti di pollo",
    "Straccetti di manzo", "Involtini", "Bocconcini di pollo",
  ],
  "Salumi": [
    "Prosciutto crudo", "Prosciutto cotto", "Salame", "Salame Milano",
    "Salamino piccante", "Mortadella", "Speck", "Bresaola", "Pancetta",
    "Pancetta affumicata", "Pancetta arrotolata", "Wurstel", "Wurstel di pollo",
    "Coppa", "Porchetta", "Guanciale", "Lardo", "Culatello", "Nduja",
    "Finocchiona", "Soppressata", "Salsiccia",
  ],
  "Pesce": [
    "Salmone", "Filetti di salmone", "Tranci di salmone", "Merluzzo",
    "Filetti di merluzzo", "Gamberi", "Gamberetti", "Calamari", "Vongole",
    "Cozze", "Branzino", "Orata", "Baccalà", "Seppie", "Polpo", "Moscardini",
    "Sgombro", "Tonno fresco", "Trota", "Sogliola", "Platessa",
    "Filetti di platessa", "Nasello", "Pesce spada", "Alici", "Scampi",
    "Totani", "Surimi", "Granchio", "Coda di rospo",
  ],
  "Latticini": [
    "Latte", "Latte intero", "Latte parzialmente scremato", "Latte scremato",
    "Latte fresco", "Latte a lunga conservazione", "Latte senza lattosio",
    "Latte di capra", "Formaggio", "Formaggio grattugiato",
    "Formaggio spalmabile", "Parmigiano", "Parmigiano Reggiano",
    "Grana Padano", "Pecorino", "Mozzarella", "Mozzarella di bufala",
    "Mozzarella light", "Yogurt", "Yogurt greco", "Yogurt bianco",
    "Yogurt alla frutta", "Yogurt magro", "Kefir", "Burro", "Burro salato",
    "Panna", "Panna da cucina", "Panna fresca", "Panna montata", "Ricotta",
    "Ricotta di pecora", "Mascarpone", "Gorgonzola", "Stracchino",
    "Philadelphia", "Scamorza", "Provola", "Fontina", "Burrata", "Caciotta",
    "Caciocavallo", "Emmental", "Asiago", "Taleggio", "Robiola",
    "Crescenza", "Squacquerone",
  ],
  "Pane e Forno": [
    "Pane", "Pane integrale", "Pane a fette", "Pancarré", "Piadina",
    "Cracker", "Grissini", "Focaccia", "Taralli", "Panini", "Panini al latte",
    "Baguette", "Tortillas", "Pita", "Friselle", "Ciabatta",
  ],
  "Pasta, Riso e Cereali": [
    "Pasta", "Pasta integrale", "Pasta senza glutine", "Spaghetti", "Penne",
    "Fusilli", "Rigatoni", "Farfalle", "Tagliatelle", "Lasagne", "Tortellini",
    "Ravioli", "Gnocchi", "Gnocchi di patate", "Riso", "Riso basmati",
    "Riso integrale", "Riso per risotto", "Riso venere", "Cous cous",
    "Farina", "Farina 00", "Farina integrale", "Avena", "Fiocchi di avena",
    "Cereali", "Cereali integrali", "Orzo", "Orzo perlato", "Farro", "Polenta",
    "Pangrattato", "Quinoa", "Semola", "Lievito", "Lievito di birra",
    "Lievito per dolci",
  ],
  "Legumi": [
    "Fagioli", "Fagioli cannellini", "Fagioli borlotti", "Fagioli neri",
    "Ceci", "Lenticchie", "Lenticchie rosse", "Piselli", "Piselli secchi",
    "Fave", "Soia", "Edamame",
  ],
  "Conserve": [
    "Tonno in scatola", "Tonno all'olio", "Tonno al naturale", "Sgombro all'olio",
    "Pomodori pelati", "Passata di pomodoro", "Polpa di pomodoro",
    "Concentrato di pomodoro", "Pomodori secchi", "Acciughe", "Sardine",
    "Olive", "Olive verdi", "Olive nere", "Mais", "Capperi", "Carciofini",
    "Cetriolini sottaceto", "Funghi sottolio", "Fagioli in scatola",
    "Ceci in scatola", "Lenticchie in scatola", "Zuppa pronta",
  ],
  "Condimenti e Salse": [
    "Olio EVO", "Olio di semi", "Olio di girasole", "Aceto",
    "Aceto balsamico", "Aceto di mele", "Maionese", "Ketchup", "Senape",
    "Pesto", "Pesto alla genovese", "Sugo pronto", "Ragù pronto", "Brodo",
    "Brodo granulare", "Dado", "Besciamella", "Salsa di soia", "Tabasco",
    "Salsa worcestershire", "Salsa rosa", "Salsa barbecue",
  ],
  "Spezie ed Erbe": [
    "Sale", "Sale fino", "Sale grosso", "Pepe", "Pepe nero", "Paprika",
    "Paprika dolce", "Curcuma", "Cumino", "Origano", "Rosmarino", "Timo",
    "Cannella", "Zenzero in polvere", "Peperoncino", "Peperoncino in polvere",
    "Noce moscata", "Curry", "Zafferano", "Alloro", "Salvia", "Vaniglia",
    "Erbe di Provenza", "Aglio in polvere", "Cipolla in polvere",
  ],
  "Frutta Secca": [
    "Mandorle", "Noci", "Nocciole", "Pistacchi", "Pinoli", "Anacardi",
    "Arachidi", "Uvetta", "Datteri", "Semi di chia", "Semi di lino",
    "Semi di girasole", "Semi di zucca", "Fichi secchi",
    "Mix di frutta secca", "Albicocche secche", "Prugne secche",
  ],
  "Dolci": [
    "Biscotti", "Biscotti secchi", "Biscotti frollini", "Cioccolato",
    "Cioccolato fondente", "Cioccolato al latte", "Cioccolato bianco",
    "Merendine", "Marmellata", "Confettura", "Miele", "Zucchero",
    "Zucchero di canna", "Zucchero a velo", "Nutella", "Crema spalmabile",
    "Fette biscottate", "Muesli", "Wafer", "Budino", "Cacao",
    "Cacao amaro", "Caramelle", "Torta", "Torta pronta", "Panettone",
    "Pandoro", "Croissant", "Brioche", "Savoiardi", "Gelatina",
  ],
  "Surgelati": [
    "Piselli surgelati", "Spinaci surgelati", "Minestrone surgelato",
    "Verdure surgelate", "Bastoncini di pesce", "Filetti di pesce surgelati",
    "Gamberi surgelati", "Sofficini", "Cotolette surgelate", "Gelato",
    "Ghiaccioli", "Pizza surgelata", "Patatine surgelate", "Frutti di bosco surgelati",
  ],
  "Bevande": [
    "Acqua", "Acqua frizzante", "Acqua naturale", "Caffè", "Caffè in grani",
    "Caffè in capsule", "Caffè in cialde", "Succo di frutta", "Succo di arancia",
    "Succo di mela", "Vino", "Vino rosso", "Vino bianco", "Vino rosato",
    "Birra", "Birra analcolica", "Coca cola", "Aranciata", "Chinotto",
    "Tè", "Tè freddo", "Tisana", "Camomilla", "Spremuta", "Latte di soia",
    "Latte di avena", "Latte di mandorla", "Latte di riso", "Latte di cocco",
    "Prosecco", "Spumante", "Energy drink",
  ],
};

// Lista piatta dei nomi del catalogo (per il pool dei suggerimenti).
export const CATALOG_NAMES = Object.values(PRODUCT_CATALOG).flat();

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

// Pill di "contesto/umore" per le ricette: l'utente ne tocca una o più, e l'AI
// le considera (oltre alla stagione corrente, iniettata automaticamente) PRIMA
// di proporre le idee per l'occasione scelta. `hint` = frase messa nel prompt.
export const RECIPE_CONTEXTS = [
  { id: "fresco", icon: "🥒", label: "Fresco", hint: "il piatto deve essere fresco, anche freddo o a temperatura ambiente" },
  { id: "caldo", icon: "🍜", label: "Caldo", hint: "il piatto deve essere caldo e confortante" },
  { id: "sostanzioso", icon: "🔋", label: "Sostanzioso", hint: "il piatto deve essere sostanzioso e saziante" },
  { id: "senzacottura", icon: "🌯", label: "Senza cottura", hint: "la ricetta NON deve richiedere alcuna cottura, né fornelli né forno: solo ingredienti crudi o già pronti da assemblare (insalate, piatti freddi, ecc.)" },
  { id: "proteico", icon: "🏋️", label: "Proteico", hint: "il piatto deve essere ricco di proteine" },
];

// Regole condivise per ottenere il NOME GENERICO dell'alimento (usate da
// scontrino/foto, scansione barcode e aggiunta manuale).
export const NAME_RULES = `Restituisci solo il NOME GENERICO dell'alimento, il più semplice possibile.
TOGLI SEMPRE: la marca e il nome commerciale, il peso/grammatura/volume e la quantità, il formato e la confezione (PET, lattina, bottiglia, busta, vaschetta, conf., multipack), le parole promozionali, e le descrizioni di preparazione o taglio (grattugiato, a fette, affettato, a cubetti, frullato, in tranci).
MANTIENI SOLO le qualità che identificano un alimento davvero diverso (es. greco, integrale, fresco, senza lattosio, senza glutine, piccante, decaffeinato, basmati, oppure la parte come petto/coscia).
Il nome deve avere la prima lettera maiuscola e il resto minuscolo.
Esempi: "Rosa Blu acqua naturale 1,5L" -> "Acqua"; "Parmigiano Reggiano grattugiato 100g" -> "Parmigiano"; "Yoga Succo di Pera PET" -> "Succo di pera"; "Meteora yogurt greco 0% 500g" -> "Yogurt greco"; "Barilla spaghetti n.5 500g" -> "Spaghetti"; "Petto di pollo a fette 400g" -> "Petto di pollo".`;

// Blocco categorie + regole per TUTTI i prompt AI: usa | come separatore per
// evitare l'ambiguità della virgola in "Pasta, Riso e Cereali", e fornisce
// regole esplicite per i casi che l'AI sbaglia più spesso.
export const CATEGORY_PROMPT = `Usa SOLO una di queste categorie (nome ESATTO):
Verdura | Frutta | Carne | Salumi | Pesce | Latticini | Pane e Forno | Pasta, Riso e Cereali | Legumi | Conserve | Surgelati | Bevande | Dolci | Frutta Secca | Condimenti e Salse | Spezie ed Erbe | Altro

Regole (applica nell'ordine — la prima che corrisponde vince):
• SURGELATO/CONGELATO → "Surgelati" (gelato, bastoncini, sofficini, piselli/spinaci/broccoli surgelati, carne o pesce congelati…)
• Pasta (spaghetti, penne, rigatoni, farfalle, lasagne, gnocchi, tortellini, ravioli…), riso, farro, orzo, couscous, quinoa, bulgur, farina, avena, polenta, pan grattato → "Pasta, Riso e Cereali"
• Uova → "Altro"
• Tonno, salmone, sgombro, acciughe, sardine IN SCATOLA / al naturale / sott'olio → "Conserve"; gli stessi prodotti FRESCHI (banco pescheria) → "Pesce"
• Prosciutto, salame, bresaola, speck, mortadella, wurstel, nduja, pancetta, guanciale, affettati → "Salumi"
• Latte (anche vegetale: soia, avena, riso, mandorla), formaggio, yogurt, burro, panna, ricotta, mozzarella, parmigiano, kefir, burrata → "Latticini"
• Sale, pepe, spezie (curry, curcuma, paprika, cumino, cannella…), erbe aromatiche SECCHE (origano, basilico, rosmarino, timo secchi…), lievito → "Spezie ed Erbe"
• Olio, aceto, salsa, pesto, sugo, brodo (anche "brodo di pollo/manzo/vegetale"), dado, ketchup, maionese, senape, soia, tahina, besciamella → "Condimenti e Salse"
• Piselli, mais, fagioli, ceci, lenticchie, fave, soia (non surgelati) → "Legumi"
• Conserve vegetali (pelati, passata, olive, capperi, sottoli, sottaceti), tonno/pesce in scatola → "Conserve"
• Mandorle, noci, nocciole, pistacchi, pinoli, anacardi, arachidi, semi (chia, lino, girasole, zucca) → "Frutta Secca"
• Crema/pasta di nocciole, nutella, cioccolato, biscotti, marmellata, miele, dolci, merendine → "Dolci"
• Acqua, succhi, vino, birra, caffè, tè, tisane, bibite → "Bevande"
• Tutto il resto → "Altro"`;

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
${CATEGORY_PROMPT}`;

// Schemi di output strutturato per Gemini (generationConfig.responseSchema):
// garantiscono la FORMA del JSON e vincolano "category" alle categorie valide
// (enum), eliminando il bisogno di parsing difensivo con regex. Il tipo va in
// MAIUSCOLO come richiesto dall'enum Type dell'API Gemini.
const CATEGORY_FIELD = { type: "STRING", enum: CATEGORIES };

// Estrazione prodotti da scontrino/foto/voce: lista di {name, qty, category}.
export const ITEMS_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          qty: { type: "STRING" },
          category: CATEGORY_FIELD,
        },
        required: ["name", "qty", "category"],
      },
    },
  },
  required: ["items"],
};

// Pulizia nome singolo (barcode → nome generico + categoria).
export const NAME_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    category: CATEGORY_FIELD,
  },
  required: ["name", "category"],
};

// Proposte di ricette (lista di idee con metadati per la card e la foto).
export const RECIPES_SCHEMA = {
  type: "OBJECT",
  properties: {
    recipes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          time: { type: "STRING" },
          difficulty: { type: "STRING", enum: ["Facile", "Media", "Elaborata"] },
          imageQuery: { type: "STRING" },
        },
        required: ["title", "description", "time", "difficulty", "imageQuery"],
      },
    },
  },
  required: ["recipes"],
};

// Data ISO (YYYY-MM-DD) a +N giorni da oggi, per le scadenze demo (calcolata
// all'avvio: i dati demo si inseriscono nella stessa sessione).
const demoDate = (days) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Prodotti demo per l'onboarding (1-2 per categoria): popolano la dispensa
// durante il tutorial e vengono eliminati alla fine, per un avvio pulito.
// Alcuni hanno una scadenza (4° campo) per mostrare il banner scadenze:
// uova in scadenza (3 gg), latte già scaduto, rucola ancora lontana (12 gg).
export const DEMO_DATA = [
  ["Zucchine", "3", "Verdura"],
  ["Pomodorini", "500 g", "Verdura"],
  ["Menta", "1 vaso", "Verdura"],
  ["Rucola", "1", "Verdura", demoDate(12)],
  ["Mele", "4", "Frutta"],
  ["Limoni", "2", "Verdura"],
  ["Petto di pollo", "500 g", "Carne"],
  ["Prosciutto crudo", "100 g", "Salumi"],
  ["Tonno fresco", "300 g", "Pesce"],
  ["Parmigiano", "200 g", "Latticini"],
  ["Feta", "200 g", "Latticini"],
  ["Yogurt greco", "4", "Latticini"],
  ["Latte", "1 l", "Latticini", demoDate(-2)],
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
  ["Uova", "6", "Altro", demoDate(3)],
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
  ["Limone", "1", "Verdura"],
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
