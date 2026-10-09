import { describe, it, expect } from "vitest";
import { parsePrefs, allowedBy } from "./prefs.js";
import { planWeek } from "./planner.js";
import BASE from "../data/ricetteBase.js";

const byTitle = (t) => BASE.find((r) => r.title === t);
const ok = (prefs, title) => allowedBy(prefs)(byTitle(title));

describe("parsePrefs", () => {
  it("capisce gli elenchi di cibi esclusi", () => {
    expect(parsePrefs("no peperoni e no melanzane").labels).toEqual(["peperoni", "melanzane"]);
    expect(parsePrefs("Niente funghi, cipolla e aglio.").terms).toEqual(["funghi", "cipolla", "aglio"]);
    expect(parsePrefs("non mi piacciono i peperoni e le melanzane").terms).toEqual(["peperoni", "melanzane"]);
    expect(parsePrefs("allergico alle noci").terms).toEqual(["noci"]);
  });
  it("riconosce gruppi e diete", () => {
    expect([...parsePrefs("sono intollerante al lattosio e non mangio pesce").groups]).toEqual(["latticini", "pesce"]);
    expect([...parsePrefs("senza glutine").groups]).toEqual(["glutine"]);
    expect([...parsePrefs("Vegetariano").groups]).toEqual(["carne", "pesce"]);
    expect([...parsePrefs("allergia ai frutti di mare").groups]).toEqual(["crostacei e molluschi"]);
  });
  it("non scambia il resto della frase per un'esclusione", () => {
    expect(parsePrefs("pochi fritti, poco sale")).toMatchObject({ terms: [], labels: [] });
    const r = parsePrefs("senza glutine, mi piace il pesce");
    expect([...r.groups]).toEqual(["glutine"]);
    expect(r.terms).toEqual([]);
    expect([...parsePrefs("no carne, vegano no").groups]).toContain("carne");
  });
  it("mostra solo ciò che sa applicare", () => {
    expect(parsePrefs("no fritti e no melanzane").labels).toEqual(["melanzane"]);
    expect(parsePrefs("").labels).toEqual([]);
  });
});

describe("allowedBy", () => {
  it("no peperoni e no melanzane", () => {
    const prefs = "no peperoni e no melanzane";
    expect(ok(prefs, "Parmigiana di melanzane")).toBe(false);
    expect(ok(prefs, "Pasta alla Norma")).toBe(false);
    expect(ok(prefs, "Peperoni ripieni")).toBe(false);
    expect(ok(prefs, "Pollo ai peperoni")).toBe(false);
    // il peperoncino non è un peperone
    expect(ok(prefs, "Penne all'arrabbiata")).toBe(true);
    expect(ok(prefs, "Pasta al pesto")).toBe(true);
  });
  it("vegetariano: niente carne né pesce, anche quando sono solo un ingrediente", () => {
    expect(ok("vegetariano", "Carbonara")).toBe(false);
    expect(ok("vegetariano", "Lasagne al ragù")).toBe(false);
    expect(ok("vegetariano", "Salmone in padella")).toBe(false);
    expect(ok("vegetariano", "Pasta al tonno")).toBe(false);
    expect(ok("vegetariano", "Frittata di zucchine")).toBe(true);
  });
  it("vegano: fuori anche uova e latticini", () => {
    expect(ok("vegana", "Frittata di zucchine")).toBe(false);
    expect(ok("vegana", "Risotto alla parmigiana")).toBe(false);
    expect(ok("vegana", "Pasta aglio, olio e peperoncino")).toBe(true);
  });
  it("senza glutine e senza lattosio", () => {
    expect(ok("senza glutine", "Spaghetti al pomodoro")).toBe(false);
    expect(ok("senza glutine", "Risotto alla parmigiana")).toBe(true);
    expect(ok("no latticini", "Risotto alla parmigiana")).toBe(false);
    expect(ok("no latticini", "Ceci al curry")).toBe(true); // il latte di cocco non è un latticino
  });
  it("senza esigenze passa tutto", () => {
    expect(BASE.every(allowedBy(""))).toBe(true);
    expect(BASE.every(allowedBy("pochi fritti"))).toBe(true);
  });
  it("il piano della settimana non propone ciò che è escluso", () => {
    const allowed = allowedBy("no peperoni e no melanzane, vegetariano");
    const week = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
    const slots = week.flatMap((date) => [{ date, slot: "pranzo" }, { date, slot: "cena" }]);
    for (const random of [() => 0, () => 0.5, () => 0.99]) {
      const plan = planWeek({ slots, recipes: BASE.filter(allowed), pantry: [{ name: "Melanzane", qty: "3" }, { name: "Peperoni", qty: "2" }, { name: "Petto di pollo", qty: "500 g" }], random });
      expect(plan.length).toBe(14);
      for (const p of plan) {
        const text = `${p.recipe.title} ${p.recipe.ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
        expect(text).not.toMatch(/melanzan|peperoni\b|pollo|salmone/);
      }
    }
  });
});
