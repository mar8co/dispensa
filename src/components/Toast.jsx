// Toast in basso con eventuale azione "Annulla" (per undo dopo eliminazioni).
import { Undo2 } from "lucide-react";

export default function Toast({ message, onUndo }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[60] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-200 px-4 py-2.5 text-sm text-stone-900 shadow-lg">
        <span>{message}</span>
        {onUndo && (
          <button
            onClick={onUndo}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
          >
            <Undo2 className="h-3.5 w-3.5" /> Annulla
          </button>
        )}
      </div>
    </div>
  );
}
