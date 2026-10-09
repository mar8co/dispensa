// Foglio di revisione dopo una scansione (scontrino / foto / barcode / voce).
// Mostra i prodotti riconosciuti raggruppati per categoria; per ciascuno si
// possono cambiare nome, quantità (stepper −/+) e categoria, o rimuoverlo.
// Solo alla conferma i prodotti vengono aggiunti alla dispensa.
import { useState } from "react";
import { X, Check, Mic } from "lucide-react";
import { CATEGORIES, CAT_ICON } from "../constants.js";
import Sheet from "./Sheet.jsx";
import Button from "./Button.jsx";
import ProductFields from "./ProductFields.jsx";
import { adjustQty, atMinQty, formatQtyDisplay, changeUnit } from "../lib/pantry.js";

function tmpId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ReviewScanModal({ initialItems, onCancel, onConfirm, onAddMore }) {
  const [items, setItems] = useState(() =>
    (initialItems || []).map((it) => ({
      id: tmpId(),
      name: String(it.name || "").trim(),
      qty: String(it.qty || "1").trim() || "1",
      category: CATEGORIES.includes(it.category) ? it.category : "Altro",
      expiry: it.expiry || "",
    }))
  );
  // Conferma prima di scartare: dopo un OCR riuscito, un tocco sulla X (o un
  // drag involontario) non deve buttare via tutti i prodotti riconosciuti.
  // Col foglio "pieno" il drag-to-dismiss è bloccato (locked) e X/Annulla
  // aprono questa conferma; a foglio vuoto si chiude normalmente.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = items.length > 0;

  function update(id, field, val) {
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, [field]: val } : x)));
  }
  function remove(id) {
    setItems((arr) => arr.filter((x) => x.id !== id));
  }
  // Il "−" è attivo solo dal secondo passo in su (1 pz / 50 g / 0,25 kg-l).
  const atMin = atMinQty;

  // Raggruppa per categoria nell'ordine di CATEGORIES.
  const grouped = CATEGORIES
    .map((c) => ({ cat: c, list: items.filter((x) => x.category === c) }))
    .filter((g) => g.list.length > 0);

  return (
    <Sheet onClose={onCancel} locked={dirty}>
      {(close) => (
      <>
        <div className="flex items-start justify-between gap-2 px-[18px] pb-3 pt-1">
          <div>
            <p className="micro">Revisione</p>
            <h3 className="titolo mt-1">Prodotti riconosciuti</h3>
            <p className="mt-2 text-[0.9rem] font-medium leading-snug text-tenue">Controlla nome, quantità e categoria, poi conferma.</p>
          </div>
          <button
            onClick={() => (dirty ? setConfirmDiscard(true) : close())}
            className="tondo"
            aria-label="Chiudi"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto border-t-[1.5px] border-ink px-[18px] py-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-[1rem] font-semibold text-tenue">
              Nessun prodotto da aggiungere.
            </p>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ cat, list }) => (
                <div key={cat}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[1.05rem] leading-none">{CAT_ICON[cat]}</span>
                    <h4 className="text-[1.1rem] font-extrabold tracking-[-0.03em] text-ink">{cat}</h4>
                    <span className="num text-[1.1rem] font-extrabold tracking-[-0.03em] text-tenue">{list.length}</span>
                  </div>
                  <ul className="divide-y divide-riga">
                    {list.map((it) => (
                      <li key={it.id} className="py-3">
                        {/* Vista prodotto standard (ProductFields): identica a
                            Dispensa/Spesa/Aggiungi a mano. */}
                        <ProductFields
                          name={it.name}
                          onName={(v) => update(it.id, "name", v)}
                          category={it.category}
                          onCategory={(c) => update(it.id, "category", c)}
                          onDelete={() => remove(it.id)}
                          qtyValue={formatQtyDisplay(it.qty)}
                          onQtyInput={(v) => update(it.id, "qty", v.replace("½", "0,5"))}
                          onMinus={() => update(it.id, "qty", adjustQty(it.qty, -1))}
                          onPlus={() => update(it.id, "qty", adjustQty(it.qty, 1))}
                          minusDisabled={atMin(it.qty)}
                          unitActive={String(it.qty).replace(/-?\d+([.,]\d+)?/, "").trim().toLowerCase()}
                          onUnit={(u) => update(it.id, "qty", changeUnit(it.qty, u))}
                          showExpiry
                          expiry={it.expiry}
                          onExpiry={(v) => update(it.id, "expiry", v)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {confirmDiscard ? (
          <div className="border-t-[1.5px] border-ink bg-giallo px-[18px] py-3.5">
            <p className="text-center text-[0.95rem] font-semibold text-ink">
              Scartare {items.length === 1 ? "il prodotto riconosciuto" : `i ${items.length} prodotti riconosciuti`}?
            </p>
            <div className="mt-2.5 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDiscard(false)}>
                Continua a modificare
              </Button>
              {/* onCancel diretto: smonta senza animazione (sicuro: vedi
                  l'invariante in Sheet.jsx), close() qui è bloccato da locked. */}
              <Button variant="danger" className="flex-1" onClick={onCancel}>
                Scarta tutto
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t-[1.5px] border-ink px-[18px] py-3">
            {/* Solo dal flusso voce (onAddMore presente): riapre la dettatura e
                ACCODA i nuovi prodotti a questi, senza ricominciare da capo. */}
            {onAddMore && (
              <Button variant="secondary" full className="mb-2" onClick={() => onAddMore(items)}>
                <Mic className="h-4 w-4" /> Aggiungi altri prodotti
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => (dirty ? setConfirmDiscard(true) : close())}>
                Annulla
              </Button>
              <Button variant="primary" className="flex-[2]" onClick={() => onConfirm(items)} disabled={items.length === 0}>
                <Check className="h-4 w-4" />
                {items.length > 0
                  ? `Aggiungi ${items.length} ${items.length === 1 ? "prodotto" : "prodotti"}`
                  : "Aggiungi"}
              </Button>
            </div>
          </div>
        )}
      </>
      )}
    </Sheet>
  );
}
