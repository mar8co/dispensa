// Scheda "Da comprare": lista della spesa con spunta, contatore quantità,
// swipe-to-delete (scorri la riga a destra/sinistra per eliminare), aggiunta
// manuale e azioni per spostare i barrati in dispensa o rimuoverli.
import { useState, useRef } from "react";
import { Plus, Minus, Trash2, Check, PackagePlus, Loader2, ListChecks, Store } from "lucide-react";
import { CATEGORIES, CAT_ICON } from "../constants.js";
import { guessCategory } from "../lib/pantry.js";

// Riga con gesto di scorrimento orizzontale per eliminare.
function SwipeItem({ it, onToggle, onAdjustQty, onDelete }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const axis = useRef(null); // 'h' | 'v' | null

  const THRESHOLD = 90;

  function onPointerDown(e) {
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
    setDragging(true);
  }
  function onPointerMove(e) {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (axis.current == null) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      axis.current = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
      // Da qui in poi gestiamo noi lo swipe orizzontale.
      if (axis.current === "h") {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignora */ }
      }
    }
    if (axis.current === "h") setDx(ddx);
  }
  function onPointerEnd(e) {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    start.current = null;
    setDragging(false);
    if (axis.current === "h" && Math.abs(ddx) > THRESHOLD) {
      setDx(ddx > 0 ? 600 : -600); // esce di scena
      setTimeout(() => onDelete(it.id), 160);
    } else {
      setDx(0);
    }
    axis.current = null;
  }

  const n = parseFloat(String(it.qty).replace(",", "."));
  const atMin = !isNaN(n) && n <= 1;

  return (
    <li className="relative overflow-hidden">
      {/* Sfondo rosso: il cestino appare solo sul lato che si scopre scorrendo
          (a destra se scorri verso sinistra, a sinistra se scorri verso destra). */}
      <div className={`absolute inset-0 flex items-center bg-red-500 px-5 text-white ${dx > 0 ? "justify-start" : "justify-end"}`}>
        <Trash2 className="h-5 w-5" />
      </div>
      {/* Contenuto scorrevole */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{
          transform: `translateX(${dx}px)`,
          touchAction: "pan-y",
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className="relative flex items-center gap-2 bg-white px-4 py-3"
      >
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
        <p className={`min-w-0 flex-1 truncate text-sm font-medium ${it.checked ? "text-stone-400 line-through" : "text-stone-800"}`}>
          {it.name}
        </p>
        <div className="shrink-0">
          {/\d/.test(it.qty) ? (
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
              <span className="min-w-[1.75rem] px-0.5 text-center text-sm font-semibold tabular-nums text-stone-800">{it.qty}</span>
              <button
                onClick={() => onAdjustQty(it, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
                aria-label="Aumenta"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            it.qty && it.qty !== "1" && <span className="text-xs text-stone-500">{it.qty}</span>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ShoppingTab({
  inputCls,
  shopping,
  onAdd, onToggle, onDelete, onAdjustQty, onToggleAll, onMoveChecked, onClearChecked,
  movingChecked,
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [byAisle, setByAisle] = useState(true);

  const checkedCount = shopping.filter((s) => s.checked).length;
  const allChecked = shopping.length > 0 && checkedCount === shopping.length;

  // Raggruppa per reparto (categoria indovinata dal nome), nell'ordine di CATEGORIES.
  const groups = CATEGORIES
    .map((c) => ({ cat: c, list: shopping.filter((s) => (guessCategory(s.name) || "Altro") === c) }))
    .filter((g) => g.list.length > 0);

  const renderItems = (list) =>
    list.map((it) => (
      <SwipeItem key={it.id} it={it} onToggle={onToggle} onAdjustQty={onAdjustQty} onDelete={onDelete} />
    ));

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
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={() => setByAisle((v) => !v)}
            aria-pressed={byAisle}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              byAisle
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-stone-300 bg-white text-stone-500 hover:bg-stone-50"
            }`}
          >
            <Store className="h-3.5 w-3.5" /> Per reparto
          </button>
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
        byAisle ? (
          <div className="space-y-3">
            {groups.map(({ cat, list }) => (
              <div key={cat} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-2">
                  <span className="text-base">{CAT_ICON[cat]}</span>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{cat}</h4>
                  <span className="rounded-full bg-stone-100 px-1.5 text-xs text-stone-500">{list.length}</span>
                </div>
                <ul className="divide-y divide-stone-100">{renderItems(list)}</ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <ul className="divide-y divide-stone-100">{renderItems(shopping)}</ul>
          </div>
        )
      )}

      {shopping.length > 0 && (
        <p className="mt-2 text-center text-[11px] text-stone-400">
          Scorri un prodotto a destra o sinistra per eliminarlo
        </p>
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

      {/* Spazio per non coprire gli ultimi elementi con la barra fissa */}
      <div className="h-32" />

      {/* Form aggiunta: SEMPRE fisso in basso, a portata di pollice */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
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
      </div>
    </>
  );
}
