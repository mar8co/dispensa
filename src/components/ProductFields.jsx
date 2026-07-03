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
import ExpiryCalendar from "./ExpiryCalendar.jsx";

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
  const [expOpen, setExpOpen] = useState(false); // calendario scadenza aperto

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

      {/* Riga 2 (zona quantità, separata da una riga sottile): scadenza ·
          stepper in pill · unità. flex-nowrap: la riga non si spezza MAI; se lo
          spazio è pochissimo cede solo il box scadenza (min-w-0 + testo
          troncato), mentre stepper e unità (shrink-0) restano sempre interi. */}
      <div className="mt-2.5 flex items-center justify-between gap-x-1.5 border-t border-hair pt-2">
        {showExpiry && (
          <div
            className={`flex h-9 min-w-0 items-center rounded-lg border text-xs font-semibold transition ${
              expiry ? "border-tomato/40 bg-tomato/5 text-tomato" : "border-hair bg-paper text-stone-500"
            }`}
          >
            {/* Tocco sul box = apre/chiude il calendario in-app (niente picker
                nativo: vedi ExpiryCalendar). */}
            <button
              type="button"
              data-tour="expiry-field"
              onClick={() => { setExpOpen((o) => !o); tourSignal("expiry-opened"); }}
              title="Scadenza"
              aria-haspopup="dialog"
              aria-expanded={expOpen}
              className="flex h-full min-w-0 items-center gap-1.5 pl-2.5 pr-1.5"
            >
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{expiry ? formatExpiry(expiry) : "Scadenza"}</span>
            </button>
            {expiry && (
              <button
                type="button"
                onClick={() => { onExpiry(""); setExpOpen(false); }}
                className="flex h-full shrink-0 items-center pl-0.5 pr-2"
                aria-label="Rimuovi scadenza"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Stepper in pill (bordo + divisori tra − valore +): legge come un
            unico controllo, coerente con le pillole delle unità. */}
        <div data-tour="qty-stepper" className="flex h-9 shrink-0 items-center overflow-hidden rounded-lg border border-hair bg-paper">
          <button
            type="button"
            onClick={onMinus}
            disabled={minusDisabled}
            className="flex h-full w-8 items-center justify-center text-lg leading-none text-stone-500 transition hover:text-ink active:scale-90 disabled:text-stone-300"
            aria-label="Diminuisci"
          >−</button>
          <input
            inputMode="decimal"
            className="h-full w-9 border-x border-hair bg-transparent text-center text-[15px] font-bold text-ink outline-none"
            value={qtyValue}
            onChange={(e) => onQtyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
            aria-label="Quantità"
          />
          <button
            type="button"
            onClick={onPlus}
            className="flex h-full w-8 items-center justify-center text-lg leading-none text-stone-500 transition hover:text-tomato active:scale-90"
            aria-label="Aumenta"
          >+</button>
        </div>

        <div data-tour="unit-chips" className="flex shrink-0 gap-0.5">
          {["", "g", "kg", "l"].map((u) => {
            const active = u === "" ? unitActive === "" : unitActive === u;
            return (
              <button
                key={u || "pz"}
                type="button"
                onClick={() => onUnit(u)}
                aria-pressed={active}
                className={`flex h-9 items-center rounded-lg border px-1.5 text-xs font-bold transition ${
                  active ? "border-tomato bg-tomato text-[#fff]" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"
                }`}
              >
                {u || "pz"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendario in-app: si apre sotto la riga, con niente preselezionato. */}
      {showExpiry && expOpen && (
        <ExpiryCalendar
          value={expiry}
          onPick={(iso) => { onExpiry(iso); setExpOpen(false); }}
        />
      )}
    </>
  );
}
