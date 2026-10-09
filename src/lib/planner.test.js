import { describe, it, expect } from "vitest";
import { planWeek, freeSlots, shoppingList } from "./planner.js";
import BASE from "../data/ricetteBase.js";

const WEEK = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]; // lun → dom
const ALL = WEEK.flatMap((date) => [{ date, slot: "pranzo" }, { date, slot: "cena" }]);
// Pranzi in cui si preferisce un primo: lunedì, mercoledì, venerdì, domenica.
const PRIMI = ["2026-10-05", "2026-10-07", "2026-10-09", "2026-10-11"].map((date) => ({ date, slot: "pranzo" }));
const pantry = [
  ["Spaghetti", "500 g"], ["Passata di pomodoro", "700 g"], ["Aglio", "3"], ["Uova", "6"], ["Zucchine", "4"],
  ["Parmigiano", "200 g"], ["Petto di pollo", "500 g"], ["Limone", "2"], ["Riso", "1 kg"], ["Cipolla", "2"], ["Patate", "1 kg"],
].map(([name, qty]) => ({ name, qty }));
const first = () => 0; // "caso" fisso: sempre la prima scelta
const primo = (title, ingredients) => ({ title, tipo: "primi", servings: 2, ingredients: ingredients.map(([name, qty]) => ({ name, qty })) });
const names = (pick) => pick.missing.map((m) => `${m.name} ${m.qty}`);

describe("freeSlots", () => {
  it("salta i giorni passati e i pasti già pianificati", () => {
    const meals = [{ date: "2026-10-09", slot: "cena" }, { date: "2026-10-06", slot: "pranzo" }];
    const slots = freeSlots(WEEK, meals, "2026-10-09");
    expect(slots).toEqual([
      { date: "2026-10-09", slot: "pranzo" },
      { date: "2026-10-10", slot: "pranzo" }, { date: "2026-10-10", slot: "cena" },
      { date: "2026-10-11", slot: "pranzo" }, { date: "2026-10-11", slot: "cena" },
    ]);
  });
});

describe("planWeek", () => {
  it("riempie tutti i pasti senza ripetere una ricetta", () => {
    const plan = planWeek({ slots: ALL, recipes: BASE, pantry, random: first });
    expect(plan.length).toBe(14);
    expect(new Set(plan.map((p) => p.recipe.title)).size).toBe(14);
    expect(plan.map((p) => `${p.date}|${p.slot}`)).toEqual(ALL.map((s) => `${s.date}|${s.slot}`));
  });
  it("non propone mai contorni né dolci", () => {
    for (const random of [first, () => 0.5, () => 0.99]) {
      const plan = planWeek({ slots: ALL, recipes: BASE, pantry, random });
      for (const p of plan) expect(["contorni", "dolci"]).not.toContain(p.recipe.tipo);
    }
  });
  it("a pranzo del lunedì un primo, a cena un secondo di carne", () => {
    const plan = planWeek({ slots: ALL.slice(0, 2), recipes: BASE, pantry, random: first });
    expect(plan[0].recipe.tipo).toBe("primi");
    expect(plan[1].recipe.tipo).toBe("carne");
  });
  it("parte da ciò che c'è: sceglie tra le ricette a cui manca meno", () => {
    const plan = planWeek({ slots: ALL.slice(0, 1), recipes: BASE, pantry, random: first });
    expect(plan[0].missing).toEqual([]);
    const empty = planWeek({ slots: ALL.slice(0, 1), recipes: BASE, pantry: [], random: first });
    expect(empty[0].missing.length).toBeGreaterThan(0);
  });
  it("preferisce chi consuma un prodotto in scadenza", () => {
    const a = primo("A", [["Spaghetti", "100 g"]]);
    const b = primo("B", [["Zucchine", "2"]]);
    const plan = planWeek({ slots: ALL.slice(0, 1), recipes: [a, b], pantry, expiring: [{ name: "Zucchine" }], random: () => 0.99 });
    expect(plan[0].recipe.title).toBe("B");
  });
  it("le ricette dell'utente (senza tipo) valgono per ogni pasto, tranne i dolci", () => {
    const mia = { title: "La mia pasta", ingredients: [{ name: "Spaghetti", qty: "100 g" }] };
    const torta = { title: "La mia torta", ingredients: [{ name: "Zucchero", qty: "100 g" }, { name: "Uova", qty: "2" }] };
    const plan = planWeek({ slots: ALL.slice(0, 2), recipes: [torta, mia], pantry, random: first });
    expect(plan.map((p) => p.recipe.title)).toEqual(["La mia pasta"]);
  });
});

