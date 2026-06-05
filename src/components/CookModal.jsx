// Modale "Ho cucinato questo": mostra gli ingredienti della ricetta che
// corrispondono a prodotti in dispensa e permette di aggiornare la quantità
// rimanente (vuoto o 0 = rimuovi il prodotto).
import { X, Check } from "lucide-react";

export default function CookModal({ rows, onClose, onSetAfter, onRemoveRow, onApply }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-screen w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-base font-semibold">Aggiorna la dispensa</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto px-4 py-3">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              Nessun ingrediente di questa ricetta corrisponde a un prodotto in dispensa.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-stone-500">
                Controlla la quantità che rimane di ogni prodotto. Lascia vuoto o 0 per rimuoverlo dalla dispensa.
              </p>
              <ul className="space-y-3">
                {rows.map((r, i) => (
                  <li key={r.itemId} className="rounded-xl border border-stone-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-800">{r.name}</p>
                        <p className="mt-0.5 text-xs text-stone-500">Usato: {r.used} · Prima: {r.before}</p>
                      </div>
                      <button
                        onClick={() => onRemoveRow(i)}
                        className="rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500"
                        aria-label="Ignora"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="shrink-0 text-xs text-stone-500">Rimane:</span>
                      <input
                        className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                        value={r.after}
                        onChange={(e) => onSetAfter(i, e.target.value)}
                      />
                      {!r.auto && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          da verificare
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-stone-100 px-4 py-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Annulla
          </button>
          <button
            onClick={onApply}
            disabled={rows.length === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Conferma
          </button>
        </div>
      </div>
    </div>
  );
}
