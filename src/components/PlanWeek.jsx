// Piano pasti — vista settimana (mockup 1 approvato: agenda verticale dentro
// Ricette). Una card per giorno con gli slot Pranzo/Cena; "oggi" è evidenziato
// in modo discreto (etichetta e bordo tomato tenue); i giorni passati restano
// visibili ma attenuati e compressi. Toccando uno slot si apre il foglio:
// vuoto → scegli dal ricettario / piatto libero / genera un'idea;
// pieno → cucina (CookModal via bridge), mancanti alla spesa, cambia, rimuovi.
import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Sun, Moon, Plus, Check, Sparkles,
  ShoppingCart, Utensils, Trash2, RefreshCw,
} from "lucide-react";
import Sheet from "./Sheet.jsx";
import Button from "./Button.jsx";
import { isoDate, mondayOf, addDays } from "../hooks/useMealPlan.jsx";

const SLOTS = [
  { id: "pranzo", label: "Pranzo", Icon: Sun },
  { id: "cena", label: "Cena", Icon: Moon },
];

// "mar 14" (come le date brevi del resto dell'app, minuscole).
function dayLabel(d) {
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
}

// Intestazione settimana: "Questa settimana" oppure l'intervallo "14–20 lug".
function weekLabel(weekStart) {
  if (isoDate(weekStart) === isoDate(mondayOf(new Date()))) return "Questa settimana";
  const end = addDays(weekStart, 6);
  const m1 = weekStart.toLocaleDateString("it-IT", { month: "short" });
  const m2 = end.toLocaleDateString("it-IT", { month: "short" });
  return m1 === m2
    ? `${weekStart.getDate()}–${end.getDate()} ${m1}`
    : `${weekStart.getDate()} ${m1} – ${end.getDate()} ${m2}`;
}

