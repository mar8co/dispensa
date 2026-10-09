import { describe, it, expect } from "vitest";
import { planWeek, freeSlots } from "./planner.js";
import { findMatch } from "./pantry.js";
import BASE from "../data/ricetteBase.js";

const WEEK = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]; // lun → dom
const ALL = WEEK.flatMap((date) => [{ date, slot: "pranzo" }, { date, slot: "cena" }]);
const pantry = ["Spaghetti", "Passata di pomodoro", "Aglio", "Uova", "Zucchine", "Parmigiano", "Petto di pollo", "Limone", "Riso", "Cipolla", "Patate"].map((name) => ({ name }));
const has = (n) => !!findMatch(n, pantry);
const first = () => 0; // "caso" fisso: sempre la prima scelta

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
    const plan = planWeek({ slots: ALL, recipes: BASE, hasIngredient: has, random: first });
    expect(plan.length).toBe(14);
    expect(new Set(plan.map((p) => p.recipe.title)).size).toBe(14);
    expect(plan.map((p) => `${p.date}|${p.slot}`)).toEqual(ALL.map((s) => `${s.date}|${s.slot}`));
  });
  it("non propone mai contorni né dolci", () => {
    for (const random of [first, () => 0.5, () => 0.99]) {
      const plan = planWeek({ slots: ALL, recipes: BASE, hasIngredient: has, random });
      for (const p of plan) expect(["contorni", "dolci"]).not.toContain(p.recipe.tipo);
    }
  });
  it("a pranzo del lunedì un primo, a cena un secondo di carne", () => {
    const plan = planWeek({ slots: ALL.slice(0, 2), recipes: BASE, hasIngredient: has, random: first });
    expect(plan[0].recipe.tipo).toBe("primi");
    expect(plan[1].recipe.tipo).toBe("carne");
  });
  it("parte da ciò che c'è: sceglie tra le ricette a cui manca meno ed elenca i mancanti", () => {
    const plan = planWeek({ slots: ALL.slice(0, 1), recipes: BASE, hasIngredient: has, random: first });
    expect(plan[0].missing).toEqual([]);
    const empty = planWeek({ slots: ALL.slice(0, 1), recipes: BASE, hasIngredient: () => false, random: first });
    expect(empty[0].missing.length).toBeGreaterThan(0);
  });
  it("preferisce chi consuma un prodotto in scadenza", () => {
    const a = { title: "A", tipo: "primi", ingredients: [{ name: "Spaghetti", qty: "100 g" }] };
    const b = { title: "B", tipo: "primi", ingredients: [{ name: "Zucchine", qty: "2" }] };
    const plan = planWeek({ slots: ALL.slice(0, 1), recipes: [a, b], hasIngredient: has, expiring: [{ name: "Zucchine" }], random: () => 0.99 });
    expect(plan[0].recipe.title).toBe("B");
  });
  it("le ricette dell'utente (senza tipo) valgono per ogni pasto, tranne i dolci", () => {
    const mia = { title: "La mia pasta", ingredients: [{ name: "Spaghetti", qty: "100 g" }] };
    const torta = { title: "La mia torta", ingredients: [{ name: "Zucchero", qty: "100 g" }, { name: "Uova", qty: "2" }] };
    const plan = planWeek({ slots: ALL.slice(0, 2), recipes: [torta, mia], hasIngredient: has, random: first });
    expect(plan.map((p) => p.recipe.title)).toEqual(["La mia pasta"]);
  });
});
