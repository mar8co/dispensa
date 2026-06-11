// Scheda Dispensa — vista "scaffali": una card per categoria con righe
// compatte (nome + quantità), tutta la dispensa a colpo d'occhio. Toccando
// un prodotto si aprono lì sotto i comandi: quantità, scadenza, modifica,
// elimina. Un solo prodotto aperto alla volta.
import { useState } from "react";
import {
  Trash2, Pencil, Check, X, Search, ShoppingCart, AlertTriangle, ChefHat,
  CalendarPlus, GripVertical,
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
    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${EXP_STYLE[st]}`}>
      {formatExpiry(date)}
    </span>
  );
}

const editCls =
  "w-full rounded-lg border border-hair bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

const SORTS = [
  ["recenti", "Recenti"],
  ["nome", "A-Z"],
  ["scadenza", "Scadenza"],
];

// Tono del nome a riposo: spento se finito, rosso se scade a brevissimo,
// ambra se scade in settimana.
function nameTone(it, out) {
  if (out) return "text-stone-400";
  const st = expiryStatus(it.expiry);
  if (st === "scaduto" || st === "oggi" || st === "presto") return "text-tomato";
  if (st === "settimana") return "text-amber-700";
  return "text-ink";
}

// Quantità a riposo: i numeri puri diventano "×3", il resto resta com'è.
const qtyLabel = (q) => (/^\d+$/.test(String(q).trim()) ? `×${String(q).trim()}` : q);

export default function PantryTab({
  search, setSearch, sort, setSort, onOpenProfile, userInitial,
  grouped, cardRefs,
  dragCat, onDragStart, onDragMove, onDragEnd, onAdjustQty, onSetExpiry,
  editId, editName, setEditName, editCat, setEditCat,
  startEdit, saveEdit, setEditId, removeItem,
  expiringCount, expFilter, setExpFilter, onCookExpiring, isOut, onToShopping,
}) {
  const searchActive = search.trim() !== "";
  const [openId, setOpenId] = useState(null); // prodotto coi comandi aperti

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

      {/* Ricerca minimale */}
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

      {/* Striscia scadenze */}
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

      {/* Ordinamento (dentro ogni scaffale) */}
      {grouped.length > 0 && (
        <div className="mt-3 flex gap-1.5">
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
      )}

      {grouped.length === 0 && (
        <p className="py-12 text-center text-sm text-stone-400">
          {searchActive ? "Nessun prodotto trovato." : expFilter ? "Niente in scadenza. 🎉" : "Dispensa vuota. Tocca + per aggiungere."}
        </p>
      )}

      {/* Scaffali: una card per categoria, in due colonne */}
      <div className="mt-4 columns-2 gap-3">
        {grouped.map(({ cat, list }) => (
          <section
            key={cat}
            ref={(el) => { cardRefs.current[cat] = el; }}
            className={`mb-3 break-inside-avoid rounded-2xl border bg-paper p-3 ${dragCat === cat ? "border-tomato ring-2 ring-tomato/20" : "border-hair"}`}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-sm">{CAT_ICON[cat]}</span>
              <h2 className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-tomato">{cat}</h2>
              <span className="text-[11px] font-bold text-stone-400">{list.length}</span>
              <button
                onPointerDown={(e) => onDragStart(e, cat)}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
                style={{ touchAction: "none" }}
                className="-mr-1.5 shrink-0 cursor-grab rounded p-1 text-stone-300 hover:text-stone-600 active:cursor-grabbing"
                aria-label="Trascina per riordinare"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            </div>

            <ul>
              {list.map((it) => {
                const out = isOut(it);

                // Modifica: nome + categoria, in linea nello scaffale
                if (editId === it.id) {
                  return (
                    <li key={it.id} className="-mx-1 my-1 space-y-2 rounded-xl bg-stone-50 p-2.5">
                      <input
                        autoFocus
                        className={editCls}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        placeholder="Nome"
                      />
                      <select className={editCls} value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-ink px-2 py-2 text-xs font-semibold text-white hover:opacity-90">
                          <Check className="h-3.5 w-3.5" /> Salva
                        </button>
                        <button onClick={() => setEditId(null)} className="flex items-center justify-center rounded-lg border border-hair px-2.5 text-stone-500 hover:bg-stone-100" aria-label="Annulla">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                }

                // Espanso: comandi sotto il prodotto toccato
                if (openId === it.id) {
                  return (
                    <li key={it.id} className="-mx-1 my-1 rounded-xl bg-stone-50 p-2.5">
                      <button onClick={() => setOpenId(null)} className="flex w-full items-center text-left">
                        <span className={`min-w-0 truncate text-[13px] font-bold ${nameTone(it, out)}`}>
                          {it.name}
                          <ExpiryBadge date={it.expiry} />
                        </span>
                      </button>
                      {out && (
                        <button
                          onClick={() => onToShopping(it)}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-tomato/10 px-2 py-0.5 text-[11px] font-bold text-tomato transition hover:bg-tomato/20"
                        >
                          <ShoppingCart className="h-3 w-3" /> finito · metti in lista
                        </button>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {/\d/.test(it.qty) ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onAdjustQty(it, -1)}
                              disabled={out}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border text-base leading-none transition ${
                                out ? "border-hair text-stone-300" : "border-stone-300 text-stone-600 hover:border-ink hover:text-ink active:scale-95"
                              }`}
                              aria-label="Diminuisci"
                            >−</button>
                            <span className="min-w-[2.25rem] text-center text-sm font-bold tabular-nums text-ink">{it.qty}</span>
                            <button
                              onClick={() => onAdjustQty(it, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-base leading-none text-stone-600 transition hover:border-tomato hover:text-tomato active:scale-95"
                              aria-label="Aumenta"
                            >+</button>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-500">{it.qty}</span>
                        )}
                        <div className="flex gap-1.5">
                          <label
                            title="Scadenza"
                            className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition ${
                              it.expiry ? "border-tomato/40 bg-tomato/5 text-tomato" : "border-hair text-stone-500 hover:text-tomato"
                            }`}
                          >
                            <CalendarPlus className="h-4 w-4" />
                            <input
                              type="date"
                              value={it.expiry || ""}
                              onChange={(e) => onSetExpiry(it, e.target.value)}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              aria-label="Scadenza"
                            />
                          </label>
                          <button
                            onClick={() => startEdit(it)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-hair text-stone-500 transition hover:bg-stone-100 hover:text-ink"
                            aria-label="Modifica"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setOpenId(null); removeItem(it); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-hair text-stone-500 transition hover:bg-tomato/10 hover:text-tomato"
                            aria-label="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                }

                // A riposo: solo nome + quantità
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => setOpenId(it.id)}
                      className="flex w-full items-center justify-between gap-2 py-1 text-left"
                    >
                      <span className={`min-w-0 truncate text-[13px] font-semibold ${nameTone(it, out)}`}>{it.name}</span>
                      <span className="shrink-0 text-xs text-stone-400">{qtyLabel(it.qty)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
