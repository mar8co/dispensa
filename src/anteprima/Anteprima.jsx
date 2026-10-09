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
//   foglio = profilo | impostazioni | premium | privacy | svuota | aggiungi |
//            revisione | cucinato | voce
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
import { mondayOf } from "../hooks/useMealPlan.jsx";
import ProfileSheet from "../components/ProfileSheet.jsx";
import PrivacySheet from "../components/PrivacySheet.jsx";
import ConfirmClearModal from "../components/ConfirmClearModal.jsx";
import ManualAddModal from "../components/ManualAddModal.jsx";
import ReviewScanModal from "../components/ReviewScanModal.jsx";
import CookModal from "../components/CookModal.jsx";
import VoiceAddModal from "../components/VoiceAddModal.jsx";
import PlanReadySheet from "../components/PlanReadySheet.jsx";

// "Aggiungi a mano" con lo stato che in Dispensa.jsx vive nel composition root.
function AggiungiProva({ onClose }) {
  const [name, setName] = useState("Pomod");
  const [qty, setQty] = useState("1");
  const [cat, setCat] = useState("");
  const [expiry, setExpiry] = useState("");
  return (
    <ManualAddModal
      newName={name} setNewName={setName} newQty={qty} setNewQty={setQty}
      newCat={cat} setNewCat={setCat} newExpiry={expiry} setNewExpiry={setExpiry}
      adding={false} onSubmit={async () => ({ name, category: "Verdura" })} onQuickAdd={async (n) => ({ name: n, category: "Verdura" })}
      onClose={onClose} historyNames={["Pomodori", "Pomodorini"]} pantryNames={[]}
    />
  );
}
import { usePageColor } from "../hooks/usePageColor.js";
import { pageColorFor, PAGE_COLOR } from "../lib/colors.js";

