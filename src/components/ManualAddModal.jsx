// Foglio di aggiunta manuale (dal menù "+"): usa la vista prodotto STANDARD
// (ProductFields, la stessa di Dispensa/Spesa/Revisione) con in più i
// suggerimenti dallo storico e il pulsante "Aggiungi". Resta aperto dopo ogni
// aggiunta (con conferma), così si inseriscono più prodotti di fila.
// La pulizia del nome è locale: istantanea e senza consumare quota AI.
import { useMemo, useState } from "react";
import { Plus, Loader2, X, Check } from "lucide-react";
import Sheet from "./Sheet.jsx";
import Button from "./Button.jsx";
import ProductFields from "./ProductFields.jsx";
import { norm, correctName, guessCategory } from "../lib/pantry.js";
import { CATEGORIES, CAT_ICON } from "../constants.js";

// Passi del contatore per unità: pz ±1, g ±50, kg/l ±0,25.
const STEPS = { "": 1, g: 50, kg: 0.25, l: 0.25 };
const parseV = (v) => parseFloat(String(v).replace(",", ".")) || 0;
const fmtV = (n) => String(Math.round(n * 1000) / 1000).replace(".", ",");

export default function ManualAddModal({
  newName, setNewName, newQty, setNewQty, unit, setUnit,
  newCat, setNewCat, newExpiry, setNewExpiry, adding, onSubmit, onQuickAdd, onClose,
  historyNames = [], pantryNames = [],
}) {
  const [lastAdded, setLastAdded] = useState(null); // { name, merged, category }

  // Categoria mostrata: la scelta manuale vince, altrimenti la stima
  // automatica che si aggiorna mentre scrivi.
  const guessed = newName.trim() ? (guessCategory(correctName(newName)) || "Altro") : "Altro";
  const isAuto = !CATEGORIES.includes(newCat);
  const effCat = isAuto ? guessed : newCat;

  // Contatore a passi: pz 1,2,3… · g 50,100,150… · kg/l 0,25 0,5 0,75…
  const step = STEPS[unit] ?? 1;
  function bumpQty(dir) {
    setNewQty((v) => {
      let n = parseV(v) + dir * step;
      n = Math.round(n / step) * step;
      if (n < step) n = step;
      return fmtV(n);
    });
  }
  // Cambiando unità la quantità si RESETTA al default dell'unità scelta
  // (mai ereditata dal valore precedente): pz → 1, g → 100, kg/l → 1.
  function chooseUnit(u) {
    setUnit(u);
    setNewQty(u === "g" ? "100" : "1");
  }

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
    if (!newName.trim() || adding) return;
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
          <button onClick={close} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Vista prodotto standard; i suggerimenti entrano nello slot. */}
        <ProductFields
          name={newName}
          onName={setNewName}
          onEnter={submit}
          namePlaceholder="Cosa hai in dispensa?"
          autoFocus
          category={effCat}
          onCategory={setNewCat}
          allowAuto
          isAuto={isAuto}
          qtyValue={newQty}
          onQtyInput={(v) => setNewQty(v.replace(/[^0-9.,]/g, ""))}
          onMinus={() => bumpQty(-1)}
          onPlus={() => bumpQty(1)}
          minusDisabled={parseV(newQty) <= step}
          unitActive={unit}
          onUnit={chooseUnit}
          showExpiry
          expiry={newExpiry || ""}
          onExpiry={setNewExpiry}
        >
          {/* Completamenti: un tap e il prodotto è dentro */}
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((n) => (
                <button
                  key={n}
                  // pointerdown: funziona anche con la tastiera iOS aperta
                  onPointerDown={(e) => { e.preventDefault(); quickAdd(n); }}
                  className="rounded-full border border-hair bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-tomato hover:text-tomato"
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </ProductFields>

        <Button variant="primary" full className="mt-3" onClick={submit} disabled={adding || !newName.trim()}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 shrink-0" /> Aggiungi</>}
        </Button>

        {/* Conferma dell'ultimo inserimento: il foglio resta aperto */}
        {lastAdded && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
            <Check className="h-3.5 w-3.5 shrink-0 text-tomato" />
            <span className="min-w-0 truncate">
              <strong className="text-ink">{lastAdded.name}</strong>{" "}
              {lastAdded.merged
                ? "era già in dispensa: quantità aumentata"
                : <>aggiunto in <strong className="text-ink">{CAT_ICON[lastAdded.category]} {lastAdded.category}</strong></>}
            </span>
          </p>
        )}
      </div>
      )}
    </Sheet>
  );
}
