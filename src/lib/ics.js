// Calendario Alimentare → calendario del telefono (Apple, Google, Outlook…).
// Produce un file .ics standard (RFC 5545): un evento per ogni pasto, col nome
// del piatto preceduto da un'emoji — 🥗 pranzo, 🍳 cena — all'ORA in cui si
// mangia (pranzo 13:00, cena 20:30; inizio e fine coincidono: è un promemoria,
// non un impegno che occupa la giornata) e con un avviso prima.
// Logica pura (testata in ics.test.js); lo serve server/calendar.js.

const EMOJI = { pranzo: "🥗", cena: "🍳" };
const ORA = { pranzo: "130000", cena: "203000" };

// Nel testo di un evento virgola, punto e virgola e barra vanno protetti.
const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, " ");
const compact = (iso) => iso.replace(/-/g, "");

// Quanto prima avvisare: il tempo per cucinare, così l'avviso suona quando è
// ora di mettersi ai fornelli e non quando è già tardi. Tempo della ricetta
// ("25 min", "1 h 10 min") + 10 minuti di margine, arrotondato ai 5; mai meno
// di 30 minuti né più di 2 ore. Senza ricetta (piatto libero): 30 minuti.
export function reminderMinutes(time) {
  const s = String(time || "").toLowerCase();
  const h = s.match(/(\d+)\s*(?:h|or[ae])/);
  const m = s.match(/(\d+)\s*min/);
  const cook = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  if (!cook) return 30;
  return Math.min(120, Math.max(30, Math.ceil((cook + 10) / 5) * 5));
}

// Fuso di Roma, con l'ora legale: gli orari restano 13:00 e 20:30 tutto l'anno.
const FUSO = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Rome",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

// meals: [{ id, date: "YYYY-MM-DD", slot: "pranzo" | "cena", title, time? }]
// (`time` = tempo della ricetta, es. "25 min": decide quanto prima avvisare.)
// L'UID è legato al pasto: rileggendo il calendario gli eventi si AGGIORNANO
// invece di raddoppiare.
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
    "X-WR-TIMEZONE:Europe/Rome",
    "X-APPLE-CALENDAR-COLOR:#DCCEB3",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
    ...FUSO,
  ];
  for (const m of meals) {
    if (!m?.date || !m?.title) continue;
    const slot = m.slot === "cena" ? "cena" : "pranzo";
    const quando = `${compact(m.date)}T${ORA[slot]}`;
    const titolo = `${EMOJI[slot]} ${esc(m.title)}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id || `${m.date}-${m.slot}`}@dispensa`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Rome:${quando}`,
      `DTEND;TZID=Europe/Rome:${quando}`,
      `SUMMARY:${titolo}`,
      "TRANSP:TRANSPARENT", // non occupa la giornata
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${titolo}`,
      `TRIGGER:-PT${reminderMinutes(m.time)}M`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
