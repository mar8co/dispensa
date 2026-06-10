// Foglio di aggiunta manuale (dal menù "+"): nome con suggerimenti, quantità
// con contatore, toggle grammi, scadenza opzionale. Resta aperto dopo ogni
// aggiunta (con conferma), così si inseriscono più prodotti di fila.
// La pulizia del nome è locale: istantanea e senza consumare quota AI.
import { useMemo, useState } from "react";
import { Plus, Minus, Loader2, CalendarPlus, X, Check } from "lucide-react";
import Sheet from "./Sheet.jsx";
import { norm } from "../lib/pantry.js";

function formatDateIt(d) {
  if (!d) return "";
  const dt = new Date(`${d}T00:00:00`);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("it-IT");
}

export default function ManualAddModal({
  newName, setNewName, newQty, setNewQty, grams, setGrams,
  newExpiry, setNewExpiry, adding, onSubmit, onQuickAdd, onClose,
  historyNames = [], pantryNames = [],
}) {
  const [lastAdded, setLastAdded] = useState(null); // { name, merged }

  const inputCls =
    "w-full rounded-xl border border-hair bg-paper px-3.5 py-3 text-sm text-ink outline-none focus:border-stone-400 focus:ring-2 focus:ring-tomato/15";

  // Candidati per i suggerimenti: storico acquisti + nomi già in dispensa.
  const pool = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const n of [...historyNames, ...pantryNames]) {
      const k = norm(n);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    return out;
  }, [historyNames, pantryNames]);

  const q = norm(newName);
  const suggestions = q
    ? pool.filter((n) => norm(n).includes(q) && norm(n) !== q).slice(0, 5)
    : [];

  async function submit() {
    const res = await onSubmit();
    if (res) setLastAdded(res);
  }
  async function quickAdd(n) {
    const res = await onQuickAdd(n);
    if (res) setLastAdded(res);
  }

  return (
    <Sheet onClose={onClose}>
      {(close) => (
      <div className="px-5 pb-7 pt-1">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-ink">Aggiungi a mano</h3>
          <button onClick={close} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          autoFocus
          className={inputCls}
          placeholder="Cosa hai in dispensa?"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        {/* Completamenti: un tap e il prodotto è dentro */}
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((n) => (
              <button
                key={n}
                onClick={() => quickAdd(n)}
                className="rounded-full border border-hair bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-tomato hover:text-tomato"
              >
                {n}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-1.5">
          <div className="flex shrink-0 items-center rounded-xl border border-hair bg-paper">
            <button
              onClick={() => setNewQty((v) => String(Math.max(1, (parseFloat(String(v).replace(",", ".")) || 1) - 1)))}
              className="flex h-11 w-9 items-center justify-center rounded-l-xl text-stone-500 hover:bg-stone-100"
              aria-label="Meno"
            ><Minus className="h-4 w-4" /></button>
            <input
              type="text" inputMode="numeric" value={newQty}
              onChange={(e) => setNewQty(e.target.value.replace(/[^0-9.,]/g, ""))}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-9 border-0 bg-transparent text-center text-base font-bold text-ink outline-none"
            />
            <button
              onClick={() => setNewQty((v) => String((parseFloat(String(v).replace(",", ".")) || 0) + 1))}
              className="flex h-11 w-9 items-center justify-center rounded-r-xl text-stone-500 hover:bg-stone-100"
              aria-label="Più"
            ><Plus className="h-4 w-4" /></button>
          </div>

          <button
            onClick={() => setGrams((g) => !g)}
            aria-pressed={grams}
            className={`h-11 shrink-0 rounded-xl border px-3.5 text-sm font-bold transition ${grams ? "border-tomato bg-tomato text-white" : "border-hair bg-paper text-stone-500 hover:bg-stone-50"}`}
          >gr</button>

          <label
            title="Scadenza"
            className={`relative flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border px-3.5 transition ${newExpiry ? "border-tomato bg-tomato text-white" : "border-hair bg-paper text-tomato hover:bg-tomato/5"}`}
          >
            <CalendarPlus className="h-5 w-5" />
            <input
              type="date" value={newExpiry || ""}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Scadenza"
            />
          </label>

          <button
            onClick={submit}
            disabled={adding || !newName.trim()}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 shrink-0" /> Aggiungi</>}
          </button>
        </div>

        {newExpiry && (
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-tomato/10 px-2 py-1 font-semibold text-tomato">
              <CalendarPlus className="h-3.5 w-3.5" /> Scade il {formatDateIt(newExpiry)}
            </span>
            <button onClick={() => setNewExpiry("")} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100" aria-label="Rimuovi scadenza">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Conferma dell'ultimo inserimento: il foglio resta aperto */}
        {lastAdded && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
            <Check className="h-3.5 w-3.5 shrink-0 text-tomato" />
            <span className="min-w-0 truncate">
              <strong className="text-ink">{lastAdded.name}</strong>{" "}
              {lastAdded.merged ? "era già in dispensa: quantità aumentata" : "aggiunto in dispensa"}
            </span>
          </p>
        )}
      </div>
      )}
    </Sheet>
  );
}
