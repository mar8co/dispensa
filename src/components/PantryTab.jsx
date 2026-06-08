// Scheda Dispensa — stile editoriale: titolo serif, ricerca, sezioni separate
// da righe sottili (niente scatole), accento pomodoro, +/- rapido, scadenze,
// modifica/eliminazione in-line. L'aggiunta è gestita dalla barra in basso.
import {
  Plus, Minus, Trash2, Pencil, Check, X, Search,
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

export default function PantryTab({
  total,
  search, setSearch, sort, setSort,
  grouped, collapsed, setCollapsed, cardRefs, allCollapsed, onToggleAll,
  dragCat, onDragStart, onDragMove, onDragEnd, onAdjustQty,
  editId, editName, setEditName, editQty, setEditQty, editCat, setEditCat,
  editExpiry, setEditExpiry, startEdit, saveEdit, setEditId, removeItem,
  setConfirmClear,
}) {
  const searchActive = search.trim() !== "";

  return (
    <div className="pt-2">
      {/* Header editoriale */}
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">La tua dispensa</div>
      <h1 className="mt-1.5 font-display text-[40px] font-semibold leading-[0.98] text-ink">Ciao!<br />Hai fame?</h1>
      <p className="mt-2.5 text-sm text-stone-500">{total} prodotti · {grouped.length} categorie</p>

      {/* Ricerca */}
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          className="w-full rounded-xl border border-hair bg-paper py-2.5 pl-9 pr-9 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15"
          placeholder="Cerca un prodotto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchActive && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:bg-stone-100" aria-label="Cancella ricerca">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Ordinamento + apri/chiudi */}
      {grouped.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-hair bg-paper px-2 py-1.5 text-xs font-semibold text-stone-600 outline-none focus:border-stone-400"
          >
            <option value="recenti">Più recenti</option>
            <option value="nome">Nome (A-Z)</option>
            <option value="scadenza">Scadenza</option>
          </select>
          <button onClick={onToggleAll} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-500 hover:text-ink">
            {allCollapsed ? (<><ChevronsUpDown className="h-3.5 w-3.5" /> Apri tutto</>) : (<><ChevronsDownUp className="h-3.5 w-3.5" /> Chiudi tutto</>)}
          </button>
        </div>
      )}

      {grouped.length === 0 && (
        <p className="py-12 text-center text-sm text-stone-400">
          {searchActive ? "Nessun prodotto trovato." : "Dispensa vuota. Tocca + per aggiungere."}
        </p>
      )}

      {/* Sezioni (niente scatole: righe sottili) */}
      <div className="mt-4 space-y-6">
        {grouped.map(({ cat, list }) => {
          const open = !collapsed[cat] || searchActive;
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
                  {list.map((it) =>
                    editId === it.id ? (
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
                          <button onClick={saveEdit} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-black"><Check className="h-4 w-4" /> Salva</button>
                          <button onClick={() => setEditId(null)} className="flex items-center justify-center rounded-xl border border-hair px-3 py-2 text-stone-500 hover:bg-stone-50"><X className="h-4 w-4" /></button>
                        </div>
                      </li>
                    ) : (
                      <li key={it.id} className="flex items-center gap-2 border-b border-hair py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-ink">{it.name}<ExpiryBadge date={it.expiry} /></p>
                        </div>
                        {/\d/.test(it.qty) ? (
                          <div className="flex shrink-0 items-center gap-2 text-stone-400">
                            <button onClick={() => onAdjustQty(it, -1)} className="text-base leading-none hover:text-ink" aria-label="Diminuisci">−</button>
                            <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-ink">{it.qty}</span>
                            <button onClick={() => onAdjustQty(it, 1)} className="text-base leading-none hover:text-tomato" aria-label="Aumenta">+</button>
                          </div>
                        ) : (
                          <span className="shrink-0 text-xs text-stone-400">{it.qty}</span>
                        )}
                        <button onClick={() => startEdit(it)} className="ml-1 shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-700" aria-label="Modifica"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => removeItem(it)} className="shrink-0 rounded-lg p-1.5 text-stone-300 hover:bg-tomato/10 hover:text-tomato" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                      </li>
                    )
                  )}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {grouped.length > 0 && !searchActive && (
        <button onClick={() => setConfirmClear(true)} className="mx-auto mt-8 block text-xs text-stone-300 hover:text-stone-500">
          Svuota dispensa
        </button>
      )}
    </div>
  );
}
