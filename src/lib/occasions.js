// Ricette del ricettario adatte a un'OCCASIONE ("Pranzo veloce", "Pesce e
// mare"…), scelte sul dispositivo: compaiono SUBITO quando si tocca
// un'occasione, mentre le idee su misura dell'AI arrivano dopo qualche
// secondo. Regole semplici su tipo, tempo, titolo e ingredienti: non devono
// essere perfette, devono dare qualcosa di sensato all'istante.
// Logica pura, testata in occasions.test.js.
import { rankCookable } from "./suggest.js";
import { allowedBy } from "./prefs.js";
import { norm } from "./pantry.js";

const PASTO = new Set(["primi", "carne", "pesce", "verdure", "zuppe", "veloci"]);
const minutes = (r) => {
  const s = String(r.time || "");
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*min/);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0) || 999;
};
const title = (r, re) => re.test(norm(r.title || ""));
const hasIng = (r, re) => (r.ingredients || []).some((i) => re.test(norm(i?.name || "")));
const vegetariano = allowedBy("vegetariano");
const GRASSI = /burro|panna|pancetta|guanciale|salsiccia|mascarpone|besciamella|fritt/;
const PESCE = /tonno|salmone|merluzzo|gamber|cozze|vongole|calamar|polpo|orata|branzino|alici|acciugh|sgombro|seppi|pesce|baccala|platessa|sogliola/;

const REGOLE = {
  "Pranzo veloce": (r) => PASTO.has(r.tipo) && minutes(r) <= 20,
  "Schiscetta": (r) => title(r, /insalata|cous cous|frittata|torta salata|polpett|farro|orzo|riso freddo|piadina|wrap|panino/),
  "Cucina italiana": (r) => r.tipo === "primi" || title(r, /milanese|romana|parmigiana|saltimbocca|cacciatora|pizzaiola|napoletana|siciliana|ligure|genovese/),
  "Cucina etnica": (r) => title(r, /curry|cous cous|hummus|taco|chili|noodle|cantonese|falafel|teriyaki|guacamole|poke|fajita|soia|kebab|tzatziki|paella|tikka|wok|burrito|ramen|sushi|thai|messican|indian|orientale|greca/),
  "Leggero & sano": (r) => ["verdure", "zuppe", "pesce"].includes(r.tipo) && !title(r, GRASSI) && !hasIng(r, GRASSI),
  "Comfort food": (r) => title(r, /lasagne|parmigiana|polpette|gnocchi|risotto|al forno|pure|carbonara|amatriciana|spezzatino|zuppa|vellutata|ragu|gratinat|pasticcio|stufat|brasato|minestrone|pasta e /),
  "Colazione & brunch": (r) => title(r, /pancake|yogurt|porridge|french toast|crepes|uova|frittata|toast|banana bread|muesli|ciambellone|muffin|torta/),
  "Pesce e mare": (r) => r.tipo === "pesce" || hasIng(r, PESCE),
  "Vegetariano": (r) => PASTO.has(r.tipo) && vegetariano(r),
  "Aperitivo": (r) => title(r, /bruschett|hummus|crostin|polpett|frittat|torta salata|crocchett|piadina|focaccia|caprese|involtini|tartine|olive/),
  "Una pentola sola": (r) => PASTO.has(r.tipo) && ((r.steps || []).length <= 2 || title(r, /zuppa|minestr|vellutata|risotto|spezzatino|pasta e |padella|stufat/)),
  "Dolci & dessert": (r) => r.tipo === "dolci" && !title(r, /yogurt|porridge|muesli/),
};

// modeId: nome dell'occasione · recipes: ricettario (già filtrato per le
// esigenze alimentari) · hasIngredient/expiring: come in rankCookable.
// Ritorna fino a `max` voci { recipe, missing, usesExpiring }: prima quelle a
// cui manca meno, poi quelle che usano ciò che scade.
export function recipesForOccasion(modeId, recipes, hasIngredient, expiring = [], max = 5) {
  const regola = REGOLE[modeId];
  if (!regola) return [];
  return rankCookable(recipes.filter(regola), hasIngredient, expiring, Infinity).slice(0, max);
}
export const OCCASIONI_NOTE = Object.keys(REGOLE);