describe("planWeek: conto delle scorte", () => {
  it("una ricetta consuma ciò che serve alla successiva (pezzi)", () => {
    // 6 uova: la prima frittata ne usa 4, alla seconda ne restano 2 → ne mancano 2.
    const recipes = [primo("Frittata uno", [["Uova", "4"]]), primo("Frittata due", [["Uova", "4"]])];
    const plan = planWeek({ slots: PRIMI.slice(0, 2), recipes, pantry: [{ name: "Uova", qty: "6" }], random: first });
    expect(names(plan[0])).toEqual([]);
    expect(names(plan[1])).toEqual(["Uova 2"]);
  });
  it("lo stesso conto vale a peso, tra g e kg", () => {
    // 0,5 kg di pasta, tre ricette da 180 g: alla terza mancano 40 g.
    const recipes = ["uno", "due", "tre"].map((n) => primo(`Pasta ${n}`, [["Spaghetti", "180 g"]]));
    const plan = planWeek({ slots: PRIMI.slice(0, 3), recipes, pantry: [{ name: "Spaghetti", qty: "0,5 kg" }], random: first });
    expect(plan.map(names)).toEqual([[], [], ["Spaghetti 40 g"]]);
  });
  it("a peso, se manca meno di un decimo si considera che basti", () => {
    // 500 g: 180 + 180 = 360, ne restano 140 e la terza ne chiede 150.
    const recipes = [primo("Pasta uno", [["Spaghetti", "180 g"]]), primo("Pasta due", [["Spaghetti", "180 g"]]), primo("Pasta tre", [["Spaghetti", "150 g"]])];
    const plan = planWeek({ slots: PRIMI.slice(0, 3), recipes, pantry: [{ name: "Spaghetti", qty: "500 g" }], random: first });
    expect(plan.map(names)).toEqual([[], [], []]);
  });
  it("con unità non confrontabili scala un uso per ricetta", () => {
    // Un barattolo di ceci vale per UNA ricetta: alla seconda mancano, con la dose della ricetta.
    const recipes = [primo("Ceci uno", [["Ceci", "240 g"]]), primo("Ceci due", [["Ceci", "240 g"]])];
    const plan = planWeek({ slots: PRIMI.slice(0, 2), recipes, pantry: [{ name: "Ceci", qty: "1 barattolo" }], random: first });
    expect(plan.map(names)).toEqual([[], ["Ceci 240 g"]]);
  });
  it("le porzioni di casa moltiplicano il consumo", () => {
    // Per 4 persone servono 8 uova: con 6 in dispensa ne mancano 2.
    const plan = planWeek({ slots: PRIMI.slice(0, 1), recipes: [primo("Frittata", [["Uova", "4"]])], pantry: [{ name: "Uova", qty: "6" }], servings: 4, random: first });
    expect(names(plan[0])).toEqual(["Uova 2"]);
  });
  it("i pasti già nel piano consumano le scorte prima degli altri", () => {
    const giaNelPiano = [{ recipe: primo("Carbonara di ieri", [["Uova", "4"]]) }];
    const plan = planWeek({ slots: PRIMI.slice(0, 1), recipes: [primo("Frittata", [["Uova", "4"]])], pantry: [{ name: "Uova", qty: "6" }], planned: giaNelPiano, random: first });
    expect(names(plan[0])).toEqual(["Uova 2"]);
  });
  it("finita una scorta, preferisce le ricette che usano ancora qualcosa della dispensa", () => {
    // 4 uova: dopo la prima frittata sono finite. Tra "Uova due" (tutta da
    // comprare) e le zucchine (manca solo una cosa, il resto c'è) vince la seconda.
    const recipes = [
      primo("Frittata", [["Uova", "4"]]), primo("Uova due", [["Uova", "4"]]),
      primo("Pasta zucchine e pinoli", [["Zucchine", "2"], ["Pinoli", "20 g"]]),
    ];
    const plan = planWeek({ slots: PRIMI.slice(0, 2), recipes, pantry: [{ name: "Uova", qty: "4" }, { name: "Zucchine", qty: "4" }], random: (() => { let n = 0; return () => (n++ === 0 ? 0 : 0.99); })() });
    expect(plan.map((p) => p.recipe.title)).toEqual(["Frittata", "Pasta zucchine e pinoli"]);
  });
  it("le scorte q.b. (olio, sale, spezie) non entrano nel conto", () => {
    const plan = planWeek({ slots: PRIMI.slice(0, 1), recipes: [primo("Aglio e olio", [["Spaghetti", "180 g"], ["Olio EVO", "q.b."], ["Sale", "q.b."]])], pantry: [{ name: "Spaghetti", qty: "500 g" }], random: first });
    expect(plan[0].missing).toEqual([]);
  });
});

describe("shoppingList", () => {
  it("una voce per prodotto, con le quantità sommate", () => {
    const recipes = [
      primo("Salmone uno", [["Salmone", "300 g"], ["Limone", "1"]]),
      primo("Salmone due", [["Salmone", "300 g"], ["Limone", "1"]]),
    ];
    const plan = planWeek({ slots: PRIMI.slice(0, 2), recipes, pantry: [], random: first });
    expect(shoppingList(plan)).toEqual([{ name: "Salmone", qty: "600 g" }, { name: "Limone", qty: "2" }]);
  });
  it("i pezzi si arrotondano per eccesso e le unità libere valgono 1", () => {
    const plan = planWeek({ slots: PRIMI.slice(0, 1), recipes: [primo("Zuppa", [["Cipolla", "0,5"], ["Pane", "2 fette"], ["Latte", "1,2 l"]])], pantry: [], random: first });
    expect(shoppingList(plan)).toEqual([
      { name: "Cipolla", qty: "1" }, { name: "Pane", qty: "1" }, { name: "Latte", qty: "1,2 l" },
    ]);
  });
});
