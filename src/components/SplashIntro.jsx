// Intro in-app (splash "concept 4"): riprende esattamente la splash nativa iOS
// (icona + "Dispensa" su sfondo di brand) e vi aggiunge la sottolineatura
// ondulata tomato che si DISEGNA, poi sfuma nell'app. È il livello che dà
// l'animazione su TUTTE le piattaforme (iOS PWA installata, Android, desktop):
// la PNG statica è il primo fotogramma, quindi il passaggio è senza stacco.
//
// Si mostra una sola volta all'avvio (montaggio di App). Rispetta
// prefers-reduced-motion (niente disegno, dissolvenza più breve). Vedi gli stili
// .splash-* in index.css e lo script generate-splash.mjs per le immagini native.
import { useEffect, useRef, useState } from "react";

export default function SplashIntro() {
  const [leaving, setLeaving] = useState(false); // avvia la dissolvenza d'uscita
  const [gone, setGone] = useState(false); // smontato: non copre più nulla
  const pathRef = useRef(null);

  useEffect(() => {
    // La lunghezza reale del tratto guida l'animazione di disegno (stroke-dashoffset).
    const p = pathRef.current;
    if (p) {
      try { p.style.setProperty("--dash", p.getTotalLength()); } catch { /* fallback in CSS */ }
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const hold = reduce ? 700 : 1450; // tempo visibile prima di sfumare
    const t1 = setTimeout(() => setLeaving(true), hold);
    const t2 = setTimeout(() => setGone(true), hold + 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (gone) return null;

  return (
    <div className={`splash-intro${leaving ? " is-leaving" : ""}`} aria-hidden="true">
      <div className="splash-lockup">
        <img src="/icon.svg" alt="" width="512" height="512" className="splash-icon" />
        <div className="splash-word">Dispensa</div>
        <svg className="splash-uline" viewBox="0 0 200 16" preserveAspectRatio="none">
          <path ref={pathRef} d="M2,9 q11,-7 22,0 t22,0 t22,0 t22,0 t22,0 t22,0 t22,0 t22,0 t22,0" />
        </svg>
      </div>
    </div>
  );
}
