// Piano della settimana SENZA AI. Per ogni pasto libero sceglie una ricetta dal
// ricettario (le tue + quelle incluse nell'app) partendo da ciò che c'è in
// dispensa: prima quelle a cui manca meno, e tra quelle chi consuma i prodotti
// in scadenza. Calcolo locale: immediato, funziona senza rete, non costa
// richieste.
//
// Tiene il CONTO delle scorte mentre sceglie: ogni ricetta messa nel piano
// "consuma" i suoi ingredienti, così la successiva vede solo quello che resta
// (con 6 uova, tre ricette da 4 non risultano tutte fattibili). E per ogni
// ingrediente che manca dice QUANTO ne serve, non un generico "1".
import { mainIngredients } from "./suggest.js";
import { findMatch, parseQty, parseRecipeQty, formatShoppingQty, norm } from "./pantry.js";

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

// --- Il conto delle scorte ---
// Ogni prodotto in dispensa ha un "resto" nella sua unità di base: grammi,
// millilitri oppure pezzi. Quando dispensa e ricetta parlano la stessa lingua
// (peso con peso, volume con volume, pezzi con pezzi) il conto è esatto.
// Quando NON sono confrontabili ("1 barattolo" di ceci contro "240 g") non si
// può sapere quanto resta: si scala UN USO per ricetta — un pezzo/confezione,
// oppure 250 g / 250 ml se il prodotto è a peso o a volume. È una stima, ma
// impedisce che lo stesso barattolo venga contato per tre ricette.
const UN_USO = { weight: 250, volume: 250 };
const QUASI_ZERO = 1e-6;
// A peso e a volume, se ne resta almeno il 90% di quanto serve si considera
// che basti: nessuno va a comprare 10 g di spaghetti.
const BASTA = 0.9;

function makeStock(pantry) {
  return pantry.map((it) => {
    const p = parseQty(it.qty);
    // Senza un numero ("poca quantità") vale per un uso solo.
    return { key: it.id ?? it.name, family: p ? p.family : "other", left: p && p.base > 0 ? p.base : 1 };
  });
}

const esatto = (f) => f === "weight" || f === "volume" || f === "count";

// Cosa succede alle scorte se si cucina `recipe` per `factor` volte la sua
// dose: quali prodotti e quanto se ne consuma, cosa manca (e quanto). Non
// tocca `stock`: lo fa `applica`, solo per la ricetta scelta.
function valuta(recipe, factor, stock, matchIdx, expiringKeys) {
  const missing = [];        // [{ name, family, base }]
  const consume = new Map(); // indice in stock → quantità consumata da QUESTA ricetta
  let usesExpiring = false;
  let covered = 0;           // ingredienti che la dispensa copre, del tutto o in parte
  for (const ing of mainIngredients(recipe)) {
    const p = parseRecipeQty(ing.qty);
    const need = p ? { family: p.family, base: p.base * factor } : { family: "other", base: 1 };
    const idx = matchIdx(ing.name);
    const s = idx >= 0 ? stock[idx] : null;
    const left = s ? s.left - (consume.get(idx) || 0) : 0;
    if (!s || left <= QUASI_ZERO) { missing.push({ name: ing.name, ...need }); continue; }
    if (expiringKeys.has(s.key)) usesExpiring = true;
    covered += 1;
    if (s.family === need.family && esatto(s.family)) {
      const soglia = s.family === "count" ? need.base : need.base * BASTA;
      if (left + QUASI_ZERO >= soglia) {
        consume.set(idx, (consume.get(idx) || 0) + Math.min(left, need.base));
      } else {
        // Ce n'è, ma non basta: si usa tutto e manca la differenza.
        consume.set(idx, (consume.get(idx) || 0) + left);
        missing.push({ name: ing.name, family: need.family, base: need.base - left });
      }
    } else {
      // Unità non confrontabili: un uso (vedi sopra).
      consume.set(idx, (consume.get(idx) || 0) + Math.min(left, UN_USO[s.family] || 1));
    }
  }
  return { missing, consume, usesExpiring, covered };
}
function applica(stock, consume) {
  for (const [idx, amount] of consume) stock[idx].left -= amount;
}

// Quante volte la dose base: porzioni volute / porzioni della ricetta.
function factorOf(recipe, servings) {
  const base = Number(recipe.servings) || 2;
  return (Number(servings) || base) / base;
}

