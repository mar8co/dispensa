// Barretta fluttuante che mostra il timer attivo più vicino alla scadenza,
// visibile da qualunque scheda; toccandola si torna alle Ricette.
import { useState, useEffect } from "react";
import { Timer } from "lucide-react";
import { subscribeTimers, activeTimers } from "../lib/timers.js";

export default function TimerBar({ onTap, bottom }) {
  const [, force] = useState(0);
  const hasTimers = activeTimers().length > 0;
  useEffect(() => {
    // La subscription risveglia il componente quando un timer parte/finisce;
    // il tick al secondo serve SOLO col countdown a schermo: senza timer
    // attivi niente re-render inutili (l'app resta aperta a lungo su iPhone).
    const unsub = subscribeTimers(() => force((x) => x + 1));
    if (!hasTimers) return unsub;
    const int = setInterval(() => force((x) => x + 1), 1000);
    return () => { unsub(); clearInterval(int); };
  }, [hasTimers]);

  const list = activeTimers().sort((a, b) => a.endTime - b.endTime);
  if (!list.length) return null;
  const t = list[0];
  const left = Math.max(0, Math.round((t.endTime - Date.now()) / 1000));
  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <button
      onClick={onTap}
      className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-tomato/30 bg-cream/95 py-2 pl-3 pr-4 shadow-lg backdrop-blur transition active:scale-95"
      style={{ bottom }}
      aria-label="Vai al timer"
    >
      <Timer className="h-4 w-4 animate-pulse text-tomato" />
      <span className="font-mono text-sm font-bold tabular-nums text-ink">{fmt(left)}</span>
      {t.label && <span className="max-w-[9rem] truncate text-xs font-semibold text-stone-500">{t.label}</span>}
      {list.length > 1 && (
        <span className="rounded-full bg-tomato px-1.5 text-[10px] font-bold leading-4 text-white">+{list.length - 1}</span>
      )}
    </button>
  );
}
