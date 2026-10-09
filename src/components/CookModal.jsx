// Foglio "Ho cucinato questo": aggiorna la dispensa dopo aver cucinato.
// Ogni ingrediente della ricetta che corrisponde a un prodotto in dispensa
// finisce in una di tre corsie (vedi openCookModal in Dispensa.jsx):
//  - "qb"    scorta a piacere (olio/sale/spezie o ricetta "q.b."): NON si scala,
//            si mostra soltanto, con un'azione "sta finendo? → lista".
//  - "exact" stessa unità della ricetta: stepper con la quantità rimasta esatta.
//  - "pack"  unità non confrontabili (es. "1 barattolo" vs "200 g"): stepper a
//            confezioni, mezzo pezzo (½) incluso — niente matematica/stima.
import { useState } from "react";
import { X, Check, ShoppingCart } from "lucide-react";
import Sheet from "./Sheet.jsx";
import Button from "./Button.jsx";
import { adjustQty, formatQtyDisplay } from "../lib/pantry.js";
import { FOGLIO_NERO } from "../lib/colors.js";

// Etichette "parlate" delle 3 corsie (i nomi tecnici exact/pack/qb restano
// nel codice): "sottratto per te" = matematica fatta dall'app, "quanto
// resta?" = lo dice l'utente con lo stepper, "q.b." = scorta non toccata.
const TAGS = {
  exact: { label: "sottratto per te", cls: "text-tenue" },
  pack: { label: "quanto resta?", cls: "bg-giallo text-ink" }, // sul foglio nero il cartellino nero sparirebbe
  qb: { label: "q.b.", cls: "" },
};

export default function CookModal({ rows, onClose, onSetAfter, onRemoveRow, onApply, onStapleToShopping }) {
  // Scorte q.b. già segnalate "in lista" in questa sessione del foglio.
  const [added, setAdded] = useState(() => new Set());

  return (
    <Sheet onClose={onClose} panelClass="bg-ink" handleClass="bg-crema/40">
      {(close) => (
        <div className={FOGLIO_NERO}>
          <div className="flex items-center justify-between gap-2 border-b-[1.5px] border-ink px-[18px] pb-3 pt-1">
            <h3 className="titolo">Aggiorna la dispensa</h3>
            <button onClick={close} className="tondo" aria-label="Chiudi">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto px-[18px] py-3">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-[1rem] font-semibold text-tenue">
                Nessun ingrediente di questa ricetta corrisponde a un prodotto in dispensa.
              </p>
            ) : (
              <>
                <p className="mb-2 text-[0.86rem] font-medium leading-snug text-tenue">
                  Controlla quanto resta di ogni prodotto. Le scorte “q.b.” (olio, sale, spezie…) non si aggiornano.
                </p>
                <ul className="divide-y divide-riga">
                  {rows.map((r, i) => {
                    const tag = TAGS[r.kind] || TAGS.exact;
                    const isAdded = added.has(r.itemId);
                    return (
                      <li key={r.itemId} className="py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[1.06rem] font-bold tracking-[-0.02em] text-ink">{r.name}</p>
                            <p className="mt-0.5 text-[0.8rem] font-medium text-tenue">
                              {r.kind === "qb"
                                ? "Usato q.b. · non aggiornato"
                                : r.kind === "pack"
                                  ? <>In dispensa: {formatQtyDisplay(r.before)}</>
                                  : <>Usato: {formatQtyDisplay(r.used)} · Prima: {formatQtyDisplay(r.before)}</>}
                            </p>
                          </div>
                          <span className={`cartellino ${tag.cls}`}>
                            {tag.label}
                          </span>
                        </div>

                        {r.kind === "qb" ? (
                          <button
                            onClick={() => { onStapleToShopping(r.name); setAdded((p) => new Set(p).add(r.itemId)); }}
                            disabled={isAdded}
                            className="pillola mt-2 min-h-[32px] px-3 text-[0.8rem] disabled:opacity-40"
                          >
                            {isAdded
                              ? <><Check className="h-3.5 w-3.5" /> in lista</>
                              : <><ShoppingCart className="h-3.5 w-3.5" /> Sta finendo? Mettilo in lista</>}
                          </button>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="shrink-0 text-[0.86rem] font-semibold text-tenue">Rimane:</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onSetAfter(i, adjustQty(r.after, -1))}
                                className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition active:scale-95"
                                aria-label="Diminuisci"
                              >−</button>
                              <input
                                inputMode="decimal"
                                className="num w-20 rounded-none border-0 border-b-[1.5px] border-ink bg-transparent px-1 py-1 text-center font-extrabold text-ink outline-none focus:border-b-[3px]"
                                value={formatQtyDisplay(r.after)}
                                onChange={(e) => onSetAfter(i, e.target.value.replace("½", "0,5"))}
                                aria-label="Quantità rimasta"
                              />
                              <button
                                onClick={() => onSetAfter(i, adjustQty(r.after, 1))}
                                className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition active:scale-95"
                                aria-label="Aumenta"
                              >+</button>
                            </div>
                            <button
                              onClick={() => onRemoveRow(i)}
                              className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-tenue"
                              aria-label="Ignora"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-[0.86rem] font-medium text-tenue">
                  Lascia vuoto o 0 per togliere un prodotto dalla dispensa.
                </p>
              </>
            )}
          </div>

          <div className="flex gap-2 border-t-[1.5px] border-ink px-[18px] py-3">
            <Button variant="secondary" className="flex-1" onClick={close}>
              Annulla
            </Button>
            <Button variant="primary" className="flex-1" onClick={onApply} disabled={rows.length === 0}>
              <Check className="h-4 w-4" /> Conferma
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
