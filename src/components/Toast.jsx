// Avviso breve in basso: pillola nera con l'eventuale azione in giallo
// ("Annulla" per gli undo, oppure un'etichetta personalizzata, es. "Stop").
import { useState, useEffect } from "react";

// Posizione: appena sopra il FAB "+" (`bottom-32`), uguale su tutte le schede.
// Eccezione 1: sulla Spesa, quando c'è la barra "Sposta in dispensa" (carrello
// non vuoto), il toast si alza (`bottom-44`) per non coprirla.
// Eccezione 2: con la TASTIERA aperta (un campo di testo ha il focus) il toast
// va IN ALTO: su iOS la tastiera copre gli elementi fissati in basso, e i
// feedback con Annulla ("Modifica salvata") arrivano proprio mentre si scrive.
// (`actionTone` dei chiamanti non serve più: nella veste manifesto l'azione è
// sempre gialla sul nero.)
export default function Toast({ message, onUndo, actionLabel = "Annulla", raised = false }) {
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    const isTyping = () => {
      const t = document.activeElement?.tagName;
      return t === "INPUT" || t === "TEXTAREA";
    };
    setKbOpen(isTyping());
    const onFocus = () => setKbOpen(isTyping());
    // Al blur l'activeElement è ancora il vecchio campo: si ricontrolla al tick dopo.
    const onBlur = () => setTimeout(() => setKbOpen(isTyping()), 50);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  const pos = kbOpen
    ? "top-[calc(env(safe-area-inset-top)+12px)]"
    : raised ? "bottom-44" : "bottom-32";

  return (
    <div className={`pointer-events-none fixed inset-x-0 ${pos} z-[60] flex justify-center px-4`}>
      {/* Raggio 24px: su una riga è una pillola, se il testo va a capo resta morbido. */}
      <div role="status" className="animate-sale pointer-events-auto flex max-w-full items-center gap-3.5 rounded-[24px] bg-ink px-[1.1rem] py-[0.7rem] text-[0.92rem] font-[650] leading-snug text-white shadow-barra">
        <span className="min-w-0 break-words">{message}</span>
        {onUndo && (
          <button onClick={onUndo} className="-my-2 shrink-0 py-2 text-[0.95rem] font-extrabold text-giallo">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
