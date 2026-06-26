// Toast in basso con eventuale azione (default "Annulla" per gli undo,
// oppure un'etichetta personalizzata, es. "In lista spesa").
import { Undo2 } from "lucide-react";

export default function Toast({ message, onUndo, actionLabel = "Annulla", actionTone = "tomato" }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-44 z-[60] flex justify-center px-4">
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
