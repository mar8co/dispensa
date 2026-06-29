import { describe, it, expect } from "vitest";
import { bumpedHistory, sortedNames } from "./history.js";

describe("bumpedHistory", () => {
  it("aggiunge e incrementa i nomi", () => {
    let h = bumpedHistory({}, ["Pane", "Latte"]);
    expect(h["pane"].count).toBe(1);
    expect(h["latte"].count).toBe(1);
    h = bumpedHistory(h, ["Pane"]);
    expect(h["pane"].count).toBe(2);
  });
  it("normalizza la chiave ma conserva il nome originale", () => {
    const h = bumpedHistory({}, ["Pomodorini"]);
    expect(Object.keys(h)).toContain("pomodorini");
    expect(h["pomodorini"].name).toBe("Pomodorini");
  });
  it("ignora i nomi vuoti o nulli", () => {
    const h = bumpedHistory({}, ["", "   ", null, undefined]);
    expect(Object.keys(h)).toHaveLength(0);
  });
  it("non muta l'oggetto storico originale", () => {
    const orig = {};
    bumpedHistory(orig, ["Pane"]);
    expect(orig).toEqual({});
  });
});

describe("sortedNames", () => {
  it("ordina per frequenza, poi per recenza", () => {
    const hist = {
      a: { name: "Pane", count: 3, last: 100 },
      b: { name: "Latte", count: 5, last: 50 },
      c: { name: "Uova", count: 3, last: 200 },
    };
    expect(sortedNames(hist)).toEqual(["Latte", "Uova", "Pane"]);
  });
});