// slots: [{ date: "YYYY-MM-DD", slot: "pranzo" | "cena" }] da riempire, in ordine.
// recipes: ricettario (prima le ricette dell'utente).
// pantry: prodotti che ci sono davvero [{ id?, name, qty }] (senza i finiti).
// expiring: quelli in scadenza (stessi oggetti o stessi id/nomi).
// servings: porzioni di casa (null = quelle di ogni ricetta).
// planned: pasti GIÀ nel piano, non ancora cucinati [{ recipe, servings? }]:
//          consumano le scorte prima di scegliere il resto.
// random: sorgente del caso (per i test).
// Ritorna [{ date, slot, recipe, missing: [{ name, qty }] }]; una ricetta non si ripete.
export function planWeek({ slots, recipes, pantry = [], expiring = [], servings = null, planned = [], random = Math.random }) {
  const stock = makeStock(pantry);
  const expiringKeys = new Set(expiring.map((it) => it.id ?? it.name));
  // A quale prodotto della dispensa corrisponde un ingrediente: non dipende
  // dalle quantità, quindi si calcola una volta per nome.
  const cache = new Map();
  const matchIdx = (name) => {
    const k = norm(name);
    if (!cache.has(k)) {
      const hit = findMatch(name, pantry);
      cache.set(k, hit ? pantry.indexOf(hit) : -1);
    }
    return cache.get(k);
  };

  for (const p of planned) {
    if (p?.recipe) applica(stock, valuta(p.recipe, factorOf(p.recipe, p.servings), stock, matchIdx, expiringKeys).consume);
  }

  const pool = recipes.filter((r) => isMeal(r) && mainIngredients(r).length > 0);
  const seen = new Set();
  const candidates = pool.filter((r) => { const k = norm(r.title || ""); return k && !seen.has(k) && seen.add(k); });
  const used = new Set();
  const out = [];
  for (const { date, slot } of slots) {
    const want = (slot === "pranzo" ? PRANZO : CENA)[weekdayOf(date)];
    const free = candidates.filter((r) => !used.has(r.title));
    if (!free.length) break;
    const ofType = free.filter((r) => (r.tipo || want) === want);
    // Valutate con le scorte DI ADESSO (quelle rimaste dopo i pasti già scelti):
    // meno mancanti prima, poi chi usa ciò che scade, poi chi usa più cose
    // della dispensa, poi l'ordine del ricettario.
    const ranked = (ofType.length ? ofType : free)
      .map((recipe, order) => ({ recipe, order, ...valuta(recipe, factorOf(recipe, servings), stock, matchIdx, expiringKeys) }))
      .sort((a, b) => a.missing.length - b.missing.length || Number(b.usesExpiring) - Number(a.usesExpiring) || b.covered - a.covered || a.order - b.order);
    // Tra le migliori (al più un ingrediente mancante in più della prima) se ne
    // prende una a caso, così ogni volta il piano è diverso; ma se qualcuna
    // consuma un prodotto in scadenza si sceglie tra quelle.
    const top = ranked.filter((x) => x.missing.length <= ranked[0].missing.length + 1).slice(0, 6);
    const urgent = top.filter((x) => x.usesExpiring);
    // …e, potendo, una che usi ALMENO un prodotto della dispensa: finite le
    // uova, non si continua a proporre frittate tutte da comprare.
    const useful = (urgent.length ? urgent : top).filter((x) => x.covered > 0);
    const choices = useful.length ? useful : urgent.length ? urgent : top;
    const pick = choices[Math.floor(random() * choices.length)] || choices[0];
    used.add(pick.recipe.title);
    applica(stock, pick.consume);
    out.push({
      date, slot, recipe: pick.recipe,
      missing: pick.missing.map((m) => ({ name: m.name, qty: formatShoppingQty(m.family, m.base), family: m.family, base: m.base })),
    });
  }
  return out;
}

// La spesa per un piano: una voce per prodotto, con le quantità SOMMATE tra le
// ricette che lo chiedono (due ricette da 300 g di salmone → 600 g). Se due
// ricette lo misurano in modo diverso (una "2", l'altra "300 g") la somma non
// ha senso: resta la misura della prima.
export function shoppingList(picks) {
  const byName = new Map();
  for (const p of picks) {
    for (const m of p.missing) {
      const k = norm(m.name);
      const cur = byName.get(k);
      if (!cur) byName.set(k, { name: m.name, family: m.family, base: m.base });
      else if (cur.family === m.family) cur.base += m.base;
    }
  }
  return [...byName.values()].map((x) => ({ name: x.name, qty: formatShoppingQty(x.family, x.base) }));
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