const q = new URLSearchParams(location.search);
const PARAM_VISTA = q.get("vista") || "dispensa";
const PARAM_FOGLIO = q.get("foglio") || "";
const PARAM_ESIGENZE = q.get("esigenze") || ""; // es. ?esigenze=no peperoni, vegetariano

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
  const [foglio, setFoglio] = useState(PARAM_FOGLIO);
  const [ordine, setOrdine] = useState(CATEGORIES);
  const chiudi = () => setFoglio("");
  const cardRefs = useRef({});

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
  };

  if (PARAM_VISTA === "accesso") return <Auth />;

  return (
    <div className="min-h-screen bg-sfondo text-ink">
      <div
        className="mx-auto max-w-md px-4 pt-7"
        style={{ paddingBottom: "var(--sopra-nav)" }}
      >
        {!(view === "ricette" && (mode || recipe)) && (
        <header className="mb-3.5 flex items-center gap-2.5">
          <button
            onClick={() => setFoglio("profilo")}
            aria-label="Profilo"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-blu text-[0.95rem] font-[750] tracking-[-0.02em] text-white transition active:scale-95"
          >
            M
          </button>
          <div id="testata-azioni" className="ml-auto flex gap-2" />
        </header>
        )}
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
            onFinish={(it) => { setItems((l) => l.filter((x) => x.id !== it.id)); setToast({ message: <><strong>{it.name}</strong> finito: è in lista</>, onUndo: () => setToast(null) }); }}
            onCookWith={() => {}}
          />
        )}

        {view === "spesa" && (
          <ShoppingTab
            shopping={shopping}
            onAdd={async (name, qty) => { setShopping((l) => [{ id: `n${Date.now()}`, name, qty, checked: false }, ...l]); return {}; }}
            onToggle={(id, checked) => {
              setShopping((l) => l.map((x) => (x.id === id ? { ...x, checked } : x)));
            }}
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
            orderedModes={MODES} mode={mode}
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
              meals: [{ id: "m1", date: inDays(0), slot: "cena", title: "Frittata di zucchine" }, { id: "m2", date: inDays(1), slot: "pranzo", title: "Spaghetti al limone" }], weekStart: mondayOf(new Date()), shiftWeek: () => {}, loadingMeals: false,
              planMeal: () => {}, removeMeal: () => {}, markMealCooked: () => {}, setMealServings: () => {}, onCookMeal: () => {},
              onFillWeek: () => notify("Piano pronto: 9 pasti · 12 prodotti in lista"), fillingWeek: false,
              // "Aggiungi al piano": domani a cena c'è già un piatto, dopodomani a pranzo questa ricetta.
              loadRange: async () => [
                { id: "m1", date: inDays(1), slot: "cena", title: "Pollo al limone" },
                { id: "m2", date: inDays(2), slot: "pranzo", title: "Pasta zucchine e menta" },
              ],
            }}
            startOnPlan={PARAM_VISTA === "piano"}
            foodPrefs={PARAM_ESIGENZE}
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
      {addMenuOpen && (
      <button
        onClick={() => setAddMenuOpen(false)}
        aria-label="Chiudi menù"
        className="animate-fade-in fixed inset-0 z-30 bg-black/45"
      />
      )}

      <BottomNav
        view={view}
        setView={(v) => { setAddMenuOpen(false); setView(v); window.scrollTo(0, 0); }}
        shoppingCount={shopping.filter((x) => !x.checked).length}
        expiredCount={expiredCount}
        addSlot={(
          <AddFab
            menuOpen={addMenuOpen}
            setMenuOpen={setAddMenuOpen}
            onManual={() => setFoglio("aggiungi")} onPhoto={() => {}} onBarcode={() => {}} onVoice={() => {}}
          />
        )}
      />

      {(foglio === "profilo" || foglio === "impostazioni") && (
        <ProfileSheet
          email="marco@esempio.it" itemCount={items.length} shared foodPrefs={PARAM_ESIGENZE} onSaveFoodPrefs={() => {}}
          onClose={chiudi} onClearPantry={() => setFoglio("svuota")}
          catOrder={ordine} onMoveCat={(c, d) => setOrdine((o) => { const i = o.indexOf(c), j = i + d; if (j < 0 || j >= o.length) return o; const n = [...o]; [n[i], n[j]] = [n[j], n[i]]; return n; })}
          onLogout={chiudi} onDeleteAccount={async () => {}} onOpenPrivacy={() => setFoglio("privacy")}
          households={[{ id: "h1", name: "Casa" }]} activeHouseholdId="h1" onSwitchHousehold={() => {}} onHouseholdsChanged={() => {}}
        />
      )}
      {foglio === "privacy" && <PrivacySheet onClose={chiudi} />}
      {foglio === "svuota" && <ConfirmClearModal onCancel={chiudi} onConfirm={chiudi} />}
      {foglio === "aggiungi" && <AggiungiProva onClose={chiudi} />}
      {foglio === "revisione" && (
        <ReviewScanModal
          initialItems={[{ name: "Latte", qty: "1 l", category: "Latticini" }, { name: "Pane", qty: "1", category: "Pane e Forno" }, { name: "Mozzarella", qty: "2", category: "Latticini" }]}
          onCancel={chiudi} onConfirm={chiudi} onAddMore={() => {}}
        />
      )}
      {foglio === "cucinato" && (
        <CookModal
          rows={[
            { itemId: "a", name: "Spaghetti", state: "ok" },
            { itemId: "b", name: "Zucchine", state: "low" },
            { itemId: "c", name: "Olio EVO", state: "out" },
          ]}
          onClose={chiudi} onSetState={() => {}} onApply={chiudi}
        />
      )}
      {foglio === "piano-pronto" && (
        <PlanReadySheet
          added={7} onSwap={() => {}} onOpen={() => {}} onUndoAll={chiudi} onClose={chiudi}
          picks={[
            ["cena", 0, "Cotolette di pollo al forno", ["Pangrattato"]], ["pranzo", 1, "Spaghetti al limone", []],
            ["cena", 1, "Salmone con salsa allo yogurt", ["Salmone"]], ["pranzo", 2, "Risotto alle zucchine", ["Cipolla"]],
            ["cena", 2, "Frittata di zucchine", []], ["pranzo", 3, "Insalata di ceci e feta", ["Cetrioli", "Limone"]],
          ].map(([slot, n, title, miss]) => ({ id: `${n}${slot}`, date: inDays(n), slot, recipe: { title }, missing: miss.map((name) => ({ name })) }))}
        />
      )}
      {foglio === "voce" && <VoiceAddModal processing={false} onCancel={chiudi} onResult={chiudi} />}

      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          tone={toast.actionTone}
          bottom="var(--sopra-nav)"
        />
      )}
    </div>
  );
}
