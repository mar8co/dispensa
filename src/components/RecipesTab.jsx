// Scheda Ricette: griglia di occasioni (riordinabili via drag) -> 4 proposte
// generate dall'AI -> ricetta completa con grammature metriche, selettore
// porzioni, timer per passaggio e pulsante "Ho cucinato questo".
import {
  Plus, Minus, Loader2, ArrowLeft, Clock, Gauge, Utensils, GripVertical,
} from "lucide-react";
import { scaleQty } from "../lib/pantry.js";
import StepTimer from "./StepTimer.jsx";

export default function RecipesTab({
  // occasioni
  orderedModes, mode, modeCardRefs,
  dragMode, onModeDragStart, onModeDragMove, onModeDragEnd, chooseMode,
  // proposte
  ideas, loadingIdeas, openRecipe, backToModes,
  // ricetta
  recipe, loadingRecipe, recipeErr,
  servings, setServings, factor, backToIdeas,
  openCookModal, cookDone,
}) {
  return (
    <>
      {!mode && (
        <>
          <p className="mb-3 text-sm text-stone-500">Cosa ti va di cucinare? Le ricette useranno gli ingredienti della tua dispensa.</p>
          <div className="grid grid-cols-2 gap-3">
            {orderedModes.map((m) => (
              <div
                key={m.id}
                ref={(el) => { modeCardRefs.current[m.id] = el; }}
                onClick={() => chooseMode(m)}
                className={`relative cursor-pointer rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-stone-400 hover:shadow ${dragMode === m.id ? "border-emerald-400 opacity-90 shadow-lg ring-2 ring-emerald-200" : "border-stone-200"}`}
              >
                <div className="mb-2 text-2xl">{m.icon}</div>
                <div className="pr-5 text-sm font-semibold text-stone-800">{m.id}</div>
                <div className="mt-0.5 text-xs text-stone-500">{m.desc}</div>
                <button
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
          <button onClick={backToModes} className="mb-3 flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
            <ArrowLeft className="h-4 w-4" /> Occasioni
          </button>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-2xl">{mode.icon}</span>
            <h2 className="text-lg font-semibold">{mode.id}</h2>
          </div>

          {loadingIdeas && (
            <div className="flex flex-col items-center gap-2 py-12 text-stone-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Preparo le proposte…</p>
            </div>
          )}
          {recipeErr && !loadingIdeas && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
              {recipeErr}
              <button onClick={() => chooseMode(mode)} className="mt-2 block w-full rounded-lg bg-red-600 py-2 text-white">Riprova</button>
            </div>
          )}

          <div className="space-y-3">
            {ideas.map((r, i) => (
              <button
                key={i}
                onClick={() => openRecipe(r.title)}
                className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-stone-400 hover:shadow"
              >
                <h3 className="text-base font-semibold text-stone-800">{r.title}</h3>
                <p className="mt-1 text-sm text-stone-500">{r.description}</p>
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
          <button onClick={backToIdeas} className="mb-3 flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
            <ArrowLeft className="h-4 w-4" /> Altre proposte
          </button>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">{recipe.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {recipe.time && (
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                  <Clock className="h-3.5 w-3.5" /> {recipe.time}
                </span>
              )}
              <div className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-1 py-0.5">
                <button
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                  disabled={servings <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 disabled:opacity-30"
                  aria-label="Meno porzioni"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-24 text-center text-xs font-medium text-stone-700">
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

            <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-stone-400">Ingredienti</h3>
            <ul className="divide-y divide-stone-100 rounded-xl bg-stone-50">
              {(recipe.ingredients || []).map((ing, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="text-stone-700">{ing.name}</span>
                  <span className="shrink-0 font-medium text-stone-900">{scaleQty(ing.qty, factor)}</span>
                </li>
              ))}
            </ul>

            <h3 className="mb-3 mt-5 text-sm font-semibold uppercase tracking-wide text-stone-400">Procedimento</h3>
            <ol className="space-y-4">
              {(recipe.steps || []).map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed text-stone-700">{s.text}</p>
                    {s.timer ? <StepTimer minutes={Number(s.timer)} /> : null}
                  </div>
                </li>
              ))}
            </ol>

            <button
              onClick={openCookModal}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              <Utensils className="h-4 w-4" /> Ho cucinato questo
            </button>
            {cookDone && <p className="mt-2 text-center text-xs font-medium text-emerald-700">{cookDone}</p>}
          </div>
        </>
      )}
    </>
  );
}
