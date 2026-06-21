// Foglio "Ho cucinato questo": aggiorna la dispensa dopo aver cucinato.
// Ogni ingrediente della ricetta che corrisponde a un prodotto in dispensa
// finisce in una di tre corsie (vedi openCookModal in Dispensa.jsx):
//  - "qb"    scorta a piacere (olio/sale/spezie o ricetta "q.b."): NON si scala,
//            si mostra soltanto, con un'azione "sta finendo? → lista".
//  - "exact" stessa unità della ricetta: stepper con la quantità rimasta esatta.
//  - "pack"  unità non confrontabili (es. "1 barattolo" vs "200 g"): stepper a
//            confezioni, mezzo pezzo (½) incluso — niente matematica/stima.
import { useState } from "react";
import { X, Check, ShoppingCart } from "lucide-react";
import Sheet from "./Sheet.jsx";
import { adjustQty, formatQtyDisplay } from "../lib/pantry.js";

const TAGS = {
  exact: { label: "calcolo esatto", cls: "bg-stone-100 text-stone-500" },
  pack: { label: "a confezione", cls: "bg-tomato/10 text-tomato" },
  qb: { label: "q.b.", cls: "bg-amber-100 text-amber-700" },
};

export default function CookModal({ rows, onClose, onSetAfter, onRemoveRow, onApply, onStapleToShopping }) {
  // Scorte q.b. già segnalate "in lista" in questa sessione del foglio.
  const [added, setAdded] = useState(() => new Set());

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <div className="flex items-center justify-between border-b border-hair px-4 pb-3 pt-1">
            <h3 className="text-base font-semibold text-ink">Aggiorna la dispensa</h3>
            <button onClick={close} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" aria-label="Chiudi">
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
                  Controlla quanto resta di ogni prodotto. Le scorte “q.b.” (olio, sale, spezie…) non si aggiornano.
                </p>
                <ul className="space-y-3">
                  {rows.map((r, i) => {
                    const tag = TAGS[r.kind] || TAGS.exact;
                    const isAdded = added.has(r.itemId);
                    return (
                      <li key={r.itemId} className="rounded-xl border border-stone-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-stone-800">{r.name}</p>
                            <p className="mt-0.5 text-xs text-stone-500">
                              {r.kind === "qb"
                                ? "Usato q.b. · non aggiornato"
                                : r.kind === "pack"
                                  ? <>In dispensa: {formatQtyDisplay(r.before)}</>
                                  : <>Usato: {formatQtyDisplay(r.used)} · Prima: {formatQtyDisplay(r.before)}</>}
                            </p>
                          </div>
                          <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${tag.cls}`}>
                            {tag.label}
                          </span>
                        </div>

                        {r.kind === "qb" ? (
                          <button
                            onClick={() => { onStapleToShopping(r.name); setAdded((p) => new Set(p).add(r.itemId)); }}
                            disabled={isAdded}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-tomato disabled:text-stone-400"
                          >
                            {isAdded
                              ? <><Check className="h-3.5 w-3.5" /> in lista</>
                              : <><ShoppingCart className="h-3.5 w-3.5" /> sta finendo? mettilo in lista</>}
                          </button>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="shrink-0 text-xs text-stone-500">Rimane:</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onSetAfter(i, adjustQty(r.after, -1))}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-ink hover:text-ink active:scale-95"
                                aria-label="Diminuisci"
                              >−</button>
                              <input
                                inputMode="decimal"
                                className="w-20 rounded-lg border border-stone-300 bg-paper px-2 py-1.5 text-center text-sm font-bold text-ink outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                                value={formatQtyDisplay(r.after)}
                                onChange={(e) => onSetAfter(i, e.target.value.replace("½", "0,5"))}
                                aria-label="Quantità rimasta"
                              />
                              <button
                                onClick={() => onSetAfter(i, adjustQty(r.after, 1))}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-tomato hover:text-tomato active:scale-95"
                                aria-label="Aumenta"
                              >+</button>
                            </div>
                            <button
                              onClick={() => onRemoveRow(i)}
                              className="ml-auto rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500"
                              aria-label="Ignora"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-stone-400">
                  Lascia vuoto o 0 per togliere un prodotto dalla dispensa.
                </p>
              </>
            )}
          </div>

          <div className="flex gap-2 border-t border-hair px-4 py-3">
            <button
              onClick={close}
              className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              Annulla
            </button>
            <button
              onClick={onApply}
              disabled={rows.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Conferma
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
