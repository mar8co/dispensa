import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { flushSync } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  CATEGORIES, MODES, RECEIPT_PROMPT, NAME_RULES, CATEGORY_PROMPT,
  ITEMS_SCHEMA,
} from "./constants.js";
import {
  guessCategory, categorize,
  normalizeWeight, mergeQty, findMatch, LOW_QTY,
  matchKey,
} from "./lib/pantry.js";
import { callClaude, aiErrorMessage } from "./lib/claude.js";
import { cleanBarcodeName, parseSpokenList } from "./lib/parse.js";
import { allowedBy } from "./lib/prefs.js";
import { apiUrl } from "./lib/api.js";
import { supabase } from "./lib/supabase.js";
import {
  fetchPantry, updateItem,
  deleteItems,
  fetchSettings, saveSettings, fetchIsPro,
  fetchShopping, deleteShoppingItems,
  fetchSavedRecipes,
  ensurePersonalHousehold, setActiveHousehold, fetchHouseholds, fetchMembers,
  getMyUsername,
} from "./lib/db.js";
import { stopAlarm } from "./lib/timers.js";
import { storeKitAvailable, purchaseProduct, syncReceipt, onTransactionUpdate } from "./lib/storekit.js";

import { loadCache, saveCache } from "./lib/cache.js";
import { sortedNames } from "./lib/history.js";
import { enqueue, flush } from "./lib/outbox.js";
import { applyOp } from "./lib/sync.js";

import PantryTab from "./components/PantryTab.jsx";
// Schede non di default in lazy: alleggeriscono il bundle iniziale (caricano
// alla prima apertura della scheda). PantryTab resta eager (è la home).
const RecipesTab = lazy(() => import("./components/RecipesTab.jsx"));
const ShoppingTab = lazy(() => import("./components/ShoppingTab.jsx"));
import BottomNav from "./components/BottomNav.jsx";
import AddFab from "./components/AddFab.jsx";
import ManualAddModal from "./components/ManualAddModal.jsx";
import CookModal from "./components/CookModal.jsx";
import ConfirmClearModal from "./components/ConfirmClearModal.jsx";
import ReviewScanModal from "./components/ReviewScanModal.jsx";
import VoiceAddModal from "./components/VoiceAddModal.jsx";
import ProfileSheet from "./components/ProfileSheet.jsx";
import PaywallSheet from "./components/PaywallSheet.jsx";
import PrivacySheet from "./components/PrivacySheet.jsx";
import PlanReadySheet from "./components/PlanReadySheet.jsx";
import TimerBar from "./components/TimerBar.jsx";
import Toast from "./components/Toast.jsx";
import { useOnline } from "./hooks/useOnline.js";
import { useTimersTicker } from "./hooks/useTimersTicker.js";
import { useRecipes } from "./hooks/useRecipes.jsx";
import { useShopping } from "./hooks/useShopping.jsx";
import { usePantry } from "./hooks/usePantry.jsx";
import { useMealPlan, isoDate, addDays } from "./hooks/useMealPlan.jsx";
import { usePageColor } from "./hooks/usePageColor.js";
import { pageColorFor } from "./lib/colors.js";
import Barattoli from "./components/Barattoli.jsx";

// Caricata on-demand: la libreria di scansione (ZXing) è pesante e serve
// solo quando si apre la scansione del codice a barre.
const BarcodeScanModal = lazy(() => import("./components/BarcodeScanModal.jsx"));
// Anche la fotocamera integrata per lo scontrino è on-demand (usa getUserMedia).
const ReceiptScanModal = lazy(() => import("./components/ReceiptScanModal.jsx"));

// Applica un cambio di vista dentro una View Transition del browser
// (dissolvenza nativa tra schermate); dove l'API manca, applica e basta.
// IMPORTANTE: UNA sola transizione per volta. Avviarne una seconda mentre la
// prima è ancora in corso (es. toccando le schede in fretta durante il
// tutorial) su iOS Safari può lasciare lo snapshot della transizione
// "congelato" sopra la pagina, che intercetta i tocchi e blocca tutto. Se una
// transizione è già in corso, applichiamo subito lo stato senza animare.
// Due protezioni in più contro lo snapshot congelato (bug noti di Safari):
//  - niente animazione se la pagina non è visibile (transizione avviata
//    andando in background = snapshot che può non completarsi mai);
//  - watchdog: se la transizione non termina entro un tempo massimo,
//    skipTransition() rimuove d'ufficio l'overlay che intercetta i tocchi.
let viewTransitionPending = false;
function animateUI(fn) {
  if (!document.startViewTransition || viewTransitionPending || document.visibilityState !== "visible") {
    fn();
    return;
  }
  viewTransitionPending = true;
  let t;
  try {
    t = document.startViewTransition(() => flushSync(fn));
  } catch {
    viewTransitionPending = false;
    fn();
    return;
  }
  const watchdog = setTimeout(() => { try { t.skipTransition(); } catch { /* già finita */ } }, 1500);
  t.finished.catch(() => {}).finally(() => {
    clearTimeout(watchdog);
    viewTransitionPending = false;
  });
}

// Deep-link dalle notifiche push: /?view=ricette apre le Ricette,
// /?view=piano apre le Ricette direttamente sulla sotto-vista Piano
// Alimentare. Letto una volta all'avvio; poi ripuliamo la query così un
// refresh riparte dalla Dispensa.
function initialView() {
  try {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "piano") return "ricette";
    return ["dispensa", "spesa", "ricette"].includes(v) ? v : "dispensa";
  } catch { return "dispensa"; }
}
function initialPlanFirst() {
  try { return new URLSearchParams(window.location.search).get("view") === "piano"; }
  catch { return false; }
}

