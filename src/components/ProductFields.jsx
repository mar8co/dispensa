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
// La scadenza è una pillola visibile che apre il calendario IN-APP
// (ExpiryCalendar, niente picker nativo iOS). La ✕ dentro la pillola azzera
// la data.
//
// Veste manifesto: nome grande su una sola riga sotto (niente scatola),
// categoria nel cerchio, elimina nel tondo, stepper a cerchi, unità a pillole
// (scelta = piena nera).
import { useState } from "react";
import { Calendar, Trash2, X } from "lucide-react";
import { PICKER_CATS, CAT_ICON } from "../constants.js";
import { formatExpiry } from "../lib/pantry.js";
import { tourSignal } from "../lib/tour.js";
import ExpiryCalendar from "./ExpiryCalendar.jsx";

// testo-grande: sopra i 16px iOS non zooma, quindi il minimo globale dei
// campi (index.css) qui non serve.
const inputCls =
  "testo-grande min-w-0 flex-1 rounded-none border-0 border-b-[1.5px] border-ink bg-transparent py-1.5 text-[1.2rem] font-bold tracking-[-0.03em] text-ink outline-none placeholder:text-ink/40 focus:border-b-[3px] focus:pb-[4.5px]";

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
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink transition ${
            catOpen ? "bg-ink/10" : "bg-white"
          }`}
        >
          <span className="text-[19px] leading-none">{CAT_ICON[category] || "🍽️"}</span>
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="tondo h-10 w-10"
            aria-label="Elimina"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      {/* Categorie come pillole: un tap e la scelta è fatta */}
      {catOpen && (
        <div className="animate-fade-in mt-3 flex flex-wrap gap-1.5">
          {allowAuto && (
            <button
              type="button"
              onClick={() => pickCategory("")}
              aria-pressed={isAuto}
              className="pillola min-h-[34px] px-3 text-[0.8rem]"
            >
              ✨ Auto
            </button>
          )}
          {PICKER_CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickCategory(c)}
              aria-pressed={c === category && !(allowAuto && isAuto)}
              className="pillola min-h-[34px] px-3 text-[0.8rem]"
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
      <div className="mt-3 flex items-center justify-between gap-x-1 border-t border-riga pt-2.5">
        {showExpiry && (
          <div
            className={`flex h-[34px] min-w-0 items-center rounded-full border-[1.5px] border-ink text-[0.8rem] font-bold transition ${
              expOpen ? "bg-ink/10" : ""
            } ${expiry ? "text-ink" : "text-tenue"}`}
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
              className={`flex h-full min-w-0 items-center gap-1.5 pl-2.5 ${expiry ? "pr-1" : "pr-3"}`}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{expiry ? formatExpiry(expiry) : "Scadenza"}</span>
            </button>
            {expiry && (
              <button
                type="button"
                onClick={() => { onExpiry(""); setExpOpen(false); }}
                className="flex h-full shrink-0 items-center pl-0.5 pr-2.5"
                aria-label="Rimuovi scadenza"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Stepper a cerchi: − valore + (il valore resta un campo scrivibile). */}
        <div data-tour="qty-stepper" className="flex h-[34px] shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onMinus}
            disabled={minusDisabled}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-ink text-lg font-semibold leading-none text-ink transition active:scale-90 disabled:opacity-30"
            aria-label="Diminuisci"
          >−</button>
          <input
            inputMode="decimal"
            className="testo-grande num h-full w-10 bg-transparent text-center text-[1rem] font-extrabold tracking-[-0.03em] text-ink outline-none"
            value={qtyValue}
            onChange={(e) => onQtyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
            aria-label="Quantità"
          />
          <button
            type="button"
            onClick={onPlus}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-ink text-lg font-semibold leading-none text-ink transition active:scale-90"
            aria-label="Aumenta"
          >+</button>
        </div>

        <div data-tour="unit-chips" className="flex shrink-0 gap-[3px]">
          {["", "g", "kg", "l"].map((u) => {
            const active = u === "" ? unitActive === "" : unitActive === u;
            return (
              <button
                key={u || "pz"}
                type="button"
                onClick={() => onUnit(u)}
                aria-pressed={active}
                className="pillola h-[30px] min-h-0 min-w-[30px] px-1.5 text-[0.8rem]"
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
