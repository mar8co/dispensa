import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start(); o.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext non disponibile: nessun suono
  }
}

export default function StepTimer({ minutes }) {
  const total = Math.max(1, Math.round(minutes * 60));
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (running && left > 0) {
      ref.current = setTimeout(() => setLeft((l) => l - 1), 1000);
    } else if (running && left === 0) {
      setRunning(false);
      beep();
    }
    return () => clearTimeout(ref.current);
  }, [running, left]);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const done = left === 0;

  return (
    <div
      className={`mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
        done ? "border-tomato/30 bg-tomato/5" : "border-hair bg-stone-50"
      }`}
    >
      <Timer className={`h-4 w-4 ${done ? "text-tomato" : "text-stone-500"}`} />
      <span className={`font-mono text-sm tabular-nums ${done ? "text-tomato" : "text-stone-700"}`}>
        {fmt(left)}
      </span>
      <div className="ml-auto flex items-center gap-1">
        {!done && (
          <button
            onClick={() => setRunning((r) => !r)}
            className="rounded-md p-1.5 text-stone-500 hover:bg-stone-200"
            aria-label={running ? "Pausa" : "Avvia"}
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}
        <button
          onClick={() => { setRunning(false); setLeft(total); }}
          className="rounded-md p-1.5 text-stone-500 hover:bg-stone-200"
          aria-label="Reimposta"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
