// Pagina di prova SOLO per lo sviluppo (anteprima.html): monta le schermate
// VERE (PantryTab, ShoppingTab, RecipesTab, BottomNav, AddFab, Toast, fogli)
// con dati finti e callback locali, senza login né Supabase. Serve a misurare
// e fotografare l'aspetto (es. a 393 px) senza toccare i dati di nessuno.
// Il guscio qui sotto rispecchia il render di Dispensa.jsx: se cambi quello,
// allinea anche questo.
//
// Parametri (querystring):
//   vista = dispensa | spesa | ricette | proposte | ricetta | piano | accesso
//   menu=1  menu "+" aperto · toast=1  avviso con Annulla
import { useState, useRef } from "react";
import { DEMO_DATA, CATEGORIES, MODES } from "../constants.js";
import { guessCategory, daysUntilExpiry, findMatch } from "../lib/pantry.js";
import PantryTab from "../components/PantryTab.jsx";
import ShoppingTab from "../components/ShoppingTab.jsx";
import RecipesTab from "../components/RecipesTab.jsx";
import BottomNav from "../components/BottomNav.jsx";
import AddFab from "../components/AddFab.jsx";
import Toast from "../components/Toast.jsx";
import Auth from "../components/Auth.jsx";
import { usePageColor } from "../hooks/usePageColor.js";
import { pageColorFor, PAGE_COLOR } from "../lib/colors.js";

const q = new URLSearchParams(location.search);
const PARAM_VISTA = q.get("vista") || "dispensa";

const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Dispensa finta: i dati demo dell'onboarding, più qualche scadenza e un
// prodotto finito per vedere tutti gli stati.
const EXTRA_EXPIRY = { Zucchine: inDays(2), Feta: inDays(1), "Petto di pollo": inDays(0), Pane: inDays(-1) };
const PANTRY = DEMO_DATA.map(([name, qty, category, expiry], i) => ({
  id: `p${i}`,
  name,
  qty: name === "Yogurt greco" ? "0" : qty,
  category,
  expiry: EXTRA_EXPIRY[name] || expiry || null,
  created_at: new Date(Date.now() - i * 60000).toISOString(),
}));

const SHOPPING = [
  ["Zucchine", "1 kg"], ["Basilico", "1"], ["Latte", "2 l"], ["Mozzarella", "3"],
  ["Pane", "1", true], ["Caffè", "2", true], ["Detersivo piatti", "1"],
].map(([name, qty, checked], i) => ({ id: `s${i}`, name, qty, checked: !!checked }));

const IDEAS = [
  { title: "Pasta zucchine e menta", description: "Cremosa, con parmigiano e scorza di limone.", time: "20 min", difficulty: "Facile" },
  { title: "Insalata di cous cous", description: "Pomodorini, feta e ceci: fresca e veloce.", time: "15 min", difficulty: "Facile" },
  { title: "Pollo al limone", description: "Petto di pollo in padella con limone e rucola.", time: "25 min", difficulty: "Media" },
  { title: "Frittata di zucchine", description: "Uova, zucchine e un filo d'olio.", time: "20 min", difficulty: "Facile" },
];

const RECIPE = {
  title: "Pasta zucchine e menta",
  time: "20 min",
  servings: 2,
  ingredients: [
    { name: "Spaghetti", qty: "180 g" },
    { name: "Zucchine", qty: "2" },
    { name: "Menta", qty: "q.b." },
    { name: "Parmigiano", qty: "40 g" },
    { name: "Limone", qty: "1" },
    { name: "Pinoli", qty: "20 g" },
    { name: "Olio extravergine", qty: "q.b." },
  ],
  steps: [
    { text: "Porta a bollore una pentola d'acqua salata e cuoci gli spaghetti.", timer: 9 },
    { text: "Taglia le zucchine a rondelle e saltale in padella con un filo d'olio per 5 minuti." },
    { text: "Scola la pasta, uniscila alle zucchine con menta, parmigiano e scorza di limone." },
  ],
};

