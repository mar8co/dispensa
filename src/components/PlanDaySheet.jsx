// Foglio "Aggiungi al calendario" (dal dettaglio ricetta; nero come gli altri
// fogli delle Ricette). Due passi leggeri invece di 14 pulsanti (11/10, prima
// c'era una riga per giorno con due pillole ciascuna: "troppo pesante"):
//   1. una striscia coi prossimi 7 giorni — si sceglie il giorno (oggi è già
//      scelto; un puntino segna i giorni che hanno già un piatto);
//   2. sotto, i due pasti di QUEL giorno, con scritto se sono liberi o cosa c'è.
// All'apertura carica cosa c'è già in quei giorni: un pasto occupato si vede e
// per sostituirlo chiede conferma in linea.
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
  const [sel, setSel] = useState(0);            // giorno scelto (indice in `days`)
  const [taken, setTaken] = useState({});       // "data|pasto" → piatto già pianificato
  const [confirm, setConfirm] = useState(null); // pasto ("pranzo"|"cena") in attesa di conferma

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
  const day = days[sel];
  const iso = isoDate(day);
  const asking = confirm ? taken[`${iso}|${confirm}`] : null;

  return (
    <Sheet onClose={onClose} panelClass="bg-ink" handleClass="bg-crema/40">
      {(close) => (
        <div className={`px-[18px] pb-4 pt-1 ${FOGLIO_NERO}`}>
          <p className="micro">Aggiungi al calendario</p>
          {recipeTitle && <h3 className="mt-1 truncate text-[1.5rem] font-extrabold leading-tight tracking-[-0.04em] text-ink">{recipeTitle}</h3>}

          {/* 1. Il giorno: sette caselle uguali, scelta = piena chiara. */}
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {days.map((d, i) => {
              const dIso = isoDate(d);
              const busy = SLOTS.some((s) => taken[`${dIso}|${s.id}`]);
              const on = i === sel;
              return (
                <button
                  key={dIso}
                  onClick={() => { setSel(i); setConfirm(null); }}
                  aria-pressed={on}
                  aria-label={`${dayName(d, i)} ${d.getDate()}`}
                  className={`relative flex h-[58px] flex-col items-center justify-center rounded-2xl transition active:scale-95 ${on ? "bg-crema" : ""}`}
                >
                  <span className={`text-[0.7rem] font-semibold capitalize ${on ? "text-black/60" : "text-crema/60"}`}>
                    {i === 0 ? "oggi" : d.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "")}
                  </span>
                  <span className={`num text-[1.2rem] font-extrabold leading-tight tracking-[-0.03em] ${on ? "text-black" : "text-crema"}`}>{d.getDate()}</span>
                  {/* Puntino: quel giorno ha già almeno un piatto. */}
                  {busy && <i aria-hidden="true" className={`absolute bottom-1.5 h-1 w-1 rounded-full ${on ? "bg-black" : "bg-giallo"}`} />}
                </button>
              );
            })}
          </div>

          {/* 2. Il pasto di quel giorno: due righe grandi, senza scatole. */}
          <p className="mt-4 border-b border-crema/25 pb-2 text-[0.86rem] font-semibold text-tenue first-letter:uppercase">
            {dayName(day, sel)} {day.toLocaleDateString("it-IT", { day: "numeric", month: "long" })}
          </p>
          <ul className="divide-y divide-riga">
            {SLOTS.map(({ id, label, Icon }) => {
              const meal = taken[`${iso}|${id}`];
              const already = meal && same(meal); // questa ricetta è già lì
              return (
                <li key={id}>
                  <button
                    disabled={already}
                    onClick={() => {
                      if (meal) { setConfirm(id); return; }
                      close(); onChoose(day, id, null);
                    }}
                    className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left disabled:opacity-60"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-ink" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.15rem] font-extrabold tracking-[-0.03em] text-ink">{label}</span>
                      <span className="block truncate text-[0.8rem] font-medium text-tenue">
                        {already ? "Questa ricetta è già qui" : meal ? meal.title : "Libero"}
                      </span>
                    </span>
                    {already
                      ? <Check className="h-5 w-5 shrink-0 text-ink" />
                      : <span className="shrink-0 text-[0.86rem] font-bold text-giallo">{meal ? "Sostituisci" : "Aggiungi"}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Pasto occupato: conferma in linea prima di sostituire. */}
          {asking && (
            <div className="mt-2 rounded-card bg-crema/10 p-3">
              <p className="text-[0.95rem] font-semibold leading-snug text-ink">
                Tolgo <strong>{asking.title}</strong> e metto questa ricetta?
              </p>
              <div className="mt-2.5 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirm(null)}>Annulla</Button>
                <Button variant="primary" size="sm" className="flex-1" onClick={() => { close(); onChoose(day, confirm, asking.id); }}>
                  Sostituisci
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
