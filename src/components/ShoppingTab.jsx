// Scheda "Da comprare": lista della spesa con spunta, aggiunta manuale,
// e azioni per spostare i prodotti barrati nella dispensa o rimuoverli.
import { useState } from "react";
import { Plus, Minus, Trash2, Check, PackagePlus, Loader2, ListChecks } from "lucide-react";

export default function ShoppingTab({
  inputCls,
  shopping,
  onAdd, onToggle, onDelete, onAdjustQty, onToggleAll, onMoveChecked, onClearChecked,
  movingChecked,
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");

  const checkedCount = shopping.filter((s) => s.checked).length;
  const allChecked = shopping.length > 0 && checkedCount === shopping.length;

  function add() {
    const n = name.trim();
    if (!n) return;
    onAdd(n, String(qty).trim() || "1");
    setName(""); setQty("1");
  }

  return (
    <>
      {shopping.length === 0 && (
        <p className="py-10 text-center text-sm text-stone-400">
          La lista della spesa è vuota. Aggiungi qualcosa qui sotto, o aggiungi gli
          ingredienti mancanti da una ricetta.
        </p>
      )}

      {shopping.length > 0 && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={onToggleAll}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <ListChecks className="h-3.5 w-3.5" />
            {allChecked ? "Deseleziona tutto" : "Seleziona tutto"}
          </button>
        </div>
      )}

      {shopping.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <ul className="divide-y divide-stone-100">
            {shopping.map((it) => (
              <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => onToggle(it.id, !it.checked)}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                    it.checked
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-stone-300 bg-white text-transparent hover:border-stone-400"
                  }`}
                  aria-label={it.checked ? "Segna da comprare" : "Segna come preso"}
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${it.checked ? "text-stone-400 line-through" : "text-stone-800"}`}>
                    {it.name}
                  </p>
                  <div className="mt-1 flex items-center">
                    {/\d/.test(it.qty) ? (() => {
                      const n = parseFloat(String(it.qty).replace(",", "."));
                      const atMin = !isNaN(n) && n <= 1;
                      return (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onAdjustQty(it, -1)}
                            disabled={atMin}
                            className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                              atMin
                                ? "border-stone-200 text-stone-300"
                                : "border-stone-300 text-stone-600 hover:border-stone-400 hover:bg-stone-100 active:scale-95"
                            }`}
                            aria-label="Diminuisci"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[2rem] px-1 text-center text-sm font-semibold tabular-nums text-stone-800">{it.qty}</span>
                          <button
                            onClick={() => onAdjustQty(it, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
                            aria-label="Aumenta"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })() : (
                      it.qty && it.qty !== "1" && <span className="text-xs text-stone-500">{it.qty}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(it.id)}
                  className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Elimina"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {checkedCount > 0 && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onMoveChecked}
            disabled={movingChecked}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {movingChecked
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><PackagePlus className="h-4 w-4" /> Sposta {checkedCount} in dispensa</>}
          </button>
          <button
            onClick={onClearChecked}
            className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Rimuovi
          </button>
        </div>
      )}

      {/* Form aggiunta (sticky in fondo): nome in alto, contatore quantità sotto */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <input
          className={inputCls}
          placeholder="Cosa ti manca?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-stone-300 bg-white">
            <button
              onClick={() => setQty((q) => String(Math.max(1, (parseFloat(String(q).replace(",", ".")) || 1) - 1)))}
              className="flex h-11 w-11 items-center justify-center rounded-l-lg text-stone-600 transition hover:bg-stone-100"
              aria-label="Meno"
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^0-9.,]/g, ""))}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => e.key === "Enter" && add()}
              className="w-16 border-0 bg-transparent text-center text-lg font-semibold text-stone-800 outline-none"
            />
            <button
              onClick={() => setQty((q) => String((parseFloat(String(q).replace(",", ".")) || 0) + 1))}
              className="flex h-11 w-11 items-center justify-center rounded-r-lg text-stone-600 transition hover:bg-stone-100"
              aria-label="Più"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={add}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-800 px-4 py-3 text-sm font-medium text-white hover:bg-stone-900"
          >
            <Plus className="h-4 w-4" /> Aggiungi
          </button>
        </div>
      </div>
    </>
  );
}