export default function Anteprima() {
  const [view, setView] = useState(PARAM_VISTA === "spesa" ? "spesa" : ["ricette", "proposte", "ricetta", "piano"].includes(PARAM_VISTA) ? "ricette" : "dispensa");
  const [items, setItems] = useState(PANTRY);
  const [shopping, setShopping] = useState(SHOPPING);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recenti");
  const [expFilter, setExpFilter] = useState(false);
  const [byAisle, setByAisle] = useState(true);
  const [addMenuOpen, setAddMenuOpen] = useState(q.get("menu") === "1");
  const [toast, setToast] = useState(q.get("toast") === "1" ? { message: <><strong>Zucchine</strong>: modifica salvata</>, onUndo: () => setToast(null), actionTone: "ink" } : null);
  const [mode, setMode] = useState(["proposte", "ricetta"].includes(PARAM_VISTA) ? MODES[0] : null);
  const [recipe, setRecipe] = useState(PARAM_VISTA === "ricetta" ? RECIPE : null);
  const [servings, setServings] = useState(2);
  const [context, setContext] = useState([]);
  const cardRefs = useRef({});
  const modeCardRefs = useRef({});

  const notify = (message) => setToast({ message });
  usePageColor(PARAM_VISTA === "accesso" ? PAGE_COLOR.accesso : pageColorFor(view, !!recipe));

  // Dispensa: stessi calcoli di usePantry (raggruppamento, conteggi scadenze).
  const s = search.trim().toLowerCase();
  const grouped = CATEGORIES
    .map((c) => ({
      cat: c,
      list: items.filter((x) => x.category === c && (!s || x.name.toLowerCase().includes(s)) &&
        (!expFilter || (daysUntilExpiry(x.expiry) ?? 99) <= 7)),
    }))
    .filter((g) => g.list.length > 0);
  const expiredCount = items.filter((x) => { const d = daysUntilExpiry(x.expiry); return d !== null && d < 0; }).length;
  const expiringSoonCount = items.filter((x) => { const d = daysUntilExpiry(x.expiry); return d !== null && d >= 0 && d <= 7; }).length;
  const isOut = (x) => { const m = String(x.qty).replace(",", ".").match(/-?\d+(\.\d+)?/); return !!m && parseFloat(m[0]) === 0; };
  const autoSave = (it, patch) => {
    setItems((l) => l.map((x) => (x.id === it.id ? { ...x, ...patch } : x)));
    setToast({ message: <><strong>{it.name}</strong>: modifica salvata</>, onUndo: () => setToast(null), actionTone: "ink" });
  };

  if (PARAM_VISTA === "accesso") return <Auth />;

  return (
    <div className="min-h-screen bg-sfondo text-ink">
      <div className="mx-auto max-w-md px-5 pt-7 pb-28">
        {view === "dispensa" && (
          <PantryTab
            search={search} setSearch={setSearch} sort={sort} setSort={setSort}
            grouped={grouped} cardRefs={cardRefs}
            onMoveCat={() => {}}
            onAutoSave={autoSave}
            onSetExpiry={(it, expiry) => autoSave(it, { expiry: expiry || null })}
            removeItem={(it) => { setItems((l) => l.filter((x) => x.id !== it.id)); setToast({ message: <><strong>{it.name}</strong> eliminato</>, onUndo: () => setToast(null) }); }}
            expiredCount={expiredCount} expiringSoonCount={expiringSoonCount} expFilter={expFilter} setExpFilter={setExpFilter}
            onCookExpiring={() => {}} isOut={isOut} onToShopping={() => notify("In lista spesa")}
            onCookWith={() => {}}
          />
        )}

        {view === "spesa" && (
          <ShoppingTab
            shopping={shopping}
            onAdd={async (name, qty) => { setShopping((l) => [{ id: `n${Date.now()}`, name, qty, checked: false }, ...l]); return {}; }}
            onToggle={(id, checked) => setShopping((l) => l.map((x) => (x.id === id ? { ...x, checked } : x)))}
            onDelete={(id) => setShopping((l) => l.filter((x) => x.id !== id))}
            onToggleAll={() => setShopping((l) => { const all = l.every((x) => x.checked); return l.map((x) => ({ ...x, checked: !all })); })}
            onMoveChecked={() => setShopping((l) => l.filter((x) => !x.checked))}
            onClearChecked={() => setShopping((l) => l.filter((x) => !x.checked))}
            movingChecked={false}
            byAisle={byAisle} setByAisle={setByAisle}
            catFor={(name) => guessCategory(name) || "Altro"}
            onAutoSave={(it, patch) => setShopping((l) => l.map((x) => (x.id === it.id ? { ...x, ...patch } : x)))}
            onOpenVoice={() => {}}
            onNotify={notify}
            historyNames={["Latte", "Pane", "Uova", "Pasta"]}
            pantryNames={items.map((i) => i.name)}
          />
        )}

        {view === "ricette" && (
          <RecipesTab
            orderedModes={MODES} mode={mode} modeCardRefs={modeCardRefs}
            dragMode={null} onModeDragStart={() => {}} onModeDragMove={() => {}} onModeDragEnd={() => {}}
            chooseMode={(m) => { setMode(m); setRecipe(null); }}
            ideas={mode ? IDEAS : []} loadingIdeas={false}
            openRecipe={() => setRecipe(RECIPE)} backToModes={() => { setMode(null); setRecipe(null); }}
            recipe={recipe} loadingRecipe={false} recipeErr=""
            servings={servings} setServings={setServings} factor={servings / 2} backToIdeas={() => setRecipe(null)}
            openCookModal={() => {}} cookDone=""
            hasIngredient={(name) => !!findMatch(name, items)} onAddMissing={async () => {}}
            onRegenerate={() => {}} onRetry={() => {}} onCustomAsk={() => {}}
            recipeContext={context} onToggleContext={(id) => setContext((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))}
            plan={{
              meals: [], weekStart: new Date(), shiftWeek: () => {}, loadingMeals: false,
              planMeal: () => {}, removeMeal: () => {}, markMealCooked: () => {}, setMealServings: () => {}, onCookMeal: () => {},
            }}
            startOnPlan={PARAM_VISTA === "piano"}
            isPro
            onNeedPro={() => {}}
            savedRecipes={[
              { id: "r1", title: "Pasta zucchine e menta", saved: true, cooked_count: 3, data: { time: "20 min" } },
              { id: "r2", title: "Pollo al limone", saved: true, cooked_count: 1, data: { time: "25 min" } },
            ]}
            onOpenSaved={() => setRecipe(RECIPE)} onDeleteSaved={() => {}}
            isSaved={false} onToggleSave={() => {}}
          />
        )}
      </div>

      {/* Velo del menù "+", come in Dispensa.jsx */}
      <button
        onClick={() => setAddMenuOpen(false)}
        aria-label="Chiudi menù"
        tabIndex={addMenuOpen ? 0 : -1}
        className={`fixed inset-0 z-30 bg-black/45 transition-opacity duration-300 ${
          addMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <BottomNav
        view={view}
        setView={(v) => { setView(v); window.scrollTo(0, 0); }}
        onProfile={() => {}}
        shoppingCount={shopping.filter((x) => !x.checked).length}
        expiredCount={expiredCount}
        addSlot={view === "dispensa" && (
          <AddFab
            menuOpen={addMenuOpen}
            setMenuOpen={setAddMenuOpen}
            onManual={() => {}} onPhoto={() => {}} onBarcode={() => {}} onVoice={() => {}}
          />
        )}
      />

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} actionTone={toast.actionTone} raised={view === "spesa" && shopping.some((x) => x.checked)} />}
    </div>
  );
}
