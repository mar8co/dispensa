// Ticker globale dei timer della cucina: li fa scadere e "suonare" da
// qualunque scheda dell'app. Controlla i timer ogni 500 ms e al rientro in
// primo piano (visibilitychange/focus, per recuperare i tick persi mentre la
// tab era nascosta); quando un timer scade chiama `onExpired(timer)` col primo
// scaduto. Registra interval/listener una sola volta: un ref tiene l'ultima
// callback così non serve ri-registrarli a ogni render.
import { useEffect, useRef } from "react";
import { checkTimers } from "../lib/timers.js";

export function useTimersTicker(onExpired) {
  const cb = useRef(onExpired);
  cb.current = onExpired;

  useEffect(() => {
    const tick = () => {
      const expired = checkTimers();
      if (expired.length) cb.current(expired[0]);
    };
    const int = setInterval(tick, 500);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(int);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);
}
