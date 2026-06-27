import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { flushSync } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  CATEGORIES, MODES, RECEIPT_PROMPT, SEED_DATA, DEMO_DATA, NAME_RULES, CATEGORY_PROMPT,
  ITEMS_SCHEMA, NAME_SCHEMA,
} from "./constants.js";
import {
  guessCategory, categorize,
  normalizeWeight, mergeQty, scaleQty, subtractQty, findMatch,
  norm, matchKey, isStapleQb, isQbQty,
} from "./lib/pantry.js";
import { callClaude } from "./lib/claude.js";
import { supabase } from "./lib/supabase.js";
import {
  fetchPantry, insertMany, updateItem,
  deleteItems, deleteAllPantry,
  fetchSettings, saveSettings,
  fetchShopping, deleteShoppingItems,
  fetchSavedRecipes, deleteSavedRecipe,
} from "./lib/db.js";
import { stopAlarm } from "./lib/timers.js";

import { loadCache, saveCache } from "./lib/cache.js";
import { sortedNames } from "./lib/history.js";

import PantryTab from "./components/PantryTab.jsx";
import RecipesTab from "./components/RecipesTab.jsx";
import ShoppingTab from "./components/ShoppingTab.jsx";
import BottomNav from "./components/BottomNav.jsx";
import AddFab from "./components/AddFab.jsx";
import ManualAddModal from "./components/ManualAddModal.jsx";
import CookModal from "./components/CookModal.jsx";
import ConfirmClearModal from "./components/ConfirmClearModal.jsx";
import ReviewScanModal from "./components/ReviewScanModal.jsx";
import VoiceAddModal from "./components/VoiceAddModal.jsx";
import ProfileSheet from "./components/ProfileSheet.jsx";
import PrivacySheet from "./components/PrivacySheet.jsx";
import TimerBar from "./components/TimerBar.jsx";
import TourCoach from "./components/TourCoach.jsx";
import Toast from "./components/Toast.jsx";
import {
  useTourState, startTour, stopTour, tourSignal, visibleSteps,
  TOUR_MODE, TOUR_IDEA, TOUR_RECIPE,
} from "./lib/tour.js";
import { useOnline } from "./hooks/useOnline.js";
import { useTimersTicker } from "./hooks/useTimersTicker.js";
import { useRecipes } from "./hooks/useRecipes.jsx";
import { useShopping } from "./hooks/useShopping.jsx";
import { usePantry } from "./hooks/usePantry.jsx";

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
let viewTransitionPending = false;
function animateUI(fn) {
  if (!document.startViewTransition || viewTransitionPending) { fn(); return; }
  viewTransitionPending = true;
  let t;
  try {
    t = document.startViewTransition(() => flushSync(fn));
  } catch {
    viewTransitionPending = false;
    fn();
    return;
  }
  t.finished.catch(() => {}).finally(() => { viewTransitionPending = false; });
}

