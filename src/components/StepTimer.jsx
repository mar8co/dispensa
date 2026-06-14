// Timer di un passaggio di ricetta: vista sullo store globale (lib/timers.js),
// così il conteggio continua e suona anche navigando nelle altre schede.
import { useState, useEffect } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import {
  subscribeTimers, getTimer, isFinished, startTimer, pauseTimer, resetTimer,
} from "../lib/timers.js";

export default function StepTimer({ minutes, id, label }) {
  const total = Math.max(1, Math.round(minutes * 60));
  const [, force] = useState(0);
  const [pausedLeft, setPausedLeft] = useState(null); // rimanenza quando in pausa

  // Ridisegna sugli eventi dello store (start/pausa/scadenza da ovunque).
  useEffect(() => subscribeTimers(() => force((x) => x + 1)), []);

  const t = getTimer(id);
  const running = !!t;
  const done = isFinished(id);

  // Tick locale solo per aggiornare il display mentre corre.
  useEffect(() => {
    if (!running) return;
    const int = setInterval(() => force((x) => x + 1), 500);
    return () => clearInterval(int);
  }, [running]);

  const left = done
    ? 0
    : running
      ? Math.max(0, Math.round((t.endTime - Date.now()) / 1000))
      : (pausedLeft ?? total);

  function start() {
    startTimer(id, label, pausedLeft ?? total);
    setPausedLeft(null);
  }
  function pause() { setPausedLeft(pauseTimer(id)); }
  function reset() { resetTimer(id); setPausedLeft(null); }

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      className={`mt-2.5 inline-flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 ${
        done ? "border-tomato/40 bg-tomato/5" : "border-hair bg-stone-50"
      }`}
    >
      <Timer className={`h-4 w-4 ${done ? "text-tomato" : "text-stone-400"}`} />
      <span className={`font-mono text-sm font-bold tabular-nums ${done ? "text-tomato" : "text-ink"}`}>
        {fmt(left)}
      </span>
      {done ? (
        <span className="px-1 text-xs font-bold text-tomato">pronto!</span>
      ) : (
        <button
          onClick={() => (running ? pause() : start())}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-tomato text-white transition hover:bg-tomato-700 active:scale-95"
          aria-label={running ? "Pausa" : "Avvia"}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      )}
      <button
        onClick={reset}
        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
        aria-label="Reimposta"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
