// Foglio "Aggiungi al piano" (dal dettaglio ricetta; nero come gli altri fogli
// delle Ricette). I prossimi 7 giorni, uno per riga con un filo tra l'uno e
// l'altro; a destra i due pasti. All'apertura carica cosa c'è già in quei
// giorni: un pasto OCCUPATO si vede (pulsante pieno + nome del piatto sotto il
// giorno) e per sostituirlo chiede conferma in linea. Prima i 14 pulsanti erano
// tutti uguali e un piatto già pianificato veniva sovrascritto in silenzio (o,
// fuori dalla settimana caricata, non veniva salvato affatto).
import { useEffect, useState } from "react";
import { Sun, Moon, Check } from "lucide-react";
import Sheet from "./Sheet.jsx";
import Button from "./Button.jsx";
import { fetchMealPlan } from "../lib/db.js";
import { isoDate, addDays } from "../hooks/useMealPlan.jsx";
import { FOGLIO_NERO } from "../lib/colors.js";

const SLOTS = [
  { id: "pranzo", label: "Pranzo", Icon: Sun },
  { id: "cena", label: "Cena", Icon: Moon },
];

// "Oggi", "Domani", poi il giorno della settimana per esteso.
function dayName(d, i) {
  if (i === 0) return "Oggi";
  if (i === 1) return "Domani";
  return d.toLocaleDateString("it-IT", { weekday: "long" });
}

// onChoose(giorno, pasto, idDelPiattoDaSostituire | null)
// loadRange: come leggere i pasti di un intervallo di date (di serie dal DB;
// la pagina di prova ne passa uno finto).
export default function PlanDaySheet({ recipeTitle = "", onChoose, onClose, loadRange = fetchMealPlan }) {
  const [days] = useState(() => [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(new Date(), i)));
  const [taken, setTaken] = useState({});     // "data|pasto" → piatto già pianificato
  const [confirm, setConfirm] = useState(null); // "data|pasto" in attesa di conferma

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => loadRange(isoDate(days[0]), isoDate(days[6])))
      .then((rows) => {
        if (!alive) return;
        setTaken(Object.fromEntries((rows || []).map((m) => [`${m.date}|${m.slot}`, m])));
      })
      .catch(() => { /* senza rete i pasti restano "liberi": si comporta come prima */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const same = (m) => m.title.trim().toLowerCase() === recipeTitle.trim().toLowerCase();

  return (
    <Sheet onClose={onClose} panelClass="bg-ink" handleClass="bg-crema/40">
      {(close) => (
        <div className={`px-[18px] pb-4 pt-1 ${FOGLIO_NERO}`}>
          <h3 className="titolo">Aggiungi al piano</h3>
          {recipeTitle && (
            <p className="mt-1.5 truncate text-[0.95rem] font-semibold text-tenue">{recipeTitle}</p>
          )}

          <ul className="mt-3.5 divide-y divide-riga border-t-[1.5px] border-ink">
            {days.map((d, i) => {
              const iso = isoDate(d);
              const booked = SLOTS.map((s) => ({ s, meal: taken[`${iso}|${s.id}`] })).filter((x) => x.meal);
              const asking = SLOTS.find((s) => confirm === `${iso}|${s.id}`);
              return (
                <li key={iso} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="text-[1.1rem] font-extrabold capitalize tracking-[-0.03em] text-ink">{dayName(d, i)}</span>
                        <span className="text-[0.8rem] font-medium text-tenue">
                          {d.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                        </span>
                      </p>
                      {/* Cosa c'è già quel giorno */}
                      {booked.map(({ s, meal }) => (
                        <p key={s.id} className="truncate text-[0.8rem] font-medium text-tenue">
                          {s.label}: {same(meal) ? "questa ricetta" : meal.title}
                        </p>
                      ))}
                    </div>
                    {SLOTS.map(({ id, label, Icon }) => {
                      const meal = taken[`${iso}|${id}`];
                      const already = meal && same(meal); // questa ricetta è già lì
                      return (
                        <button
                          key={id}
                          disabled={already}
                          onClick={() => {
                            if (meal) { setConfirm(`${iso}|${id}`); return; }
                            close(); onChoose(d, id, null);
                          }}
                          aria-label={`${label}, ${dayName(d, i)}${meal ? ` (già pianificato: ${meal.title})` : ""}`}
                          // Occupato = pieno chiaro (con la spunta), libero = solo bordo.
                          className={`pillola h-11 min-h-0 px-3.5 text-[0.9rem] disabled:opacity-60 ${meal ? "bg-crema !text-ink" : ""}`}
                        >
                          {meal ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />} {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Pasto occupato: conferma in linea prima di sostituire. */}
                  {asking && (
                    <div className="mt-2.5 rounded-card bg-crema/10 p-3">
                      <p className="text-[0.95rem] font-semibold leading-snug text-ink">
                        A {asking.label.toLowerCase()} c&rsquo;è già <strong>{taken[confirm].title}</strong>. La sostituisco?
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirm(null)}>Annulla</Button>
                        <Button variant="primary" size="sm" className="flex-1" onClick={() => { close(); onChoose(d, asking.id, taken[confirm].id); }}>
                          Sostituisci
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
