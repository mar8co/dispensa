// Scheda Dispensa: scansione, ricerca, ordinamento, lista prodotti raggruppati
// per categoria (collassabili e riordinabili via drag), +/- rapido sulla
// quantità, badge scadenza, modifica/eliminazione in-line, aggiunta manuale.
import { useState } from "react";
import {
  Plus, Minus, Trash2, Pencil, Camera, Check, X, Loader2,
  ChevronDown, ChevronRight, GripVertical, ChevronsDownUp, ChevronsUpDown, CalendarPlus, ScanBarcode,
} from "lucide-react";
import { CATEGORIES, CAT_ICON } from "../constants.js";
import { expiryStatus, formatExpiry } from "../lib/pantry.js";

const EXP_STYLE = {
  scaduto: "bg-red-100 text-red-700",
  oggi: "bg-red-100 text-red-700",
  presto: "bg-orange-100 text-orange-700",
  settimana: "bg-amber-100 text-amber-700",
  ok: "bg-stone-100 text-stone-500",
};

function ExpiryBadge({ date }) {
  const st = expiryStatus(date);
  if (!st) return null;
  return (
    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${EXP_STYLE[st]}`}>
      {formatExpiry(date)}
    </span>
  );
}

export default function PantryTab({
  inputCls,
  // scontrino
  processing, handleReceipt, onScanBarcode,
  // ricerca / ordinamento
  search, setSearch, sort, setSort,
  // lista
  grouped, collapsed, setCollapsed, cardRefs,
  allCollapsed, onToggleAll,
  dragCat, onDragStart, onDragMove, onDragEnd,
  onAdjustQty,
  // modifica
  editId, editName, setEditName, editQty, setEditQty, editCat, setEditCat,
  editExpiry, setEditExpiry,
  startEdit, saveEdit, setEditId, removeItem,
  // svuota
  setConfirmClear,
  // aggiunta manuale
  newName, setNewName, newQty, setNewQty, grams, setGrams, adding, addManual,
  newExpiry, setNewExpiry,
}) {
  const searchActive = search.trim() !== "";
  const [addOpen, setAddOpen] = useState(false);

  function formatDateIt(d) {
    if (!d) return "";
    const dt = new Date(`${d}T00:00:00`);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("it-IT");
  }

  async function submitAdd() {
    if (!newName.trim()) return;
    await addManual();
    setAddOpen(false);
  }

  return (
    <>
      {/* Barra ordinamento + apri/chiudi */}
      {grouped.length > 0 && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-medium text-stone-600 outline-none focus:border-stone-500"
          >
            <option value="recenti">Più recenti</option>
            <option value="nome">Nome (A-Z)</option>
            <option value="scadenza">Scadenza</option>
          </select>
          <button
            onClick={onToggleAll}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
          >
            {allCollapsed
              ? (<><ChevronsUpDown className="h-3.5 w-3.5" /> Apri tutto</>)
              : (<><ChevronsDownUp className="h-3.5 w-3.5" /> Chiudi tutto</>)}
          </button>
        </div>
      )}

      {grouped.length === 0 && (
        <p className="py-10 text-center text-sm text-stone-400">
          {searchActive ? "Nessun prodotto trovato." : "Dispensa vuota. Aggiungi un prodotto qui sotto."}
        </p>
      )}

      <div className="space-y-4">
        {grouped.map(({ cat, list }) => {
          const open = !collapsed[cat] || searchActive;
          return (
            <div
              key={cat}
              ref={(el) => { cardRefs.current[cat] = el; }}
              className={`rounded-2xl border bg-white shadow-sm transition ${dragCat === cat ? "border-emerald-400 opacity-90 shadow-lg ring-2 ring-emerald-200" : "border-stone-200"}`}
            >
              <div className={`flex w-full items-center gap-1 px-3 py-3 ${open ? "border-b border-stone-100" : ""}`}>
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="text-lg">{CAT_ICON[cat]}</span>
                  <h2 className="truncate text-sm font-semibold text-stone-700">{cat}</h2>
                  <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{list.length}</span>
                  {open
                    ? <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" />
                    : <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />}
                </button>
                <button
                  data-noswipe
                  onPointerDown={(e) => onDragStart(e, cat)}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  onPointerCancel={onDragEnd}
                  style={{ touchAction: "none" }}
                  className="shrink-0 cursor-grab rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 active:cursor-grabbing"
                  aria-label="Trascina per riordinare"
                >
                  <GripVertical className="h-5 w-5" />
                </button>
              </div>
              {open && (
                <ul className="divide-y divide-stone-100">
                  {list.map((it) =>
                    editId === it.id ? (
                      <li key={it.id} className="space-y-2 px-4 py-3">
                        <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" />
                        <div className="flex gap-2">
                          <input className={inputCls} value={editQty} onChange={(e) => setEditQty(e.target.value)} placeholder="Quantità" />
                          <select className={inputCls} value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-stone-500">
                          <span className="shrink-0">Scadenza:</span>
                          <input
                            type="date"
                            className={inputCls}
                            value={editExpiry || ""}
                            onChange={(e) => setEditExpiry(e.target.value)}
                          />
                          {editExpiry && (
                            <button
                              onClick={() => setEditExpiry("")}
                              className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-100"
                              aria-label="Rimuovi scadenza"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-900">
                            <Check className="h-4 w-4" /> Salva
                          </button>
                          <button onClick={() => setEditId(null)} className="flex items-center justify-center rounded-lg border border-stone-300 px-3 py-2 text-stone-500 hover:bg-stone-50">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ) : (
                      <li key={it.id} className="flex items-center justify-between gap-2 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-stone-800">{it.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            {/\d/.test(it.qty) ? (
                              <div className="flex items-center rounded-md border border-stone-200">
                                <button
                                  onClick={() => onAdjustQty(it, -1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-l-md text-stone-500 transition hover:bg-stone-100"
                                  aria-label="Diminuisci"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="min-w-[3rem] px-1 text-center text-xs text-stone-600">{it.qty}</span>
                                <button
                                  onClick={() => onAdjustQty(it, 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-r-md text-stone-500 transition hover:bg-stone-100"
                                  aria-label="Aumenta"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-stone-500">{it.qty}</span>
                            )}
                            <ExpiryBadge date={it.expiry} />
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button onClick={() => startEdit(it)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Modifica">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => removeItem(it)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label="Elimina">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {grouped.length > 0 && !searchActive && (
        <button
          onClick={() => setConfirmClear(true)}
          className="mx-auto mt-6 block text-xs text-stone-300 transition hover:text-stone-500"
        >
          Svuota dispensa
        </button>
      )}

      {/* Spazio per non far coprire l'ultimo elemento dalla barra in basso */}
      <div className="h-24" />

      {/* Barra azioni in basso: barcode · + (aggiunta manuale) · foto */}
      <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
        <div className="flex items-center gap-7 rounded-full bg-stone-900 px-6 py-2.5 shadow-xl">
          <button
            onClick={onScanBarcode}
            className="p-1.5 text-white/90 transition hover:text-white active:scale-95"
            aria-label="Scansiona codice a barre"
          >
            <ScanBarcode className="h-6 w-6" />
          </button>

          <button
            onClick={() => setAddOpen(true)}
            className="-my-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg transition active:scale-95"
            aria-label="Aggiungi un prodotto"
          >
            <Plus className="h-7 w-7" />
          </button>

          <label
            className="cursor-pointer p-1.5 text-white/90 transition hover:text-white active:scale-95"
            aria-label="Carica foto scontrino o spesa"
          >
            {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
            <input type="file" accept="image/*" className="hidden" onChange={handleReceipt} disabled={processing} />
          </label>
        </div>
      </div>

      {/* Scheda di aggiunta manuale (si apre dal +) */}
      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Aggiungi un prodotto</h3>
              <button onClick={() => setAddOpen(false)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              autoFocus
              className={inputCls}
              placeholder="Cosa hai in dispensa?"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdd()}
            />
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex shrink-0 items-center rounded-lg border border-stone-300 bg-white">
                <button
                  onClick={() => setNewQty((q) => String(Math.max(1, (parseFloat(String(q).replace(",", ".")) || 1) - 1)))}
                  className="flex h-11 w-8 items-center justify-center rounded-l-lg text-stone-600 transition hover:bg-stone-100"
                  aria-label="Meno"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value.replace(/[^0-9.,]/g, ""))}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => e.key === "Enter" && submitAdd()}
                  className="w-9 border-0 bg-transparent text-center text-base font-semibold text-stone-800 outline-none"
                />
                <button
                  onClick={() => setNewQty((q) => String((parseFloat(String(q).replace(",", ".")) || 0) + 1))}
                  className="flex h-11 w-8 items-center justify-center rounded-r-lg text-stone-600 transition hover:bg-stone-100"
                  aria-label="Più"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => setGrams((g) => !g)}
                aria-pressed={grams}
                className={`h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition ${grams ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-stone-500 hover:bg-stone-50"}`}
              >
                gr
              </button>
              <label
                title="Scadenza"
                className={`relative flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border px-3 transition ${newExpiry ? "border-emerald-600 bg-emerald-600 text-white" : "border-amber-400 bg-amber-50 text-amber-500 hover:bg-amber-100"}`}
              >
                <CalendarPlus className="h-6 w-6" />
                <input
                  type="date"
                  value={newExpiry || ""}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Scadenza"
                />
              </label>
              <button
                onClick={submitAdd}
                disabled={adding}
                className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-stone-800 px-2 py-3 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 shrink-0" /> Aggiungi</>}
              </button>
            </div>

            {newExpiry && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Scade il {formatDateIt(newExpiry)}
                </span>
                <button
                  onClick={() => setNewExpiry("")}
                  className="shrink-0 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  aria-label="Rimuovi scadenza"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