// Foglio dello slot: scelta del piatto (vuoto) o azioni sul piatto (pieno).
function MealSlotSheet({
  date, slot, meal, savedRecipes, hasIngredient,
  onPick, onCook, onMarkCooked, onAddMissing, onRemove, onGoIdeas, onClose,
}) {
  const [picking, setPicking] = useState(!meal); // pieno → azioni; vuoto → scelta
  const [query, setQuery] = useState("");
  const [free, setFree] = useState("");
  const [missingAdded, setMissingAdded] = useState(false);

  // Il foglio resta MONTATO durante l'animazione di chiusura di Sheet: se un
  // pick arriva proprio in quella finestra (close() + onPick() nello stesso
  // gesto), `meal` passa da vuoto a pieno mentre siamo ancora qui, ma
  // `picking` (letto una volta sola al mount) restava bloccato su "scelta".
  // Risincronizziamo appena il piatto risulta impostato/aggiornato.
  useEffect(() => {
    if (meal) setPicking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal?.id, meal?.title]);

  const slotDef = SLOTS.find((s) => s.id === slot);
  const heading = `${dayLabel(date)} · ${slotDef?.label || slot}`;

  // Ricettario: salvate prima, poi cucinate di recente; filtro sul nome.
  const list = (savedRecipes || [])
    .slice()
    .sort((a, b) => Number(b.saved) - Number(a.saved))
    .filter((r) => r.title.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 30);

  const missing = (meal?.data?.ingredients || []).filter((ing) => !hasIngredient(ing.name));

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <div className="px-5 pb-4 pt-1">
          <h3 className="font-display text-lg font-extrabold capitalize tracking-tight text-ink">{heading}</h3>

          {!picking && meal && (
            <>
              <p className="mt-1 text-[15px] font-semibold text-ink">{meal.title}</p>
              {meal.cooked_at ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-stone-500">
                  <Check className="h-3.5 w-3.5 text-tomato" /> Cucinato
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-stone-500">
                  {meal.data ? "Ricetta nel piano" : "Piatto libero"}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {!meal.cooked_at && (
                  <Button variant="primary" full onClick={() => { close(); (meal.data ? onCook : onMarkCooked)(meal); }}>
                    <Utensils className="h-4 w-4" /> {meal.data ? "Ho cucinato questa ricetta" : "Segna come cucinato"}
                  </Button>
                )}
                {meal.data && missing.length > 0 && (
                  missingAdded ? (
                    <p className="text-center text-xs font-semibold text-stone-500">
                      {missing.length} {missing.length === 1 ? "prodotto aggiunto" : "prodotti aggiunti"} alla lista della spesa.
                    </p>
                  ) : (
                    <Button
                      variant="cook" size="sm" full
                      onClick={async () => { await onAddMissing(missing.map((i) => i.name)); setMissingAdded(true); }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Aggiungi {missing.length} {missing.length === 1 ? "mancante" : "mancanti"} alla spesa
                    </Button>
                  )
                )}
                <Button variant="secondary" full onClick={() => setPicking(true)}>
                  <RefreshCw className="h-4 w-4" /> Cambia piatto
                </Button>
                <Button variant="danger" full onClick={() => { close(); onRemove(meal); }}>
                  <Trash2 className="h-4 w-4" /> Rimuovi dal piano
                </Button>
              </div>
            </>
          )}

          {picking && (
            <>
              {/* Dal ricettario */}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca nel ricettario…"
                aria-label="Cerca nel ricettario"
                className="mt-3 w-full border-0 border-b border-ink/20 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-ink"
              />
              {list.length > 0 ? (
                <ul className="mt-1 max-h-56 divide-y divide-hair overflow-y-auto">
                  {list.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => { close(); onPick({ title: r.title, data: r.data || null }); }}
                        className="flex w-full items-center gap-3 py-2.5 text-left"
                      >
                        {r.image ? (
                          <img src={r.image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-lg">🍽️</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                          {r.data?.time && <span className="block text-xs text-stone-500">{r.data.time}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-xs text-stone-500">
                  {query.trim() ? "Nessuna ricetta trovata." : "Il ricettario è vuoto: salva una ricetta col cuore ♡"}
                </p>
              )}

              {/* Piatto libero (es. pizza fuori, avanzi) */}
              <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">oppure</p>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!free.trim()) return;
                  close();
                  onPick({ title: free.trim(), data: null });
                }}
              >
                <input
                  value={free}
                  onChange={(e) => setFree(e.target.value)}
                  placeholder="Scrivi tu: es. Pizza fuori, Avanzi…"
                  aria-label="Piatto libero"
                  className="min-w-0 flex-1 border-0 border-b border-ink/20 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-ink"
                />
                {free.trim() && (
                  <Button type="submit" variant="primary" size="sm">Aggiungi</Button>
                )}
              </form>

              {/* Genera un'idea con l'AI per QUESTO giorno/slot: passa alle Idee,
                  chiede subito una proposta e la piazza qui una volta aperta
                  (vedi RecipesTab → pendingSlot). */}
              <Button variant="cook" size="sm" full className="mt-4" onClick={() => { close(); onGoIdeas(date, slot); }}>
                <Sparkles className="h-3.5 w-3.5" /> Genera un'idea con l'AI
              </Button>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

export default function PlanWeek({
  meals, weekStart, shiftWeek, loadingMeals,
  planMeal, removeMeal, markMealCooked, onCookMeal,
  savedRecipes, hasIngredient, onAddMissing, onGoIdeas,
}) {
  const [sheet, setSheet] = useState(null); // { date: Date, slot: "pranzo"|"cena" }

  const todayIso = isoDate(new Date());
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i));
  const byKey = new Map(meals.map((m) => [`${m.date}|${m.slot}`, m]));
  const sheetMeal = sheet ? byKey.get(`${isoDate(sheet.date)}|${sheet.slot}`) : null;

  return (
    <div className="mt-4">
      {/* Navigazione settimana */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => shiftWeek(-1)}
          aria-label="Settimana precedente"
          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-ink"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => shiftWeek(0)}
          className="text-sm font-bold text-ink"
          title="Torna alla settimana corrente"
        >
          {weekLabel(weekStart)}
        </button>
        <button
          onClick={() => shiftWeek(1)}
          aria-label="Settimana successiva"
          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-ink"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Giorni */}
      <div className={`mt-2 space-y-2.5 ${loadingMeals ? "opacity-60" : ""}`}>
        {days.map((d) => {
          const iso = isoDate(d);
          const isToday = iso === todayIso;
          const isPast = iso < todayIso;

          if (isPast) {
            // Compresso e attenuato: solo cosa c'era (e se è stato cucinato).
            const rows = SLOTS.map((s) => ({ s, meal: byKey.get(`${iso}|${s.id}`) })).filter((x) => x.meal);
            return (
              <div key={iso} className="rounded-xl border border-hair bg-paper px-3.5 py-2 opacity-60">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold capitalize text-ink">{dayLabel(d)}</span>
                  {rows.length === 0 && <span className="text-xs text-stone-400">—</span>}
                </div>
                {rows.map(({ s, meal }) => (
                  <button
                    key={s.id}
                    onClick={() => setSheet({ date: d, slot: s.id })}
                    className="flex w-full items-center gap-1.5 py-0.5 text-left text-xs text-stone-500"
                  >
                    <s.Icon className="h-3 w-3 shrink-0 text-stone-400" />
                    <span className="min-w-0 flex-1 truncate">{meal.title}</span>
                    {meal.cooked_at && <Check className="h-3.5 w-3.5 shrink-0 text-tomato" />}
                  </button>
                ))}
              </div>
            );
          }

          return (
            <div
              key={iso}
              className={`rounded-xl border bg-paper px-3.5 py-2.5 ${isToday ? "border-tomato/30" : "border-hair"}`}
            >
              <div className="flex items-baseline gap-2">
                {isToday && <span className="text-xs font-bold text-tomato">Oggi</span>}
                <span className="text-xs font-bold capitalize text-ink">{dayLabel(d)}</span>
              </div>
              {SLOTS.map((s) => {
                const meal = byKey.get(`${iso}|${s.id}`);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSheet({ date: d, slot: s.id })}
                    className="flex w-full items-center gap-2 py-1.5 text-left"
                  >
                    <s.Icon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                    <span className="w-14 shrink-0 text-xs text-stone-500">{s.label}</span>
                    {meal ? (
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="min-w-0 truncate rounded-lg border border-tomato/25 bg-tomato/5 px-2 py-0.5 text-xs font-semibold text-tomato">
                          {meal.title}
                        </span>
                        {meal.cooked_at && <Check className="h-3.5 w-3.5 shrink-0 text-tomato" />}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-lg border border-dashed border-stone-300 px-2 py-0.5 text-xs text-stone-400">
                        <Plus className="h-3 w-3" /> aggiungi
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {sheet && (
        <MealSlotSheet
          key={`${isoDate(sheet.date)}|${sheet.slot}`}
          date={sheet.date}
          slot={sheet.slot}
          meal={sheetMeal}
          savedRecipes={savedRecipes}
          hasIngredient={hasIngredient}
          onPick={(v) => planMeal(isoDate(sheet.date), sheet.slot, v)}
          onCook={onCookMeal}
          onMarkCooked={(meal) => markMealCooked(meal.id)}
          onAddMissing={onAddMissing}
          onRemove={(meal) => removeMeal(meal.id)}
          onGoIdeas={onGoIdeas}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
