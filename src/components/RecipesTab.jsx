// Scheda Ricette (stile editoriale): griglia occasioni -> 4 proposte -> ricetta
// completa con grammature, "cosa mi manca", timer e "Ho cucinato questa ricetta".
import { useState, useEffect } from "react";
import {
  Plus, Minus, Loader2, ArrowLeft, Clock, Gauge, Utensils, GripVertical,
  CheckCircle2, Circle, ShoppingCart,
} from "lucide-react";
import { scaleQty } from "../lib/pantry.js";
import StepTimer from "./StepTimer.jsx";

export default function RecipesTab({
  orderedModes, mode, modeCardRefs,
  dragMode, onModeDragStart, onModeDragMove, onModeDragEnd, chooseMode,
  ideas, loadingIdeas, openRecipe, backToModes,
  recipe, loadingRecipe, recipeErr,
  servings, setServings, factor, backToIdeas,
  openCookModal, cookDone,
  hasIngredient, onAddMissing,
}) {
  const [addedMissing, setAddedMissing] = useState(false);
  useEffect(() => { setAddedMissing(false); }, [recipe?.title]);

  const ingredients = recipe?.ingredients || [];
  const missing = ingredients.filter((ing) => !hasIngredient(ing.name));

  async function addMissing() {
    await onAddMissing(missing.map((ing) => ing.name));
    setAddedMissing(true);
  }

  return (
    <div className="pt-2">
      {!mode && (
        <>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-tomato">Ricette</div>
          <h1 className="mt-1 font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-ink">Cosa<br />cuciniamo?</h1>
          <p className="mt-2.5 text-sm text-stone-500">Idee con quello che hai in dispensa.</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {orderedModes.map((m) => (
              <div
                key={m.id}
                ref={(el) => { modeCardRefs.current[m.id] = el; }}
                onClick={() => chooseMode(m)}
                className={`relative cursor-pointer rounded-2xl border bg-paper p-4 text-left transition hover:border-ink ${dragMode === m.id ? "border-tomato ring-2 ring-tomato/20" : "border-hair"}`}
              >
                <div className="mb-2 text-2xl">{m.icon}</div>
                <div className="pr-5 text-sm font-bold text-ink">{m.id}</div>
                <div className="mt-0.5 text-xs text-stone-500">{m.desc}</div>
                <button
                  data-noswipe
                  onPointerDown={(e) => { e.stopPropagation(); onModeDragStart(e, m.id); }}
                  onPointerMove={onModeDragMove}
                  onPointerUp={onModeDragEnd}
                  onPointerCancel={onModeDragEnd}
                  onClick={(e) => e.stopPropagation()}
                  style={{ touchAction: "none" }}
                  className="absolute right-1.5 top-1.5 cursor-grab rounded-md p-1 text-stone-300 transition hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing"
                  aria-label="Trascina per riordinare"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {mode && !recipe && !loadingRecipe && (
        <>
          <button onClick={backToModes} className="mb-4 flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Occasioni
          </button>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">{mode.icon}</span>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">{mode.id}</h1>
          </div>

          {loadingIdeas && (
            <div className="flex flex-col items-center gap-2 py-12 text-stone-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Preparo le proposte…</p>
            </div>
          )}
          {recipeErr && !loadingIdeas && (
            <div className="rounded-xl border border-tomato/30 bg-tomato/5 p-4 text-center text-sm text-tomato">
              {recipeErr}
              <button onClick={() => chooseMode(mode)} className="mt-2 block w-full rounded-lg bg-tomato py-2 font-semibold text-white">Riprova</button>
            </div>
          )}

          <div className="space-y-3">
            {ideas.map((r, i) => (
              <button
                key={i}
                onClick={() => openRecipe(r.title)}
                className="block w-full overflow-hidden rounded-2xl border border-hair bg-paper text-left transition hover:border-ink"
              >
                {r.image ? (
                  <img src={r.image} alt="" loading="lazy" className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-4xl">
                    {mode?.icon || "🍽️"}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-base font-bold leading-snug text-ink">{r.title}</h3>
                  <p className="mt-1 text-sm leading-snug text-stone-500">{r.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.time && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        <Clock className="h-3 w-3" /> {r.time}
                      </span>
                    )}
                    {r.difficulty && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        <Gauge className="h-3 w-3" /> {r.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {mode && loadingRecipe && (
        <div className="flex flex-col items-center gap-2 py-16 text-stone-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Scrivo la ricetta completa…</p>
        </div>
      )}

      {recipe && !loadingRecipe && (
        <>
          <button onClick={backToIdeas} className="mb-4 flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Altre proposte
          </button>

          {/* Cover */}
          {recipe.image ? (
            <img src={recipe.image} alt="" className="h-44 w-full rounded-2xl object-cover" />
          ) : (
            <div className="flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 text-6xl">
              {mode?.icon || "🍽️"}
            </div>
          )}

          <h1 className="mt-4 font-display text-[26px] font-extrabold leading-tight tracking-tight text-ink">{recipe.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {recipe.time && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                <Clock className="h-3.5 w-3.5" /> {recipe.time}
              </span>
            )}
            <div className="inline-flex items-center gap-1 rounded-full border border-hair px-1 py-0.5">
              <button
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                disabled={servings <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 disabled:opacity-30"
                aria-label="Meno porzioni"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-24 text-center text-xs font-semibold text-ink">
                {servings} {servings === 1 ? "porzione" : "porzioni"}
              </span>
              <button
                onClick={() => setServings((s) => s + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100"
                aria-label="Più porzioni"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Ingredienti: raccolti in un "foglio" */}
          <div className="mb-2 mt-6 flex items-baseline justify-between">
            <h3 className="font-display text-base font-bold uppercase tracking-wide text-ink">Ingredienti</h3>
            <span className="flex items-center gap-1 text-[11px] text-stone-400"><CheckCircle2 className="h-3.5 w-3.5 text-ink" /> ce l'hai · <Circle className="h-3.5 w-3.5 text-tomato" /> manca</span>
          </div>
          <div className="rounded-2xl border border-hair bg-stone-50/70 px-4 py-1.5">
            <ul className="divide-y divide-hair">
              {ingredients.map((ing, i) => {
                const have = hasIngredient(ing.name);
                return (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      {have
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ink" />
                        : <Circle className="h-4 w-4 shrink-0 text-tomato" />}
                      <span className={`truncate ${have ? "text-ink" : "text-tomato"}`}>{ing.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-ink">{scaleQty(ing.qty, factor)}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {missing.length > 0 && (
            addedMissing ? (
              <p className="mt-3 text-center text-xs font-semibold text-stone-500">
                {missing.length} {missing.length === 1 ? "prodotto aggiunto" : "prodotti aggiunti"} alla lista della spesa.
              </p>
            ) : (
              <button
                onClick={addMissing}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-tomato/40 bg-tomato/5 px-3 py-2.5 text-xs font-semibold text-tomato transition hover:bg-tomato/10"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Aggiungi {missing.length} {missing.length === 1 ? "mancante" : "mancanti"} alla spesa
              </button>
            )
          )}

          <h3 className="mb-4 mt-7 font-display text-base font-bold uppercase tracking-wide text-ink">Procedimento</h3>
          <ol className="space-y-5">
            {(recipe.steps || []).map((s, i) => (
              <li key={i} className="flex gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div className="flex-1 pt-0.5">
                  <p className="text-[15px] leading-relaxed text-stone-800">{s.text}</p>
                  {s.timer ? <StepTimer minutes={Number(s.timer)} id={`${recipe.title}-${i}`} /> : null}
                </div>
              </li>
            ))}
          </ol>

          <button
            onClick={openCookModal}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-tomato px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-tomato-700"
          >
            <Utensils className="h-4 w-4" /> Ho cucinato questa ricetta
          </button>
          {cookDone && <p className="mt-2 text-center text-xs font-semibold text-stone-500">{cookDone}</p>}
        </>
      )}
    </div>
  );
}
