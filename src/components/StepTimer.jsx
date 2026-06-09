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
      className={`mt-2.5 inline-flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 ${
        done ? "border-tomato/40 bg-tomato/5" : "border-hair bg-stone-50"
      }`}
    >
      <Timer className={`h-4 w-4 ${done ? "text-tomato" : "text-stone-400"}`} />
      <span className={`font-mono text-sm font-bold tabular-nums ${done ? "text-tomato" : "text-ink"}`}>
        {fmt(left)}
      </span>
      {!done ? (
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black active:scale-95"
          aria-label={running ? "Pausa" : "Avvia"}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      ) : (
        <span className="px-1 text-xs font-bold text-tomato">fatto!</span>
      )}
      <button
        onClick={() => { setRunning(false); setLeft(total); }}
        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
        aria-label="Reimposta"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
