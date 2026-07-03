// Calendario di scadenza in-app: sostituisce il date picker nativo di iOS, che
// si apre SEMPRE "su oggi" e non permette di lasciare la data non selezionata.
// Qui niente è preselezionato: oggi ha solo un contorno, la data si valorizza
// SOLO quando l'utente tocca un giorno (o una scorciatoia). È in-flow (si apre
// sotto la riga quantità) così funziona identico ovunque, anche dentro i
// bottom sheet, senza i problemi di posizionamento/clipping di un popover.
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MESI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];
// Intestazione settimana lun→dom (standard italiano).
const GIORNI = ["L", "M", "M", "G", "V", "S", "D"];

// ISO locale YYYY-MM-DD costruito dalle parti, senza passare da UTC (niente
// slittamenti di fuso che sposterebbero il giorno scelto).
function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function ExpiryCalendar({ value, onPick }) {
  // "Oggi" calcolato una volta sola al montaggio.
  const [today] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
  });
  // Mese mostrato: parte dal valore già scelto, altrimenti dal mese corrente.
  const [view, setView] = useState(() =>
    value ? { y: +value.slice(0, 4), m: +value.slice(5, 7) - 1 } : { y: today.y, m: today.m }
  );

  // Cambio mese con normalizzazione dell'anno (dicembre↔gennaio).
  function shiftMonth(delta) {
    setView((v) => {
      const idx = v.y * 12 + v.m + delta;
      return { y: Math.floor(idx / 12), m: ((idx % 12) + 12) % 12 };
    });
  }
  // Scorciatoia: oggi + n giorni.
  function quick(n) {
    const t = new Date(today.y, today.m, today.d + n);
    onPick(toISO(t.getFullYear(), t.getMonth(), t.getDate()));
  }

  // Griglia del mese, lun-first: colonna vuota iniziale + giorni.
  const startCol = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const todayISO = toISO(today.y, today.m, today.d);
  const cells = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div
      role="dialog"
      aria-label="Scegli la scadenza"
      className="animate-fade-in mt-2 rounded-xl border border-hair bg-paper p-2.5"
    >
      {/* Scorciatoie per i casi più frequenti */}
      <div className="mb-2.5 flex gap-1.5">
        {[["Oggi", 0], ["Domani", 1], ["Tra 3 gg", 3]].map(([lbl, n]) => (
          <button
            key={lbl}
            type="button"
            onClick={() => quick(n)}
            className="flex-1 rounded-lg border border-hair bg-paper px-1 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-tomato hover:text-tomato"
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Navigazione mese */}
      <div className="mb-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Mese precedente"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold text-ink">{MESI[view.m]} {view.y}</span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Mese successivo"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Intestazione giorni + celle */}
      <div className="grid grid-cols-7 gap-0.5">
        {GIORNI.map((g, i) => (
          <span key={`h${i}`} className="flex h-6 items-center justify-center text-[11px] text-stone-400">{g}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const iso = toISO(view.y, view.m, d);
          const isSel = iso === value;
          const isToday = iso === todayISO;
          const isPast = iso < todayISO;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(iso)}
              aria-label={`${d} ${MESI[view.m]} ${view.y}`}
              aria-pressed={isSel}
              className={`flex h-8 items-center justify-center rounded-lg text-[13px] transition ${
                isSel
                  ? "bg-tomato font-bold text-[#fff]"
                  : isToday
                    ? "border border-tomato/45 font-bold text-tomato hover:bg-tomato/5"
                    : isPast
                      ? "text-stone-300 hover:bg-stone-100"
                      : "text-ink hover:bg-stone-100"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
