// Foglio "Ho cucinato questo": aggiorna la dispensa dopo aver cucinato.
// Dal 09/10 NON fa più conti (niente grammi sottratti): per ogni prodotto
// della dispensa usato dalla ricetta si dice solo com'è rimasto, con tre
// pillole — "Ce n'è ancora" (già scelta: se non si tocca nulla non cambia
// nulla), "Sta finendo", "Finito" (esce dalla dispensa ed entra in lista).
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

// rows: [{ itemId, name, state: "ok" | "low" | "out" }]
export default function CookModal({ rows, onClose, onSetState, onApply }) {
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
                  Tocca solo ciò che è cambiato. I prodotti finiti vanno nella lista della spesa.
                </p>
                <ul className="divide-y divide-riga">
                  {rows.map((r, i) => (
                    <li key={r.itemId} className="py-3">
                      <p className="truncate text-[1.06rem] font-bold tracking-[-0.02em] text-ink">{r.name}</p>
                      {/* Scelta = pillola gialla (sul foglio nero la piena nera sparirebbe). */}
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
