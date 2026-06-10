import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";

// AudioContext condiviso, sbloccato al primo "Avvia" (gesto utente) così il
// suono può partire anche più tardi quando il timer finisce.
let sharedCtx = null;
function unlockAudio() {
  try {
    if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (sharedCtx.state === "suspended") sharedCtx.resume();
  } catch { /* niente audio */ }
}
function beep() {
  try {
    if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (sharedCtx.state === "suspended") sharedCtx.resume();
    const ctx = sharedCtx;
    // tre brevi bip
    [0, 0.6, 1.2].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.45);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.5);
    });
  } catch { /* niente audio */ }
}
function notify() {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏱️ Timer finito", {
        body: "Il tempo di cottura è terminato!",
        icon: "/pwa-192x192.png",
        tag: "dispensa-timer",
      });
    }
  } catch { /* niente notifica */ }
}

export default function StepTimer({ minutes, id }) {
  const total = Math.max(1, Math.round(minutes * 60));
  const storeKey = id ? `dispensa-timer-${id}` : null;

  const [endTime, setEndTime] = useState(null); // ms di fine quando in corso
  const [left, setLeft] = useState(total);       // secondi mostrati
  const [done, setDone] = useState(false);
  const tickRef = useRef(null);
  const firedRef = useRef(false);

  function finish() {
    setLeft(0); setEndTime(null); setDone(true);
    if (storeKey) { try { localStorage.removeItem(storeKey); } catch { /* */ } }
    if (!firedRef.current) { firedRef.current = true; beep(); notify(); }
  }

  // Ripristino da localStorage (sopravvive al cambio scheda dentro l'app).
  useEffect(() => {
    if (!storeKey) return;
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const end = parseInt(raw, 10);
        if (!isNaN(end)) {
          if (end - Date.now() > 0) setEndTime(end);
          else { setLeft(0); setDone(true); }
        }
      }
    } catch { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick basato sull'orario reale (preciso anche se il browser rallenta).
  useEffect(() => {
    if (endTime == null) return;
    const tick = () => {
      const rem = Math.round((endTime - Date.now()) / 1000);
      if (rem <= 0) finish();
      else setLeft(rem);
    };
    tick();
    tickRef.current = setInterval(tick, 250);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime]);

  // Al ritorno in primo piano: se è scaduto mentre eri via, suona subito.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && endTime != null) {
        if (endTime - Date.now() <= 0) finish();
        else setLeft(Math.round((endTime - Date.now()) / 1000));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime]);

  const running = endTime != null;

  function start() {
    unlockAudio();
    try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch { /* */ }
    firedRef.current = false;
    setDone(false);
    const base = left > 0 ? left : total;
    const end = Date.now() + base * 1000;
    setEndTime(end);
    if (storeKey) { try { localStorage.setItem(storeKey, String(end)); } catch { /* */ } }
  }
  function pause() {
    setEndTime(null);
    if (storeKey) { try { localStorage.removeItem(storeKey); } catch { /* */ } }
  }
  function reset() {
    setEndTime(null); setDone(false); firedRef.current = false; setLeft(total);
    if (storeKey) { try { localStorage.removeItem(storeKey); } catch { /* */ } }
  }

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
        <span className="px-1 text-xs font-bold text-tomato">fatto!</span>
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
