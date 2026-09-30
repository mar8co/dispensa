// Piano pasti — vista settimana (mockup 1 approvato: agenda verticale dentro
// Ricette). Una card bianca per giorno con gli slot Pranzo/Cena; "oggi" è
// evidenziato in modo discreto (cartellino nero "Oggi" e bordo nero); i giorni
// passati restano visibili ma attenuati e compressi. Toccando uno slot si apre il foglio:
// vuoto → scegli dal ricettario / piatto libero / genera un'idea;
// pieno → cucina (CookModal via bridge), mancanti alla spesa, cambia, rimuovi.
import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Sun, Moon, Plus, Minus, Check, Sparkles,
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
  onPick, onCook, onMarkCooked, onAddMissing, onRemove, onGoIdeas, onChangeServings, onClose,
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
        <div className="px-[18px] pb-4 pt-1">
          <p className="micro capitalize">{heading}</p>

          {!picking && meal && (
            <>
              <p className="titolo mt-1">{meal.title}</p>
              {meal.cooked_at ? (
                <p className="mt-2 flex items-center gap-1 text-[0.86rem] font-semibold text-tenue">
                  <Check className="h-3.5 w-3.5 text-ink" /> Cucinato
                </p>
              ) : (
                <p className="mt-2 text-[0.86rem] font-semibold text-tenue">
                  {meal.data ? "Ricetta nel piano" : "Piatto libero"}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {/* Porzioni pianificate (solo ricette): "Ho cucinato" scala la
                    dispensa in proporzione a questo numero. */}
                {meal.data && !meal.cooked_at && (() => {
                  const servings = Number(meal.data.planServings) || Number(meal.data.servings) || 2;
                  return (
                    <div className="flex items-center justify-between border-y-[1.5px] border-ink py-2">
                      <span className="text-[1rem] font-bold text-ink">Porzioni</span>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onChangeServings(servings - 1)}
                          disabled={servings <= 1}
                          aria-label="Meno porzioni"
                          className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition active:scale-90 disabled:opacity-30"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="num w-9 text-center text-[1.15rem] font-extrabold text-ink">{servings}</span>
                        <button
                          onClick={() => onChangeServings(servings + 1)}
                          aria-label="Più porzioni"
                          className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition active:scale-90"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
                {!meal.cooked_at && (
                  <Button variant="primary" full onClick={() => { close(); (meal.data ? onCook : onMarkCooked)(meal); }}>
                    <Utensils className="h-4 w-4" /> {meal.data ? "Ho cucinato questa ricetta" : "Segna come cucinato"}
                  </Button>
                )}
                {meal.data && missing.length > 0 && (
                  missingAdded ? (
                    <p className="text-center text-[0.86rem] font-semibold text-tenue">
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
                className="campo mt-3 text-ink"
              />
              {list.length > 0 ? (
                <ul className="mt-1 max-h-56 divide-y divide-riga overflow-y-auto">
                  {list.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => { close(); onPick({ title: r.title, data: r.data || null }); }}
                        className="flex w-full items-center gap-3 py-2.5 text-left"
                      >
                        {r.image ? (
                          <img src={r.image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/[0.06] text-lg">🍽️</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[1rem] font-bold tracking-[-0.02em] text-ink">{r.title}</span>
                          {r.data?.time && <span className="block text-[0.8rem] font-medium text-tenue">{r.data.time}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-[0.9rem] font-semibold text-tenue">
                  {query.trim() ? "Nessuna ricetta trovata." : "Il ricettario è vuoto: salva una ricetta col cuore ♡"}
                </p>
              )}

              {/* Piatto libero (es. pizza fuori, avanzi) */}
              <p className="micro mt-4 text-center">Oppure</p>
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
                  className="campo min-w-0 flex-1 text-ink"
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
  planMeal, removeMeal, markMealCooked, setMealServings, onCookMeal,
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
          className="tondo"
        >
          <ChevronLeft className="h-[18px] w-[18px]" />
        </button>
        <button
          onClick={() => shiftWeek(0)}
          className="text-[1.3rem] font-extrabold tracking-[-0.045em] text-ink"
          title="Torna alla settimana corrente"
        >
          {weekLabel(weekStart)}
        </button>
        <button
          onClick={() => shiftWeek(1)}
          aria-label="Settimana successiva"
          className="tondo"
        >
          <ChevronRight className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Giorni */}
      <div className={`mt-3 space-y-2 ${loadingMeals ? "opacity-60" : ""}`}>
        {days.map((d) => {
          const iso = isoDate(d);
          const isToday = iso === todayIso;
          const isPast = iso < todayIso;

          if (isPast) {
            // Compresso e attenuato: solo cosa c'era (e se è stato cucinato).
            const rows = SLOTS.map((s) => ({ s, meal: byKey.get(`${iso}|${s.id}`) })).filter((x) => x.meal);
            return (
              <div key={iso} className="rounded-card bg-white/55 px-3.5 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.86rem] font-bold capitalize text-ink/60">{dayLabel(d)}</span>
                  {rows.length === 0 && <span className="text-[0.86rem] text-ink/40">–</span>}
                </div>
                {rows.map(({ s, meal }) => (
                  <button
                    key={s.id}
                    onClick={() => setSheet({ date: d, slot: s.id })}
                    className="flex w-full items-center gap-1.5 py-0.5 text-left text-[0.86rem] font-medium text-ink/60"
                  >
                    <s.Icon className="h-3 w-3 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{meal.title}</span>
                    {meal.cooked_at && <Check className="h-3.5 w-3.5 shrink-0 text-ink" />}
                  </button>
                ))}
              </div>
            );
          }

          return (
            <div
              key={iso}
              className={`rounded-card bg-white px-3.5 py-2.5 ${isToday ? "shadow-[inset_0_0_0_2px_#0a0a0a]" : ""}`}
            >
              <div className="flex items-center gap-2">
                {isToday && <span className="cartellino bg-ink text-white">Oggi</span>}
                <span className="text-[1.05rem] font-extrabold capitalize tracking-[-0.03em] text-ink">{dayLabel(d)}</span>
              </div>
              {SLOTS.map((s) => {
                const meal = byKey.get(`${iso}|${s.id}`);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSheet({ date: d, slot: s.id })}
                    className="flex min-h-[40px] w-full items-center gap-2 py-1 text-left"
                  >
                    <s.Icon className="h-4 w-4 shrink-0 text-ink/50" />
                    <span className="w-14 shrink-0 text-[0.8rem] font-medium text-tenue">{s.label}</span>
                    {meal ? (
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="min-w-0 truncate text-[1rem] font-bold tracking-[-0.02em] text-ink">
                          {meal.title}
                        </span>
                        {meal.cooked_at && <Check className="h-4 w-4 shrink-0 text-ink" />}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full border-[1.5px] border-dashed border-ink/35 px-2.5 py-0.5 text-[0.8rem] font-semibold text-tenue">
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
          onChangeServings={(n) => sheetMeal && setMealServings(sheetMeal.id, n)}
          onAddMissing={onAddMissing}
          onRemove={(meal) => removeMeal(meal.id)}
          onGoIdeas={onGoIdeas}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
