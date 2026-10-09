// Calendario Alimentare → calendario del telefono (Apple, Google, Outlook…).
// Produce un file .ics standard (RFC 5545): un evento "tutto il giorno" per
// ogni pasto, col nome del piatto preceduto da un'emoji — 🥗 pranzo, 🍳 cena.
// Logica pura (testata in ics.test.js); l'invio del file sta in PlanWeek.

const EMOJI = { pranzo: "🥗", cena: "🍳" };

// Nel testo di un evento virgola, punto e virgola e barra vanno protetti.
const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, " ");
const compact = (iso) => iso.replace(/-/g, "");
// Il giorno dopo (la fine di un evento "tutto il giorno" è esclusa).
function nextDay(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// meals: [{ id, date: "YYYY-MM-DD", slot: "pranzo" | "cena", title }]
// L'UID è legato al pasto: salvando di nuovo lo stesso calendario gli eventi
// si AGGIORNANO invece di raddoppiare (se l'app calendario lo rispetta).
export function mealsToIcs(meals, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dispensa//Calendario Alimentare//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // Calendario in abbonamento: nome, colore (il beige del marchio; lo
    // rispettano i calendari Apple) e ogni quanto rileggerlo. Quest'ultimo è
    // solo un SUGGERIMENTO: la cadenza vera la decide il telefono.
    "X-WR-CALNAME:Dispensa",
    "X-APPLE-CALENDAR-COLOR:#DCCEB3",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];
  for (const m of meals) {
    if (!m?.date || !m?.title) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id || `${m.date}-${m.slot}`}@dispensa`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(m.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(m.date))}`,
      `SUMMARY:${EMOJI[m.slot] || EMOJI.pranzo} ${esc(m.title)}`,
      "TRANSP:TRANSPARENT", // non occupa la giornata
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