export default function Dispensa({ session }) {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dispensa");
  // Categorie CHIUSE di default: ogni categoria parte con collapsed=true.
  // Le scelte salvate dall'utente (aperto/chiuso) vengono fuse sopra al load.
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c, true]))
  );
  const [catOrder, setCatOrder] = useState(CATEGORIES);
  const cardRefs = useRef({});

  const [modeOrder, setModeOrder] = useState(MODES.map((m) => m.id));
  const [dragMode, setDragMode] = useState(null);
  const dragModeRef = useRef(null);
  const modeCardRefs = useRef({});


  // lista della spesa: impostazioni persistite (la collezione e la logica
  // vivono in useShopping)
  const [byAisle, setByAisle] = useState(true); // vista "per reparto" (persistita)
  const [shopCats, setShopCats] = useState({}); // reparti corretti a mano (per nome, persistiti)

  // toast / undo
  const [toast, setToast] = useState(null); // { message, onUndo? }
  const toastTimer = useRef(null);

  // stato connessione (per indicatore offline)
  const online = useOnline();

  // scontrino
  const [processing, setProcessing] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false); // fotocamera integrata scontrino
  const [scanOpen, setScanOpen] = useState(false);
  const [scanItems, setScanItems] = useState([]);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
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

  // foglio profilo (tema, svuota dispensa, logout)
  const [profileOpen, setProfileOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false); // informativa privacy

  // tutorial interattivo (primo accesso + ripetibile dal Profilo)
  const tour = useTourState();

  // Lista della spesa: stato (articoli, storico, voce) e logica (aggiunta con
  // merge, modifica, spunta, per reparto). I reparti corretti a mano (shopCats)
  // restano impostazioni qui in Dispensa e sono passati all'hook.
  // showToast/dismissToast sono dichiarazioni di funzione (hoisted), quindi
  // disponibili anche se definite più sotto.
  const {
    shopping, setShopping, movingChecked, setMovingChecked,
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
    newName, setNewName, newQty, setNewQty, newUnit, setNewUnit,
    newCat, setNewCat, newExpiry, setNewExpiry, adding,
    search, setSearch, sort, setSort, expFilter, setExpFilter,
    confirmClear, setConfirmClear,
    grouped, expiringItems, expiredCount, expiringSoonCount, isOut, hasIngredient,
    mergeItems, addManual, submitManual, removeItem, clearPantry,
    autoSaveItem, setItemExpiry, moveCategory,
  } = usePantry({
    session, showToast, dismissToast, catOrder, setCatOrder,
    bumpShopHistory, addToShoppingMerged,
  });

  // Applica le impostazioni (da cache o da DB) a catOrder/modeOrder.
  // NB: lo stato "collassato" NON viene ripristinato: le categorie partono
  // sempre chiuse a ogni apertura/ricarica dell'app (default voluto).
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
        let rows = await fetchPantry();
        // Primissimo accesso (nessuna cache + DB vuoto): popola i prodotti
        // demo e avvia l'onboarding, che alla fine li svuota per partire
        // puliti. Se l'onboarding è già stato fatto su questo dispositivo,
        // riparte dal seed classico.
        if (rows.length === 0 && !cached) {
          const onboarded = (() => { try { return localStorage.getItem(`dispensa-onboarded-${uid}`) === "1"; } catch { return false; } })();
          const src = onboarded ? SEED_DATA : DEMO_DATA;
          rows = await insertMany(src.map(([name, qty, category, expiry]) => ({ name, qty, category, expiry: expiry || null })));
          if (!onboarded) startTour(true);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Specchio dei dati in cache locale (per consultazione offline) ---
  useEffect(() => {
    if (!loaded) return;
    saveCache(session.user.id, {
      items,
      shopping,
      settings: { collapsed, catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, shopping, collapsed, catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs, loaded]);

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
    const channel = supabase
      .channel("realtime-dispensa")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pantry_items", filter: `user_id=eq.${uid}` }, upsert(setItems))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pantry_items", filter: `user_id=eq.${uid}` }, upsert(setItems))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "pantry_items", filter: `user_id=eq.${uid}` }, remove(setItems))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shopping_items", filter: `user_id=eq.${uid}` }, upsert(setShopping))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shopping_items", filter: `user_id=eq.${uid}` }, upsert(setShopping))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "shopping_items", filter: `user_id=eq.${uid}` }, remove(setShopping))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    saveSettings({ collapsed, catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs }).catch((e) =>
      console.error("Errore salvataggio impostazioni:", e)
    );
  }, [collapsed, catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs, loaded]);

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

  const pantryStr = items.map((i) => `${i.name} (${i.qty})`).join(", ");

  // Ricette: stato (mode/ideas/recipe/servings/ricettario) e logica (proposte,
  // ricetta completa, cache idee 24h, preferiti/cucinate) vivono in useRecipes.
  // Le dipendenze trasversali e gli helper UI sono passati qui; i setter tornano
  // indietro perché tutorial e CookModal leggono/scrivono ancora questo stato.
  const {
    mode, setMode, ideas, setIdeas, recipe, setRecipe, servings,
    loadingIdeas, setLoadingIdeas, loadingRecipe, setLoadingRecipe,
    recipeErr, setRecipeErr, savedRecipes,
    chooseMode, askCustom, changeServings, savedByTitle,
    openRecipe, openSavedRecipe, commitRecipes,
    toggleSaveRecipe, recordCookedRecipe, removeSavedRecipe,
    backToModes, backToIdeas,
  } = useRecipes({
    session, foodPrefs, pantryStr, prefServings, setPrefServings,
    tourActive: tour.active, setCookDone,
    showToast, dismissToast, animateUI, scrollToTop,
  });

  // Pulisce/genericizza un nome alimento via AI -> { name, category }.
  async function aiCleanName(raw) {
    const prompt =
      `Sei un assistente per una dispensa italiana. Dall'input dell'utente ricava il nome dell'alimento. ` +
      `${NAME_RULES} ` +
      `Assegna anche la categoria corretta seguendo queste istruzioni:\n${CATEGORY_PROMPT}\n` +
      `Input: "${raw}". ` +
      `Rispondi SOLO con JSON valido senza markdown: {"name":"...","category":"..."}`;
    return callClaude([{ type: "text", text: prompt }], 256, { schema: NAME_SCHEMA, temperature: 0.1 });
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
    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || "Eliminazione non riuscita.");
    }
    try { localStorage.removeItem(`dispensa-onboarded-${session.user.id}`); } catch { /* */ }
    await supabase.auth.signOut();
  }

  // --- Tutorial interattivo ---
  const markOnboarded = () => {
    try { localStorage.setItem(`dispensa-onboarded-${session.user.id}`, "1"); } catch { /* */ }
  };
  // Svuota dispensa e lista di esempio inserite per il tutorial.
  async function tourEmptyDemo() {
    try { await deleteAllPantry(); setItems([]); } catch (e) { console.error("Errore pulizia demo:", e); }
    const ids = shopping.map((x) => x.id);
    if (ids.length) {
      try { await deleteShoppingItems(ids); setShopping([]); }
      catch (e) { console.error("Errore pulizia lista demo:", e); }
    }
  }
  // Chiusura del tutorial: al PRIMO accesso svuota i dati demo (dispensa, lista
  // ed eventuale ricetta salvata) così parti da una dispensa vuota e tua; poi
  // torna alle occasioni e segna l'onboarding come fatto.
  function tourComplete() {
    markOnboarded();
    if (tour.firstRun) {
      tourEmptyDemo();
      const demo = savedRecipes.find((r) => norm(r.title) === norm(TOUR_RECIPE.title));
      if (demo) { commitRecipes(savedRecipes.filter((r) => r.id !== demo.id)); deleteSavedRecipe(demo.id).catch(() => {}); }
    }
    animateUI(() => { setMode(null); setIdeas([]); setRecipe(null); setRecipeErr(""); });
    stopTour();
  }
  // "Esci dal tutorial": stessa chiusura (pulisce i dati demo al primo accesso).
  function tourExit() { tourComplete(); }
  // Ripeti il tutorial dal Profilo (non tocca la dispensa reale).
  function replayTour() { startTour(false); }

  // Prepara vista e contenuti demo richiesti dal passo corrente del tutorial:
  // chiude le modali non pertinenti e, nelle Ricette, mostra la proposta demo.
  useEffect(() => {
    if (!tour.active) return;
    const step = visibleSteps(tour.firstRun)[tour.index];
    if (!step) return;
    if (step.id !== "add-manual") setManualOpen(false);
    if (step.id !== "add-modes" && step.id !== "add-manual") setAddMenuOpen(false);
    // Il Profilo resta aperto solo nel passo in cui si tocca "Svuota dispensa".
    if (step.id !== "empty-clear") setProfileOpen(false);
    if (step.view && view !== step.view) setView(step.view);
    if (step.id === "open-recipe") {
      setMode(TOUR_MODE); setRecipe(null); setIdeas([TOUR_IDEA]);
      setLoadingIdeas(false); setLoadingRecipe(false); setRecipeErr("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.active, tour.index, tour.firstRun]);

  // --- Lista della spesa: stato e logica estratti in hooks/useShopping.jsx ---
  // Resta qui solo il bridge verso la dispensa (scrive pantry_items).
  async function moveCheckedToPantry() {
    const checked = shopping.filter((x) => x.checked);
    if (!checked.length) return;
    setMovingChecked(true);
    try {
      await mergeItems(checked.map((x) => ({ name: x.name, qty: x.qty })));
      await deleteShoppingItems(checked.map((x) => x.id));
      setShopping((prev) => prev.filter((x) => !x.checked));
      bumpShopHistory(checked.map((x) => x.name)); // acquisti completati
      showToast(`${checked.length} ${checked.length === 1 ? "prodotto spostato" : "prodotti spostati"} in dispensa`);
    } catch (e) { console.error("Errore spostamento in dispensa:", e); }
    setMovingChecked(false);
  }
  // --- Riordino generico (categorie e occasioni) ---
  function moveInOrder(setOrder, dragged, target) {
    setOrder((order) => {
      const arr = [...order];
      const fromIdx = arr.indexOf(dragged);
      const toIdxOrig = arr.indexOf(target);
      if (fromIdx < 0 || toIdxOrig < 0) return order;
      arr.splice(fromIdx, 1);
      let insertAt = arr.indexOf(target);
      if (fromIdx < toIdxOrig) insertAt += 1;
      arr.splice(insertAt, 0, dragged);
      return arr;
    });
  }

  // --- Trascinamento occasioni di ricetta ---
  function onModeDragStart(e, id) {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignora */ }
    dragModeRef.current = id;
    setDragMode(id);
  }
  function onModeDragMove(e) {
    if (!dragModeRef.current) return;
    const x = e.clientX, y = e.clientY;
    for (const id in modeCardRefs.current) {
      const el = modeCardRefs.current[id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        if (id !== dragModeRef.current) moveInOrder(setModeOrder, dragModeRef.current, id);
        break;
      }
    }
  }
  function onModeDragEnd() {
    dragModeRef.current = null;
    setDragMode(null);
  }

  // --- Scontrino ---
  // L'immagine arriva già come base64 (scattata dalla fotocamera integrata o
  // scelta dalla galleria nel ReceiptScanModal). Mostra l'overlay di analisi,
  // poi apre la revisione.
  async function analyzeReceipt(data64, mediaType) {
    setReceiptOpen(false);
    if (!data64) return;
    setProcessing(true);
    try {
      const parsed = await callClaude([
        { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: data64 } },
        { type: "text", text: RECEIPT_PROMPT },
      ], 2048, { schema: ITEMS_SCHEMA, temperature: 0.1 });
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
      if (!list.length) showToast("Nessun alimento riconosciuto nell'immagine.");
      else {
        // Non aggiunge subito: apre la modale di revisione per nome/categoria.
        setScanItems(list);
        setScanOpen(true);
      }
    } catch (err) {
      console.error(err);
      showToast("Impossibile leggere l'immagine. Riprova con una foto più nitida.");
    } finally {
      setProcessing(false);
    }
  }

  // Risultato della scansione barcode: genericizza il nome trovato e apre la revisione.
  async function handleBarcodeResult(item) {
    setBarcodeOpen(false);
    const raw = String(item?.name || "").trim();
    let name = raw;
    let aiCategory = null;
    if (raw) {
      try {
        const parsed = await aiCleanName(raw);
        if (parsed && parsed.name) {
          name = String(parsed.name).trim();
          aiCategory = parsed.category;
        }
      } catch (e) { console.error(e); }
    }
    name = name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";
    // Dizionario-first: le varianti note finiscono nella categoria giusta;
    // l'AI è fallback per i prodotti che il dizionario non riconosce.
    const category = categorize(name, aiCategory);
    const qty = normalizeWeight(String(item?.qty || "1"));
    setScanItems([{ name, qty, category }]);
    setScanOpen(true);
    if (!item?.found) showToast("Codice non trovato: inserisci il nome del prodotto.");
  }

  // Aggiunta a voce: la frase trascritta viene passata all'AI che estrae e
  // categorizza gli alimenti, poi si apre la revisione (come per le foto).
  async function handleVoiceResult(transcript) {
    if (!transcript) { setVoiceOpen(false); return; }
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
      // pasta) vengono corrette anche se l'AI le sbaglia; l'utente può poi
      // modificarle nella revisione.
      const list = raw.map((it) => ({
        ...it,
        category: categorize(String(it?.name || ""), it?.category),
      }));
      setVoiceProcessing(false);
      setVoiceOpen(false);
      if (!list.length) { showToast("Non ho riconosciuto alimenti. Riprova."); return; }
      setScanItems(list);
      setScanOpen(true);
    } catch (e) {
      console.error(e);
      setVoiceProcessing(false);
      setVoiceOpen(false);
      showToast("Errore nell'elaborare la voce. Riprova.");
    }
  }

  // Conferma dei prodotti rivisti nella modale: vengono aggiunti alla
  // dispensa e le categorie coinvolte si aprono, così vedi dove sono finiti.
  async function confirmScan(reviewed) {
    setScanOpen(false);
    const valid = (reviewed || []).filter((x) => String(x.name || "").trim());
    if (valid.length) {
      await mergeItems(valid);
      const cats = new Set(valid.map((x) => (CATEGORIES.includes(x.category) ? x.category : "Altro")));
      setCollapsed((prev) => {
        const next = { ...prev };
        for (const c of cats) next[c] = false;
        return next;
      });
      showToast(`${valid.length} prodotti aggiunti.`);
    }
    setScanItems([]);
  }

  // Porta la pagina in cima (ogni sezione/categoria riparte dall'alto).
  function scrollToTop() {
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }

  // Cambio scheda con dissolvenza (View Transition).
  function changeView(v) {
    if (v !== view) { animateUI(() => setView(v)); scrollToTop(); }
    tourSignal(`view-${v}`);
  }

  // --- Ricette: stato e logica estratti in hooks/useRecipes.jsx ---

  // "Cucina con questi": manda i prodotti in scadenza alle Ricette.
  function cookWithExpiring() {
    const names = expiringItems.filter((x) => !isOut(x)).map((x) => x.name).slice(0, 8);
    if (!names.length) return;
    changeView("ricette");
    askCustom(`qualcosa per usare subito: ${names.join(", ")}`);
  }
  // Dal pannello prodotto: apre le Ricette con proposte basate su quel prodotto
  // (come scrivere il suo nome nel box "Cosa ti va?").
  function cookWithProduct(name) {
    const n = String(name || "").trim();
    if (!n) return;
    changeView("ricette");
    askCustom(n);
  }

  // --- Derivati ---
  const orderedModes = modeOrder.map((id) => MODES.find((m) => m.id === id)).filter(Boolean);

  const baseServings = recipe ? (Number(recipe.servings) || 2) : 1;
  const factor = servings / baseServings;

  // --- "Ho cucinato questo" ---

  // Prepara le righe del CookModal classificando ogni ingrediente in 3 corsie:
  //  - "qb"    → scorta a piacere (olio/sale/spezie… o la ricetta dice "q.b."):
  //              NON si scala, si mostra soltanto.
  //  - "exact" → stessa unità della ricetta: matematica esatta (es. 500 g − 200 g).
  //  - "pack"  → unità non confrontabili (es. "1 barattolo" vs "200 g"): niente
  //              stima, l'utente dice quanti ne restano con lo stepper (½ incluso).
  function openCookModal() {
    if (!recipe) return;
    const rows = [];
    const seen = new Set();
    for (const ing of (recipe.ingredients || [])) {
      const match = findMatch(ing.name, items);
      if (!match || seen.has(match.id)) continue;
      seen.add(match.id);
      if (isQbQty(ing.qty) || isStapleQb(match.name, match.category)) {
        rows.push({ itemId: match.id, name: match.name, before: match.qty, kind: "qb" });
        continue;
      }
      const used = scaleQty(ing.qty, factor);
      const sub = subtractQty(match.qty, used);
      rows.push(sub.ok
        ? { itemId: match.id, name: match.name, used, before: match.qty, after: sub.value, kind: "exact" }
        : { itemId: match.id, name: match.name, used, before: match.qty, after: match.qty, kind: "pack" });
    }
    setCookRows(rows);
    setCookOpen(true);
  }
  function setRowAfter(idx, val) {
    setCookRows((rows) => rows.map((r, i) => (i === idx ? { ...r, after: val } : r)));
  }
  function removeRow(idx) {
    setCookRows((rows) => rows.filter((_, i) => i !== idx));
  }
  async function applyCooked() {
    const updates = {};
    const removals = new Set();
    for (const r of cookRows) {
      if (r.kind === "qb") continue; // le scorte "q.b." non si toccano
      const v = String(r.after).trim();
      const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
      const isZero = m && parseFloat(m[0]) === 0;
      if (v === "" || isZero) removals.add(r.itemId);
      else updates[r.itemId] = v;
    }
    try {
      if (removals.size) await deleteItems([...removals]);
      for (const [id, qty] of Object.entries(updates)) await updateItem(id, { qty });
      setItems((prev) =>
        prev
          .filter((x) => !removals.has(x.id))
          .map((x) => (updates[x.id] !== undefined ? { ...x, qty: updates[x.id] } : x))
      );
    } catch (e) {
      console.error("Errore aggiornamento dopo cottura:", e);
    }
    setCookOpen(false);
    const n = Object.keys(updates).length + removals.size;
    setCookDone(n ? `Dispensa aggiornata: ${n} prodotti.` : "");
    recordCookedRecipe(); // storico "cucinate di recente"
    // I prodotti finiti cucinando si possono rimettere in lista con un tap.
    const finished = cookRows.filter((r) => removals.has(r.itemId)).map((r) => r.name);
    if (finished.length) {
      showToast(
        finished.length === 1
          ? <>Hai finito <strong>{finished[0]}</strong></>
          : `Hai finito ${finished.length} prodotti`,
        async () => {
          await addToShoppingMerged(finished.map((name) => ({ name, qty: "1" })));
          dismissToast();
        },
        "metti nella lista"
      );
    }
  }


  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      {!online && (
        <div className="fixed left-1/2 top-2 z-40 -translate-x-1/2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700 shadow">
          offline
        </div>
      )}
      {/* Sulla dispensa più spazio in fondo, così il "+" non copre l'ultima categoria */}
      <div className="mx-auto max-w-md px-5 pt-7 pb-28">
        {view === "dispensa" && (
          <PantryTab
            search={search} setSearch={setSearch} sort={sort} setSort={setSort}
            grouped={grouped} cardRefs={cardRefs}
            onMoveCat={moveCategory}
            onAutoSave={autoSaveItem} onSetExpiry={setItemExpiry} removeItem={removeItem}
            expiredCount={expiredCount} expiringSoonCount={expiringSoonCount} expFilter={expFilter} setExpFilter={setExpFilter}
            onCookExpiring={cookWithExpiring} isOut={isOut} onToShopping={finishedToShopping}
            onCookWith={cookWithProduct}
          />
        )}

        {view === "ricette" && (
          <RecipesTab
            orderedModes={orderedModes} mode={mode} modeCardRefs={modeCardRefs}
            dragMode={dragMode} onModeDragStart={onModeDragStart} onModeDragMove={onModeDragMove}
            onModeDragEnd={onModeDragEnd} chooseMode={chooseMode}
            ideas={ideas} loadingIdeas={loadingIdeas} openRecipe={openRecipe} backToModes={backToModes}
            recipe={recipe} loadingRecipe={loadingRecipe} recipeErr={recipeErr}
            servings={servings} setServings={changeServings} factor={factor} backToIdeas={backToIdeas}
            openCookModal={openCookModal} cookDone={cookDone}
            hasIngredient={hasIngredient} onAddMissing={addMissingToShopping}
            onRegenerate={() => mode && chooseMode(mode, true)}
            onCustomAsk={askCustom}
            savedRecipes={savedRecipes}
            onOpenSaved={openSavedRecipe}
            onDeleteSaved={removeSavedRecipe}
            isSaved={!!(recipe && savedByTitle(recipe.title)?.saved)}
            onToggleSave={toggleSaveRecipe}
          />
        )}

        {view === "spesa" && (
          <ShoppingTab
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
            onOpenVoice={() => setShopVoiceOpen(true)}
            onNotify={showToast}
            historyNames={sortedNames(shopHist)}
            pantryNames={items.map((i) => i.name)}
          />
        )}

      </div>

      {/* Timer attivi visibili da ogni scheda */}
      <TimerBar
        onTap={() => changeView("ricette")}
        bottom={view === "spesa"
          ? (shopping.some((s) => s.checked)
              ? "calc(192px + env(safe-area-inset-bottom))"
              : "calc(138px + env(safe-area-inset-bottom))")
          : "calc(86px + env(safe-area-inset-bottom))"}
      />

      {/* Overlay sfocato del menù "+": a livello di pagina (NON dentro la
          navbar, che ha transform), così copre tutto lo schermo e chiude il
          menù al tocco esterno. */}
      <button
        onClick={() => setAddMenuOpen(false)}
        aria-label="Chiudi menù"
        tabIndex={addMenuOpen ? 0 : -1}
        className={`fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          addMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Navbar: Dispensa · Spesa · [+] · Ricette · Profilo. Il "+" è centrale
          e globale (aggiunge un prodotto da qualunque scheda). */}
      <BottomNav
        view={view}
        setView={changeView}
        onProfile={() => { setProfileOpen(true); tourSignal("profile-opened"); }}
        shoppingCount={shopping.filter((s) => !s.checked).length}
        addSlot={
          <AddFab
            menuOpen={addMenuOpen}
            setMenuOpen={setAddMenuOpen}
            onManual={() => setManualOpen(true)}
            onPhoto={() => setReceiptOpen(true)}
            onBarcode={() => setBarcodeOpen(true)}
            onVoice={() => setVoiceOpen(true)}
          />
        }
      />

      {/* Fotocamera integrata per lo scontrino (anteprima live + galleria) */}
      {receiptOpen && (
        <Suspense fallback={null}>
          <ReceiptScanModal
            onClose={() => setReceiptOpen(false)}
            onCapture={analyzeReceipt}
          />
        </Suspense>
      )}

      {/* Overlay di analisi: copre il momento di attesa dell'AI */}
      {processing && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-cream/95 px-10 text-center backdrop-blur">
          <img src="/analisi-spesa.png" alt="" className="h-auto w-[140px]" />
          <Loader2 className="h-5 w-5 animate-spin text-tomato" />
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight text-ink">Sto analizzando la spesa…</p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-stone-500">
              Identifico i prodotti e li aggiungo alla dispensa.
            </p>
          </div>
        </div>
      )}

      {manualOpen && (
        <ManualAddModal
          newName={newName} setNewName={setNewName} newQty={newQty} setNewQty={setNewQty}
          unit={newUnit} setUnit={setNewUnit} newCat={newCat} setNewCat={setNewCat}
          newExpiry={newExpiry} setNewExpiry={setNewExpiry}
          adding={adding} onSubmit={submitManual} onQuickAdd={addManual}
          onClose={() => setManualOpen(false)}
          historyNames={sortedNames(shopHist)} pantryNames={items.map((i) => i.name)}
        />
      )}

      {profileOpen && (
        <ProfileSheet
          email={session.user.email}
          itemCount={items.length}
          foodPrefs={foodPrefs}
          onSaveFoodPrefs={setFoodPrefs}
          onClose={() => setProfileOpen(false)}
          onClearPantry={() => {
            // Durante il tutorial lo svuotamento è guidato e immediato (niente
            // conferma): cancella i dati demo e avanza al passo finale.
            if (tour.active) { tourEmptyDemo(); tourSignal("pantry-cleared"); }
            else setConfirmClear(true);
          }}
          onLogout={logout}
          onReplayTour={replayTour}
          onDeleteAccount={deleteAccount}
          onOpenPrivacy={() => setPrivacyOpen(true)}
        />
      )}

      {privacyOpen && <PrivacySheet onClose={() => setPrivacyOpen(false)} />}

      {confirmClear && (
        <ConfirmClearModal onCancel={() => setConfirmClear(false)} onConfirm={clearPantry} />
      )}

      {cookOpen && (
        <CookModal
          rows={cookRows}
          onClose={() => setCookOpen(false)}
          onSetAfter={setRowAfter}
          onRemoveRow={removeRow}
          onApply={applyCooked}
          onStapleToShopping={(name) => {
            addToShoppingMerged([{ name, qty: "1" }]);
            showToast(<><strong>{name}</strong> aggiunto alla lista della spesa</>);
          }}
        />
      )}

      {scanOpen && (
        <ReviewScanModal
          initialItems={scanItems}
          onCancel={() => { setScanOpen(false); setScanItems([]); }}
          onConfirm={confirmScan}
        />
      )}

      {barcodeOpen && (
        <Suspense fallback={null}>
          <BarcodeScanModal
            onClose={() => setBarcodeOpen(false)}
            onResult={handleBarcodeResult}
          />
        </Suspense>
      )}

      {voiceOpen && (
        <VoiceAddModal
          processing={voiceProcessing}
          onCancel={() => { if (!voiceProcessing) setVoiceOpen(false); }}
          onResult={handleVoiceResult}
        />
      )}

      {/* Aggiunta a voce per la lista della spesa */}
      {shopVoiceOpen && (
        <VoiceAddModal
          processing={shopVoiceProcessing}
          onCancel={() => { if (!shopVoiceProcessing) setShopVoiceOpen(false); }}
          onResult={handleShoppingVoice}
          confirmLabel="Aggiungi alla lista"
        />
      )}

      {tour.active && (
        <TourCoach onExit={tourExit} onComplete={tourComplete} onEmptyDemo={tourEmptyDemo} />
      )}

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} actionLabel={toast.actionLabel} actionTone={toast.actionTone} raised={view === "spesa"} />}
    </div>
  );
}
