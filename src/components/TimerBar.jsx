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
      className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink py-2 pl-3 pr-4 text-crema shadow-barra transition active:scale-95"
      style={{ bottom }}
      aria-label="Vai al timer"
    >
      <Timer className="h-4 w-4 animate-pulse" />
      <span className="num text-[0.95rem] font-extrabold tracking-[-0.02em]">{fmt(left)}</span>
      {t.label && <span className="max-w-[9rem] truncate text-xs font-semibold text-crema/70">{t.label}</span>}
      {list.length > 1 && (
        <span className="rounded-full bg-giallo px-1.5 text-[10px] font-extrabold leading-4 text-ink">+{list.length - 1}</span>
      )}
    </button>
  );
}
