import { describe, it, expect } from "vitest";
import { withArticle, expiringPhrase, expiredPhrase } from "./italiano.js";

describe("articolo davanti al prodotto", () => {
  it.each([
    ["Latte", "Il latte"], ["Pane", "Il pane"], ["Riso", "Il riso"], ["Tonno fresco", "Il tonno fresco"],
    ["Panna", "La panna"], ["Mozzarella", "La mozzarella"], ["Carne", "La carne"],
    ["Zucchine", "Le zucchine"], ["Uova", "Le uova"], ["Mele", "Le mele"], ["Patate", "Le patate"],
    ["Tagliatelle", "Le tagliatelle"], ["Polpette", "Le polpette"],
    ["Ceci", "I ceci"], ["Pomodorini", "I pomodorini"], ["Limoni", "I limoni"],
    ["Spinaci", "Gli spinaci"], ["Gnocchi", "Gli gnocchi"], ["Asparagi", "Gli asparagi"],
    ["Yogurt greco", "Lo yogurt greco"], ["Zucchero", "Lo zucchero"], ["Spezzatino", "Lo spezzatino"],
    ["Olio EVO", "L'olio EVO"], ["Aglio", "L'aglio"], ["Insalata", "L'insalata"],
    ["Kiwi", "Il kiwi"], ["Petto di pollo", "Il petto di pollo"],
  ])("%s → %s", (name, expected) => {
    expect(withArticle(name)).toBe(expected);
  });
});

describe("frasi delle scadenze", () => {
  it("sta / stanno scadendo", () => {
    expect(expiringPhrase("Latte")).toBe("Il latte sta scadendo");
    expect(expiringPhrase("Zucchine")).toBe("Le zucchine stanno scadendo");
    expect(expiringPhrase("Uova")).toBe("Le uova stanno scadendo");
    expect(expiringPhrase("Spinaci")).toBe("Gli spinaci stanno scadendo");
  });
  it("scaduto concorda in genere e numero", () => {
    expect(expiredPhrase("Latte")).toBe("Il latte è scaduto");
    expect(expiredPhrase("Panna")).toBe("La panna è scaduta");
    expect(expiredPhrase("Uova")).toBe("Le uova sono scadute");
    expect(expiredPhrase("Ceci")).toBe("I ceci sono scaduti");
  });
});
