// Avviso breve in basso: pillola nera con l'eventuale azione in giallo
// ("Annulla" per gli undo, oppure un'etichetta personalizzata, es. "Stop").
import { useState, useEffect } from "react";

// Posizione: la decide Dispensa.jsx (`bottom`, un valore CSS): appena sopra la
// barra (col "+"), alla stessa altezza su tutte le schede.
// Eccezione: con la TASTIERA aperta (un campo di testo ha il focus) l'avviso
// va IN ALTO: su iOS la tastiera copre gli elementi fissati in basso, e i
// feedback con Annulla ("Modifica salvata") arrivano proprio mentre si scrive.
// Colore: pillola nera con l'azione gialla; `tone="verde"` (es. "spostato nel
// carrello") = pillola verde col testo nero e l'azione sottolineata.
export default function Toast({ message, onUndo, actionLabel = "Annulla", tone, bottom = "var(--sopra-nav)" }) {
  const verde = tone === "verde";
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

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 ${kbOpen ? "top-[calc(env(safe-area-inset-top)+12px)]" : ""}`}
      style={kbOpen ? undefined : { bottom }}
    >
      {/* Raggio 24px: su una riga è una pillola, se il testo va a capo resta morbido. */}
      <div role="status" className={`animate-sale pointer-events-auto flex max-w-full items-center gap-3.5 rounded-[24px] px-[1.1rem] py-[0.7rem] text-[0.92rem] font-[650] leading-snug shadow-barra ${verde ? "border-[1.5px] border-ink bg-verde text-ink" : "bg-ink text-white"}`}>
        <span className="min-w-0 break-words">{message}</span>
        {onUndo && (
          <button onClick={onUndo} className={`-my-2 shrink-0 py-2 text-[0.95rem] font-extrabold ${verde ? "text-ink underline underline-offset-2" : "text-giallo"}`}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
