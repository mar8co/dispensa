// Foglio "Piano pronto": compare dopo "Riempi la settimana" (nero, come gli
// altri fogli del Piano). Fa VEDERE cosa è stato messo — un pasto per riga, col
// giorno e ciò che manca — e permette di ritoccarlo subito: tocco sul piatto =
// apre la ricetta, tondo con le frecce = ne propone un'altra per quel pasto.
// "Annulla tutto" toglie i pasti appena aggiunti e i prodotti messi in lista.
// La logica (scelta delle ricette, lista della spesa) sta in Dispensa.jsx.
import { RefreshCw, Loader2, Check } from "lucide-react";
import Sheet from "./Sheet.jsx";
import Button from "./Button.jsx";
import { FOGLIO_NERO } from "../lib/colors.js";

const SLOT = { pranzo: "pranzo", cena: "cena" };
// "ven 9 · cena"
function when(p) {
  const d = new Date(`${p.date}T12:00:00`);
  return `${d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" })} · ${SLOT[p.slot] || p.slot}`;
}

// picks: [{ id, date, slot, recipe, missing: [{ name }] }] · added: prodotti messi in lista
// swapping: indice del pasto che si sta cambiando (null = nessuno)
export default function PlanReadySheet({ picks, added = 0, swapping = null, onSwap, onOpen, onUndoAll, onClose }) {
  return (
    <Sheet onClose={onClose} panelClass="bg-ink" handleClass="bg-crema/40">
      {(close) => (
        <div className={FOGLIO_NERO}>
          <div className="px-[18px] pb-3 pt-1">
            <h3 className="titolo">Piano pronto</h3>
            <p className="mt-2 text-[0.95rem] font-semibold leading-snug text-tenue">
              {picks.length} {picks.length === 1 ? "pasto aggiunto" : "pasti aggiunti"}
              {added > 0 && <> · {added} {added === 1 ? "prodotto" : "prodotti"} in lista</>}.
              Tocca un piatto per vederlo, le frecce per cambiarlo.
            </p>
          </div>

          <ul className="max-h-[50vh] divide-y divide-riga overflow-y-auto border-y-[1.5px] border-ink px-[18px]">
            {picks.map((p, i) => (
              <li key={`${p.date}|${p.slot}`} className="flex items-center gap-2 py-2">
                <button onClick={() => { close(); onOpen(p); }} className="min-w-0 flex-1 py-1 text-left">
                  <span className="micro block capitalize">{when(p)}</span>
                  <span className="block truncate text-[1.06rem] font-bold tracking-[-0.02em] text-ink">{p.recipe.title}</span>
                  <span className="block truncate text-[0.8rem] font-medium text-tenue">
                    {p.missing.length ? `manca: ${p.missing.map((m) => m.name).join(", ")}` : "hai tutto"}
                  </span>
                </button>
                <button
                  onClick={() => onSwap(i)}
                  disabled={swapping !== null}
                  aria-label={`Cambia ${p.recipe.title}`}
                  title="Proponine un'altra"
                  className="tondo h-11 w-11 disabled:opacity-40"
                >
                  {swapping === i ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <RefreshCw className="h-[18px] w-[18px]" />}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 px-[18px] py-3">
            <Button variant="secondary" className="flex-1" onClick={() => { close(); onUndoAll(); }} disabled={swapping !== null}>
              Annulla tutto
            </Button>
            <Button variant="primary" className="flex-1" onClick={close}>
              <Check className="h-4 w-4" /> Va bene
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
