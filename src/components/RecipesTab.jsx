// Scheda Ricette (veste manifesto): un solo colore pieno (PAGE_COLOR.ricette,
// oggi arancio) anche per la ricetta aperta e la modalità cucina; sul colore
// gli ingredienti stanno in una card bianca (il rosso di "manca" non si
// leggerebbe). I fogli del Piano e "Aggiorna la dispensa" sono neri.
// griglia occasioni -> 5 proposte -> ricetta completa con grammature, "cosa mi
// manca", timer e "Ho cucinato questa ricetta".
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Minus, ArrowLeft, Clock, Gauge, Utensils,
  CheckCircle2, Circle, ShoppingCart, Heart, RefreshCw, Sparkles,
  ChefHat, ChevronDown, Trash2, Check, CalendarPlus,
} from "lucide-react";
import { stripParens, formatRecipeQty, shoppingQty } from "../lib/pantry.js";
import { RECIPE_CONTEXTS } from "../constants.js";
import { AI_LIMIT_MESSAGE } from "../lib/claude.js";
import { rankCookable } from "../lib/suggest.js";
import { allowedBy } from "../lib/prefs.js";
import BASE_RECIPES from "../data/ricetteBase.js";
import Button from "./Button.jsx";
import Sheet from "./Sheet.jsx";
import CookingMode from "./CookingMode.jsx";
import PlanWeek from "./PlanWeek.jsx";
import PlanDaySheet from "./PlanDaySheet.jsx";
import { isoDate } from "../hooks/useMealPlan.jsx";

