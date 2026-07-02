// Toast in basso con eventuale azione (default "Annulla" per gli undo,
// oppure un'etichetta personalizzata, es. "In lista spesa").
import { useState, useEffect } from "react";
import { Undo2 } from "lucide-react";

// Posizione: appena sopra il FAB "+" (`bottom-32`), uguale su tutte le schede.
// Eccezione 1: sulla Spesa, quando c'è la barra "Sposta in dispensa" (carrello
// non vuoto), il toast si alza (`bottom-44`) per non coprirla.
// Eccezione 2: con la TASTIERA aperta (un campo di testo ha il focus) il toast
// va IN ALTO: su iOS la tastiera copre gli elementi fissati in basso, e i
// feedback con Annulla ("Modifica salvata") arrivano proprio mentre si scrive.
export default function Toast({ message, onUndo, actionLabel = "Annulla", actionTone = "tomato", raised = false }) {
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
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-xl border border-stone-300 bg-stone-200 px-4 py-2.5 text-sm text-stone-900 shadow-lg">
        <span className="min-w-0 break-words">{message}</span>
        {onUndo && (
          <button
            onClick={onUndo}
            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition ${
              actionTone === "ink" ? "bg-ink hover:opacity-90" : "bg-tomato hover:bg-tomato-700"
            }`}
          >
            {actionLabel === "Annulla" && <Undo2 className="h-3.5 w-3.5" />} {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
