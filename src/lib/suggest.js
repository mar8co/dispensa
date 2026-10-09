// "Puoi farle adesso": sceglie, tra ricette già note (il tuo ricettario + il
// ricettario di base dell'app), quelle che si possono cucinare con ciò che c'è
// in dispensa. Tutto sul dispositivo: niente AI, niente rete.
import { guessCategory, isQbQty, isStapleQb, norm, findMatch } from "./pantry.js";

// Ingredienti "veri" di una ricetta: fuori le scorte a piacere (olio, sale,
// pepe, spezie, "q.b."), che non devono far risultare "manca qualcosa".
function mainIngredients(recipe) {
  return (recipe.ingredients || []).filter(
    (ing) => ing?.name && !isQbQty(ing.qty) && !isStapleQb(ing.name, guessCategory(ing.name))
  );
}

// recipes: [{ title, ingredients, ... }] · hasIngredient(nome) → bool ·
// expiring: prodotti in scadenza [{ name }] · maxMissing: quanti ingredienti
// possono mancare. Ritorna [{ recipe, missing: [nomi], usesExpiring }] in
// ordine: prima quelle a cui non manca nulla, poi quelle che consumano ciò che
// scade, poi l'ordine d'ingresso (il tuo ricettario viene prima di quello base).
export function rankCookable(recipes, hasIngredient, expiring = [], maxMissing = 1) {
  const seen = new Set();
  const out = [];
  recipes.forEach((recipe, order) => {
    const key = norm(recipe?.title || "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    const main = mainIngredients(recipe);
    if (!main.length) return;
    const missing = main.filter((ing) => !hasIngredient(ing.name)).map((ing) => ing.name);
    if (missing.length > maxMissing) return;
    const usesExpiring = main.some((ing) => !!findMatch(ing.name, expiring));
    out.push({ recipe, missing, usesExpiring, order });
  });
  return out.sort((a, b) =>
    a.missing.length - b.missing.length ||
    Number(b.usesExpiring) - Number(a.usesExpiring) ||
    a.order - b.order
  );
}