// Foto con caricamento morbido: placeholder neutro sotto, fade-in quando pronta.
function FadeImg({ src, className = "" }) {
  const [ready, setReady] = useState(false);
  return (
    <div className={`overflow-hidden bg-ink/10 ${className}`}>
      <img
        src={src}
        alt=""
        loading="lazy"
        onLoad={() => setReady(true)}
        className={`h-full w-full object-cover transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

// Scheletro di una card proposta (mentre l'AI prepara le 5 idee).
function IdeaSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-card bg-white">
      <div className="h-32 w-full bg-ink/10" />
      <div className="space-y-2.5 p-4">
        <div className="h-4 w-2/3 rounded bg-ink/10" />
        <div className="h-3 w-11/12 rounded bg-ink/10" />
        <div className="flex gap-2 pt-1">
          <div className="h-5 w-16 rounded-full bg-ink/10" />
          <div className="h-5 w-14 rounded-full bg-ink/10" />
        </div>
      </div>
    </div>
  );
}

export default function RecipesTab({
  orderedModes, mode, chooseMode,
  ideas, loadingIdeas, openRecipe, backToModes,
  recipe, loadingRecipe, recipeErr,
  servings, setServings, factor, backToIdeas,
  openCookModal, cookDone,
  hasIngredient, onAddMissing,
  onRegenerate, onRetry, onCustomAsk,
  recipeContext = [], onToggleContext,
  savedRecipes, onOpenSaved, onDeleteSaved, isSaved, onToggleSave,
  plan = null,
  startOnPlan = false,
  online = true,
  expiring = [],
  foodPrefs = "",
}) {

  const [addedMissing, setAddedMissing] = useState(false);
  const [ask, setAsk] = useState("");          // "Cosa ti va?"
  const [shelf, setShelf] = useState("salvate"); // tab del ricettario
  const [struck, setStruck] = useState({});    // ingredienti spuntati
  const [cooking, setCooking] = useState(false);  // modalità cucina
  const [cookableOpen, setCookableOpen] = useState(false); // "Puoi farle con quello che hai" aperta
  // Sotto-vista iniziale: "piano" se si arriva dal deep-link della notifica
  // delle 18:30 con cena pianificata (/?view=piano), altrimenti "idee".
  const [tab, setTab] = useState(startOnPlan && plan ? "piano" : "idee");
  const [planSheet, setPlanSheet] = useState(false); // "Aggiungi al piano" aperto
  const [plannedMsg, setPlannedMsg] = useState("");  // feedback dopo l'aggiunta
  // Giorno/slot in attesa di un'idea AI (arriva da "Genera un'idea con l'AI"
  // dentro il foglio di uno slot vuoto): appena si apre una ricetta la
  // piazziamo lì automaticamente, chiudendo il giro generazione → piano.
  const [pendingSlot, setPendingSlot] = useState(null); // { date, slot } | null
  useEffect(() => {
    setAddedMissing(false); setStruck({}); setCooking(false);
    setPlanSheet(false);
    if (recipe && pendingSlot && plan) {
      plan.planMeal(isoDate(pendingSlot.date), pendingSlot.slot, { title: recipe.title, data: recipe });
      const label = pendingSlot.date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
      setPlannedMsg(`Nel calendario: ${label} · ${pendingSlot.slot} ✓`);
      setPendingSlot(null);
    } else {
      setPlannedMsg("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.title]);

  // Ricetta aperta: in alto resta SEMPRE la riga con la freccia per tornare
  // indietro (fissa mentre si scorre). Quando il titolo grande è uscito dallo
  // schermo, accanto alla freccia compare il nome del piatto, più piccolo:
  // così a metà procedimento si sa ancora cosa si sta leggendo e si torna
  // indietro senza risalire in cima.
  const titleRef = useRef(null);
  const [titleGone, setTitleGone] = useState(false);
  useEffect(() => {
    setTitleGone(false);
    const el = titleRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    // Il margine in alto vale l'altezza della riga fissa: il titolo "esce"
    // quando finisce sotto di lei, non quando tocca il bordo dello schermo.
    const io = new IntersectionObserver(
      ([e]) => setTitleGone(!e.isIntersecting && e.boundingClientRect.top < 80),
      { rootMargin: "-60px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [recipe?.title, loadingRecipe]);

  // Dal dettaglio ricetta: mette QUESTA ricetta nel piano (giorno + slot).
  // `existingId`: il piatto già pianificato in quel pasto, da sostituire.
  function planCurrentRecipe(day, slot, existingId = null) {
    if (!plan || !recipe) return;
    plan.planMeal(isoDate(day), slot, { title: recipe.title, data: recipe }, existingId);
    const label = day.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
    setPlannedMsg(`Nel calendario: ${label} · ${slot} ✓`);
  }

  // "Genera un'idea con l'AI" da uno slot del Piano: passa alle Idee e chiede
  // subito una proposta adatta al momento (pranzo/cena). Il pick verrà
  // piazzato in automatico nell'effetto sopra, appena una ricetta si apre.
  function generateIdeaFor(date, slot) {
    setPendingSlot({ date, slot });
    setTab("idee");
    onCustomAsk(slot === "pranzo" ? "un'idea veloce per pranzo" : "un'idea per cena");
  }

  // Tornando alla griglia occasioni si esce dal "genera per questo slot": da
  // qui in poi il browsing è di nuovo libero, senza piazzamenti automatici.
  function handleBackToModes() {
    setPendingSlot(null);
    backToModes();
  }

  // Tornando manualmente al Piano (senza aver aperto una ricetta) si annulla
  // l'attesa: evita che una ricetta aperta più tardi, scollegata, finisca
  // piazzata per errore nello slot originale.
  function switchTab(id) {
    if (id === "piano") setPendingSlot(null);
    setTab(id);
  }

  const savedList = (savedRecipes || []).filter((r) => r.saved);
  const cookedList = (savedRecipes || [])
    .filter((r) => r.cooked_count > 0)
    .sort((a, b) => String(b.last_cooked_at || "").localeCompare(String(a.last_cooked_at || "")));

  // "Puoi farle adesso": ricette GIÀ note (prima le tue, poi quelle di base
  // dell'app) che si possono cucinare con la dispensa di ora, al massimo con
  // un ingrediente mancante. Calcolo locale: niente AI, funziona offline.
  const cookbook = useMemo(() => {
    const mine = (savedRecipes || []).filter((r) => r.data?.ingredients?.length).map((r) => ({ ...r.data, image: r.data.image || r.image }));
    // Fuori le ricette che non rispettano le esigenze alimentari del Profilo.
    return [...mine, ...BASE_RECIPES].filter(allowedBy(foodPrefs));
  }, [savedRecipes, foodPrefs]);
  const allRanked = rankCookable(cookbook, hasIngredient, expiring, Infinity);
  // Da mostrare: fino a 5 ricette a cui non manca NULLA; se non ce ne sono,
  // le DUE a cui mancano meno ingredienti (scelta dell'utente del 09/10: mai
  // l'elenco intero del ricettario).
  const doable = allRanked.filter((x) => x.missing.length === 0).slice(0, 5);
  const cookable = doable.length ? doable : allRanked.slice(0, 2);
  // Riga di una ricetta del ricettario (Puoi farle adesso / Tutte / Trovate).
  const recipeRow = ({ recipe: r, missing: miss, usesExpiring }) => (
    <li key={r.title}>
      <button onClick={() => onOpenSaved({ title: r.title, data: r })} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.06rem] font-bold tracking-[-0.02em] text-ink">{r.title}</span>
          <span className="block truncate text-[0.8rem] font-medium text-tenue">
            {r.time ? `${r.time} · ` : ""}
            {miss.length === 0 ? "hai tutto" : `ti manca: ${miss.join(", ")}`}
          </span>
        </span>
        {usesExpiring && <span className="cartellino bg-ink text-white">usa ciò che scade</span>}
      </button>
    </li>
  );

  const ingredients = recipe?.ingredients || [];
  const missing = ingredients.filter((ing) => !hasIngredient(ing.name));

  async function addMissing() {
    // In lista con la quantità della ricetta (per le porzioni scelte), non "1".
    await onAddMissing(missing.map((ing) => ({ name: ing.name, qty: shoppingQty(ing.qty, factor) })));
    setAddedMissing(true);
  }

  return (
    <div className="pt-2">
      {/* La pagina principale si vede solo se NON c'è una ricetta aperta: una
          ricetta del ricettario si apre con `mode` vuoto, e prima compariva in
          fondo a questa pagina, sotto tutto il resto — cioè, toccandola dalla
          sezione in alto, sembrava non aprirsi. */}
      {!mode && !recipe && (
        <>
          <h1 className="gigante">Cosa<br />cuciniamo?</h1>

          {/* Sotto-viste: Idee (occasioni + ricettario) e Piano (settimana).
              Il piano compare solo se il composition root lo passa (migration-11). */}
          {plan && (
            <div className="mt-5 grid grid-cols-2 gap-1.5">
              {[["idee", "Idee"], ["piano", "Calendario Alimentare"]].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  aria-pressed={tab === id}
                  className="pillola min-h-[40px] text-[0.9rem]"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {tab === "piano" && plan && (
            <PlanWeek
              {...plan}
              savedRecipes={savedRecipes}
              hasIngredient={hasIngredient}
              onAddMissing={onAddMissing}
              onGoIdeas={generateIdeaFor}
            />
          )}

          {tab === "idee" && (
          <>
          {/* Occhiello rosso + ricerca ingredienti: bloccati insieme in alto
              mentre si scorrono occasioni e ricettario. */}
          <div className="sticky top-0 z-20 -mx-4 mt-4 bg-sfondo px-4 pb-2 pt-2">
            <div className="micro">Ricette</div>
            {/* "Cosa ti va?": un ingrediente, una voglia, "qualcosa di estivo"…
                l'AI incrocia la richiesta con la dispensa. */}
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                if (!ask.trim()) return;
                if (online) { onCustomAsk(ask); setAsk(""); }
              }}
            >
              <Sparkles className="pointer-events-none absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
              <input
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                placeholder="Cosa ti va? es. qualcosa coi funghi"
                className={`campo testo-grande pl-8 text-[1.06rem] text-ink ${ask.trim() ? "pr-20" : "pr-2"}`}
              />
              {ask.trim() && (
                <button type="submit" disabled={!online} className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-[0.84rem] font-bold text-white disabled:opacity-40">
                  Vai
                </button>
              )}
            </form>
          </div>

          {/* Senza rete: le idee nuove le prepara l'AI, lo si dice PRIMA del
              tocco (le occasioni si attenuano). */}
          {!online && (
            <p className="mt-3 text-[0.9rem] font-bold leading-snug text-ink">
              Sei offline: le idee nuove tornano con la rete. Il tuo ricettario funziona lo stesso.
            </p>
          )}

          {/* Pill di contesto/umore: l'AI le considera (oltre alla stagione)
              quando poi scegli un'occasione. Multi-select, opzionali. */}
          {/* Una riga sola che scorre di lato (prima andavano a capo): con le
              pillole dell'ingrediente principale sono nove. */}
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
            {RECIPE_CONTEXTS.map((c) => {
              const on = recipeContext.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => onToggleContext(c.id)}
                  aria-pressed={on}
                  // Fondo bianco da spenta; da accesa resta nera (.pillola).
                  className={`pillola min-h-[36px] px-3 text-[0.84rem] ${on ? "" : "bg-white"}`}
                >
                  <span>{c.icon}</span> {c.label}
                </button>
              );
            })}
          </div>
          {/* Feedback: le pill agiscono sulle proposte FUTURE — senza questa
              riga il toggle sembrava non fare nulla. */}
          {recipeContext.length > 0 && (
            <p className="animate-fade-in mt-2 text-[0.86rem] font-semibold text-tenue">
              Ne tengo conto nella ricetta
            </p>
          )}

              {/* Per tutti (dal 09/10 non c'è più distinzione free/premium):
                  dal ricettario, senza AI, al massimo 5 ricette che si possono
                  fare con la dispensa di ora. Se non ce n'è nessuna se ne
                  mostrano DUE, quelle a cui manca meno. Ogni riga apre la
                  ricetta completa, col procedimento, come le altre. */}
              {cookable.length > 0 && (
                <section className="mt-6">
                  {/* A scomparsa, CHIUSA di serie (09/10): l'intestazione è il
                      bottone, col numero di ricette e la freccina. */}
                  <button
                    onClick={() => setCookableOpen((v) => !v)}
                    aria-expanded={cookableOpen}
                    className="flex w-full items-center gap-2 border-b-[1.5px] border-ink pb-[7px] text-left"
                  >
                    <h2 className="min-w-0 text-[1.3rem] font-extrabold leading-[1.05] tracking-[-0.04em] text-ink">{doable.length ? "Puoi farle con quello che hai" : "Ti manca poco"}</h2>
                    <span className="num ml-auto text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-tenue">{String(cookable.length).padStart(2, "0")}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-ink transition-transform duration-200 ${cookableOpen ? "rotate-180" : ""}`} />
                  </button>
                  {cookableOpen && (
                    <div className="animate-fade-in">
                      {!doable.length && <p className="micro mt-2">Le più vicine a quello che hai in dispensa.</p>}
                      <ul className="divide-y divide-riga">{cookable.map(recipeRow)}</ul>
                    </div>
                  )}
                </section>
              )}

          {/* Idee su misura: le prepara l'AI partendo dall'occasione scelta. */}
          <div className="mt-7 border-b-[1.5px] border-ink pb-[7px]">
            <h2 className="text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-ink">Idee su misura</h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {orderedModes.map((m) => (
              <div
                key={m.id}
                onClick={() => online && chooseMode(m)}
                aria-disabled={!online}
                className={`relative cursor-pointer rounded-card bg-white p-4 text-left transition active:scale-[0.98] ${!online ? "opacity-50" : ""}`}
              >
                <div className="mb-2 text-2xl">{m.icon}</div>
                <div className="text-[1.05rem] font-extrabold leading-tight tracking-[-0.03em] text-ink">{m.id}</div>
                <div className="mt-1 text-[0.8rem] font-medium leading-snug text-tenue">{m.desc}</div>
              </div>
            ))}
          </div>

          {/* Il tuo ricettario: salvate ❤️ e cucinate di recente */}
          {(savedList.length > 0 || cookedList.length > 0) && (
            <section className="mt-9">
              <div className="flex items-center gap-2 border-b-[1.5px] border-ink pb-[7px]">
                <h2 className="text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-ink">Il tuo ricettario</h2>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShelf("salvate")}
                  aria-pressed={shelf === "salvate"}
                  className="pillola min-h-[36px] px-3 text-[0.84rem]"
                >
                  <Heart className="h-3.5 w-3.5" /> Salvate {savedList.length > 0 && `(${savedList.length})`}
                </button>
                <button
                  onClick={() => setShelf("recenti")}
                  aria-pressed={shelf === "recenti"}
                  className="pillola min-h-[36px] px-3 text-[0.84rem]"
                >
                  <Utensils className="h-3.5 w-3.5" /> Cucinate {cookedList.length > 0 && `(${cookedList.length})`}
                </button>
              </div>
              <ul className="mt-2 divide-y divide-riga">
                {(shelf === "salvate" ? savedList : cookedList).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5">
                    {r.image ? (
                      <img src={r.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-[14px] object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white text-xl">🍽️</div>
                    )}
                    <button onClick={() => onOpenSaved(r)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[1.06rem] font-bold tracking-[-0.02em] text-ink">{r.title}</p>
                      <p className="text-[0.8rem] font-medium text-tenue">
                        {r.data?.time || ""}
                        {r.cooked_count > 0 && `${r.data?.time ? " · " : ""}cucinata ${r.cooked_count}×`}
                      </p>
                    </button>
                    {shelf === "recenti" && r.saved && <Heart className="h-4 w-4 shrink-0 fill-ink text-ink" />}
                    <button
                      onClick={() => onDeleteSaved(r)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/40 transition active:text-ink"
                      aria-label="Elimina dal ricettario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {shelf === "salvate" && savedList.length === 0 && (
                <p className="py-5 text-center text-[0.9rem] font-semibold text-tenue">
                  Nessuna ricetta salvata: apri una ricetta e tocca il cuore ♡
                </p>
              )}
              {shelf === "recenti" && cookedList.length === 0 && (
                <p className="py-5 text-center text-[0.9rem] font-semibold text-tenue">
                  Qui troverai le ricette che hai cucinato.
                </p>
              )}
            </section>
          )}
          </>
          )}
        </>
      )}

      {mode && !recipe && !loadingRecipe && (
        <>
          {/* Header sticky: indietro + nome categoria, sempre visibile durante
              lo scroll delle proposte. */}
          <div className="sticky top-0 z-20 -mx-4 mb-3 flex items-center gap-2.5 border-b-[1.5px] border-ink bg-sfondo px-4 py-2.5">
            <button onClick={handleBackToModes} aria-label="Torna alle occasioni" className="tondo">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <span className="shrink-0 text-[1.6rem] leading-none">{mode.icon}</span>
            <h1 className="min-w-0 truncate text-[1.9rem] font-extrabold leading-none tracking-[-0.055em] text-ink [word-spacing:0.08em]">{mode.id}</h1>
          </div>

          {loadingIdeas && (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => <IdeaSkeleton key={i} />)}
            </div>
          )}
          {recipeErr && !loadingIdeas && (
            <div className="rounded-card bg-white p-4 text-center text-[0.95rem] font-semibold text-errore">
              {recipeErr}
              {/* Riprova ripete l'AZIONE fallita (ricetta o proposte), non
                  rigenera a caso le idee dell'occasione. */}
              {/* Tetto giornaliero: riprovare non può funzionare, niente bottone. */}
              {recipeErr !== AI_LIMIT_MESSAGE && <button onClick={onRetry} className="bottone mt-3 w-full">Riprova</button>}
            </div>
          )}

          <div className="space-y-3">
            {ideas.map((r, i) => (
              <button
                key={i}
                onClick={() => openRecipe(r.title)}
                className="block w-full overflow-hidden rounded-card bg-white text-left shadow-card transition active:scale-[0.99]"
              >
                {r.image ? (
                  <FadeImg src={r.image} className="h-32 w-full" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-ink/[0.06] text-4xl">
                    {mode?.icon || "🍽️"}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-[1.35rem] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink [word-spacing:0.08em]">{r.title}</h3>
                  <p className="mt-1.5 text-[0.92rem] font-medium leading-snug text-tenue">{r.description}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {r.time && (
                      <span className="cartellino inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {r.time}
                      </span>
                    )}
                    {r.difficulty && (
                      <span className="cartellino inline-flex items-center gap-1">
                        <Gauge className="h-3 w-3" /> {r.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {ideas.length > 0 && !loadingIdeas && (
            <Button variant="cook" full className="mt-4 mb-8" onClick={onRegenerate} disabled={!online}>
              <RefreshCw className="h-4 w-4" /> Altre idee
            </Button>
          )}
        </>
      )}

      {mode && loadingRecipe && (
        <div className="animate-pulse pt-1">
          <div className="h-44 w-full rounded-card bg-ink/[0.07]" />
          <div className="mt-5 h-9 w-3/4 rounded bg-ink/[0.07]" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-20 rounded-full bg-ink/[0.07]" />
            <div className="h-6 w-36 rounded-full bg-ink/[0.07]" />
          </div>
          <div className="mt-7 h-5 w-32 rounded bg-ink/[0.07]" />
          <div className="mt-3 space-y-3 border-t-[1.5px] border-ink/15 pt-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 w-full rounded bg-ink/[0.07]" />
            ))}
          </div>
          <div className="mt-7 h-5 w-40 rounded bg-ink/[0.07]" />
          <div className="mt-4 space-y-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3.5">
                <div className="h-8 w-8 shrink-0 rounded-full bg-ink/[0.07]" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-full rounded bg-ink/[0.07]" />
                  <div className="h-3.5 w-2/3 rounded bg-ink/[0.07]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recipe && !loadingRecipe && (
        <>
          {/* Riga fissa in alto, come nell'elenco delle proposte: tondo con la
              freccia e, accanto, "Altre proposte" finché il titolo grande è a
              schermo; poi il nome del piatto (su una riga, troncato) e il
              filo sotto, che la stacca da ciò che le scorre dietro. */}
          <div className={`sticky top-0 z-20 -mx-4 mb-3 flex items-center gap-2.5 border-b-[1.5px] bg-sfondo px-4 py-2.5 ${titleGone ? "border-ink" : "border-transparent"}`}>
            <button onClick={backToIdeas} aria-label={mode ? "Torna alle proposte" : "Indietro"} className="tondo">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            {titleGone ? (
              <p className="animate-fade-in min-w-0 truncate text-[1.25rem] font-extrabold leading-tight tracking-[-0.045em] text-ink [word-spacing:0.08em]">{recipe.title}</p>
            ) : (
              <button onClick={backToIdeas} className="link min-h-[36px] text-[0.95rem] text-ink">{mode ? "Altre proposte" : "Indietro"}</button>
            )}
          </div>

          {/* Cover con cuore per salvare */}
          <div className="relative">
            {recipe.image ? (
              <FadeImg src={recipe.image} className="h-44 w-full rounded-card" />
            ) : (
              <div className="flex h-36 items-center justify-center overflow-hidden rounded-card bg-white text-6xl">
                {mode?.icon || "🍽️"}
              </div>
            )}
            <button
              onClick={onToggleSave}
              aria-label={isSaved ? "Rimuovi dalle salvate" : "Salva nel ricettario"}
              className="tondo absolute right-3 top-3 h-11 w-11 bg-white shadow-card"
            >
              <Heart className={`h-5 w-5 transition ${isSaved ? "fill-rosso-azione text-rosso-azione" : "text-ink"}`} />
            </button>
          </div>

          <h1 ref={titleRef} className="titolo mt-5">{recipe.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {recipe.time && (
              <span className="pillola min-h-[36px] cursor-default bg-white px-3 text-[0.84rem]">
                <Clock className="h-3.5 w-3.5" /> {recipe.time}
              </span>
            )}
            <div className="inline-flex items-center gap-1">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                disabled={servings <= 1}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition active:scale-90 disabled:opacity-30"
                aria-label="Meno porzioni"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="num w-24 text-center text-[0.95rem] font-extrabold tracking-[-0.02em] text-ink">
                {servings} {servings === 1 ? "porzione" : "porzioni"}
              </span>
              <button
                onClick={() => setServings(servings + 1)}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition active:scale-90"
                aria-label="Più porzioni"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Ingredienti: raccolti in un "foglio" */}
          <div className="mt-7 flex items-baseline justify-between gap-2 border-b-[1.5px] border-ink pb-[7px]">
            <h3 className="text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-ink">Ingredienti</h3>
            <span className="flex items-center gap-1 text-[0.72rem] font-medium text-ink"><CheckCircle2 className="h-3.5 w-3.5 text-ink" /> ce l'hai · <Circle className="h-3.5 w-3.5 text-ink" /> manca · tocca e depenni</span>
          </div>
          {/* Card bianca: sul colore pieno il rosso di "manca" non si leggerebbe. */}
          <div className="mt-3 rounded-card bg-white px-3.5">
            <ul className="divide-y divide-riga">
              {ingredients.map((ing, i) => {
                const have = hasIngredient(ing.name);
                const off = !!struck[i];
                return (
                  <li
                    key={i}
                    onClick={() => setStruck((p) => ({ ...p, [i]: !p[i] }))}
                    className={`flex min-h-[46px] cursor-pointer items-center justify-between gap-3 py-2 text-[1rem] transition ${off ? "opacity-40" : ""}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {have
                        ? <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-ink" />
                        : <Circle className="h-[18px] w-[18px] shrink-0 text-rosso-azione" />}
                      <span className={`truncate font-semibold tracking-[-0.01em] ${have ? "text-ink" : "text-rosso-azione"} ${off ? "line-through" : ""}`}>{stripParens(ing.name)}</span>
                    </span>
                    <span className="num shrink-0 font-bold text-ink">
                      {formatRecipeQty(ing.name, ing.qty, factor)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {missing.length > 0 && (
            addedMissing ? (
              <p className="mt-3 text-center text-[0.86rem] font-semibold text-ink">
                {missing.length} {missing.length === 1 ? "prodotto aggiunto" : "prodotti aggiunti"} alla lista della spesa.
              </p>
            ) : (
              <Button variant="cook" size="sm" full className="mt-3" onClick={addMissing}>
                <ShoppingCart className="h-3.5 w-3.5" />
                Aggiungi {missing.length} {missing.length === 1 ? "mancante" : "mancanti"} alla spesa
              </Button>
            )
          )}

          {/* Nel piano settimanale: è anche la via "genera un'idea → piano". */}
          {plan && (
            plannedMsg ? (
              <p className="mt-3 text-center text-[0.86rem] font-semibold text-ink">{plannedMsg}</p>
            ) : (
              <Button variant="secondary" size="sm" full className="mt-3" onClick={() => setPlanSheet(true)}>
                <CalendarPlus className="h-3.5 w-3.5" /> Aggiungi al calendario
              </Button>
            )
          )}

          {/* Modalità cucina: il modo consigliato di seguire la ricetta (schermo
              intero, un passaggio alla volta, timer e schermo sempre acceso).
              Bottone grande e giallo: è l'unico posto dove restano i timer e
              la spunta dei passaggi, tolti da questa pagina il 09/10. */}
          <Button variant="primary" size="lg" full className="mt-7 bg-giallo text-ink shadow-[inset_0_0_0_1.5px_#0a0a0a]" onClick={() => setCooking(true)}>
            <ChefHat className="h-5 w-5" /> Modalità cucina
          </Button>
          <p className="mt-2 text-center text-[0.8rem] font-medium text-tenue">Un passaggio alla volta, con i timer</p>

          <h3 className="mb-4 mt-8 border-b-[1.5px] border-ink pb-[7px] text-[1.3rem] font-extrabold leading-none tracking-[-0.04em] text-ink">Procedimento</h3>
          <ol className="space-y-5">
            {(recipe.steps || []).map((s, i) => (
              <li key={i} className="flex gap-3.5">
                <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[0.95rem] font-extrabold text-white">{i + 1}</span>
                <p className="flex-1 pt-0.5 text-[1.02rem] font-medium leading-relaxed text-ink">{s.text}</p>
              </li>
            ))}
          </ol>

          <Button variant="primary" size="lg" full className="mt-7" onClick={openCookModal}>
            <Utensils className="h-4 w-4" /> Ho cucinato questa ricetta
          </Button>
          {cookDone && <p className="mt-2 text-center text-[0.86rem] font-semibold text-ink">{cookDone}</p>}

          {cooking && (
            <CookingMode
              recipe={recipe}
              onClose={() => setCooking(false)}
              onFinish={openCookModal}
            />
          )}

          {planSheet && (
            <PlanDaySheet
              recipeTitle={recipe.title}
              loadRange={plan?.loadRange}
              onChoose={planCurrentRecipe}
              onClose={() => setPlanSheet(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
