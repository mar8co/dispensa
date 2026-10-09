// Un po' di grammatica per parlare dei prodotti per nome: articolo, singolare
// o plurale, maschile o femminile ("Il latte sta scadendo", "Le zucchine
// stanno scadendo", "Le uova sono scadute"). L'italiano non si indovina sempre
// dal nome: qui ci sono regole sulle desinenze più le eccezioni dei cibi
// comuni. Guarda solo la PRIMA parola ("Petto di pollo" → petto). Nel dubbio:
// maschile singolare. Logica pura, testata in italiano.test.js.

// Femminili plurali che finiscono in -e (dove la sola desinenza non basta) e uova.
const FEM_PL = new Set(["uova", "patate", "carote", "mele", "pere", "banane", "cipolle", "melanzane", "olive", "verdure", "acciughe", "vongole", "cozze", "lenticchie", "arance", "albicocche", "erbe", "pesche", "ciliegie", "prugne", "mandorle", "fave", "bietole", "rape", "penne", "lasagne", "farfalle", "salsicce", "more", "castagne", "sarde", "seppie", "trofie", "fette", "noci", "alici", "arachidi", "spezie", "fragole", "nocciole", "biete", "cime", "coste", "pannocchie", "susine", "nespole", "capesante", "telline", "aringhe", "triglie", "sogliole", "orate", "uvette", "bacche", "gallette", "cialde", "bevande", "bibite", "birre", "salse", "conserve", "marmellate", "caramelle", "merendine", "brioche", "crespelle", "tigelle"]);
// Femminili singolari che non finiscono in -a.
const FEM_SG = new Set(["carne", "pancetta", "frutta", "neve", "noce", "pelle", "salsiccia", "maionese", "senape", "birra", "besciamella", "polpa"]);
// Parole che finiscono in -i ma sono singolari (o invariabili).
const SG_IN_I = new Set(["kiwi", "wasabi", "tzatziki", "sushi", "brandy", "whisky", "curry", "chili", "muesli", "tahini"]);
// Maschili singolari che finiscono in -a.
const MASC_IN_A = new Set(["gorgonzola", "tiramisù", "ragù"]);

// "Lo" / "Gli": davanti a s+consonante, z, gn, ps, pn, x, y.
const IMPURA = /^(s[bcdfglmnpqrtvz]|z|gn|ps|pn|x|y)/;
const VOCALE = /^h?[aeiouàèéìòù]/; // anche la "h" muta: l'hamburger

// name → { plural, fem, article } (l'articolo ha già lo spazio, tranne "L'").
export function grammar(name) {
  const w = String(name || "").trim().toLowerCase().split(/\s+/)[0] || "";
  let plural = false;
  let fem = false;
  if (FEM_PL.has(w)) { plural = true; fem = true; }
  else if (FEM_SG.has(w)) { fem = true; }
  else if (SG_IN_I.has(w) || MASC_IN_A.has(w)) { /* maschile singolare */ }
  else if (/(ine|elle|ette|ole|ucce|icce|ane)$/.test(w) && w !== "pane") { plural = true; fem = true; } // zucchine, tagliatelle, polpette…
  else if (/i$/.test(w)) { plural = true; }               // ceci, spinaci, pomodori
  else if (/a$/.test(w)) { fem = true; }                  // panna, farina, mozzarella
  // -o, -e e il resto: maschile singolare (latte, pane, riso, tonno)

  let article;
  if (plural) article = fem ? "Le " : (VOCALE.test(w) || IMPURA.test(w) ? "Gli " : "I ");
  else if (VOCALE.test(w)) article = "L'";
  else article = fem ? "La " : (IMPURA.test(w) ? "Lo " : "Il ");
  return { plural, fem, article };
}

// "Latte" → "Il latte" · "Zucchine" → "Le zucchine" · "Uova" → "Le uova".
// La prima lettera del nome diventa minuscola (viene dopo l'articolo), a meno
// che il nome sia una sigla tutta maiuscola.
export function withArticle(name) {
  const n = String(name || "").trim();
  if (!n) return "";
  const lower = n === n.toUpperCase() && n.length > 1 ? n : n.charAt(0).toLowerCase() + n.slice(1);
  return grammar(n).article + lower;
}

// "Il latte sta scadendo" · "Le zucchine stanno scadendo".
export function expiringPhrase(name) {
  return `${withArticle(name)} ${grammar(name).plural ? "stanno" : "sta"} scadendo`;
}
// "Il latte è scaduto" · "La panna è scaduta" · "Le uova sono scadute" · "I ceci sono scaduti".
export function expiredPhrase(name) {
  const g = grammar(name);
  const fine = g.plural ? (g.fem ? "e" : "i") : (g.fem ? "a" : "o");
  return `${withArticle(name)} ${g.plural ? "sono" : "è"} scadut${fine}`;
}
