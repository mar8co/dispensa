// Timer di un passaggio di ricetta: vista sullo store globale (lib/timers.js),
// così il conteggio continua e suona anche navigando nelle altre schede.
import { useState, useEffect } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import {
  subscribeTimers, getTimer, isFinished, startTimer, pauseTimer, resetTimer,
} from "../lib/timers.js";
import { tourSignal } from "../lib/tour.js";

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
    tourSignal("timer-started");
  }
  function pause() { setPausedLeft(pauseTimer(id)); }
  function reset() { resetTimer(id); setPausedLeft(null); }

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      data-tour="step-timer"
      className={`mt-2.5 inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink py-1 pl-3 pr-1 text-ink ${
        done ? "bg-verde" : ""
      }`}
    >
      <Timer className="h-4 w-4" />
      <span className="num text-[1rem] font-extrabold tracking-[-0.02em]">
        {fmt(left)}
      </span>
      {done ? (
        <span className="px-1 text-[0.84rem] font-extrabold">pronto!</span>
      ) : (
        <button
          onClick={() => (running ? pause() : start())}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition active:scale-95"
          aria-label={running ? "Pausa" : "Avvia"}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      )}
      <button
        onClick={reset}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink/50 transition active:text-ink"
        aria-label="Reimposta"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
