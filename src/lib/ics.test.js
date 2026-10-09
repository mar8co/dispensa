import { describe, it, expect } from "vitest";
import { mealsToIcs, reminderMinutes } from "./ics.js";

const NOW = new Date("2026-10-09T10:00:00Z");

describe("mealsToIcs", () => {
  it("pranzo alle 13:00 e cena alle 20:30, con l'emoji giusta", () => {
    const ics = mealsToIcs([
      { id: "a", date: "2026-10-10", slot: "pranzo", title: "Pasta al limone" },
      { id: "b", date: "2026-10-10", slot: "cena", title: "Frittata" },
    ], NOW);
    expect(ics).toContain("SUMMARY:🥗 Pasta al limone");
    expect(ics).toContain("SUMMARY:🍳 Frittata");
    // inizio e fine coincidono
    expect(ics).toContain("DTSTART;TZID=Europe/Rome:20261010T130000");
    expect(ics).toContain("DTEND;TZID=Europe/Rome:20261010T130000");
    expect(ics).toContain("DTSTART;TZID=Europe/Rome:20261010T203000");
    expect(ics).toContain("DTEND;TZID=Europe/Rome:20261010T203000");
    expect(ics).toContain("UID:a@dispensa");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain("X-WR-CALNAME:Dispensa");
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
  it("l'avviso parte in tempo per cucinare", () => {
    const ics = mealsToIcs([
      { id: "a", date: "2026-10-10", slot: "pranzo", title: "Veloce", time: "15 min" },
      { id: "b", date: "2026-10-10", slot: "cena", title: "Lenta", time: "50 min" },
    ], NOW);
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("TRIGGER:-PT60M");
  });
  it("protegge virgole e punti e virgola", () => {
    const ics = mealsToIcs([{ id: "c", date: "2026-10-31", slot: "cena", title: "Riso, piselli; e basta" }], NOW);
    expect(ics).toContain("SUMMARY:🍳 Riso\\, piselli\\; e basta");
  });
  it("salta le voci senza data o senza titolo", () => {
    const ics = mealsToIcs([{ id: "d", date: "", slot: "cena", title: "X" }, { id: "e", date: "2026-10-10", slot: "cena", title: "" }], NOW);
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});

describe("reminderMinutes", () => {
  it("tempo della ricetta + 10 minuti, tra 30 minuti e 2 ore", () => {
    expect(reminderMinutes("")).toBe(30);        // piatto libero
    expect(reminderMinutes("10 min")).toBe(30);  // mai meno di mezz'ora
    expect(reminderMinutes("25 min")).toBe(35);
    expect(reminderMinutes("1 h 10 min")).toBe(80);
    expect(reminderMinutes("1 ora")).toBe(70);
    expect(reminderMinutes("3 h")).toBe(120);    // mai più di due ore
  });
});
