// Modalità cucina: schermo intero, un passaggio alla volta a caratteri
// grandi, timer integrato e schermo sempre acceso (Wake Lock) finché aperta.
// All'ultimo passaggio la CTA porta dritto ad aggiornare la dispensa
// (onFinish → CookModal): è il momento di massima intenzione, non va sprecato.
import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import StepTimer from "./StepTimer.jsx";

export default function CookingMode({ recipe, onClose, onFinish }) {
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
    <div className="fixed inset-0 z-50 flex flex-col bg-sfondo [&_.micro]:text-ink">
      {/* Testata (sotto la fascia di vetro di iOS nell'app installata) */}
      <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
        <div className="min-w-0 flex-1">
          <p className="micro">Modalità cucina</p>
          <p className="truncate text-[1.05rem] font-bold tracking-[-0.02em] text-ink">{recipe.title}</p>
        </div>
        <button onClick={onClose} className="tondo h-10 w-10" aria-label="Chiudi">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Avanzamento */}
      <div className="flex gap-1 px-4">
        {steps.map((_, k) => (
          <button
            key={k}
            onClick={() => setI(k)}
            aria-label={`Passaggio ${k + 1}`}
            className={`h-[5px] flex-1 rounded-full transition ${k < i ? "bg-ink/45" : k === i ? "bg-ink" : "bg-white/60"}`}
          />
        ))}
      </div>

      {/* Passaggio corrente */}
      <div className="flex-1 overflow-y-auto px-5 py-7">
        <div className="num mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-[1.3rem] font-extrabold tracking-[-0.03em] text-white">
          {i + 1}
        </div>
        <p className="text-[1.75rem] font-bold leading-[1.18] tracking-[-0.035em] text-ink">
          {s?.text}
        </p>
        {s?.timer ? (
          <div className="mt-5">
            <StepTimer minutes={Number(s.timer)} id={`${recipe.title}-${i}`} label={recipe.title} />
          </div>
        ) : null}
        <p className="micro mt-6">Passaggio {i + 1} di {steps.length}</p>
      </div>

      {/* Comandi grandi, a portata di pollice. All'ultimo passaggio la CTA
          apre "Aggiorna la dispensa" (CookModal); "Salta" discreto per chi
          non vuole aggiornare le scorte. */}
      <div className="px-4 pt-2" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="flex h-14 w-20 items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition active:scale-95 disabled:opacity-30"
            aria-label="Passaggio precedente"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          {last ? (
            <button
              onClick={() => { onClose(); onFinish?.(); }}
              className="bottone h-14 flex-1 text-[1.05rem]"
            >
              <Utensils className="h-5 w-5" /> Aggiorna la dispensa
            </button>
          ) : (
            <button
              onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))}
              className="bottone h-14 flex-1 text-[1.05rem]"
            >
              Avanti <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
        {last && (
          <button
            onClick={onClose}
            className="link mt-2 block w-full py-2 text-center text-[0.9rem] text-ink"
          >
            Salta, non aggiornare
          </button>
        )}
      </div>
    </div>
  );
}
