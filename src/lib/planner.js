// Piano della settimana SENZA AI. Per ogni pasto libero sceglie una ricetta dal
// ricettario (le tue + quelle incluse nell'app) partendo da ciò che c'è in
// dispensa: prima quelle a cui manca meno, e tra quelle chi consuma i prodotti
// in scadenza. Calcolo locale: immediato, funziona senza rete, non costa
// richieste. Gli ingredienti che mancano li mette in lista il chiamante.
import { rankCookable } from "./suggest.js";

// Che tipo di piatto si preferisce, giorno per giorno (0 = lunedì): a pranzo
// quasi sempre un primo, la sera un secondo; un po' di rotazione per variare.
const PRANZO = ["primi", "zuppe", "primi", "veloci", "primi", "verdure", "primi"];
const CENA = ["carne", "pesce", "verdure", "carne", "zuppe", "pesce", "verdure"];
// Tipi che fanno un pasto: restano fuori i contorni e i dolci/colazioni.
const PASTO = new Set(["primi", "carne", "pesce", "verdure", "zuppe", "veloci"]);

// Le ricette salvate dall'utente non hanno un tipo: valgono per qualsiasi
// pasto, a meno che dagli ingredienti non sembrino un dolce.
const DOLCE = /zucchero|cacao|cioccolat/i;
function isMeal(recipe) {
  if (recipe.tipo) return PASTO.has(recipe.tipo);
  return !(recipe.ingredients || []).some((ing) => DOLCE.test(ing?.name || ""));
}

// Lunedì = 0 … domenica = 6, da una data "YYYY-MM-DD" (a mezzogiorno: immune ai cambi d'ora).
const weekdayOf = (iso) => (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;

// slots: [{ date: "YYYY-MM-DD", slot: "pranzo" | "cena" }] da riempire, in ordine.
// recipes: ricettario (prima le ricette dell'utente). hasIngredient(nome) → bool.
// expiring: prodotti in scadenza [{ name }]. random: sorgente del caso (per i test).
// Ritorna [{ date, slot, recipe, missing: [nomi] }]; una ricetta non si ripete.
export function planWeek({ slots, recipes, hasIngredient, expiring = [], random = Math.random }) {
  // Tutte le ricette "da pasto", già in ordine: meno ingredienti mancanti
  // prima, poi chi usa ciò che scade.
  const ranked = rankCookable(recipes.filter(isMeal), hasIngredient, expiring, Infinity);
  const used = new Set();
  const out = [];
  for (const { date, slot } of slots) {
    const want = (slot === "pranzo" ? PRANZO : CENA)[weekdayOf(date)];
    const free = ranked.filter((x) => !used.has(x.recipe.title));
    if (!free.length) break;
    const ofType = free.filter((x) => (x.recipe.tipo || want) === want);
    const list = ofType.length ? ofType : free;
    // Tra le migliori (al più un ingrediente mancante in più della prima) se ne
    // prende una a caso, così ogni volta il piano è diverso; ma se qualcuna
    // consuma un prodotto in scadenza si sceglie tra quelle.
    const top = list.filter((x) => x.missing.length <= list[0].missing.length + 1).slice(0, 6);
    const urgent = top.filter((x) => x.usesExpiring);
    const choices = urgent.length ? urgent : top;
    const pick = choices[Math.floor(random() * choices.length)] || choices[0];
    used.add(pick.recipe.title);
    out.push({ date, slot, recipe: pick.recipe, missing: pick.missing });
  }
  return out;
}

// I pasti LIBERI della settimana da oggi in poi (i giorni passati non si
// toccano, i pasti già pianificati nemmeno). weekDays: 7 date "YYYY-MM-DD".
export function freeSlots(weekDays, meals, todayIso) {
  const taken = new Set(meals.map((m) => `${m.date}|${m.slot}`));
  const out = [];
  for (const date of weekDays) {
    if (date < todayIso) continue;
    for (const slot of ["pranzo", "cena"]) {
      if (!taken.has(`${date}|${slot}`)) out.push({ date, slot });
    }
  }
  return out;
}
