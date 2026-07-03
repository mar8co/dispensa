// Campi standard del prodotto — la STESSA vista ovunque si mostri o modifichi
// un prodotto: pannello Dispensa, modifica Spesa, Aggiungi a mano, Revisione
// scansione (foto/scontrino/barcode/voce). Presentazionale: la logica di ogni
// contesto (autosave, debounce, merge, submit) resta nel chiamante.
//
// Layout (variante approvata dall'utente):
//   riga 1   [nome ................] [categoria emoji] [elimina?]
//   pillole categoria (si aprono toccando l'emoji, come in Spesa)
//   {children: contenuto del contesto, es. suggerimenti dell'aggiunta a mano}
//   riga 2   [scadenza?] [−  qty  +] [pz g kg l]
//
// La scadenza è un BOX visibile che apre il calendario nativo: l'input date
// invisibile copre il box, così il tap lo apre senza showPicker (che su iOS
// richiede la user-activation sincrona). La ✕ dentro il box azzera la data.
import { useState } from "react";
import { Calendar, Trash2, X } from "lucide-react";
import { PICKER_CATS, CAT_ICON } from "../constants.js";
import { formatExpiry } from "../lib/pantry.js";
import { tourSignal } from "../lib/tour.js";

const inputCls =
  "min-w-0 flex-1 rounded-lg border border-hair bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

export default function ProductFields({
  // riga 1 — nome
  name, onName, onNameBlur, onEnter, namePlaceholder = "Nome", autoFocus = false,
  // riga 1 — categoria (emoji → pillole) e rimozione
  category, onCategory, allowAuto = false, isAuto = false, onDelete,
  // riga 2 — quantità e unità
  qtyValue, onQtyInput, onMinus, onPlus, minusDisabled = false,
  unitActive, onUnit,
  // riga 2 — scadenza (solo dove ha senso: dispensa/aggiunta/revisione)
  showExpiry = false, expiry = "", onExpiry,
  children,
}) {
  const [catOpen, setCatOpen] = useState(false);

  function pickCategory(c) {
    setCatOpen(false);
    onCategory?.(c);
  }

  return (
    <>
      {/* Riga 1: nome · categoria (emoji, come in Spesa) · elimina */}
      <div className="flex items-center gap-1.5">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => onName(e.target.value)}
          onBlur={onNameBlur}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (onEnter) onEnter(); else e.currentTarget.blur();
          }}
          placeholder={namePlaceholder}
          autoFocus={autoFocus}
          aria-label="Nome prodotto"
        />
        <button
          type="button"
          onClick={() => setCatOpen((v) => !v)}
          aria-label="Categoria"
          aria-expanded={catOpen}
          title="Categoria"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
            catOpen ? "border-tomato bg-tomato/5" : "border-hair bg-paper"
          }`}
        >
          <span className="text-[17px] leading-none">{CAT_ICON[category] || "🍽️"}</span>
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hair bg-paper text-stone-500 transition hover:bg-tomato/10 hover:text-tomato"
            aria-label="Elimina"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Categorie come pillole: un tap e la scelta è fatta */}
      {catOpen && (
        <div className="animate-fade-in mt-2.5 flex flex-wrap gap-1.5">
          {allowAuto && (
            <button
              type="button"
              onClick={() => pickCategory("")}
              className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                isAuto
                  ? "border-tomato bg-tomato text-[#fff]"
                  : "border-hair bg-paper text-stone-600 hover:border-tomato hover:text-tomato"
              }`}
            >
              ✨ Auto
            </button>
          )}
          {PICKER_CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickCategory(c)}
              className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                c === category && !(allowAuto && isAuto)
                  ? "border-tomato bg-tomato text-[#fff]"
                  : "border-hair bg-paper text-stone-600 hover:border-tomato hover:text-tomato"
              }`}
            >
              {CAT_ICON[c]} {c}
            </button>
          ))}
        </div>
      )}

      {children}

      {/* Riga 2 (zona quantità, separata da una riga sottile):
          scadenza · stepper stretto · unità */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t border-hair pt-2">
        {showExpiry && (
          <label
            data-tour="expiry-field"
            onClick={() => tourSignal("expiry-opened")}
            title="Scadenza"
            className={`relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
              expiry ? "border-tomato/40 bg-tomato/5 text-tomato" : "border-hair bg-paper text-stone-500"
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            {expiry ? formatExpiry(expiry) : "Scadenza"}
            <input
              type="date"
              value={expiry}
              onChange={(e) => onExpiry(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Data di scadenza"
            />
            {expiry && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExpiry(""); }}
                className="relative z-[1] -mr-1 rounded p-0.5"
                aria-label="Rimuovi scadenza"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        )}

        {/* Stepper stretto: glifi piccoli, bersagli alti 44px */}
        <div data-tour="qty-stepper" className="flex items-center">
          <button
            type="button"
            onClick={onMinus}
            disabled={minusDisabled}
            className="flex h-11 w-9 items-center justify-center text-xl leading-none text-stone-500 transition hover:text-ink active:scale-90 disabled:text-stone-300"
            aria-label="Diminuisci"
          >−</button>
          <input
            inputMode="decimal"
            className="w-10 border-0 bg-transparent text-center text-[15px] font-bold text-ink outline-none"
            value={qtyValue}
            onChange={(e) => onQtyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
            aria-label="Quantità"
          />
          <button
            type="button"
            onClick={onPlus}
            className="flex h-11 w-9 items-center justify-center text-xl leading-none text-stone-500 transition hover:text-tomato active:scale-90"
            aria-label="Aumenta"
          >+</button>
        </div>

        <div data-tour="unit-chips" className="flex gap-1">
          {["", "g", "kg", "l"].map((u) => {
            const active = u === "" ? unitActive === "" : unitActive === u;
            return (
              <button
                key={u || "pz"}
                type="button"
                onClick={() => onUnit(u)}
                aria-pressed={active}
                className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                  active ? "border-tomato bg-tomato text-[#fff]" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"
                }`}
              >
                {u || "pz"}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
