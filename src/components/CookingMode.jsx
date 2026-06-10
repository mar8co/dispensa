// Modalità cucina: schermo intero, un passaggio alla volta a caratteri
// grandi, timer integrato e schermo sempre acceso (Wake Lock) finché aperta.
import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import StepTimer from "./StepTimer.jsx";

export default function CookingMode({ recipe, onClose }) {
  const steps = recipe.steps || [];
  const [i, setI] = useState(0);
  const wakeRef = useRef(null);
  const last = i >= steps.length - 1;

  // Schermo sempre acceso finché si cucina (se supportato).
  useEffect(() => {
    let active = true;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) wakeRef.current = await navigator.wakeLock.request("screen");
      } catch { /* niente wake lock */ }
    };
    acquire();
    const onVis = () => { if (active && document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVis);
      wakeRef.current?.release?.().catch(() => {});
      wakeRef.current = null;
    };
  }, []);

  const s = steps[i];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream">
      {/* Testata */}
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">Modalità cucina</p>
          <p className="truncate text-sm font-semibold text-stone-500">{recipe.title}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-ink" aria-label="Chiudi">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Avanzamento */}
      <div className="flex gap-1 px-5">
        {steps.map((_, k) => (
          <button
            key={k}
            onClick={() => setI(k)}
            aria-label={`Passaggio ${k + 1}`}
            className={`h-1.5 flex-1 rounded-full transition ${k < i ? "bg-tomato/40" : k === i ? "bg-tomato" : "bg-stone-200"}`}
          />
        ))}
      </div>

      {/* Passaggio corrente */}
      <div className="flex-1 overflow-y-auto px-6 py-7">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-ink font-display text-lg font-bold text-white">
          {i + 1}
        </div>
        <p className="font-display text-[24px] font-semibold leading-snug tracking-tight text-ink">
          {s?.text}
        </p>
        {s?.timer ? (
          <div className="mt-5">
            <StepTimer minutes={Number(s.timer)} id={`${recipe.title}-${i}`} label={recipe.title} />
          </div>
        ) : null}
        <p className="mt-6 text-xs text-stone-400">Passaggio {i + 1} di {steps.length}</p>
      </div>

      {/* Comandi grandi, a portata di pollice */}
      <div className="flex gap-2 px-5 pt-2" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
        <button
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          className="flex h-14 w-20 items-center justify-center rounded-2xl border border-hair text-ink transition hover:bg-stone-50 disabled:opacity-30"
          aria-label="Passaggio precedente"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        {last ? (
          <button
            onClick={onClose}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-tomato text-base font-bold text-white transition hover:bg-tomato-700"
          >
            <Check className="h-5 w-5" /> Ho finito!
          </button>
        ) : (
          <button
            onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink text-base font-bold text-white transition hover:opacity-90"
          >
            Avanti <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
