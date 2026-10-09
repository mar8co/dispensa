import { describe, it, expect } from "vitest";
import { recipesForOccasion, OCCASIONI_NOTE } from "./occasions.js";
import BASE from "../data/ricetteBase.js";
import { MODES } from "../constants.js";

const niente = () => false;

describe("ricette per occasione", () => {
  it("ogni occasione dell'app ha la sua regola e almeno tre ricette", () => {
    for (const m of MODES) {
      expect(OCCASIONI_NOTE).toContain(m.id);
      expect(recipesForOccasion(m.id, BASE, niente).length, m.id).toBeGreaterThanOrEqual(3);
    }
  });
  it("al massimo cinque, e un'occasione sconosciuta non dà nulla", () => {
    expect(recipesForOccasion("Pranzo veloce", BASE, niente).length).toBeLessThanOrEqual(5);
    expect(recipesForOccasion("Boh", BASE, niente)).toEqual([]);
  });
  it("pranzo veloce: solo piatti da 20 minuti al massimo", () => {
    for (const { recipe } of recipesForOccasion("Pranzo veloce", BASE, niente, [], 50)) {
      expect(parseInt(recipe.time, 10)).toBeLessThanOrEqual(20);
    }
  });
  it("dolci: solo dolci; pesce: solo piatti col pesce", () => {
    for (const { recipe } of recipesForOccasion("Dolci & dessert", BASE, niente, [], 50)) expect(recipe.tipo).toBe("dolci");
    expect(recipesForOccasion("Pesce e mare", BASE, niente, [], 50).every((x) => x.recipe.tipo !== "dolci")).toBe(true);
  });
  it("prima le ricette a cui manca meno", () => {
    const hoTutto = () => true;
    expect(recipesForOccasion("Pranzo veloce", BASE, hoTutto)[0].missing).toEqual([]);
  });
});
