// Scheda "Spesa" (stile editoriale): lista con spunta, contatore, swipe-to-delete,
// raggruppamento per reparto, aggiunta in basso. Bianco / nero / rosso.
import { useState, useRef } from "react";
import { Plus, Minus, Trash2, Check, PackagePlus, Loader2, ListChecks, Store } from "lucide-react";
import { CATEGORIES, CAT_ICON } from "../constants.js";
import { guessCategory } from "../lib/pantry.js";

// Riga con gesto di scorrimento orizzontale per eliminare.
function SwipeItem({ it, onToggle, onAdjustQty, onDelete }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const start = useRef(null);
  const axis = useRef(null);
  const THRESHOLD = 80;

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
      const w = typeof window !== "undefined" ? window.innerWidth : 400;
      setRemoving(true);
      setDx(ddx > 0 ? w : -w);
      setTimeout(() => onDelete(it.id), 300);
    } else {
      setDx(0);
    }
    axis.current = null;
  }

  const n = parseFloat(String(it.qty).replace(",", "."));
  const atMin = !isNaN(n) && n <= 1;

  return (
    <li
      data-noswipe
      className="relative overflow-hidden transition-all duration-300 ease-out"
      style={{ maxHeight: removing ? 0 : "6rem", opacity: removing ? 0 : 1 }}
    >
      <div className={`absolute inset-0 flex items-center bg-tomato px-5 text-white ${dx > 0 ? "justify-start" : "justify-end"}`}>
        <Trash2 className="h-5 w-5" />
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{
          transform: `translateX(${dx}px)`,
          touchAction: "pan-y",
          transition: dragging ? "none" : removing ? "transform 0.3s cubic-bezier(.4,0,.2,1)" : "transform 0.2s ease",
        }}
        className="relative flex items-center gap-3 bg-white py-3"
      >
        <button
          onClick={() => onToggle(it.id, !it.checked)}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
            it.checked
              ? "border-ink bg-ink text-white"
              : "border-stone-300 bg-white text-transparent hover:border-stone-500"
          }`}
          aria-label={it.checked ? "Segna da comprare" : "Segna come preso"}
        >
          <Check className="h-4 w-4" />
        </button>
        <p className={`min-w-0 flex-1 truncate text-[15px] font-semibold ${it.checked ? "text-stone-400 line-through" : "text-ink"}`}>
          {it.name}
        </p>
        <div className="shrink-0">
          {/\d/.test(it.qty) ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                onClick={() => onAdjustQty(it, -1)}
                disabled={atMin}
                className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                  atMin ? "border-hair text-stone-300" : "border-stone-300 text-stone-600 hover:border-ink hover:text-ink active:scale-95"
                }`}
                aria-label="Diminuisci"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[1.75rem] px-0.5 text-center text-sm font-bold tabular-nums text-ink">{it.qty}</span>
              <button
                onClick={() => onAdjustQty(it, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-tomato hover:bg-tomato/5 hover:text-tomato active:scale-95"
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
  shopping,
  onAdd, onToggle, onDelete, onAdjustQty, onToggleAll, onMoveChecked, onClearChecked,
  movingChecked, onHideNav, byAisle, setByAisle,
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [focused, setFocused] = useState(false);

  const checkedCount = shopping.filter((s) => s.checked).length;
  const allChecked = shopping.length > 0 && checkedCount === shopping.length;

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

  const inputBase = "w-full rounded-xl border border-hair bg-paper px-3.5 py-3 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

  return (
    <div className="pt-2">
      {/* Header editoriale */}
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">La tua lista</div>
      <h1 className="mt-1 font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-ink">La spesa</h1>

      {shopping.length === 0 && (
        <p className="py-12 text-center text-sm text-stone-400">
          La lista è vuota. Aggiungi qualcosa qui sotto, o aggiungi i mancanti da una ricetta.
        </p>
      )}

      <div className="mt-5">
        {shopping.length > 0 && (
          byAisle ? (
            <div className="space-y-6">
              {groups.map(({ cat, list }) => (
                <section key={cat}>
                  <div className="flex items-center gap-2 border-b border-ink/15 pb-2">
                    <span className="text-base">{CAT_ICON[cat]}</span>
                    <h4 className="font-display text-base font-bold uppercase tracking-wide text-ink">{cat}</h4>
                    <span className="font-display text-sm font-bold text-tomato">{String(list.length).padStart(2, "0")}</span>
                  </div>
                  <ul className="divide-y divide-hair">{renderItems(list)}</ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-hair border-t border-ink/15">{renderItems(shopping)}</ul>
          )
        )}
      </div>

      {shopping.length > 0 && (
        <p className="mt-3 text-center text-[11px] text-stone-400">
          Scorri un prodotto a destra o sinistra per eliminarlo
        </p>
      )}

      {checkedCount > 0 && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onMoveChecked}
            disabled={movingChecked}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            {movingChecked
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><PackagePlus className="h-4 w-4" /> Sposta {checkedCount} in dispensa</>}
          </button>
          <button
            onClick={onClearChecked}
            className="rounded-xl border border-hair px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-stone-50"
          >
            Rimuovi
          </button>
        </div>
      )}

      <div className="h-60" />

      {/* Form aggiunta: fisso in basso. Mentre scrivi, scende a ridosso del bordo
          (la barra di navigazione viene nascosta) per stare sopra la tastiera. */}
      <div
        className="fixed inset-x-0 z-20 border-t border-hair bg-white/95 backdrop-blur transition-[bottom] duration-150"
        style={{ bottom: focused ? "env(safe-area-inset-bottom)" : "calc(60px + env(safe-area-inset-bottom))" }}
      >
        <div
          className="mx-auto max-w-md px-5 py-3"
          onFocus={() => { setFocused(true); onHideNav?.(true); }}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setFocused(false); onHideNav?.(false); } }}
        >
          <input
            className={inputBase}
            placeholder="Cosa ti manca?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-hair bg-paper">
              <button
                onClick={() => setQty((q) => String(Math.max(1, (parseFloat(String(q).replace(",", ".")) || 1) - 1)))}
                className="flex h-11 w-10 items-center justify-center rounded-l-xl text-stone-600 transition hover:bg-stone-100"
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
                className="w-12 border-0 bg-transparent text-center text-lg font-bold text-ink outline-none"
              />
              <button
                onClick={() => setQty((q) => String((parseFloat(String(q).replace(",", ".")) || 0) + 1))}
                className="flex h-11 w-10 items-center justify-center rounded-r-xl text-stone-600 transition hover:bg-stone-100"
                aria-label="Più"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={add}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-black"
            >
              <Plus className="h-4 w-4" /> Aggiungi
            </button>
          </div>

          {shopping.length > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={() => setByAisle((v) => !v)}
                aria-pressed={byAisle}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  byAisle ? "border-ink bg-ink text-white" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"
                }`}
              >
                <Store className="h-3.5 w-3.5" /> Per reparto
              </button>
              <button
                onClick={onToggleAll}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-ink"
              >
                <ListChecks className="h-3.5 w-3.5" />
                {allChecked ? "Deseleziona tutto" : "Seleziona tutto"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
