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
      className="animate-fade-in mt-3 border-t border-riga pt-3"
    >
      {/* Scorciatoie per i casi più frequenti */}
      <div className="mb-3 flex gap-1.5">
        {[["Oggi", 0], ["Domani", 1], ["Tra 3 gg", 3]].map(([lbl, n]) => (
          <button
            key={lbl}
            type="button"
            onClick={() => quick(n)}
            className="pillola min-h-[34px] flex-1 px-1 text-[0.8rem]"
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Navigazione mese */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[1.45rem] font-extrabold capitalize leading-none tracking-[-0.05em] text-ink">
          {MESI[view.m]} <span className="text-[0.95rem] font-semibold tracking-normal text-tenue">{view.y}</span>
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mese precedente"
            className="tondo h-[34px] w-[34px]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Mese successivo"
            className="tondo h-[34px] w-[34px]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </span>
      </div>

      {/* Intestazione giorni + celle */}
      <div className="grid grid-cols-7 gap-0.5">
        {GIORNI.map((g, i) => (
          <span key={`h${i}`} className={`flex h-6 items-center justify-center text-[0.72rem] font-semibold ${i >= 5 ? "text-rosso-azione" : "text-tenue"}`}>{g}</span>
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
              className="flex h-10 items-center justify-center"
            >
              {/* Cerchio: scelto = pieno nero, oggi = anello rosso, passati al 30%. */}
              <span className={`num flex h-9 w-9 items-center justify-center rounded-full text-[0.95rem] font-[650] tracking-[-0.02em] transition-transform active:scale-90 ${
                isSel
                  ? "bg-ink text-white"
                  : isToday
                    ? "text-ink shadow-[inset_0_0_0_2.2px_#e02a0d]"
                    : isPast
                      ? "text-ink/30"
                      : "text-ink"
              }`}>{d}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
