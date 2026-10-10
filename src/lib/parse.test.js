import { describe, it, expect } from "vitest";
import { catalogAtStart, cleanBarcodeName, parseSpokenList } from "./parse.js";

describe("catalogAtStart", () => {
  it("trova il prodotto più lungo con cui inizia il testo", () => {
    expect(catalogAtStart("yogurt greco bianco")).toBe("Yogurt greco");
    expect(catalogAtStart("spaghetti n 5")).toBe("Spaghetti");
    expect(catalogAtStart("caffe macinato")).toBe("Caffè");
  });
  it("non vale un match più avanti nella frase", () => {
    expect(catalogAtStart("crema di nocciole")).toBe(null);
  });
});

describe("cleanBarcodeName", () => {
  it("toglie marca, peso e formato", () => {
    expect(cleanBarcodeName("Barilla Spaghetti n.5 500g", "Barilla")).toMatchObject({ name: "Spaghetti", category: "Pasta, Riso e Cereali", resolved: true });
    expect(cleanBarcodeName("Meteora yogurt greco 0% 500 g", "Meteora")).toMatchObject({ name: "Yogurt greco", category: "Latticini", resolved: true });
    expect(cleanBarcodeName("Acqua naturale 1,5L PET", "Rosa Blu")).toMatchObject({ name: "Acqua naturale", resolved: true });
  });
  it("le marche-sinonimo diventano il nome generico", () => {
    expect(cleanBarcodeName("Macine 350g", "Mulino Bianco")).toMatchObject({ name: "Biscotti", category: "Dolci", resolved: true });
  });
  it("tiene il nome ripulito se il dizionario ne conosce la categoria", () => {
    expect(cleanBarcodeName("Crema di nocciole 350g", "")).toMatchObject({ name: "Crema di nocciole", category: "Dolci", resolved: true });
  });
  it("dice quando non sa", () => {
    expect(cleanBarcodeName("Xyz Qwerty 200g", "")).toMatchObject({ resolved: false });
    expect(cleanBarcodeName("", "")).toMatchObject({ name: "", resolved: false });
  });
});

describe("parseSpokenList", () => {
  it("divide la frase e legge numeri e confezioni", () => {
    const { items, unknown } = parseSpokenList("pane, un pacco di pasta, il latte e sei uova");
    expect(unknown).toBe(0);
    expect(items.map((x) => [x.name, x.qty])).toEqual([["Pane", "1"], ["Pasta", "1"], ["Latte", "1"], ["Uova", "6"]]);
  });
  it("legge pesi e volumi, anche con il mezzo", () => {
    const { items } = parseSpokenList("mezzo chilo di patate, due litri di latte e un chilo e mezzo di mele, 200 grammi di prosciutto cotto, due etti di mortadella");
    expect(items.map((x) => [x.name, x.qty])).toEqual([
      ["Patate", "500 g"], ["Latte", "2 l"], ["Mele", "1,5 kg"], ["Prosciutto cotto", "200 g"], ["Mortadella", "200 g"],
    ]);
  });
  it("assegna la categoria dal dizionario", () => {
    const { items } = parseSpokenList("tre zucchine e una mozzarella");
    expect(items).toEqual([
      { name: "Zucchine", qty: "3", category: "Verdura" },
      { name: "Mozzarella", qty: "1", category: "Latticini" },
    ]);
  });
  it("senza pause: un numero apre un prodotto nuovo", () => {
    const { items } = parseSpokenList("una pera due zucchine quattro pesce");
    expect(items.map((x) => [x.name, x.qty])).toEqual([["Pere", "1"], ["Zucchine", "2"], ["Pesce", "4"]]);
    const b = parseSpokenList("due pacchi di pasta 3 mozzarelle un litro di latte");
    expect(b.items.map((x) => [x.name, x.qty])).toEqual([["Pasta", "2"], ["Mozzarella", "3"], ["Latte", "1 l"]]);
  });
  it("i numeri che fanno parte del nome non dividono", () => {
    expect(parseSpokenList("farina 00").items.length).toBe(1);
    expect(parseSpokenList("spaghetti numero 5").items.length).toBe(1);
  });
  it("senza pause e senza numeri: divide sui prodotti che conosce", () => {
    const { items } = parseSpokenList("pane latte uova");
    expect(items.map((x) => x.name)).toEqual(["Pane", "Latte", "Uova"]);
    // un nome con la sua specifica resta intero
    expect(parseSpokenList("tonno fresco").items.length).toBe(1);
    expect(parseSpokenList("latte di mandorla").items.length).toBe(1);
    expect(parseSpokenList("yogurt greco").items.length).toBe(1);
  });
  it("conta ciò che non riconosce", () => {
    const { items, unknown } = parseSpokenList("latte e detersivo per i piatti");
    expect(items.length).toBe(2);
    expect(unknown).toBe(1);
  });
});