export default function Dispensa({ session }) {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState(initialView);
  const [planFirst] = useState(initialPlanFirst); // notifica 18:30 → sotto-vista Piano
  const [catOrder, setCatOrder] = useState(CATEGORIES);
  const cardRefs = useRef({});

  const [modeOrder, setModeOrder] = useState(MODES.map((m) => m.id));


  // lista della spesa: impostazioni persistite (la collezione e la logica
  // vivono in useShopping)
  const [byAisle, setByAisle] = useState(true); // vista "per reparto" (persistita)
  const [shopCats, setShopCats] = useState({}); // reparti corretti a mano (per nome, persistiti)

  // nucleo familiare (household): elenco + nucleo attivo + se condiviso (>1 membro)
  const [households, setHouseholds] = useState([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState(null);
  const [sharedHousehold, setSharedHousehold] = useState(false);

  // toast / undo
  const [toast, setToast] = useState(null); // { message, onUndo? }
  const toastTimer = useRef(null);

  // stato connessione (per indicatore offline)
  const online = useOnline();

  // Anti-"pulsante morto" sui fogli (Vaul chiude un foglio in ~500ms di
  // animazione PRIMA di avvisare l'app che è chiuso davvero — vedi
  // Sheet.jsx). Se l'utente ritocca lo stesso pulsante d'apertura durante
  // quella finestra, lo stato booleano (es. `manualOpen`) è ancora `true`:
  // React vede lo stesso valore e non riapre nulla, lasciando il foglio
  // agganciato alla vecchia animazione di chiusura. Un contatore per foglio,
  // usato come `key`, forza React a montare un'istanza FRESCA ogni volta che
  // il foglio viene aperto, indipendentemente da quale stato avesse prima.
  const modalEpoch = useRef({});
  const modalSeq = useRef(0);
  // Sequenza GLOBALE (non per-nome): due modali diversi non hanno mai la
  // stessa key. Con contatori separati, Profilo (epoch 1) e Impostazioni
  // (epoch 1) montati vicini collidevano come key React tra fratelli, e React
  // può ometterne uno ("Encountered two children with the same key").
  function bumpModal(name) { modalEpoch.current[name] = ++modalSeq.current; }

  // scontrino
  const [processing, setProcessing] = useState(false);
  const processAbortRef = useRef(null); // "Annulla" sull'overlay di analisi AI
  const [receiptOpen, setReceiptOpen] = useState(false); // fotocamera integrata scontrino
  const [scanOpen, setScanOpen] = useState(false);
  const [scanItems, setScanItems] = useState([]);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceReview, setVoiceReview] = useState(false); // il riepilogo aperto viene dalla voce → mostra "Aggiungi altri prodotti"
  const voiceAppendRef = useRef(false); // il prossimo risultato voce si ACCODA al riepilogo invece di sostituirlo
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // porzioni e preferenze alimentari (persistite nelle impostazioni, usate
  // anche dall'hook ricette per i prompt e il default porzioni)
  const [prefServings, setPrefServings] = useState(null); // "a casa siamo in X" (persistito)
  const [foodPrefs, setFoodPrefs] = useState("");          // preferenze alimentari (persistite)

  // "Ho cucinato questo"
  const [cookOpen, setCookOpen] = useState(false);
  const [cookRows, setCookRows] = useState([]);
  const [cookDone, setCookDone] = useState("");

  // foglio profilo (nome, famiglia, esigenze, svuota, logout)
  const [profileOpen, setProfileOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false); // informativa privacy
  // Premium: `isPro` decide solo COSA MOSTRARE (i controlli veri sono nelle
  // policy del DB e nel proxy AI). Parte da true per non far lampeggiare il
  // paywall a un abbonato mentre la verifica è in corso.
  const [isPro, setIsPro] = useState(true);
  const [paywall, setPaywall] = useState(null); // { reason } | null
  // Passaggio Profilo→Privacy/Premium SERIALIZZATO: il foglio successivo
  // si apre solo QUANDO il precedente ha finito l'animazione di chiusura
  // (onClose). Due drawer Vaul sovrapposti lasciavano residui Radix
  // (pointer-events sul body) che mangiavano il primo tap dopo la chiusura.
  const pendingSheetRef = useRef(null); // "privacy" | "paywall" | null
  function openPendingSheet() {
    const next = pendingSheetRef.current;
    pendingSheetRef.current = null;
    if (next === "privacy") { bumpModal("privacy"); setPrivacyOpen(true); }
    else if (next === "paywall") { bumpModal("paywall"); setPaywall({ reason: null }); }
  }

  // Lista della spesa: stato (articoli, storico, voce) e logica (aggiunta con
  // merge, modifica, spunta, per reparto). I reparti corretti a mano (shopCats)
  // restano impostazioni qui in Dispensa e sono passati all'hook.
  // showToast/dismissToast sono dichiarazioni di funzione (hoisted), quindi
  // disponibili anche se definite più sotto.
  const {
    shopping, setShopping, movingChecked,
    shopHist, shopVoiceOpen, setShopVoiceOpen, shopVoiceProcessing,
    bumpShopHistory, catForShopping, addToShoppingMerged, addShoppingItem,
    autoSaveShopping, handleShoppingVoice, toggleShoppingItem, removeShoppingItem,
    toggleAllShopping, adjustShoppingQty, clearCheckedShopping,
    addMissingToShopping, finishedToShopping,
  } = useShopping({ session, showToast, dismissToast, shopCats, setShopCats });

  // Dispensa: stato (prodotti, form, ricerca/ordine/filtro) e logica (CRUD con
  // merge, raggruppamento per categoria, scadenze). catOrder resta impostazione
  // in Dispensa; bumpShopHistory/addToShoppingMerged arrivano da useShopping.
  const {
    items, setItems,
    newName, setNewName, newQty, setNewQty,
    newCat, setNewCat, newExpiry, setNewExpiry, adding,
    search, setSearch, sort, setSort, expFilter, setExpFilter,
    confirmClear, setConfirmClear,
    grouped, expiringItems, expiredCount, expiringSoonCount, isOut, hasIngredient,
    mergeItems, addManual, submitManual, removeItem, clearPantry,
    autoSaveItem, setItemExpiry, finishItem,
  } = usePantry({
    session, showToast, dismissToast, catOrder,
    bumpShopHistory, addToShoppingMerged,
  });

  // Piano pasti settimanale (fase 2): settimana visibile, voci e operazioni.
  // Carica dopo la risoluzione del nucleo (ready = loaded); il ponte col
  // CookModal ("Ho cucinato" dal piano) è più sotto: cookMealFromPlan.
  const {
    weekStart, shiftWeek, meals, setMeals, loadingMeals,
    planMeal, removeMeal, markMealCooked, setMealServings,
  } = useMealPlan({ ready: loaded, householdId: activeHouseholdId });

  // Applica le impostazioni (da cache o da DB) a catOrder/modeOrder.
  function applySettings(s) {
    if (!s || typeof s !== "object") return;
    if (typeof s.byAisle === "boolean") setByAisle(s.byAisle);
    if (s.shopCats && typeof s.shopCats === "object") setShopCats(s.shopCats);
    if (Number(s.prefServings) >= 1) setPrefServings(Number(s.prefServings));
    if (typeof s.foodPrefs === "string") setFoodPrefs(s.foodPrefs);
    if (Array.isArray(s.catOrder)) {
      setCatOrder([
        ...s.catOrder.filter((c) => CATEGORIES.includes(c)),
        ...CATEGORIES.filter((c) => !s.catOrder.includes(c)),
      ]);
    }
    if (Array.isArray(s.modeOrder)) {
      const ids = MODES.map((m) => m.id);
      setModeOrder([
        ...s.modeOrder.filter((id) => ids.includes(id)),
        ...ids.filter((id) => !s.modeOrder.includes(id)),
      ]);
    }
  }

  // --- Caricamento iniziale: prima la cache (istantaneo, anche offline),
  //     poi aggiorna dalla rete; se la rete manca si tiene la cache. ---
  useEffect(() => {
    const uid = session.user.id;
    let onOnline = null; // replay outbox al ritorno online (registrato sotto)
    const cached = loadCache(uid);
    const cachedTs = cached?.ts || 0;
    if (cached) {
      if (Array.isArray(cached.items)) setItems(cached.items);
      if (Array.isArray(cached.shopping)) setShopping(cached.shopping);
      applySettings(cached.settings);
      setLoaded(true); // mostra subito i dati in cache
    }
    (async () => {
      try {
        // Risolvi il nucleo (household) dell'utente e rendilo attivo PRIMA di
        // qualsiasi insert, così i dati vi finiscono
        // dentro. Best-effort: se fallisce, gli insert restano senza
        // household_id e l'app continua a funzionare (RLS ancora per-utente).
        try {
          const hs = await ensurePersonalHousehold();
          setHouseholds(hs);
          // Nucleo attivo: l'ultimo scelto su questo dispositivo, se ancora
          // valido; altrimenti il primo (personale).
          let activeId = null;
          try { activeId = localStorage.getItem(`dispensa-active-household-${uid}`); } catch { /* */ }
          if (!activeId || !hs.some((h) => h.id === activeId)) activeId = hs[0]?.id || null;
          setActiveHousehold(activeId);
          setActiveHouseholdId(activeId);
          if (activeId) {
            try { const m = await fetchMembers(activeId); setSharedHousehold((m?.length || 0) > 1); } catch { /* */ }
          }
        } catch (e) {
          console.warn("Household non disponibile (resto su per-utente).", e?.message || e);
        }
        // Replay dell'outbox (scritture rimaste in coda offline): DOPO la
        // risoluzione del nucleo, così gli insert rigiocati ricevono
        // l'household_id giusto da db.js. Poi anche a ogni ritorno online.
        onOnline = () => { flush(uid, applyOp); };
        window.addEventListener("online", onOnline);
        flush(uid, applyOp);
        let rows = await fetchPantry();
        // Primo accesso: la dispensa parte VUOTA (dal 09/10 niente più
        // prodotti di esempio né tutorial: lo spiega la schermata vuota).
        // Migrazione categorie: i prodotti con etichette vecchie (es.
        // "Fresco e Verdure") vengono ri-categorizzati con le nuove regole
        // e salvati sul DB in background. Una tantum.
        const stale = rows.filter((x) => !CATEGORIES.includes(x.category));
        if (stale.length) {
          const recat = (x) => guessCategory(x.name) || "Altro";
          rows = rows.map((x) => (CATEGORIES.includes(x.category) ? x : { ...x, category: recat(x) }));
          Promise.all(stale.map((x) => updateItem(x.id, { category: recat(x) })))
            .catch((e) => console.warn("Migrazione categorie parziale:", e));
        }
        setItems(rows);
        try {
          // Applica le impostazioni dal DB solo se più recenti della cache
          // locale: se l'app è stata chiusa prima che un salvataggio
          // arrivasse al DB (es. toggle "Per reparto" e via), la scelta
          // locale non viene sovrascritta da quella vecchia.
          const remote = await fetchSettings();
          if (remote) {
            const remoteTs = Date.parse(remote.updatedAt || "") || 0;
            if (!cachedTs || remoteTs >= cachedTs) applySettings(remote.settings);
          }
        } catch (e) { console.error(e); }
        fetchIsPro().then(setIsPro).catch(() => {});
        try { setShopping(await fetchShopping()); } catch (e) { console.error(e); }
        // Ricettario local-first: adottiamo le righe dal DB SOLO se ce ne sono.
        // Se il DB è vuoto o non ancora sincronizzato NON sovrascriviamo la
        // copia locale (altrimenti preferiti/cucinate sparirebbero alla
        // riapertura quando il sync sul DB non è andato a buon fine).
        try {
          const rows = await fetchSavedRecipes();
          if (Array.isArray(rows) && rows.length) commitRecipes(rows);
        } catch (e) { console.warn("Ricettario dal DB non disponibile, uso la copia locale.", e?.message || e); }
      } catch (e) {
        console.warn("Rete non disponibile: uso i dati in cache.", e);
        if (!cached) setItems([]);
      } finally {
        setLoaded(true);
      }
    })();
    return () => { if (onOnline) window.removeEventListener("online", onOnline); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Specchio dei dati in cache locale (per consultazione offline) ---
  useEffect(() => {
    if (!loaded) return;
    saveCache(session.user.id, {
      items,
      shopping,
      settings: { catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, shopping, catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs, loaded]);

  // --- Realtime: sincronizza dispensa e lista spesa tra dispositivi ---
  useEffect(() => {
    const uid = session.user.id;
    const upsert = (setFn) => (payload) => {
      const row = payload.new;
      if (!row?.id) return;
      setFn((prev) =>
        prev.some((x) => x.id === row.id)
          ? prev.map((x) => (x.id === row.id ? { ...x, ...row } : x))
          : [...prev, row]
      );
    };
    const remove = (setFn) => (payload) => {
      const id = payload.old?.id;
      if (id) setFn((prev) => prev.filter((x) => x.id !== id));
    };
    // Filtra per nucleo attivo (household); finché non è risolto, fallback per
    // utente. Col nucleo, dopo lo switch RLS (fase 5) ricevi anche gli eventi
    // dei familiari. Si ri-sottoscrive quando cambia il nucleo attivo.
    const filter = activeHouseholdId ? `household_id=eq.${activeHouseholdId}` : `user_id=eq.${uid}`;
    const channel = supabase
      .channel("realtime-dispensa")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pantry_items", filter }, upsert(setItems))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pantry_items", filter }, upsert(setItems))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "pantry_items", filter }, remove(setItems))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shopping_items", filter }, upsert(setShopping))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shopping_items", filter }, upsert(setShopping))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "shopping_items", filter }, remove(setShopping))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "meal_plan", filter }, upsert(setMeals))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "meal_plan", filter }, upsert(setMeals))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "meal_plan", filter }, remove(setMeals))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHouseholdId]);

  // Il gesto "finito" (scorrere la riga) non si scopre da soli: UNA volta per
  // dispositivo, alla prima Dispensa non vuota, un avviso lo spiega.
  const hasItems = items.length > 0;
  useEffect(() => {
    if (!loaded || !hasItems || view !== "dispensa") return;
    try {
      if (localStorage.getItem("dispensa-finito-hint")) return;
      localStorage.setItem("dispensa-finito-hint", "1");
    } catch { return; }
    showToast("Quando finisci un prodotto scorri la riga verso sinistra: va nella lista della spesa", undefined, undefined, undefined, 5000);
  }, [loaded, hasItems, view]);

  // Pulisce il timer del toast allo smontaggio.
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Mostra un toast per ~6 secondi, con eventuale azione ("Annulla" di
  // default, oppure un'etichetta personalizzata es. "metti nella lista").
  function showToast(message, onUndo, actionLabel, actionTone, duration = 6000) {
    clearTimeout(toastTimer.current);
    setToast({ message, onUndo, actionLabel, actionTone });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }
  function dismissToast() {
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  // --- Persistenza impostazioni (jsonb sincronizzato) ---
  useEffect(() => {
    if (!loaded) return;
    saveSettings({ catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs }).catch((e) =>
      console.error("Errore salvataggio impostazioni:", e)
    );
  }, [catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs, loaded]);

  // Ripulisce la query del deep-link push (?view=…) dopo averla applicata allo
  // stato iniziale: un refresh riparte così dalla Dispensa, non dalla scheda
  // aperta dalla notifica.
  useEffect(() => {
    if (window.location.search.includes("view=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Transazioni che arrivano FUORI da un acquisto esplicito (rinnovi mentre
  // l'app è aperta, Ask-to-Buy approvato, acquisto su un altro dispositivo):
  // le mandiamo al server e rileggiamo lo stato Premium. Solo guscio nativo.
  useEffect(() => {
    if (!storeKitAvailable()) return undefined;
    let removed = false;
    let handle;
    onTransactionUpdate(async (tx) => {
      try {
        await syncReceipt(tx);
        setIsPro(await fetchIsPro());
      } catch (e) { console.error("Sync transazione fallita:", e); }
    }).then((h) => {
      handle = h;
      if (removed) h.remove(); // smontato prima che la promise risolvesse
    });
    return () => { removed = true; handle?.remove?.(); };
  }, []);

  // --- Ticker globale dei timer: suonano da qualunque scheda dell'app ---
  useTimersTicker((t) => {
    // Il toast resta finché non tocchi "Stop", che zittisce l'allarme.
    showToast(
      <>⏱️ {t.label ? <><strong>{t.label}</strong> è pronto!</> : "Tempo scaduto!"}</>,
      () => { stopAlarm(); dismissToast(); },
      "Stop",
      "ink",
      30000
    );
  });

  // I prodotti finiti (quantità 0) restano in elenco come promemoria, ma per le
  // ricette NON ci sono: non vanno proposti all'AI come disponibili.
  const pantryStr = items.filter((i) => !isOut(i)).map((i) => `${i.name} (${i.qty})`).join(", ");

  // Ricette: stato (mode/ideas/recipe/servings/ricettario) e logica (proposte,
  // ricetta completa, cache idee 24h, preferiti/cucinate) vivono in useRecipes.
  // Le dipendenze trasversali e gli helper UI sono passati qui.
  const {
    mode, ideas, recipe, servings,
    loadingIdeas, loadingRecipe,
    recipeErr, savedRecipes,
    recipeContext, toggleRecipeContext,
    chooseMode, askCustom, retryLast, changeServings, savedByTitle,
    openRecipe, openSavedRecipe, commitRecipes,
    toggleSaveRecipe, recordCookedRecipe, removeSavedRecipe,
    backToModes, backToIdeas,
  } = useRecipes({
    session, foodPrefs, pantryStr, prefServings, setPrefServings,
    setCookDone,
    showToast, dismissToast, animateUI, scrollToTop,
  });

  // Colore pieno della schermata (fondo + barra di stato): uno per scheda, la
  // ricetta aperta in bianco. Cambia dentro la View Transition del cambio vista.
  usePageColor(pageColorFor(view, !!recipe || loadingRecipe));

  // Iniziale dell'avatar in alto a sinistra (apre il Profilo): il Nome scelto
  // nel Profilo, altrimenti la mail. Si rilegge alla chiusura del Profilo,
  // dove il Nome si può cambiare.
  const [myName, setMyName] = useState("");
  useEffect(() => {
    if (profileOpen) return;
    getMyUsername().then((n) => setMyName(n || "")).catch(() => {});
  }, [profileOpen]);

  // Nomi commerciali che le regole locali non hanno saputo ripulire (barcode):
  // UNA sola richiesta AI per tutti, invece di una per prodotto (cinque codici
  // consumavano da soli le richieste gratuite della giornata).
  // Ritorna [{ name, category }] nello stesso ordine, oppure null.
  async function aiCleanNames(rawNames, signal) {
    const prompt =
      `Sei un assistente per una dispensa italiana. Per OGNI nome commerciale dell'elenco ricava il nome dell'alimento. ` +
      `${NAME_RULES} ` +
      `Restituisci le voci nello STESSO ordine e nello stesso numero dell'elenco, con "qty" sempre "1". ` +
      `Elenco:\n${rawNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}\n` +
      `Rispondi SOLO con JSON valido senza markdown: {"items":[{"name":"...","qty":"1","category":"..."}]}\n` +
      `${CATEGORY_PROMPT}`;
    const parsed = await callClaude([{ type: "text", text: prompt }], 1200, { schema: ITEMS_SCHEMA, temperature: 0.1, signal });
    const list = Array.isArray(parsed?.items) ? parsed.items : [];
    return list.length === rawNames.length ? list : null;
  }

  // Apre l'overlay di analisi con un AbortController fresco; ritorna il signal.
  function beginProcessing() {
    const ctrl = new AbortController();
    processAbortRef.current = ctrl;
    setProcessing(true);
    return ctrl.signal;
  }
  function endProcessing() {
    processAbortRef.current = null;
    setProcessing(false);
  }

  // --- Nucleo familiare: cambia nucleo attivo (ricarica i dati) / aggiorna elenco ---
  async function switchHousehold(hid) {
    if (!hid || hid === activeHouseholdId) return;
    setActiveHousehold(hid);
    setActiveHouseholdId(hid);
    try { localStorage.setItem(`dispensa-active-household-${session.user.id}`, hid); } catch { /* */ }
    try { const m = await fetchMembers(hid); setSharedHousehold((m?.length || 0) > 1); } catch { /* */ }
    try { setItems(await fetchPantry()); } catch (e) { console.error(e); }
    try { setShopping(await fetchShopping()); } catch (e) { console.error(e); }
  }
  async function refreshHouseholds() {
    try { setHouseholds(await fetchHouseholds()); } catch (e) { console.error(e); }
  }

  // --- Operazioni dispensa: CRUD e derivati estratti in hooks/usePantry.jsx ---
  async function logout() {
    await supabase.auth.signOut();
  }
  // Cancellazione account + tutti i dati (endpoint server con service role).
  // Al termine fa il logout: App.jsx torna alla schermata di accesso.
  async function deleteAccount() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const res = await fetch(apiUrl("/api/account"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || "Eliminazione non riuscita.");
    }
    await supabase.auth.signOut();
  }

  // --- Lista della spesa: stato e logica estratti in hooks/useShopping.jsx ---
  // Resta qui solo il bridge verso la dispensa (scrive pantry_items).
  // "Sposta in dispensa": sposta subito, senza passi in più (la revisione con
  // le scadenze proposte è stata tolta il 09/10: la data, se serve, si mette
  // dal prodotto).
  // Ordine delle categorie della Dispensa: si cambia dal Profilo, una
  // posizione alla volta (prima c'erano le frecce su ogni intestazione).
  function moveCatInOrder(cat, dir) {
    setCatOrder((order) => {
      const i = order.indexOf(cat);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return order;
      const arr = [...order];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }
  async function moveCheckedToPantry() {
    const checked = shopping.filter((x) => x.checked);
    if (!checked.length) return;
    const list = checked.map((x) => ({ name: x.name, qty: x.qty, category: catForShopping(x.name), expiry: "" }));
    await mergeItems(list);
    leaveShopping(checked.map((x) => x.id));
    showToast(`${list.length} ${list.length === 1 ? "prodotto spostato" : "prodotti spostati"} in dispensa`);
  }
  // Gli articoli spostati in dispensa escono dalla lista (subito a schermo,
  // in coda se offline) ed entrano nello storico degli acquisti.
  function leaveShopping(idList) {
    const ids = new Set(idList);
    const moved = shopping.filter((x) => ids.has(x.id));
    setShopping((prev) => prev.filter((x) => !ids.has(x.id)));
    deleteShoppingItems([...ids]).catch(() => {
      for (const id of ids) enqueue(session.user.id, { table: "shopping", type: "delete", id });
    });
    bumpShopHistory(moved.map((x) => x.name)); // acquisti completati
  }
  // --- Scontrino ---
  // L'immagine arriva già come base64 (scattata dalla fotocamera integrata o
  // scelta dalla galleria nel ReceiptScanModal). Mostra l'overlay di analisi,
  // poi apre la revisione.
  async function analyzeReceipt(data64, mediaType) {
    setReceiptOpen(false);
    if (!data64) return;
    const signal = beginProcessing();
    try {
      const parsed = await callClaude([
        { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: data64 } },
        { type: "text", text: RECEIPT_PROMPT },
      ], 2048, { schema: ITEMS_SCHEMA, temperature: 0.1, signal });
      const raw = Array.isArray(parsed.items) ? parsed.items : [];
      // Rete di sicurezza: anche se l'AI non aggrega, uniamo qui i prodotti
      // con lo stesso nome sommando le quantità compatibili (mergeQty).
      const byName = new Map();
      for (const it of raw) {
        const name = String(it?.name || "").trim();
        if (!name) continue;
        const k = matchKey(name); // singolare/plurale uniti: "Limoni"+"limone" → 1 voce
        const qty = normalizeWeight(String(it?.qty || "1").trim() || "1");
        if (byName.has(k)) {
          const ex = byName.get(k);
          ex.qty = normalizeWeight(mergeQty(ex.qty, qty));
        } else {
          // Categoria: il dizionario locale vince sulle varianti note (es. i
          // formati di pasta), l'AI resta fallback per i prodotti non in lista.
          byName.set(k, { name, qty, category: categorize(name, it?.category) });
        }
      }
      const list = [...byName.values()];
      if (!list.length) showToast("Nessun alimento riconosciuto nell'immagine");
      else {
        // Non aggiunge subito: apre la modale di revisione per nome/categoria.
        setScanItems(list);
        setVoiceReview(false); // scontrino: niente tasto "Aggiungi altri prodotti"
        bumpModal("scan");
        setScanOpen(true);
      }
    } catch (err) {
      // Annullata dall'utente: si torna indietro in silenzio, niente toast.
      if (err?.code !== "cancelled") {
        console.error(err);
        showToast(aiErrorMessage(err, "Impossibile leggere l'immagine. Riprova con una foto più nitida."));
      }
    } finally {
      endProcessing();
    }
  }

  // Risultato della raffica barcode (array dal vassoio). I nomi si ripuliscono
  // PRIMA in locale (marca, peso, formato → catalogo: lib/parse.js): istantaneo,
  // anche offline, senza richieste. Solo per quelli che le regole non
  // riconoscono si chiede all'AI, tutti insieme e con Annulla; se l'AI non
  // risponde si tiene il nome ripulito, da sistemare nella revisione.
  async function handleBarcodeResult(items) {
    setBarcodeOpen(false);
    const batch = Array.isArray(items) ? items : [items];
    if (!batch.length) return;
    const cleaned = batch.map((item) => {
      // Due candidati da Open Food Facts: il nome del prodotto e, se serve,
      // la denominazione generica ("pasta di semola di grano duro").
      let local = cleanBarcodeName(item?.name, item?.brands);
      if (!local.resolved && item?.generic) {
        const alt = cleanBarcodeName(item.generic, item?.brands);
        if (alt.resolved) local = alt;
      }
      return {
        raw: String(item?.name || "").trim(),
        name: local.name,
        resolved: local.resolved,
        qty: normalizeWeight(String(item?.qty || "1")),
        // Dizionario-first; poi la categoria dedotta dai tag Open Food Facts.
        category: categorize(local.name, item?.category),
        found: !!item?.found,
      };
    });
    const doubt = cleaned.filter((x) => !x.resolved && x.raw);
    if (doubt.length && online) {
      const signal = beginProcessing();
      try {
        const fixed = await aiCleanNames(doubt.map((x) => x.raw), signal);
        if (fixed) {
          doubt.forEach((x, i) => {
            const n = String(fixed[i]?.name || "").trim();
            if (!n) return;
            x.name = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
            x.category = categorize(x.name, fixed[i]?.category);
          });
        }
      } catch (e) {
        if (e?.code === "cancelled") { endProcessing(); return; } // niente revisione
        console.error(e); // non fatale: restano i nomi ripuliti in locale
      }
      endProcessing();
    }
    setScanItems(cleaned.map(({ name, qty, category }) => ({ name, qty, category })));
    setVoiceReview(false); // barcode: niente tasto "Aggiungi altri prodotti"
    bumpModal("scan");
    setScanOpen(true);
    const missing = cleaned.filter((x) => !x.found).length;
    if (missing) {
      showToast(missing === 1
        ? "Un codice non trovato: inserisci il nome del prodotto."
        : `${missing} codici non trovati: inserisci i nomi.`);
    }
  }

  // Aggiunta a voce: la frase si legge PRIMA in locale (lib/parse.js: virgole
  // ed "e", numeri e unità in italiano, catalogo dei prodotti) — niente attesa,
  // niente richieste. Solo se qualcosa non è stato riconosciuto si chiede
  // all'AI; se l'AI non risponde (offline, limite) si tiene la lettura locale.
  // Poi si apre la revisione (come per le foto). Dal riepilogo si può "Aggiungi
  // altri prodotti": ri-detta e ACCODA (append).
  async function handleVoiceResult(transcript) {
    // "append" = si arriva dal riepilogo ("Aggiungi altri prodotti"): i nuovi
    // prodotti si ACCODANO a quelli già riconosciuti invece di sostituirli.
    const append = voiceAppendRef.current;
    voiceAppendRef.current = false;
    if (!transcript) {
      setVoiceOpen(false);
      if (append) { bumpModal("scan"); setScanOpen(true); } // torna al riepilogo intatto
      return;
    }
    const local = parseSpokenList(transcript);
    let list = local.items;
    if (!list.length || local.unknown > 0) {
      setVoiceProcessing(true);
      try {
        const prompt =
          `Sei un assistente per la dispensa italiana. Questa è una frase detta a voce ` +
          `che elenca alimenti da aggiungere: "${transcript}". Estrai TUTTI gli alimenti citati. ` +
          `${NAME_RULES} ` +
          `Per la quantità: se l'utente indica un numero o una confezione ("6 uova", "un pacco di pasta", ` +
          `"due litri di latte"), mettila nel campo "qty" (numero oppure unità metriche come "500 g"/"1 l"), ` +
          `MAI nel nome; altrimenti "1". ` +
          `Rispondi SOLO con JSON valido senza markdown: {"items":[{"name":"...","qty":"...","category":"..."}]}\n` +
          `${CATEGORY_PROMPT}`;
        const parsed = await callClaude([{ type: "text", text: prompt }], 1200, { schema: ITEMS_SCHEMA, temperature: 0.1 });
        const raw = Array.isArray(parsed?.items) ? parsed.items : [];
        // Dizionario-first sulla categoria: le varianti note (es. formati di
        // pasta) vengono corrette anche se l'AI le sbaglia.
        if (raw.length) {
          list = raw.map((it) => ({ ...it, category: categorize(String(it?.name || ""), it?.category) }));
        }
      } catch (e) {
        console.error(e);
        // Senza AI resta la lettura locale; se è vuota, si dice perché.
        if (!list.length) {
          setVoiceProcessing(false);
          setVoiceOpen(false);
          showToast(aiErrorMessage(e, "Errore nell'elaborare la voce. Riprova."));
          if (append) { bumpModal("scan"); setScanOpen(true); } // non perdere quanto già riconosciuto
          return;
        }
      }
      setVoiceProcessing(false);
    }
    setVoiceOpen(false);
    if (!list.length) {
      showToast("Non ho riconosciuto alimenti. Riprova.");
      if (append) { bumpModal("scan"); setScanOpen(true); } // riapri il riepilogo con quanto già c'era
      return;
    }
    setVoiceReview(true); // il riepilogo mostrerà "Aggiungi altri prodotti"
    setScanItems((prev) => (append ? [...prev, ...list] : list));
    bumpModal("scan");
    setScanOpen(true);
  }

  // Dal riepilogo voce: "Aggiungi altri prodotti" → riapre la dettatura senza
  // perdere ciò che è già stato riconosciuto (incluse le modifiche fatte); il
  // risultato della nuova dettatura si accoda al ritorno (append).
  function handleReviewAddMore(currentItems) {
    setScanItems(currentItems);   // conserva l'elenco corrente (con le modifiche)
    setScanOpen(false);
    voiceAppendRef.current = true;
    bumpModal("voice");
    setVoiceOpen(true);
  }

  // Conferma dei prodotti rivisti nella modale: vengono aggiunti alla dispensa.
  async function confirmScan(reviewed) {
    setScanOpen(false);
    const valid = (reviewed || []).filter((x) => String(x.name || "").trim());
    if (valid.length) {
      await mergeItems(valid);
      showToast(`${valid.length} ${valid.length === 1 ? "prodotto aggiunto" : "prodotti aggiunti"}`);
    }
    setScanItems([]);
    setVoiceReview(false);
  }

  // Porta la pagina in cima (ogni sezione/categoria riparte dall'alto).
  function scrollToTop() {
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }

  // Cambio scheda con dissolvenza (View Transition). Il menù del "+" si
  // chiude sempre: fuori dalla Dispensa il FAB non è montato e un menù
  // rimasto "aperto" lascerebbe l'overlay scuro senza le opzioni.
  function changeView(v) {
    setAddMenuOpen(false);
    if (v !== view) { animateUI(() => setView(v)); scrollToTop(); }
  }

  // --- Ricette: stato e logica estratti in hooks/useRecipes.jsx ---

  // "Cucina con questi": manda i prodotti in scadenza alle Ricette.
  // Le idee con l'AI sono di Premium: nel piano gratuito gli stessi pulsanti
  // portano alle Ricette, dove "Puoi farle adesso" mette già in cima ciò che
  // usa i prodotti in scadenza.
  function cookWithExpiring() {
    const names = expiringItems.filter((x) => !isOut(x)).map((x) => x.name).slice(0, 8);
    if (!names.length) return;
    changeView("ricette");
    if (!isPro) { backToModes(); return; }
    askCustom(`qualcosa per usare subito: ${names.join(", ")}`);
  }
  // Dal pannello prodotto: apre le Ricette con proposte basate su quel prodotto
  // (come scrivere il suo nome nel box "Cosa ti va?").
  function cookWithProduct(name) {
    const n = String(name || "").trim();
    if (!n) return;
    changeView("ricette");
    if (!isPro) { backToModes(); return; }
    askCustom(n);
  }

  // --- Piano della settimana, generato da solo ---
  // Riempie i pasti LIBERI della settimana aperta (da oggi in poi) con ricette
  // del ricettario scelte partendo dalla dispensa (lib/planner.js: niente AI,
  // tiene il conto di ciò che ogni ricetta consuma), e mette in lista della
  // spesa gli ingredienti che mancano, con la loro quantità. È un ponte tra
  // piano, dispensa e lista, quindi sta qui. Ricettario e pianificatore si
  // caricano solo al tocco (import dinamico): non pesano sull'avvio.
  const [fillingWeek, setFillingWeek] = useState(false);
  // Riepilogo mostrato dopo "Riempi la settimana" (PlanReadySheet): i pasti
  // appena messi, quanti prodotti sono finiti in lista e come toglierli.
  const [planReady, setPlanReady] = useState(null); // { picks, added, undo, rejected } | null
  const [swappingMeal, setSwappingMeal] = useState(null); // indice del pasto che si sta cambiando
  // L'ultima versione di addMissingToShopping: dopo aver annullato le aggiunte
  // in lista (cambio di un piatto) serve quella che vede la lista AGGIORNATA.
  const addMissingRef = useRef(addMissingToShopping);
  addMissingRef.current = addMissingToShopping;

  // Ricettario e pianificatore si caricano solo al bisogno (import dinamico).
  // Ritorna tutto ciò che serve per scegliere: le ricette che rispettano le
  // esigenze alimentari del Profilo (qui non c'è l'AI a leggerle), le scorte
  // vere (senza i finiti) e i prodotti in scadenza.
  async function plannerKit() {
    const [{ default: BASE }, planner] = await Promise.all([
      import("./data/ricetteBase.js"), import("./lib/planner.js"),
    ]);
    const mine = savedRecipes.filter((r) => r.data?.ingredients?.length).map((r) => r.data);
    return {
      ...planner,
      recipes: [...mine, ...BASE].filter(allowedBy(foodPrefs)),
      pantry: items.filter((x) => !isOut(x)),
      expiring: expiringItems.filter((x) => !isOut(x)),
    };
  }
  // I pasti già nel piano e non ancora cucinati consumano le scorte prima
  // degli altri (`except`: il pasto che si sta sostituendo non conta).
  function plannedMeals(except = null) {
    const today = isoDate(new Date());
    return meals
      .filter((m) => m.data && !m.cooked_at && m.date >= today && m.id !== except)
      .map((m) => ({ recipe: m.data, servings: m.data.planServings }));
  }
  // Le porzioni di casa ("a casa siamo in X"), se impostate, valgono anche nel piano.
  const withServings = (recipe) => (prefServings ? { ...recipe, planServings: prefServings } : recipe);

  async function fillWeek() {
    if (fillingWeek) return;
    setFillingWeek(true);
    try {
      const { planWeek, freeSlots, shoppingList, recipes, pantry, expiring } = await plannerKit();
      const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => isoDate(addDays(weekStart, i)));
      const slots = freeSlots(weekDays, meals, isoDate(new Date()));
      if (!slots.length) { showToast("In questa settimana non ci sono pasti liberi da riempire"); return; }
      // Il pianificatore tiene il conto delle scorte ricetta dopo ricetta,
      // partendo dai pasti già nel piano.
      const picks = planWeek({ slots, recipes, pantry, expiring, servings: prefServings, planned: plannedMeals() });
      const ids = await Promise.all(picks.map((p) =>
        planMeal(p.date, p.slot, { title: p.recipe.title, data: withServings(p.recipe) })
      ));
      const saved = picks.map((p, i) => ({ ...p, id: ids[i] })).filter((p) => p.id);
      if (!saved.length) { showToast("Non sono riuscito a salvare il piano. Controlla la connessione e riprova."); return; }
      // Mancanti in lista: una voce per prodotto, con la quantità che serve
      // davvero (sommata tra le ricette). Chi è già in lista si salta.
      const missing = shoppingList(saved);
      const res = missing.length ? await addMissingToShopping(missing) : null;
      // Niente avviso che sparisce: un foglio che mostra cosa è stato messo e
      // lascia cambiare subito i piatti che non vanno.
      bumpModal("planReady");
      setPlanReady({ picks: saved, added: res?.added || 0, undo: res?.undo, rejected: [] });
    } catch (e) {
      console.error(e);
      showToast("Non sono riuscito a preparare il piano. Riprova.");
    } finally {
      setFillingWeek(false);
    }
  }

  // Dal riepilogo: un'altra ricetta per QUEL pasto. Si sceglie come le altre
  // (scorte, scadenze, esigenze), scartando le ricette già nel piano e quelle
  // già rifiutate qui; poi la lista della spesa si rifà sui piatti rimasti.
  async function swapPlanned(i) {
    const cur = planReady?.picks[i];
    if (!cur || swappingMeal !== null) return;
    setSwappingMeal(i);
    try {
      const { planWeek, shoppingList, recipes, pantry, expiring } = await plannerKit();
      const skip = new Set([...meals.map((m) => m.title), ...planReady.rejected, cur.recipe.title]);
      const [next] = planWeek({
        slots: [{ date: cur.date, slot: cur.slot }],
        recipes: recipes.filter((r) => !skip.has(r.title)),
        pantry, expiring, servings: prefServings, planned: plannedMeals(cur.id),
      });
      if (!next) { showToast("Non ho altre ricette da proporre per questo pasto"); return; }
      const ok = await planMeal(cur.date, cur.slot, { title: next.recipe.title, data: withServings(next.recipe) }, cur.id);
      if (!ok) { showToast("Non sono riuscito a cambiare il piatto. Controlla la connessione e riprova."); return; }
      const picks = planReady.picks.map((p, k) => (k === i ? { ...next, id: cur.id } : p));
      // Lista: via le aggiunte di prima (flushSync: la lista deve risultare
      // aggiornata PRIMA di rimetterci i mancanti del piano nuovo).
      flushSync(() => planReady.undo?.());
      const missing = shoppingList(picks);
      const res = missing.length ? await addMissingRef.current(missing) : null;
      setPlanReady({ picks, added: res?.added || 0, undo: res?.undo, rejected: [...planReady.rejected, cur.recipe.title] });
    } catch (e) {
      console.error(e);
      showToast("Non sono riuscito a cambiare il piatto. Riprova.");
    } finally {
      setSwappingMeal(null);
    }
  }
  // "Annulla tutto": via i pasti appena aggiunti e i prodotti messi in lista.
  function undoPlan() {
    if (!planReady) return;
    planReady.picks.forEach((p) => removeMeal(p.id));
    planReady.undo?.();
  }

  // --- Derivati ---
  const orderedModes = modeOrder.map((id) => MODES.find((m) => m.id === id)).filter(Boolean);

  const baseServings = recipe ? (Number(recipe.servings) || 2) : 1;
  const factor = servings / baseServings;

  // --- Premium ---

  // Apre il paywall spiegando PERCHÉ (la funzione toccata): un paywall che
  // risponde a un'azione converte meglio di uno generico.
  function openPaywall(reason) {
    bumpModal("paywall");
    setPaywall({ reason });
  }

  // Acquisto reale via StoreKit 2 (solo nell'app nativa). Il pagamento passa da
  // Apple; la transazione firmata va a /api/receipt, che verifica con Apple e
  // scrive l'entitlement col service role. Poi rileggiamo lo stato Premium: la
  // UI non se lo decide da sola. Sul web (paywall visibile per provare la UI)
  // diciamo chiaramente che l'acquisto si fa dall'app.
  async function purchasePremium(productId) {
    if (!storeKitAvailable()) {
      throw new Error("Gli abbonamenti si attivano dall'app Dispensa su App Store.");
    }
    const res = await purchaseProduct(productId, session.user.id);
    if (res?.status === "cancelled") return; // annullato dall'utente: nessun errore
    if (res?.status === "pending") {
      // Ask-to-Buy / autorizzazione: l'esito arriverà dal listener transactionUpdated.
      showToast("Acquisto in attesa di approvazione. Ti avviseremo.");
      return;
    }
    if (res?.status !== "purchased") {
      throw new Error("Acquisto non completato. Riprova.");
    }
    await syncReceipt(res); // verifica lato server + scrittura entitlement
    const pro = await fetchIsPro();
    setIsPro(pro);
    if (!pro) throw new Error("Pagamento ricevuto: attivazione in corso, riprova tra poco.");
    showToast("Benvenuto in Premium! 🎉");
  }

  // --- "Ho cucinato questo" ---

  // Le righe del CookModal: un prodotto della dispensa per ogni ingrediente
  // della ricetta che ci corrisponde (una volta sola), tutti su "ce n'è
  // ancora". Niente conti: cosa è cambiato lo dice chi ha cucinato.
  function buildCookRows(rec) {
    const rows = [];
    const seen = new Set();
    for (const ing of (rec.ingredients || [])) {
      const match = findMatch(ing.name, items);
      if (!match || seen.has(match.id)) continue;
      seen.add(match.id);
      rows.push({ itemId: match.id, name: match.name, state: "ok" });
    }
    return rows;
  }
  // Chi si sta cucinando: la ricetta per lo storico (recordCookedRecipe) e
  // l'eventuale voce del piano da marcare a cottura applicata.
  const cookRecipeRef = useRef(null);
  const cookMealRef = useRef(null);
  function openCookModal() {
    if (!recipe) return;
    cookRecipeRef.current = recipe;
    cookMealRef.current = null;
    setCookRows(buildCookRows(recipe));
    bumpModal("cook");
    setCookOpen(true);
  }
  // "Ho cucinato" dal piano pasti: stessa scalatura, ricetta della voce.
  // Le porzioni pianificate (planServings, se impostate nel foglio dello
  // slot) scalano rispetto alle porzioni base della ricetta. Se nessun
  // ingrediente è in dispensa non c'è nulla da scalare: si marca e basta.
  function cookMealFromPlan(meal) {
    if (!meal?.data) return;
    const rows = buildCookRows(meal.data);
    if (!rows.length) {
      markMealCooked(meal.id);
      showToast(<><strong>{meal.title}</strong> segnata come cucinata</>);
      return;
    }
    cookRecipeRef.current = meal.data;
    cookMealRef.current = meal.id;
    setCookRows(rows);
    bumpModal("cook");
    setCookOpen(true);
  }
  function setRowState(idx, state) {
    setCookRows((rows) => rows.map((r, i) => (i === idx ? { ...r, state } : r)));
  }
  async function applyCooked() {
    const low = new Set(cookRows.filter((r) => r.state === "low").map((r) => r.itemId));
    const out = cookRows.filter((r) => r.state === "out");
    const removals = new Set(out.map((r) => r.itemId));
    // Come il resto della dispensa: stato aggiornato SUBITO, scrittura in
    // background e, se fallisce (offline), in coda per il ritorno online.
    const uid = session.user.id;
    setItems((prev) =>
      prev
        .filter((x) => !removals.has(x.id))
        .map((x) => (low.has(x.id) ? { ...x, qty: LOW_QTY } : x))
    );
    if (removals.size) {
      deleteItems([...removals]).catch(() => {
        for (const id of removals) enqueue(uid, { table: "pantry", type: "delete", id });
      });
    }
    for (const id of low) {
      updateItem(id, { qty: LOW_QTY }).catch(() => enqueue(uid, { table: "pantry", type: "update", id, fields: { qty: LOW_QTY } }));
    }
    setCookOpen(false);
    const n = low.size + removals.size;
    setCookDone(n ? `Dispensa aggiornata: ${n} ${n === 1 ? "prodotto" : "prodotti"}.` : "Segnata come cucinata.");
    recordCookedRecipe(cookRecipeRef.current || undefined); // storico "cucinate di recente"
    // Cottura partita dal piano pasti: marca anche la voce del piano.
    if (cookMealRef.current) {
      markMealCooked(cookMealRef.current);
      cookMealRef.current = null;
    }
    // I prodotti finiti vanno da soli in lista della spesa.
    if (out.length) {
      await addToShoppingMerged(out.map((r) => ({ name: r.name, qty: "1" })));
      showToast(out.length === 1
        ? <><strong>{out[0].name}</strong> finito: è in lista</>
        : `${out.length} prodotti finiti: sono in lista`);
    }
  }


  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sfondo">
        <Loader2 className="h-6 w-6 animate-spin text-ink/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sfondo text-ink">
      {/* Spazio in fondo: la barra (col "+" sulla stessa riga) non deve coprire
          l'ultima riga. */}
      <div
        className="mx-auto max-w-md px-4 pt-7"
        style={{ paddingBottom: "var(--sopra-nav)" }}
      >
        {/* Testata, come in Wishlist: l'avatar del Profilo in alto a sinistra
            (prima era una voce della barra in basso) e, accanto, "Offline"
            quando manca la rete. Nelle SOTTO-PAGINE delle Ricette (proposte di
            un'occasione, ricetta aperta) la testata non c'è: lì in alto resta
            solo la riga con la freccia per tornare indietro (09/10). */}
        {!(view === "ricette" && (mode || recipe || loadingRecipe)) && (
        <header className="mb-3.5 flex items-center gap-2.5">
          <button
            onClick={() => { bumpModal("profile"); setProfileOpen(true); }}
            aria-label="Profilo"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-blu text-[0.95rem] font-[750] tracking-[-0.02em] text-white transition active:scale-95"
          >
            {(myName || session.user.email || "?").trim().charAt(0).toUpperCase()}
          </button>
          {!online && <span className="text-[0.72rem] font-bold text-ink">Offline</span>}
          {/* Azioni della scheda aperta sulla stessa riga, a destra (la Spesa ci
              mette luce e condivisione, via portal). Le Impostazioni stanno
              nel Profilo: l'ingranaggio qui non c'è più (09/10). */}
          <div id="testata-azioni" className="ml-auto flex gap-2" />
        </header>
        )}
        {view === "dispensa" && (
          <PantryTab
            shared={sharedHousehold}
            search={search} setSearch={setSearch} sort={sort} setSort={setSort}
            grouped={grouped} cardRefs={cardRefs}
            onAutoSave={autoSaveItem} onSetExpiry={setItemExpiry} removeItem={removeItem}
            expiredCount={expiredCount} expiringSoonCount={expiringSoonCount} expFilter={expFilter} setExpFilter={setExpFilter}
            onCookExpiring={cookWithExpiring} isOut={isOut} onToShopping={finishedToShopping}
            // Riga scorsa verso sinistra o pillola "Finito": via dalla dispensa, in lista.
            onFinish={finishItem}
            onCookWith={cookWithProduct}
          />
        )}

        {view === "ricette" && (
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink" /></div>}>
          <RecipesTab
            orderedModes={orderedModes} mode={mode} chooseMode={chooseMode}
            ideas={ideas} loadingIdeas={loadingIdeas} openRecipe={openRecipe} backToModes={backToModes}
            recipe={recipe} loadingRecipe={loadingRecipe} recipeErr={recipeErr}
            servings={servings} setServings={changeServings} factor={factor} backToIdeas={backToIdeas}
            openCookModal={openCookModal} cookDone={cookDone}
            hasIngredient={hasIngredient} onAddMissing={addMissingToShopping}
            onRegenerate={() => mode && chooseMode(mode, true)}
            onRetry={retryLast}
            onCustomAsk={askCustom}
            recipeContext={recipeContext} onToggleContext={toggleRecipeContext}
            plan={{ meals, weekStart, shiftWeek, loadingMeals, planMeal, removeMeal, markMealCooked, setMealServings, onCookMeal: cookMealFromPlan, onFillWeek: fillWeek, fillingWeek }}
            startOnPlan={planFirst}
            isPro={isPro}
            onNeedPro={() => openPaywall("Il Piano Alimentare fa parte di Premium: organizza la settimana e la lista della spesa si riempie da sola.")}
            online={online}
            foodPrefs={foodPrefs}
            onNeedAi={() => openPaywall("Le idee su misura con l'AI fanno parte di Premium: scegli un'occasione o scrivi cosa ti va, e te le preparo con quello che hai.")}
            expiring={expiringItems.filter((x) => !isOut(x))}
            onAiLimit={() => openPaywall("Hai finito le richieste AI di oggi: con Premium non hanno limiti.")}
            savedRecipes={savedRecipes}
            onOpenSaved={openSavedRecipe}
            onDeleteSaved={removeSavedRecipe}
            isSaved={!!(recipe && savedByTitle(recipe.title)?.saved)}
            onToggleSave={toggleSaveRecipe}
          />
          </Suspense>
        )}

        {view === "spesa" && (
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink" /></div>}>
          <ShoppingTab
            shared={sharedHousehold}
            shopping={shopping}
            onAdd={addShoppingItem}
            onToggle={toggleShoppingItem}
            onDelete={removeShoppingItem}
            onAdjustQty={adjustShoppingQty}
            onToggleAll={toggleAllShopping}
            onMoveChecked={moveCheckedToPantry}
            onClearChecked={clearCheckedShopping}
            movingChecked={movingChecked}
            byAisle={byAisle} setByAisle={setByAisle}
            catFor={catForShopping}
            onAutoSave={autoSaveShopping}
            onOpenVoice={() => { bumpModal("shopVoice"); setShopVoiceOpen(true); }}
            onNotify={showToast}
            historyNames={sortedNames(shopHist)}
            pantryNames={items.map((i) => i.name)}
          />
          </Suspense>
        )}

      </div>

      {/* Timer attivi visibili da ogni scheda */}
      {/* Timer attivi: sopra il posto degli avvisi. */}
      <TimerBar
        onTap={() => changeView("ricette")}
        bottom="calc(var(--sopra-nav) + 56px)"
      />

      {/* Velo del menù "+": a livello di pagina (NON dentro la navbar, che ha
          transform), così copre tutto lo schermo e chiude il menù al tocco
          esterno. Tinta piena, niente sfocatura (su iPhone rallenta). Esiste
          SOLO a menù aperto: iOS colora la barra di stato guardando gli
          elementi fissi in cima, e un velo lasciato nel DOM (anche invisibile)
          la teneva grigia dopo il cambio di scheda. */}
      {addMenuOpen && (
      <button
        onClick={() => setAddMenuOpen(false)}
        aria-label="Chiudi menù"
        className="animate-fade-in fixed inset-0 z-30 bg-black/45"
      />
      )}

      {/* Barra in basso: Dispensa · Spesa · Ricette (come Wishlist) e, sulla
          stessa riga, il "+" (su tutte le schede; aggiunge ALLA DISPENSA). */}
      <BottomNav
        view={view}
        setView={changeView}
        shoppingCount={shopping.filter((s) => !s.checked).length}
        expiredCount={expiredCount}
        addSlot={(
          <AddFab
            menuOpen={addMenuOpen}
            setMenuOpen={setAddMenuOpen}
            online={online}
            onManual={() => { bumpModal("manual"); setManualOpen(true); }}
            onPhoto={() => { bumpModal("receipt"); setReceiptOpen(true); }}
            onBarcode={() => { bumpModal("barcode"); setBarcodeOpen(true); }}
            onVoice={() => { bumpModal("voice"); setVoiceOpen(true); }}
          />
        )}
      />

      {/* Fotocamera integrata per lo scontrino (anteprima live + galleria).
          key: forza un'istanza fresca del foglio a ogni apertura, anche se il
          precedente sta ancora eseguendo l'animazione di chiusura di Vaul
          (altrimenti il pulsante che lo riapre resterebbe senza effetto). */}
      {receiptOpen && (
        <Suspense fallback={null}>
          <ReceiptScanModal
            key={modalEpoch.current.receipt}
            onClose={() => setReceiptOpen(false)}
            onCapture={analyzeReceipt}
          />
        </Suspense>
      )}

      {/* Overlay di analisi: copre il momento di attesa dell'AI. "Annulla"
          aborta la richiesta (mai più di qualche secondo in ostaggio). */}
      {processing && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-sfondo px-10 text-center">
          <Barattoli size={112} className="text-ink" />
          <Loader2 className="h-5 w-5 animate-spin text-ink" />
          <div>
            <p className="grande">Riconosco i prodotti…</p>
            <p className="mx-auto mt-2 max-w-xs text-[0.95rem] font-medium text-tenue">
              Tra un attimo li controlli e li aggiungi alla dispensa.
            </p>
          </div>
          <button onClick={() => processAbortRef.current?.abort()} className="bottone-chiaro">
            Annulla
          </button>
        </div>
      )}

      {manualOpen && (
        <ManualAddModal
          key={modalEpoch.current.manual}
          newName={newName} setNewName={setNewName} newQty={newQty} setNewQty={setNewQty}
          newCat={newCat} setNewCat={setNewCat}
          newExpiry={newExpiry} setNewExpiry={setNewExpiry}
          adding={adding} onSubmit={submitManual} onQuickAdd={addManual}
          onClose={() => setManualOpen(false)}
          historyNames={sortedNames(shopHist)} pantryNames={items.map((i) => i.name)}
        />
      )}

      {profileOpen && (
        <ProfileSheet
          key={modalEpoch.current.profile}
          email={session.user.email}
          itemCount={items.length}
          shared={sharedHousehold}
          households={households}
          activeHouseholdId={activeHouseholdId}
          onSwitchHousehold={switchHousehold}
          onHouseholdsChanged={refreshHouseholds}
          foodPrefs={foodPrefs}
          onSaveFoodPrefs={setFoodPrefs}
          catOrder={catOrder}
          onMoveCat={moveCatInOrder}
          onClose={() => { setProfileOpen(false); openPendingSheet(); }}
          onDeleteAccount={deleteAccount}
          onLogout={logout}
          onOpenPrivacy={() => { pendingSheetRef.current = "privacy"; }}
          isPro={isPro}
          onOpenPaywall={() => { pendingSheetRef.current = "paywall"; }}
          onClearPantry={() => { bumpModal("confirmClear"); setConfirmClear(true); }}
        />
      )}

      {paywall && (
        <PaywallSheet
          key={modalEpoch.current.paywall}
          reason={paywall.reason}
          onPurchase={purchasePremium}
          onClose={() => setPaywall(null)}
        />
      )}

      {privacyOpen && <PrivacySheet key={modalEpoch.current.privacy} onClose={() => setPrivacyOpen(false)} />}

      {planReady && (
        <PlanReadySheet
          key={modalEpoch.current.planReady}
          picks={planReady.picks}
          added={planReady.added}
          swapping={swappingMeal}
          onSwap={swapPlanned}
          onOpen={(p) => openSavedRecipe({ title: p.recipe.title, data: p.recipe })}
          onUndoAll={undoPlan}
          onClose={() => setPlanReady(null)}
        />
      )}

      {confirmClear && (
        <ConfirmClearModal key={modalEpoch.current.confirmClear} onCancel={() => setConfirmClear(false)} onConfirm={clearPantry} />
      )}

      {cookOpen && (
        <CookModal
          key={modalEpoch.current.cook}
          rows={cookRows}
          onClose={() => setCookOpen(false)}
          onSetState={setRowState}
          onApply={applyCooked}
        />
      )}

      {scanOpen && (
        <ReviewScanModal
          key={modalEpoch.current.scan}
          initialItems={scanItems}
          onCancel={() => { setScanOpen(false); setScanItems([]); setVoiceReview(false); }}
          onConfirm={confirmScan}
          onAddMore={voiceReview ? handleReviewAddMore : undefined}
        />
      )}

      {barcodeOpen && (
        <Suspense fallback={null}>
          <BarcodeScanModal
            key={modalEpoch.current.barcode}
            onClose={() => setBarcodeOpen(false)}
            onResult={handleBarcodeResult}
          />
        </Suspense>
      )}

      {voiceOpen && (
        <VoiceAddModal
          key={modalEpoch.current.voice}
          processing={voiceProcessing}
          onCancel={() => {
            if (voiceProcessing) return;
            setVoiceOpen(false);
            // Se stavo aggiungendo altri prodotti a voce, torno al riepilogo
            // senza perdere quelli già riconosciuti.
            if (voiceAppendRef.current) { voiceAppendRef.current = false; bumpModal("scan"); setScanOpen(true); }
          }}
          onResult={handleVoiceResult}
        />
      )}

      {/* Aggiunta a voce per la lista della spesa */}
      {shopVoiceOpen && (
        <VoiceAddModal
          key={modalEpoch.current.shopVoice}
          processing={shopVoiceProcessing}
          onCancel={() => { if (!shopVoiceProcessing) setShopVoiceOpen(false); }}
          onResult={handleShoppingVoice}
          confirmLabel="Aggiungi alla lista"
        />
      )}

      {/* Avviso: appena sopra la barra, stessa altezza su tutte le schede. */}
      {toast && <Toast message={toast.message} onUndo={toast.onUndo} actionLabel={toast.actionLabel} tone={toast.actionTone} bottom="var(--sopra-nav)" />}
    </div>
  );
}
