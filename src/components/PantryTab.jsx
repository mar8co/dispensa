// Scheda Dispensa — stile editoriale: ricerca, striscia scadenze, sezioni
// separate da righe sottili, +/- rapido, swipe-to-delete, scadenze, modifica
// in-line. L'aggiunta è gestita dal menù "+" fluttuante.
import { useState, useRef } from "react";
import {
  Trash2, Pencil, Check, X, Search, ShoppingCart, AlertTriangle, ChefHat,
  ChevronDown, ChevronRight, GripVertical, ChevronsDownUp, ChevronsUpDown,
} from "lucide-react";
import { CATEGORIES, CAT_ICON } from "../constants.js";
import { expiryStatus, formatExpiry } from "../lib/pantry.js";

const EXP_STYLE = {
  scaduto: "bg-tomato text-white",
  oggi: "bg-tomato text-white",
  presto: "bg-tomato/10 text-tomato",
  settimana: "bg-amber-100 text-amber-700",
  ok: "bg-stone-100 text-stone-500",
};

function ExpiryBadge({ date }) {
  const st = expiryStatus(date);
  if (!st) return null;
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${EXP_STYLE[st]}`}>
      {formatExpiry(date)}
    </span>
  );
}

const editCls =
  "w-full rounded-xl border border-hair bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

const SORTS = [
  ["recenti", "Recenti"],
  ["nome", "A-Z"],
  ["scadenza", "Scadenza"],
];

// Riga con gesto di scorrimento orizzontale per eliminare (come in Spesa).
function SwipeRow({ onDelete, children }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [out, setOut] = useState(false);
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
      setOut(true);
      setDx(ddx > 0 ? w : -w);
      setTimeout(() => setRemoving(true), 200);
      setTimeout(onDelete, 500);
    } else {
      setDx(0);
    }
    axis.current = null;
  }

  return (
    <li
      data-noswipe
      className="relative overflow-hidden border-b border-hair"
      style={{
        maxHeight: removing ? 0 : "6rem",
        opacity: removing ? 0 : 1,
        transition: "max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease",
      }}
    >
      <div
        className={`absolute inset-0 flex items-center bg-tomato px-5 text-white transition-opacity duration-200 ${dx > 0 ? "justify-start" : "justify-end"} ${out ? "opacity-0" : "opacity-100"}`}
      >
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
          transition: dragging
            ? "none"
            : out
              ? "transform 0.22s cubic-bezier(0.55, 0, 1, 0.45)"
              : "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="relative flex items-center gap-2 bg-cream py-3"
      >
        {children}
      </div>
    </li>
  );
}

export default function PantryTab({
  search, setSearch, sort, setSort, onOpenProfile, userInitial,
  grouped, collapsed, setCollapsed, cardRefs, allCollapsed, onToggleAll,
  dragCat, onDragStart, onDragMove, onDragEnd, onAdjustQty,
  editId, editName, setEditName, editQty, setEditQty, editCat, setEditCat,
  editExpiry, setEditExpiry, startEdit, saveEdit, setEditId, removeItem,
  expiringCount, expFilter, setExpFilter, onCookExpiring, isOut, onToShopping,
}) {
  const searchActive = search.trim() !== "";

  return (
    <div className="pt-2">
      {/* Header editoriale */}
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">La tua dispensa</div>
        <button
          onClick={onOpenProfile}
          className="-mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-white shadow-sm transition hover:opacity-90 active:scale-95"
          aria-label="Profilo"
          title="Profilo"
        >
          {userInitial}
        </button>
      </div>
      <h1 className="mt-1 font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-ink">Ciao 👋<br />Hai fame?</h1>

      {/* Ricerca minimale: solo riga sotto, nessun bordo/box */}
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          className="w-full border-0 border-b border-ink/20 bg-transparent py-2.5 pl-7 pr-7 text-sm text-ink outline-none focus:border-ink"
          placeholder="Cerca un prodotto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchActive && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Cancella ricerca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Striscia scadenze: tap = filtra solo ciò che scade entro 7 giorni */}
      {expiringCount > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-amber-700/30 bg-amber-100/60">
          <button
            onClick={() => setExpFilter(!expFilter)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
            <span className="flex-1 text-xs font-semibold text-amber-700">
              {expiringCount} {expiringCount === 1 ? "prodotto" : "prodotti"} in scadenza entro 7 giorni
            </span>
            <span className="shrink-0 text-[11px] font-bold text-amber-700 underline">
              {expFilter ? "mostra tutto" : "mostra"}
            </span>
          </button>
          {expFilter && (
            <button
              onClick={onCookExpiring}
              className="flex w-full items-center justify-center gap-1.5 border-t border-amber-700/20 px-3 py-2.5 text-xs font-bold text-tomato transition hover:bg-tomato/5"
            >
              <ChefHat className="h-4 w-4" /> Cucina con questi
            </button>
          )}
        </div>
      )}

      {/* Ordinamento (chips) + apri/chiudi */}
      {grouped.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {SORTS.map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSort(v)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                  sort === v ? "border-ink bg-ink text-white" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button onClick={onToggleAll} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-500 hover:text-ink">
            {allCollapsed ? (<><ChevronsUpDown className="h-3.5 w-3.5" /> Apri</>) : (<><ChevronsDownUp className="h-3.5 w-3.5" /> Chiudi</>)}
          </button>
        </div>
      )}

      {grouped.length === 0 && (
        <p className="py-12 text-center text-sm text-stone-400">
          {searchActive ? "Nessun prodotto trovato." : expFilter ? "Niente in scadenza. 🎉" : "Dispensa vuota. Tocca + per aggiungere."}
        </p>
      )}

      {/* Sezioni (niente scatole: righe sottili) */}
      <div className="mt-4 space-y-6">
        {grouped.map(({ cat, list }) => {
          const open = !collapsed[cat] || searchActive || expFilter;
          return (
            <section key={cat} ref={(el) => { cardRefs.current[cat] = el; }} className={dragCat === cat ? "rounded-2xl ring-2 ring-tomato/30" : ""}>
              <div className="flex items-center gap-2 border-b border-ink/15 pb-2">
                <button onClick={() => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))} className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
                  <span className="text-base">{CAT_ICON[cat]}</span>
                  <h2 className="font-display text-lg font-semibold text-ink">{cat}</h2>
                  <span className="font-display text-sm font-bold text-tomato">{String(list.length).padStart(2, "0")}</span>
                  <span className="ml-auto">
                    {open ? <ChevronDown className="h-4 w-4 text-stone-400" /> : <ChevronRight className="h-4 w-4 text-stone-400" />}
                  </span>
                </button>
                <button
                  data-noswipe
                  onPointerDown={(e) => onDragStart(e, cat)}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  onPointerCancel={onDragEnd}
                  style={{ touchAction: "none" }}
                  className="shrink-0 cursor-grab rounded-lg p-1 text-stone-300 hover:text-stone-600 active:cursor-grabbing"
                  aria-label="Trascina per riordinare"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>

              {open && (
                <ul>
                  {list.map((it) => {
                    if (editId === it.id) {
                      return (
                        <li key={it.id} className="space-y-2 border-b border-hair py-3">
                          <input className={editCls} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" />
                          <div className="flex gap-2">
                            <input className={editCls} value={editQty} onChange={(e) => setEditQty(e.target.value)} placeholder="Quantità" />
                            <select className={editCls} value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="shrink-0">Scadenza:</span>
                            <input type="date" className={editCls} value={editExpiry || ""} onChange={(e) => setEditExpiry(e.target.value)} />
                            {editExpiry && (
                              <button onClick={() => setEditExpiry("")} className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-100" aria-label="Rimuovi scadenza"><X className="h-4 w-4" /></button>
                            )}
                          </label>
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white hover:opacity-90"><Check className="h-4 w-4" /> Salva</button>
                            <button onClick={() => setEditId(null)} className="flex items-center justify-center rounded-xl border border-hair px-3 py-2 text-stone-500 hover:bg-stone-50"><X className="h-4 w-4" /></button>
                          </div>
                        </li>
                      );
                    }
                    const out = isOut(it);
                    return (
                      <SwipeRow key={it.id} onDelete={() => removeItem(it)}>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-[15px] font-semibold ${out ? "text-stone-400" : "text-ink"}`}>
                            {it.name}
                            <ExpiryBadge date={it.expiry} />
                          </p>
                          {out && (
                            <button
                              onClick={() => onToShopping(it)}
                              className="mt-1 inline-flex items-center gap-1 rounded-full bg-tomato/10 px-2 py-0.5 text-[11px] font-bold text-tomato transition hover:bg-tomato/20"
                            >
                              <ShoppingCart className="h-3 w-3" /> finito · metti in lista
                            </button>
                          )}
                        </div>
                        {/\d/.test(it.qty) ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              onClick={() => onAdjustQty(it, -1)}
                              disabled={out}
                              className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                                out ? "border-hair text-stone-300" : "border-stone-300 text-stone-600 hover:border-ink hover:text-ink active:scale-95"
                              }`}
                              aria-label="Diminuisci"
                            >
                              <span className="text-base leading-none">−</span>
                            </button>
                            <span className={`min-w-[1.75rem] px-0.5 text-center text-sm font-bold tabular-nums ${out ? "text-stone-400" : "text-ink"}`}>{it.qty}</span>
                            <button
                              onClick={() => onAdjustQty(it, 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-tomato hover:bg-tomato/5 hover:text-tomato active:scale-95"
                              aria-label="Aumenta"
                            >
                              <span className="text-base leading-none">+</span>
                            </button>
                          </div>
                        ) : (
                          <span className="shrink-0 text-xs text-stone-400">{it.qty}</span>
                        )}
                        <button onClick={() => startEdit(it)} className="ml-0.5 shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-700" aria-label="Modifica"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => removeItem(it)} className="shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-tomato/10 hover:text-tomato" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                      </SwipeRow>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
