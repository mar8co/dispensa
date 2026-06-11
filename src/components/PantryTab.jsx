// Scheda Dispensa — vista "indice": sezioni a tutta larghezza per categoria,
// righe compatte con puntini di guida (nome ……… quantità), barra
// salta-reparto e intestazioni fisse durante lo scroll. Toccando un prodotto
// si aprono lì sotto i comandi: quantità, scadenza, modifica, elimina.
import { useState } from "react";
import {
  Trash2, Pencil, Check, X, Search, ShoppingCart, AlertTriangle, ChefHat,
  CalendarPlus, SlidersHorizontal, ArrowUp, ArrowDown,
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

function ExpiryBadge({ date, onlyUrgent = false }) {
  const st = expiryStatus(date);
  if (!st) return null;
  if (onlyUrgent && st === "ok") return null; // le date lontane non fanno rumore
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${EXP_STYLE[st]}`}>
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
  onMoveCat, onAdjustQty, onSetExpiry,
  editId, editName, setEditName, editQty, setEditQty, editCat, setEditCat,
  startEdit, saveEdit, setEditId, removeItem,
  expiringCount, expFilter, setExpFilter, onCookExpiring, isOut, onToShopping,
}) {
  const searchActive = search.trim() !== "";
  const [openId, setOpenId] = useState(null); // prodotto coi comandi aperti
  const [sortOpen, setSortOpen] = useState(false); // chips ordinamento a comparsa
  // Scadenza: si modifica in una riga dedicata e si salva SOLO con "Salva"
  // (su iOS il date picker, anche chiuso senza scegliere, imposta "oggi").
  const [expiryEditId, setExpiryEditId] = useState(null);
  const [expDraft, setExpDraft] = useState("");

  function toggleOpen(id) {
    setExpiryEditId(null);
    setOpenId((cur) => (cur === id ? null : id));
  }

  // Salta alla categoria: l'offset lascia spazio alla barra fissa.
  function jumpTo(cat) {
    cardRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

      {/* Ricerca minimale, con l'ordinamento dietro l'icona ⇅ a destra */}
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          className={`w-full border-0 border-b border-ink/20 bg-transparent py-2.5 pl-7 text-sm text-ink outline-none focus:border-ink ${searchActive ? "pr-16" : "pr-9"}`}
          placeholder="Cerca un prodotto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchActive && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Cancella ricerca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {grouped.length > 0 && (
          <button
            onClick={() => setSortOpen((v) => !v)}
            aria-expanded={sortOpen}
            className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1 transition hover:bg-stone-100 ${
              sort !== "recenti" ? "text-tomato" : "text-stone-400"
            }`}
            aria-label="Ordinamento"
            title="Ordinamento"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Chips ordinamento: compaiono solo al tocco dell'icona */}
      {sortOpen && grouped.length > 0 && (
        <div className="animate-fade-in mt-3 flex gap-1.5">
          {SORTS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => { setSort(v); setSortOpen(false); }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                sort === v ? "border-ink bg-ink text-white" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

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

      {/* Barra salta-reparto: fissa in alto durante lo scroll */}
      {grouped.length > 1 && (
        <div className="no-scrollbar sticky top-0 z-20 -mx-5 mt-3 flex h-12 items-center gap-1.5 overflow-x-auto bg-cream/95 px-5 backdrop-blur">
          {grouped.map(({ cat }) => (
            <button
              key={cat}
              onClick={() => jumpTo(cat)}
              className="shrink-0 rounded-full border border-hair bg-paper px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-tomato hover:text-tomato"
            >
              {CAT_ICON[cat]} {cat}
            </button>
          ))}
        </div>
      )}

      {grouped.length === 0 && (
        <p className="py-12 text-center text-sm text-stone-400">
          {searchActive ? "Nessun prodotto trovato." : expFilter ? "Niente in scadenza. 🎉" : "Dispensa vuota. Tocca + per aggiungere."}
        </p>
      )}

      {/* Sezioni a tutta larghezza, con intestazione fissa */}
      <div className="space-y-5">
        {grouped.map(({ cat, list }, gi) => (
          <section
            key={cat}
            ref={(el) => { cardRefs.current[cat] = el; }}
            style={{ scrollMarginTop: "48px" }}
          >
            <div className="sticky top-12 z-10 -mx-1 flex items-center gap-2 border-b border-ink/15 bg-cream px-1 pb-2 pt-2">
              <span className="text-base">{CAT_ICON[cat]}</span>
              <h2 className="min-w-0 truncate font-display text-lg font-semibold text-ink">{cat}</h2>
              <span className="font-display text-sm font-bold text-tomato">{String(list.length).padStart(2, "0")}</span>
              {/* Frecce per riordinare, nude e discrete: la prima categoria
                  può solo scendere, l'ultima solo salire */}
              <div className="ml-auto flex shrink-0 items-center">
                {gi > 0 && (
                  <button
                    onClick={() => onMoveCat(cat, -1)}
                    className="p-1.5 text-stone-400 transition hover:text-tomato active:scale-90 active:text-tomato"
                    aria-label="Sposta su"
                  >
                    <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </button>
                )}
                {gi < grouped.length - 1 && (
                  <button
                    onClick={() => onMoveCat(cat, 1)}
                    className="p-1.5 text-stone-400 transition hover:text-tomato active:scale-90 active:text-tomato"
                    aria-label="Sposta giù"
                  >
                    <ArrowDown className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </div>

            <ul>
              {list.map((it) => {
                const out = isOut(it);

                // Modifica: nome + categoria, in linea
                if (editId === it.id) {
                  return (
                    <li key={it.id} className="-mx-2 my-1 space-y-2 rounded-xl bg-stone-50 p-3">
                      <input
                        autoFocus
                        className={editCls}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        placeholder="Nome"
                      />
                      {/* Quantità: campo libero + chips unità rapide */}
                      <div className="flex items-center gap-1.5">
                        <input
                          className={`${editCls} w-24 shrink-0 text-center font-bold`}
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                          placeholder="Qtà"
                          aria-label="Quantità"
                        />
                        {(() => {
                          const curUnit = String(editQty).replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase();
                          return ["", "g", "kg", "ml", "l"].map((u) => {
                            const active = u === "" ? curUnit === "" : curUnit === u;
                            return (
                              <button
                                key={u || "pz"}
                                onClick={() => {
                                  const m = String(editQty).replace(",", ".").match(/-?\d+(\.\d+)?/);
                                  const n = m ? m[0].replace(".", ",") : "1";
                                  setEditQty(u ? `${n} ${u}` : n);
                                }}
                                aria-pressed={active}
                                className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                                  active ? "border-tomato bg-tomato text-white" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"
                                }`}
                              >
                                {u || "pz"}
                              </button>
                            );
                          });
                        })()}
                      </div>
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
                    <li key={it.id} className="-mx-2 my-1 rounded-xl bg-stone-50 p-3">
                      <button onClick={() => toggleOpen(it.id)} className="flex w-full items-center gap-2 text-left">
                        <span className={`min-w-0 truncate text-[15px] font-bold ${nameTone(it, out)}`}>{it.name}</span>
                        <ExpiryBadge date={it.expiry} />
                      </button>
                      {out && (
                        <button
                          onClick={() => onToShopping(it)}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-tomato/10 px-2 py-0.5 text-[11px] font-bold text-tomato transition hover:bg-tomato/20"
                        >
                          <ShoppingCart className="h-3 w-3" /> finito · metti in lista
                        </button>
                      )}
                      <div className="mt-2.5 flex items-center justify-between gap-2">
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
                            <span className="min-w-[2.5rem] text-center text-sm font-bold tabular-nums text-ink">{it.qty}</span>
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
                          <button
                            onClick={() => {
                              setExpDraft(it.expiry || "");
                              setExpiryEditId(expiryEditId === it.id ? null : it.id);
                            }}
                            title="Scadenza"
                            aria-label="Scadenza"
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                              it.expiry ? "border-tomato/40 bg-tomato/5 text-tomato" : "border-hair text-stone-500 hover:text-tomato"
                            }`}
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </button>
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

                      {/* Scadenza: si salva solo con "Salva" — chiudere il
                          calendario senza confermare non cambia nulla. */}
                      {expiryEditId === it.id && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <input
                            type="date"
                            value={expDraft}
                            onChange={(e) => setExpDraft(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-hair bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15"
                            aria-label="Data di scadenza"
                          />
                          <button
                            onClick={() => { onSetExpiry(it, expDraft); setExpiryEditId(null); }}
                            disabled={!expDraft || expDraft === (it.expiry || "")}
                            className="shrink-0 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                          >
                            Salva
                          </button>
                          {it.expiry && (
                            <button
                              onClick={() => { onSetExpiry(it, ""); setExpiryEditId(null); }}
                              className="shrink-0 rounded-lg border border-tomato/30 px-3 py-2 text-xs font-semibold text-tomato transition hover:bg-tomato/5"
                            >
                              Togli
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                }

                // A riposo: nome ……… quantità (puntini di guida)
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => toggleOpen(it.id)}
                      className="flex w-full items-baseline gap-2 py-[7px] text-left"
                    >
                      <span className={`min-w-0 truncate text-[15px] font-semibold ${nameTone(it, out)}`}>{it.name}</span>
                      <ExpiryBadge date={it.expiry} onlyUrgent />
                      {out && <span className="shrink-0 text-[11px] font-bold text-tomato">finito</span>}
                      <span aria-hidden="true" className="border-b border-dotted border-stone-300" style={{ flex: "1 0 12px" }} />
                      <span className="shrink-0 text-xs font-medium text-stone-400">{qtyLabel(it.qty)}</span>
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
