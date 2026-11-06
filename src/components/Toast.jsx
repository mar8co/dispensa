// Avviso breve ("brindisi" in Second Brain): IDENTICO a quello di Second Brain
// (dal 06/11, scelta dell'utente). Pillola nera, testo bianco, fissa in alto a
// `safe-area + 76px`, margini 16px, larga al massimo 448px, alta almeno 60px,
// padding 12px 20px, raggio 30px, testo 1.1rem peso 650, ombra
// `0 8px 30px rgb(0 0 0 / .25)`, ingresso 0.25s dall'alto. L'azione ("Annulla"
// o un'etichetta) è testo GIALLO, peso 800, a destra. Swipe verso l'ALTO: segue
// il dito sbiadendo; oltre 30px sparisce, altrimenti torna al suo posto.
// Durata (decisa da showToast in Dispensa.jsx): 2,4 s, 5 s se c'è un'azione.
// Niente pallino: l'aspetto è uno solo. Gli stili stanno in index.css (`.brindisi`).
import { useRef } from "react";

export default function Toast({ message, onUndo, actionLabel = "Annulla", onDismiss }) {
  const y0 = useRef(0);
  return (
    <div
      className="brindisi"
      onTouchStart={(e) => {
        y0.current = e.touches[0].clientY;
        e.currentTarget.style.transition = "none";
      }}
      onTouchMove={(e) => {
        const dy = Math.min(0, e.touches[0].clientY - y0.current);
        e.currentTarget.style.transform = `translateY(${dy}px)`;
        e.currentTarget.style.opacity = String(1 + dy / 120);
      }}
      onTouchEnd={(e) => {
        const el = e.currentTarget;
        const dy = e.changedTouches[0].clientY - y0.current;
        el.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
        if (dy < -30) {
          el.style.transform = "translateY(-140px)";
          el.style.opacity = "0";
          setTimeout(() => onDismiss?.(), 200);
        } else {
          el.style.transform = "";
          el.style.opacity = "";
        }
      }}
    >
      <span>{message}</span>
      {onUndo && (
        <button type="button" onClick={onUndo}>{actionLabel}</button>
      )}
    </div>
  );
}
