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
  it("conta ciò che non riconosce", () => {
    const { items, unknown } = parseSpokenList("latte e detersivo per i piatti");
    expect(items.length).toBe(2);
    expect(unknown).toBe(1);
  });
});
