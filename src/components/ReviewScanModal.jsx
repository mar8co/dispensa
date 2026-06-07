// Modale di revisione dopo una scansione (scontrino / screenshot / foto spesa).
// Mostra i prodotti riconosciuti GIÀ raggruppati per categoria; per ciascuno
// si può modificare nome, quantità e categoria (cambiando categoria il prodotto
// si sposta nel gruppo scelto) oppure rimuoverlo. Solo alla conferma i prodotti
// vengono aggiunti alla dispensa.
import { useState } from "react";
import { X, Check } from "lucide-react";
import { CATEGORIES, CAT_ICON } from "../constants.js";

function tmpId() {
  return Math.random().toString(36).slice(2, 10);
}

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

  // Raggruppa per categoria nell'ordine di CATEGORIES.
  const grouped = CATEGORIES
    .map((c) => ({ cat: c, list: items.filter((x) => x.category === c) }))
    .filter((g) => g.list.length > 0);

  const fieldCls =
    "rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="flex max-h-screen w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold">Prodotti riconosciuti</h3>
            <p className="text-xs text-stone-500">
              Controlla nome e categoria, poi conferma.
            </p>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              Nessun prodotto da aggiungere.
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ cat, list }) => (
                <div key={cat}>
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-base">{CAT_ICON[cat]}</span>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{cat}</h4>
                    <span className="rounded-full bg-stone-100 px-1.5 text-xs text-stone-500">{list.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {list.map((it) => (
                      <li key={it.id} className="rounded-xl border border-stone-200 p-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            className={`${fieldCls} min-w-0 flex-1`}
                            value={it.name}
                            onChange={(e) => update(it.id, "name", e.target.value)}
                            placeholder="Nome"
                          />
                          <input
                            className={`${fieldCls} w-20 text-center`}
                            value={it.qty}
                            onChange={(e) => update(it.id, "qty", e.target.value)}
                            placeholder="Qtà"
                          />
                          <button
                            onClick={() => remove(it.id)}
                            className="shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-600"
                            aria-label="Rimuovi"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <select
                          className={`${fieldCls} mt-2 w-full`}
                          value={it.category}
                          onChange={(e) => update(it.id, "category", e.target.value)}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-stone-100 px-4 py-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Annulla
          </button>
          <button
            onClick={() => onConfirm(items)}
            disabled={items.length === 0}
            className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {items.length > 0 ? `Aggiungi ${items.length} prodotti` : "Aggiungi"}
          </button>
        </div>
      </div>
    </div>
  );
}
