import { describe, it, expect } from "vitest";
import { mealsToIcs } from "./ics.js";

const NOW = new Date("2026-10-09T10:00:00Z");

describe("mealsToIcs", () => {
  it("un evento tutto il giorno per pasto, con l'emoji giusta", () => {
    const ics = mealsToIcs([
      { id: "a", date: "2026-10-10", slot: "pranzo", title: "Pasta al limone" },
      { id: "b", date: "2026-10-10", slot: "cena", title: "Frittata" },
    ], NOW);
    expect(ics).toContain("SUMMARY:🥗 Pasta al limone");
    expect(ics).toContain("SUMMARY:🍳 Frittata");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261010");
    expect(ics).toContain("DTEND;VALUE=DATE:20261011");
    expect(ics).toContain("UID:a@dispensa");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
  it("la fine scavalca il mese e protegge virgole e punti e virgola", () => {
    const ics = mealsToIcs([{ id: "c", date: "2026-10-31", slot: "cena", title: "Riso, piselli; e basta" }], NOW);
    expect(ics).toContain("DTEND;VALUE=DATE:20261101");
    expect(ics).toContain("SUMMARY:🍳 Riso\\, piselli\\; e basta");
  });
  it("salta le voci senza data o senza titolo", () => {
    const ics = mealsToIcs([{ id: "d", date: "", slot: "cena", title: "X" }, { id: "e", date: "2026-10-10", slot: "cena", title: "" }], NOW);
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});
