import { describe, it, expect } from "vitest";
import {
  guessCategory, categorize, correctName, parseQty, normalizeWeight, mergeQty, scaleQty,
  subtractQty, qtyStep, adjustQty, atMinQty, formatQtyDisplay, isStapleQb, isQbQty, isQbIngredient, stripParens, norm, findMatch,
  daysUntilExpiry, expiryStatus, formatExpiry,
} from "./pantry.js";

// Data ISO (YYYY-MM-DD) a +N giorni da oggi, per test stabili sulle scadenze.
function isoIn(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

describe("guessCategory", () => {
  it("il freezer vince su tutto", () => {
    expect(guessCategory("gelato al pistacchio")).toBe("Surgelati");
    expect(guessCategory("spinaci surgelati")).toBe("Surgelati");
  });
  it("classifica per parola chiave più lunga", () => {
    expect(guessCategory("Pomodori")).toBe("Verdura");
    expect(guessCategory("Parmigiano")).toBe("Latticini");
    expect(guessCategory("Tonno in scatola")).toBe("Conserve");
  });
  it("null se vuoto o sconosciuto", () => {
    expect(guessCategory("")).toBeNull();
    expect(guessCategory("oggetto misterioso xyz")).toBeNull();
  });
  it("riconosce i formati di pasta come Pasta, Riso e Cereali", () => {
    for (const p of ["Rigatoni", "Penne", "Fusilli", "Spaghetti", "Farfalle",
      "Orecchiette", "Tagliatelle", "Tortellini", "Linguine", "Paccheri"]) {
      expect(guessCategory(p)).toBe("Pasta, Riso e Cereali");
    }
  });
  it("la pasta vince anche con marca/formato nel nome", () => {
    expect(guessCategory("Farfalle Barilla 500g")).toBe("Pasta, Riso e Cereali");
  });
});

describe("categorize", () => {
  it("il dizionario locale vince sulla categoria proposta dall'AI", () => {
    // L'AI mette le farfalle in "Altro": il dizionario corregge.
    expect(categorize("Farfalle", "Altro")).toBe("Pasta, Riso e Cereali");
    expect(categorize("Rigatoni", "Surgelati")).toBe("Pasta, Riso e Cereali");
  });
  it("usa la categoria AI se valida quando il dizionario non sa nulla", () => {
    expect(categorize("Oggetto misterioso xyz", "Dolci")).toBe("Dolci");
  });
  it("ripiega su Altro se né dizionario né AI danno una categoria valida", () => {
    expect(categorize("Oggetto misterioso xyz", "CategoriaInesistente")).toBe("Altro");
    expect(categorize("Oggetto misterioso xyz", null)).toBe("Altro");
  });
});

describe("correctName", () => {
  it("mette la maiuscola e lascia i nomi corretti", () => {
    expect(correctName("latte")).toBe("Latte");
  });
  it("corregge piccoli refusi sul dizionario alimentare", () => {
    expect(correctName("mozzarela")).toBe("Mozzarella");
    expect(correctName("yogrt")).toBe("Yogurt");
  });
});

describe("parseQty", () => {
  it("peso convertito in grammi", () => {
    expect(parseQty("500 g")).toMatchObject({ family: "weight", base: 500, unit: "g" });
    expect(parseQty("1 kg")).toMatchObject({ family: "weight", base: 1000, unit: "kg" });
  });
  it("volume convertito in ml", () => {
    expect(parseQty("2 l")).toMatchObject({ family: "volume", base: 2000, unit: "l" });
    expect(parseQty("250 ml")).toMatchObject({ family: "volume", base: 250 });
  });
  it("conteggio e unità libere", () => {
    expect(parseQty("3")).toMatchObject({ family: "count", base: 3, unit: "" });
    expect(parseQty("2 pacchi")).toMatchObject({ family: "count", base: 2 });
    expect(parseQty("1 spruzzo")).toMatchObject({ family: "other", base: 1, unit: "spruzzo" });
  });
  it("null senza numero", () => {
    expect(parseQty("poca quantità")).toBeNull();
  });
});

describe("normalizeWeight", () => {
  it("promuove a kg/l oltre 1000", () => {
    expect(normalizeWeight("1500 g")).toBe("1,5 kg");
    expect(normalizeWeight("1000 ml")).toBe("1 l");
  });
  it("lascia invariato sotto soglia o conteggi", () => {
    expect(normalizeWeight("800 g")).toBe("800 g");
    expect(normalizeWeight("3")).toBe("3");
  });
});

describe("mergeQty", () => {
  it("somma stesse famiglie (anche g+kg)", () => {
    expect(mergeQty("1 kg", "300 g")).toBe("1,3 kg");
    expect(mergeQty("500 g", "500 g")).toBe("1 kg");
    expect(mergeQty("2 l", "500 ml")).toBe("2,5 l");
  });
  it("somma conteggi e unità libere uguali", () => {
    expect(mergeQty("2 pacchi", "1 pacco")).toBe("3 pacchi");
    expect(mergeQty("3", "2")).toBe("5");
  });
  it("famiglie incompatibili: concatena", () => {
    expect(mergeQty("1 kg", "2 pezzi")).toBe("1 kg + 2 pezzi");
  });
});

describe("scaleQty", () => {
  it("scala i numeri mantenendo l'unità", () => {
    expect(scaleQty("100 g", 2)).toBe("200 g");
    expect(scaleQty("2", 3)).toBe("6");
  });
  it("factor 1 o assente: invariato", () => {
    expect(scaleQty("3", 1)).toBe("3");
    expect(scaleQty("3", 0)).toBe("3");
  });
});

describe("subtractQty", () => {
  it("sottrae stessa famiglia", () => {
    expect(subtractQty("1 kg", "300 g")).toEqual({ ok: true, value: "700 g" });
    expect(subtractQty("6", "2")).toEqual({ ok: true, value: "4" });
    expect(subtractQty("3 pz", "1")).toEqual({ ok: true, value: "2 pz" });
  });
  it("non scende sotto zero", () => {
    expect(subtractQty("100 g", "300 g")).toEqual({ ok: true, value: "0 g" });
  });
  it("famiglie incompatibili: ok=false e stock invariato", () => {
    expect(subtractQty("500 g", "2 pezzi")).toEqual({ ok: false, value: "500 g" });
  });
});

describe("qtyStep", () => {
  it("passo per unità", () => {
    expect(qtyStep("100 g")).toBe(50);
    expect(qtyStep("1 kg")).toBe(0.25);
    expect(qtyStep("2 l")).toBe(0.25);
    expect(qtyStep("250 ml")).toBe(250);
    expect(qtyStep("3")).toBe(1);
    expect(qtyStep("2 pz")).toBe(1);
  });
});

describe("adjustQty", () => {
  it("incrementa/decrementa al passo, agganciando ai multipli", () => {
    expect(adjustQty("2", 1)).toBe("3");
    expect(adjustQty("100 g", 1)).toBe("150 g");
    expect(adjustQty("100 g", -1)).toBe("50 g");
    expect(adjustQty("1 kg", 1)).toBe("1,25 kg");
    expect(adjustQty("0,3 kg", 1)).toBe("0,5 kg");
  });
  it("i pezzi/confezioni scendono al mezzo (½) come minimo, poi a 0", () => {
    expect(adjustQty("1", -1)).toBe("0,5");   // 1 pezzo -> mezzo
    expect(adjustQty("0,5", -1)).toBe("0");   // mezzo -> finito
    expect(adjustQty("0,5", 1)).toBe("1");    // mezzo -> 1 (risale intero)
    expect(adjustQty("3", -1)).toBe("2");
    expect(adjustQty("1 barattolo", -1)).toBe("0,5 barattolo");
  });
  it("non scende sotto zero e lascia invariato senza numero", () => {
    expect(adjustQty("50 g", -1)).toBe("0 g");
    expect(adjustQty("poca quantità", 1)).toBe("poca quantità");
  });
});

describe("atMinQty", () => {
  it("true se un altro − arriva a zero (floor: 0,5 pz / 50 g)", () => {
    expect(atMinQty("0,5")).toBe(true);  // mezzo pezzo è il minimo
    expect(atMinQty("1")).toBe(false);   // da 1 si può scendere a 0,5
    expect(atMinQty("50 g")).toBe(true);
    expect(atMinQty("2")).toBe(false);
    expect(atMinQty("100 g")).toBe(false);
  });
});

describe("formatQtyDisplay", () => {
  it("mostra ½ solo per il mezzo pezzo (non per pesi/volumi)", () => {
    expect(formatQtyDisplay("0,5")).toBe("½");
    expect(formatQtyDisplay("0,5 barattolo")).toBe("½ barattolo");
    expect(formatQtyDisplay("1")).toBe("1");
    expect(formatQtyDisplay("2 pz")).toBe("2 pz");
    expect(formatQtyDisplay("0,5 kg")).toBe("0,5 kg"); // i pesi restano numerici
    expect(formatQtyDisplay("500 g")).toBe("500 g");
  });
});

describe("isStapleQb", () => {
  it("scorte q.b.: tutta la categoria Spezie ed Erbe", () => {
    expect(isStapleQb("Origano", "Spezie ed Erbe")).toBe(true);
    expect(isStapleQb("Pepe nero", "Spezie ed Erbe")).toBe(true);
  });
  it("scorte q.b. per nome (olio, aceto, sale, zucchero, burro, ...)", () => {
    expect(isStapleQb("Olio EVO", "Condimenti e Salse")).toBe(true);
    expect(isStapleQb("Aceto balsamico", "Condimenti e Salse")).toBe(true);
    expect(isStapleQb("Sale fino", "Altro")).toBe(true);
    expect(isStapleQb("Zucchero", "Dolci")).toBe(true);
    expect(isStapleQb("Burro", "Latticini")).toBe(true);
    expect(isStapleQb("Salsa di soia", "Condimenti e Salse")).toBe(true);
  });
  it("NON sono q.b.: si scalano normalmente", () => {
    expect(isStapleQb("Pesto", "Condimenti e Salse")).toBe(false);
    expect(isStapleQb("Passata di pomodoro", "Conserve")).toBe(false);
    expect(isStapleQb("Maionese", "Condimenti e Salse")).toBe(false);
    expect(isStapleQb("Farina", "Pasta, Riso e Cereali")).toBe(false);
    expect(isStapleQb("Peperoni", "Verdura")).toBe(false); // "pepe" non aggancia "peperoni"
    expect(isStapleQb("Olive", "Conserve")).toBe(false);   // "olio" non aggancia "olive"
  });
});

describe("isQbQty", () => {
  it("riconosce la dose q.b. dalla ricetta", () => {
    expect(isQbQty("q.b.")).toBe(true);
    expect(isQbQty("qb")).toBe(true);
    expect(isQbQty("a piacere")).toBe(true);
    expect(isQbQty("quanto basta")).toBe(true);
  });
  it("le dosi numeriche non sono q.b.", () => {
    expect(isQbQty("120 g")).toBe(false);
    expect(isQbQty("2")).toBe(false);
  });
});

describe("isQbIngredient", () => {
  it("tutta la categoria Spezie ed Erbe e Condimenti e Salse -> q.b.", () => {
    expect(isQbIngredient("Olio EVO", "15 ml")).toBe(true);
    expect(isQbIngredient("Prezzemolo", "5 g")).toBe(true);
    expect(isQbIngredient("Sale fino", "q.b.")).toBe(true);
    expect(isQbIngredient("Pepe nero", "2 g")).toBe(true);
    expect(isQbIngredient("Aceto balsamico", "20 ml")).toBe(true);
    expect(isQbIngredient("Pesto", "30 g")).toBe(true);
    expect(isQbIngredient("Maionese", "1 cucchiaio")).toBe(true);
    expect(isQbIngredient("Salsa di soia", "10 ml")).toBe(true);
    expect(isQbIngredient("Limone", "0,3")).toBe(true); // agrume a piacere
  });
  it("ingredienti con grammatura reale restano numerici", () => {
    expect(isQbIngredient("Brodo di pollo", "150 ml")).toBe(false);
    expect(isQbIngredient("Zucchero", "100 g")).toBe(false); // serve la dose nella ricetta
    expect(isQbIngredient("Burro", "50 g")).toBe(false);
    expect(isQbIngredient("Couscous", "150 g")).toBe(false);
    expect(isQbIngredient("Ceci", "0,5 lattina")).toBe(false);
  });
});

describe("stripParens", () => {
  it("toglie i chiarimenti tra parentesi dai nomi", () => {
    expect(stripParens("Insalata (da lattuga)")).toBe("Insalata");
    expect(stripParens("Pomodori (San Marzano, pelati)")).toBe("Pomodori");
    expect(stripParens("Parmigiano")).toBe("Parmigiano");
    expect(stripParens("Latte intero (fresco) di mucca")).toBe("Latte intero di mucca");
  });
});

describe("norm", () => {
  it("minuscolo, niente parentesi né punteggiatura", () => {
    expect(norm("Pomodori (bio) 2!")).toBe("pomodori 2");
    expect(norm("Caffè")).toBe("caffè");
  });
});

describe("findMatch", () => {
  const items = [{ name: "Pomodorini" }, { name: "Latte intero" }];
  it("trova per uguaglianza o inclusione", () => {
    expect(findMatch("pomodorini", items)).toBe(items[0]);
    expect(findMatch("Latte", items)).toBe(items[1]);
  });
  it("null se nessun prodotto compatibile", () => {
    expect(findMatch("Zucchine", items)).toBeNull();
  });
});

describe("scadenze", () => {
  it("daysUntilExpiry", () => {
    expect(daysUntilExpiry(isoIn(0))).toBe(0);
    expect(daysUntilExpiry(isoIn(5))).toBe(5);
    expect(daysUntilExpiry(null)).toBeNull();
    expect(daysUntilExpiry("non-una-data")).toBeNull();
  });
  it("expiryStatus", () => {
    expect(expiryStatus(isoIn(-1))).toBe("scaduto");
    expect(expiryStatus(isoIn(0))).toBe("oggi");
    expect(expiryStatus(isoIn(2))).toBe("presto");
    expect(expiryStatus(isoIn(5))).toBe("settimana");
    expect(expiryStatus(isoIn(10))).toBe("ok");
    expect(expiryStatus(null)).toBeNull();
  });
  it("formatExpiry", () => {
    expect(formatExpiry(isoIn(-1))).toBe("Scaduto");
    expect(formatExpiry(isoIn(0))).toBe("Scade oggi");
    expect(formatExpiry(isoIn(1))).toBe("Scade domani");
    expect(formatExpiry(isoIn(3))).toBe("Tra 3 gg");
    expect(formatExpiry(isoIn(20))).toContain("/");
  });
});
