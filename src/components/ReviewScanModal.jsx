// Foglio di revisione dopo una scansione (scontrino / foto / barcode / voce).
// Mostra i prodotti riconosciuti raggruppati per categoria; per ciascuno si
// possono cambiare nome, quantità (stepper −/+) e categoria, o rimuoverlo.
// Solo alla conferma i prodotti vengono aggiunti alla dispensa.
import { useState } from "react";
import { X, Check, Plus, Minus } from "lucide-react";
import { CATEGORIES, CAT_ICON } from "../constants.js";
import Sheet from "./Sheet.jsx";
import { adjustQty, atMinQty } from "../lib/pantry.js";

function tmpId() {
  return Math.random().toString(36).slice(2, 10);
}

const fieldCls =
  "rounded-lg border border-hair bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

export default function ReviewScanModal({ initialItems, onCancel, onConfirm }) {
  const [items, setItems] = useState(() =>
    (initialItems || []).map((it) => ({
      id: tmpId(),
      name: String(it.name || "").trim(),
      qty: String(it.qty || "1").trim() || "1",
      category: CATEGORIES.includes(it.category) ? it.category : "Altro",
    }))
  );

  function update(id, field, val) {
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, [field]: val } : x)));
  }
  function remove(id) {
    setItems((arr) => arr.filter((x) => x.id !== id));
  }
  // Il "−" è attivo solo dal secondo passo in su (1 pz / 50 g / 0,25 kg-l).
  const atMin = atMinQty;

  // Raggruppa per categoria nell'ordine di CATEGORIES.
  const grouped = CATEGORIES
    .map((c) => ({ cat: c, list: items.filter((x) => x.category === c) }))
    .filter((g) => g.list.length > 0);

  return (
    <Sheet onClose={onCancel}>
      {(close) => (
      <>
        <div className="flex items-start justify-between px-5 pb-3 pt-1">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">Revisione</p>
            <h3 className="mt-0.5 font-display text-xl font-extrabold tracking-tight text-ink">Prodotti riconosciuti</h3>
            <p className="mt-0.5 text-xs text-stone-500">Controlla nome, quantità e categoria, poi conferma.</p>
          </div>
          <button onClick={close} className="-mr-1 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto border-t border-hair px-5 py-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              Nessun prodotto da aggiungere.
            </p>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ cat, list }) => (
                <div key={cat}>
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-sm">{CAT_ICON[cat]}</span>
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{cat}</h4>
                    <span className="font-display text-xs font-bold text-tomato">{list.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {list.map((it) => (
                      <li key={it.id} className="rounded-xl border border-hair bg-paper p-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            className={`${fieldCls} min-w-0 flex-1 font-semibold`}
                            value={it.name}
                            onChange={(e) => update(it.id, "name", e.target.value)}
                            placeholder="Nome"
                          />
                          <button
                            onClick={() => remove(it.id)}
                            className="shrink-0 rounded-lg p-1.5 text-stone-300 transition hover:bg-tomato/10 hover:text-tomato"
                            aria-label="Rimuovi"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {/* Quantità: −/+ rapidi, campo libero per pesi tipo "500 g" */}
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => update(it.id, "qty", adjustQty(it.qty, -1))}
                              disabled={atMin(it.qty)}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                                atMin(it.qty)
                                  ? "border-hair text-stone-300"
                                  : "border-stone-300 text-stone-600 hover:border-ink hover:text-ink active:scale-95"
                              }`}
                              aria-label="Diminuisci"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              className="w-16 border-0 bg-transparent text-center text-sm font-bold tabular-nums text-ink outline-none"
                              value={it.qty}
                              onChange={(e) => update(it.id, "qty", e.target.value)}
                              aria-label="Quantità"
                            />
                            <button
                              onClick={() => update(it.id, "qty", adjustQty(it.qty, 1))}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-tomato hover:text-tomato active:scale-95"
                              aria-label="Aumenta"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <select
                            className={`${fieldCls} min-w-0 flex-1`}
                            value={it.category}
                            onChange={(e) => update(it.id, "category", e.target.value)}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{CAT_ICON[c]} {c}</option>
                            ))}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-hair px-5 py-3">
          <button
            onClick={close}
            className="flex-1 rounded-xl border border-hair py-3 text-sm font-semibold text-stone-500 transition hover:bg-stone-50"
          >
            Annulla
          </button>
          <button
            onClick={() => onConfirm(items)}
            disabled={items.length === 0}
            className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-tomato py-3 text-sm font-bold text-white transition hover:bg-tomato-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {items.length > 0
              ? `Aggiungi ${items.length} ${items.length === 1 ? "prodotto" : "prodotti"}`
              : "Aggiungi"}
          </button>
        </div>
      </>
      )}
    </Sheet>
  );
}
