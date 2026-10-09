// Foglio "Ho cucinato questo": aggiorna la dispensa dopo aver cucinato.
// Dal 09/10 niente grammi sottratti. Due tipi di riga (vedi cookRow in
// pantry.js): ciò che si CONTA a pezzi (4 uova, ne usi 2) è già scalato
// dall'app e si corregge con − e +; per tutto il resto si dice solo com'è
// rimasto, con tre pillole — "Ce n'è ancora" (già scelta: se non si tocca
// nulla non cambia nulla), "Sta finendo", "Finito" (esce dalla dispensa ed
// entra in lista).
// La ricetta continua a mostrare i grammi: servono a cucinare, non a contare.
import { X, Check } from "lucide-react";
import Sheet from "./Sheet.jsx";
import Button from "./Button.jsx";
import { FOGLIO_NERO } from "../lib/colors.js";

const STATES = [
  ["ok", "Ce n'è ancora"],
  ["low", "Sta finendo"],
  ["out", "Finito"],
];

// rows: [{ itemId, name, kind: "state", state: "ok" | "low" | "out" }
//      | { itemId, name, kind: "count", before, used, after }]
export default function CookModal({ rows, onClose, onSetState, onSetAfter, onApply }) {
  return (
    <Sheet onClose={onClose} panelClass="bg-ink" handleClass="bg-crema/40">
      {(close) => (
        <div className={FOGLIO_NERO}>
          <div className="flex items-center justify-between gap-2 border-b-[1.5px] border-ink px-[18px] pb-3 pt-1">
            <h3 className="titolo">Com&rsquo;è rimasto?</h3>
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
                <p className="mb-1 text-[0.86rem] font-medium leading-snug text-tenue">
                  I pezzi li ho già contati io: correggi se serve. Per il resto tocca solo ciò che è cambiato. I finiti vanno in lista.
                </p>
                <ul className="divide-y divide-riga">
                  {rows.map((r, i) => (
                    <li key={r.itemId} className="py-3">
                      <p className="truncate text-[1.06rem] font-bold tracking-[-0.02em] text-ink">{r.name}</p>
                      {r.kind === "count" ? (
                        // Si conta a pezzi: il conto è già fatto, qui lo si corregge.
                        <div className="mt-1.5 flex items-center gap-3">
                          <p className="min-w-0 flex-1 text-[0.8rem] font-medium text-tenue">
                            Ne avevi {r.before}, usati {r.used}
                            {r.after <= 0 && <> · <span className="font-bold text-giallo">finito, va in lista</span></>}
                          </p>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => onSetAfter(i, r.after - 1)}
                              disabled={r.after <= 0}
                              aria-label={`Meno ${r.name}`}
                              className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-crema/60 text-xl font-semibold leading-none text-crema transition active:scale-90 disabled:opacity-30"
                            >−</button>
                            <span className="num w-9 text-center text-[1.2rem] font-extrabold text-ink" aria-label="Rimasti">{Math.max(0, r.after)}</span>
                            <button
                              onClick={() => onSetAfter(i, r.after + 1)}
                              aria-label={`Più ${r.name}`}
                              className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-crema/60 text-xl font-semibold leading-none text-crema transition active:scale-90"
                            >+</button>
                          </div>
                        </div>
                      ) : (
                      // Scelta = pillola gialla (sul foglio nero la piena nera sparirebbe).
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {STATES.map(([id, label]) => (
                          <button
                            key={id}
                            onClick={() => onSetState(i, id)}
                            aria-pressed={r.state === id}
                            className={`flex h-11 items-center justify-center rounded-full border-[1.5px] px-1 text-[0.82rem] font-bold tracking-[-0.01em] transition active:scale-95 ${
                              r.state === id ? "border-giallo bg-giallo text-black" : "border-crema/60 text-crema"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="flex gap-2 border-t-[1.5px] border-ink px-[18px] py-3">
            <Button variant="secondary" className="flex-1" onClick={close}>
              Annulla
            </Button>
            <Button variant="primary" className="flex-1" onClick={onApply}>
              <Check className="h-4 w-4" /> Conferma
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
