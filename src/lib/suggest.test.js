import { describe, it, expect } from "vitest";
import { rankCookable } from "./suggest.js";
import { findMatch } from "./pantry.js";
import BASE from "../data/ricetteBase.js";

const pantry = [{ name: "Spaghetti" }, { name: "Passata di pomodoro" }, { name: "Aglio" }, { name: "Uova" }, { name: "Zucchine" }];
const has = (n) => !!findMatch(n, pantry);

describe("ricettario di base", () => {
  it("ogni ricetta ha titolo, ingredienti con dose e passaggi", () => {
    expect(BASE.length).toBeGreaterThan(25);
    for (const r of BASE) {
      expect(r.title).toBeTruthy();
      expect(r.ingredients.length).toBeGreaterThan(1);
      expect(r.ingredients.every((i) => i.name && i.qty)).toBe(true);
      expect(r.steps.length).toBeGreaterThan(0);
    }
    expect(new Set(BASE.map((r) => r.title)).size).toBe(BASE.length);
  });
});

describe("rankCookable", () => {
  it("le scorte q.b. non contano tra i mancanti", () => {
    const res = rankCookable(BASE, has, [], 0);
    expect(res.map((x) => x.recipe.title)).toContain("Spaghetti al pomodoro");
    expect(res.every((x) => x.missing.length === 0)).toBe(true);
  });
  it("ammette i mancanti fino al limite e li elenca", () => {
    const res = rankCookable(BASE, has, [], 1);
    const fr = res.find((x) => x.recipe.title === "Frittata di zucchine");
    expect(fr.missing).toEqual(["Parmigiano"]);
    expect(res.find((x) => x.recipe.title === "Carbonara")).toBeUndefined();
  });
  it("a parità mette prima ciò che usa i prodotti in scadenza", () => {
    const a = { title: "A", ingredients: [{ name: "Spaghetti", qty: "100 g" }] };
    const b = { title: "B", ingredients: [{ name: "Zucchine", qty: "2" }] };
    const res = rankCookable([a, b], has, [{ name: "Zucchine" }], 0);
    expect(res.map((x) => x.recipe.title)).toEqual(["B", "A"]);
  });
  it("salta i titoli doppi (vince il primo)", () => {
    const a = { title: "Pasta", ingredients: [{ name: "Spaghetti", qty: "100 g" }] };
    expect(rankCookable([a, { ...a }], has, [], 0).length).toBe(1);
  });
});
