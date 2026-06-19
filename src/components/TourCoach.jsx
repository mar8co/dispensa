// Overlay del tutorial interattivo: disegna lo "spotlight" (buco luminoso) sopra
// l'elemento da toccare, oscura e BLOCCA il resto dello schermo, mostra un
// tooltip contestuale e i comandi (Avanti / Esci). I passi a riquadro centrale
// (benvenuto, scontrino, fine) e quelli sopra le modali ("banner") usano una
// resa più semplice. La logica dei passi vive in lib/tour.js.
import { useEffect, useState } from "react";
import { X, ArrowRight, Hand, ScanLine } from "lucide-react";
import {
  useTourState, visibleSteps, tourGoNext, TOUR_SCAN,
} from "../lib/tour.js";

const PAD = 8; // margine del buco attorno all'elemento

export default function TourCoach({ onExit, onComplete, onEmptyDemo }) {
  const { active, index, firstRun } = useTourState();
  const steps = visibleSteps(firstRun);
  const step = active ? steps[index] : null;
  const [rect, setRect] = useState(null);

  // Porta l'elemento bersaglio in vista una volta sola all'ingresso nel passo.
  useEffect(() => {
    if (!step || step.overlay !== "spotlight") return;
    const el = document.querySelector(step.target);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Misura il bersaglio in continuo (segue scroll, animazioni e layout).
  useEffect(() => {
    if (!step || step.overlay !== "spotlight") { setRect(null); return; }
    setRect(null); // riparti pulito a ogni passo
    let raf;
    const tick = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width || r.height) {
          setRect((prev) => {
            if (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height) return prev;
            return { top: r.top, left: r.left, width: r.width, height: r.height };
          });
        }
      }
      // Se il bersaglio sparisce per un istante (es. il pannello prodotto che si
      // chiude), MANTIENI l'ultima posizione: niente flicker verso il banner.
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!step) return null;

  const isCard = step.overlay === "card";
  // Se l'elemento da evidenziare non si trova (es. non ancora montato), si
  // ripiega su una striscia in alto, così il tour non si blocca mai.
  const asBanner = step.overlay === "banner" || (step.overlay === "spotlight" && !rect);

  function exit() { onExit(); }
  function primary() {
    if (step.advance === "finish") { onComplete(); return; }
    if (step.advance === "empty") { onEmptyDemo(); tourGoNext(); return; }
    // "next" o salto manuale di un passo d'azione
    if (!tourGoNext()) onComplete();
  }

  // Blocco "Esci" comune a tutte le rese.
  const ExitBtn = (
    <button
      onClick={exit}
      className="flex items-center gap-1 text-[11px] font-semibold text-stone-400 transition hover:text-ink"
    >
      Esci dal tutorial <X className="h-3.5 w-3.5" />
    </button>
  );

  // Pulsante avanti/CTA: presente sui passi informativi; sui passi d'azione
  // c'è solo un "salta" discreto (l'avanzamento avviene compiendo l'azione).
  // Sui passi d'azione: badge "Tocca l'elemento" a sinistra e "salta" a destra,
  // sulla STESSA riga (niente spazio vuoto). Sui passi informativi: solo "Avanti".
  const Controls = (
    <div className={`mt-3 flex items-center gap-3 ${step.hint ? "justify-between" : "justify-end"}`}>
      {step.hint && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-tomato/10 px-2.5 py-1 text-[11px] font-bold text-tomato">
          <Hand className="h-3.5 w-3.5" /> Tocca l'elemento evidenziato
        </span>
      )}
      {step.hint ? (
        <button onClick={primary} className="shrink-0 text-[11px] font-semibold text-stone-400 underline transition hover:text-ink">
          salta
        </button>
      ) : (
        <button
          onClick={primary}
          className="flex items-center gap-1.5 rounded-xl bg-tomato px-4 py-2 text-sm font-bold text-[#fff] shadow-lg shadow-tomato/30 transition hover:bg-tomato-700 active:scale-95"
        >
          {step.cta || "Avanti"} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  // --- Resa a riquadro centrale (benvenuto / scontrino / svuota / fine) ---
  if (isCard) {
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div onPointerDown={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-cream p-6 shadow-2xl">
          <div className="mb-3 flex items-center justify-end">
            {ExitBtn}
          </div>
          <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink">{step.title}</h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-stone-500">{step.text}</p>

          {step.demo === "scan" && (
            <div className="mt-4 rounded-2xl border border-hair bg-paper p-3">
              {/* Da una foto dello scontrino O della spesa → ai prodotti */}
              <div className="mb-2.5 flex items-center justify-center gap-2 text-xl">
                <span title="Scontrino">🧾</span>
                <span className="text-sm font-bold text-stone-300">o</span>
                <span title="Sacchetto della spesa">🛍️</span>
                <span title="Carrello">🛒</span>
                <ArrowRight className="h-4 w-4 text-stone-400" />
                <ScanLine className="h-4 w-4 text-tomato" />
              </div>
              <div className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-stone-400">
                Alimenti riconosciuti
              </div>
              <ul className="divide-y divide-hair">
                {TOUR_SCAN.map((p) => (
                  <li key={p.name} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <span>{p.emoji}</span> {p.name}
                    </span>
                    <span className="text-xs font-medium text-stone-400">{p.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={primary}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-tomato px-4 py-3.5 text-sm font-bold text-[#fff] shadow-lg shadow-tomato/30 transition hover:bg-tomato-700 active:scale-[0.99]"
          >
            {step.cta || "Avanti"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- Resa a striscia in alto (passi su modale o bersaglio non trovato) ---
  if (asBanner) {
    // step.pos === "bottom": striscia in basso (vicino al menù "+" a semicerchio).
    const atBottom = step.overlay === "banner" && step.pos === "bottom";
    return (
      <div
        className="fixed inset-x-0 z-[95] flex justify-center px-3"
        style={atBottom
          ? { bottom: "calc(env(safe-area-inset-bottom) + 224px)" }
          : { top: 0, paddingTop: "calc(env(safe-area-inset-top) + 18px)" }}
      >
        <div onPointerDown={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-hair bg-cream/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold tracking-tight text-ink">{step.title}</h3>
            {ExitBtn}
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-stone-500">{step.text}</p>
          {Controls}
        </div>
      </div>
    );
  }

  // --- Resa spotlight: 4 pannelli scuri attorno al buco + anello + tooltip ---
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = {
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const holeBottom = hole.top + hole.height;
  const holeRight = hole.left + hole.width;
  const dim = "fixed z-[90] bg-black/55 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const stop = (e) => e.stopPropagation(); // non far chiudere i pannelli aperti

  // Tooltip: sotto il bersaglio se c'è spazio, altrimenti sopra.
  const W = Math.min(330, vw - 24);
  const cx = rect.left + rect.width / 2;
  const left = Math.max(12, Math.min(cx - W / 2, vw - W - 12));
  const below = holeBottom < vh * 0.62;
  // step.tip === "top": ancora il tooltip in alto (utile quando il bersaglio è
  // in mezzo a elementi vicini, es. il menù "+" a semicerchio, per non coprirli).
  const tipStyle = step.tip === "top"
    ? { top: "calc(env(safe-area-inset-top) + 12px)", left, width: W }
    : below
      ? { top: holeBottom + 14, left, width: W }
      : { top: hole.top - 14, left, width: W, transform: "translateY(-100%)" };

  return (
    <>
      {/* Pannelli scuri (bloccano i tocchi tranne nel buco) */}
      <div className={dim} style={{ top: 0, left: 0, width: vw, height: hole.top }} onPointerDown={stop} />
      <div className={dim} style={{ top: holeBottom, left: 0, width: vw, height: Math.max(0, vh - holeBottom) }} onPointerDown={stop} />
      <div className={dim} style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} onPointerDown={stop} />
      <div className={dim} style={{ top: hole.top, left: holeRight, width: Math.max(0, vw - holeRight), height: hole.height }} onPointerDown={stop} />

      {/* Anello luminoso attorno al bersaglio */}
      <div
        className="pointer-events-none fixed z-[91] rounded-xl border-2 border-tomato transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height, boxShadow: "0 0 0 3px rgba(226,73,47,0.25)" }}
      />

      {/* Tooltip contestuale */}
      <div onPointerDown={stop} className="fixed z-[92] rounded-2xl border border-hair bg-cream p-4 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={tipStyle}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-extrabold tracking-tight text-ink">{step.title}</h3>
          {ExitBtn}
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-stone-500">{step.text}</p>
        {Controls}
      </div>
    </>
  );
}
