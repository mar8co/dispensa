import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { flushSync } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  CATEGORIES, MODES, RECEIPT_PROMPT, SEED_DATA, NAME_RULES,
} from "./constants.js";
import {
  guessCategory, correctName,
  normalizeWeight, mergeQty, scaleQty, subtractQty, findMatch,
  adjustQty, norm, daysUntilExpiry,
} from "./lib/pantry.js";
import { callClaude, fileToBase64, fetchPhotos } from "./lib/claude.js";
import { supabase } from "./lib/supabase.js";
import {
  fetchPantry, insertItem, insertMany, updateItem,
  deleteItem, deleteItems, deleteAllPantry,
  fetchSettings, saveSettings,
  fetchShopping, insertShopping, insertManyShopping,
  updateShopping, deleteShopping, deleteShoppingItems,
  fetchSavedRecipes, upsertSavedRecipe, updateSavedRecipe, deleteSavedRecipe,
} from "./lib/db.js";
import { checkTimers } from "./lib/timers.js";

import { loadCache, saveCache } from "./lib/cache.js";
import { loadHistory, saveHistory, bumpedHistory, sortedNames } from "./lib/history.js";
import { loadSavedRecipes, saveSavedRecipes, localRecipeId } from "./lib/recipes.js";

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
import TimerBar from "./components/TimerBar.jsx";
import Toast from "./components/Toast.jsx";

// Caricata on-demand: la libreria di scansione (ZXing) è pesante e serve
// solo quando si apre la scansione del codice a barre.
const BarcodeScanModal = lazy(() => import("./components/BarcodeScanModal.jsx"));
// Anche la fotocamera integrata per lo scontrino è on-demand (usa getUserMedia).
const ReceiptScanModal = lazy(() => import("./components/ReceiptScanModal.jsx"));

// Applica un cambio di vista dentro una View Transition del browser
// (dissolvenza nativa tra schermate); dove l'API manca, applica e basta.
function animateUI(fn) {
  if (document.startViewTransition) document.startViewTransition(() => flushSync(fn));
  else fn();
}

export default function Dispensa({ session }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dispensa");
  // Categorie CHIUSE di default: ogni categoria parte con collapsed=true.
  // Le scelte salvate dall'utente (aperto/chiuso) vengono fuse sopra al load.
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c, true]))
  );
  const [catOrder, setCatOrder] = useState(CATEGORIES);
  const [dragCat, setDragCat] = useState(null);
  const dragCatRef = useRef(null);
  const cardRefs = useRef({});

  const [modeOrder, setModeOrder] = useState(MODES.map((m) => m.id));
  const [dragMode, setDragMode] = useState(null);
  const dragModeRef = useRef(null);
  const modeCardRefs = useRef({});

  // form aggiunta
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newUnit, setNewUnit] = useState(""); // "" = pezzi, oppure g/kg/ml/l
  const [newCat, setNewCat] = useState("");   // "" = categoria automatica
  const [newExpiry, setNewExpiry] = useState("");
  const [adding, setAdding] = useState(false);

  // ricerca / ordinamento / filtro scadenze
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recenti");
  const [expFilter, setExpFilter] = useState(false); // mostra solo in scadenza

  // modifica
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editCat, setEditCat] = useState(CATEGORIES[0]);
  const [editExpiry, setEditExpiry] = useState("");

  // lista della spesa
  const [shopping, setShopping] = useState([]);
  const [movingChecked, setMovingChecked] = useState(false);
  const [byAisle, setByAisle] = useState(true); // vista "per reparto" (persistita)
  const [shopCats, setShopCats] = useState({}); // reparti corretti a mano (per nome, persistiti)
  const [shopHist, setShopHist] = useState(() => loadHistory(session.user.id)); // storico per suggerimenti
  const [shopVoiceOpen, setShopVoiceOpen] = useState(false);
  const [shopVoiceProcessing, setShopVoiceProcessing] = useState(false);

  // toast / undo
  const [toast, setToast] = useState(null); // { message, onUndo? }
  const toastTimer = useRef(null);

  // stato connessione (per indicatore offline)
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

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
  const fileInputRef = useRef(null);

  // ricette
  const [mode, setMode] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [servings, setServings] = useState(1);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipeErr, setRecipeErr] = useState("");
  const [savedRecipes, setSavedRecipes] = useState(() => loadSavedRecipes(session.user.id) || []); // ricettario (salvate + cucinate)
  const [prefServings, setPrefServings] = useState(null); // "a casa siamo in X" (persistito)
  const [foodPrefs, setFoodPrefs] = useState("");          // preferenze alimentari (persistite)

  // "Ho cucinato questo"
  const [cookOpen, setCookOpen] = useState(false);
  const [cookRows, setCookRows] = useState([]);
  const [cookEstimating, setCookEstimating] = useState(false);
  const [cookDone, setCookDone] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // foglio profilo (tema, svuota dispensa, logout)
  const [profileOpen, setProfileOpen] = useState(false);

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
        // Seed iniziale solo al primissimo accesso (nessuna cache + DB vuoto).
        if (rows.length === 0 && !cached) {
          rows = await insertMany(
            SEED_DATA.map(([name, qty, category]) => ({ name, qty, category }))
          );
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
        // Ricettario: se la tabella esiste (migration-4) il DB è la fonte e
        // si aggiorna la copia locale; altrimenti si tiene quella locale, così
        // i preferiti funzionano comunque (per-dispositivo).
        try {
          const rows = await fetchSavedRecipes();
          setSavedRecipes(rows);
          saveSavedRecipes(uid, rows);
        } catch (e) { console.warn("Ricettario dal DB non disponibile, uso la copia locale.", e?.message || e); }
      } catch (e) {
        console.warn("Rete non disponibile: uso i dati in cache.", e);
        if (!cached) setItems([]);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // --- Specchio dei dati in cache locale (per consultazione offline) ---
  useEffect(() => {
    if (!loaded) return;
    saveCache(session.user.id, {
      items,
      shopping,
      settings: { collapsed, catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs },
    });
  }, [items, shopping, collapsed, catOrder, modeOrder, byAisle, shopCats, prefServings, foodPrefs, loaded]);

  // --- Indicatore stato connessione ---
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

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
  }, []);

  // Pulisce il timer del toast allo smontaggio.
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Mostra un toast per ~6 secondi, con eventuale azione ("Annulla" di
  // default, oppure un'etichetta personalizzata es. "In lista spesa").
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
  useEffect(() => {
    const tick = () => {
      for (const t of checkTimers()) {
        showToast(<>⏱️ Timer finito{t.label ? <>: <strong>{t.label}</strong></> : null}</>);
      }
    };
    const int = setInterval(tick, 500);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(int);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pantryStr = items.map((i) => `${i.name} (${i.qty})`).join(", ");

  // Pulisce/genericizza un nome alimento via AI -> { name, category }.
  async function aiCleanName(raw) {
    const prompt =
      `Sei un assistente per una dispensa italiana. Dall'input dell'utente ricava il nome dell'alimento. ` +
      `${NAME_RULES} ` +
      `Assegna anche una categoria tra: ${CATEGORIES.join(", ")}. Input: "${raw}". ` +
      `Rispondi SOLO con JSON valido senza markdown: {"name":"...","category":"..."}`;
    return callClaude([{ type: "text", text: prompt }], 200);
  }

  // --- Operazioni dispensa (scrivono su Supabase + aggiornano lo stato) ---
  // Aggiunta a mano: pulizia SOLO locale (correzione ortografica + categoria
  // automatica) — istantanea e senza consumare quota AI. L'AI resta solo per
  // il barcode, dove i nomi arrivano davvero sporchi.
  async function addManual(rawName) {
    const raw = String(rawName ?? newName).trim();
    if (!raw || adding) return null;
    const n = String(newQty).trim() || "1";
    const qty = normalizeWeight(newUnit ? `${n} ${newUnit}` : n);
    setAdding(true);
    const name = correctName(raw);
    // Categoria: quella scelta a mano nel foglio vince sull'automatica
    // (solo per il nome digitato, non per i suggerimenti rapidi).
    const category = (!rawName && CATEGORIES.includes(newCat))
      ? newCat
      : (guessCategory(name) || "Altro");
    const expiry = newExpiry || null;
    let result = null;
    try {
      const existing = items.find((x) => x.name.trim().toLowerCase() === name.toLowerCase());
      if (existing) {
        const merged = normalizeWeight(mergeQty(existing.qty, qty));
        const fields = { qty: merged };
        if (expiry) fields.expiry = expiry; // aggiorna la scadenza solo se indicata
        await updateItem(existing.id, fields);
        setItems((prev) => prev.map((x) => (x.id === existing.id ? { ...x, ...fields } : x)));
        result = { name: existing.name, merged: true, category: existing.category };
      } else {
        const row = await insertItem({ name, qty, category, expiry });
        setItems((prev) => [...prev, row]);
        result = { name, merged: false, category };
      }
      bumpShopHistory([name]);
    } catch (e) {
      console.error("Errore aggiunta prodotto:", e);
    }
    setNewName(""); setNewQty("1"); setNewUnit(""); setNewCat(""); setNewExpiry(""); setAdding(false);
    return result;
  }

  // Invio dal foglio di aggiunta manuale: il foglio resta aperto per
  // inserire più prodotti di fila (si chiude con la X o lo sfondo).
  async function submitManual() {
    if (!newName.trim()) return null;
    return addManual();
  }

  // Elimina con possibilità di Annulla (re-inserisce il prodotto).
  async function removeItem(it) {
    try {
      await deleteItem(it.id);
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      showToast(<><strong>{it.name}</strong> eliminato</>, async () => {
        try {
          const row = await insertItem({
            name: it.name, qty: it.qty, category: it.category, expiry: it.expiry,
          });
          setItems((prev) => [...prev, row]);
          dismissToast();
        } catch (e) { console.error("Errore ripristino:", e); }
      });
    } catch (e) {
      console.error("Errore eliminazione:", e);
    }
  }

  // Svuota tutto con possibilità di Annulla (re-inserisce l'intera dispensa).
  async function clearPantry() {
    setConfirmClear(false);
    const backup = items;
    if (!backup.length) return;
    try {
      await deleteAllPantry();
      setItems([]);
      showToast(`Dispensa svuotata (${backup.length} prodotti)`, async () => {
        try {
          await insertMany(
            backup.map(({ name, qty, category, expiry }) => ({ name, qty, category, expiry }))
          );
          setItems(await fetchPantry());
          dismissToast();
        } catch (e) { console.error("Errore ripristino dispensa:", e); }
      });
    } catch (e) {
      console.error("Errore svuotamento dispensa:", e);
    }
  }

  // +/- rapido sulla quantità (senza entrare in modifica). Se si arriva a
  // zero, propone di mettere il prodotto in lista della spesa.
  async function adjustItemQty(it, delta) {
    const next = adjustQty(it.qty, delta);
    if (next === it.qty) return;
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, qty: next } : x)));
    try {
      await updateItem(it.id, { qty: next });
    } catch (e) {
      console.error("Errore aggiornamento quantità:", e);
    }
    const m = String(next).replace(",", ".").match(/-?\d+(\.\d+)?/);
    if (delta < 0 && m && parseFloat(m[0]) === 0) {
      showToast(<>Hai finito <strong>{it.name}</strong></>, async () => {
        await addToShoppingMerged([{ name: it.name, qty: "1" }]);
        dismissToast();
      }, "In lista spesa");
    }
  }

  function startEdit(it) {
    setEditId(it.id); setEditName(it.name); setEditQty(it.qty);
    setEditCat(it.category); setEditExpiry(it.expiry || "");
  }

  // Salvataggio automatico dal pannello prodotto: aggiorna subito e mostra
  // il toast "Modifica salvata" con Annulla (ripristina i valori di apertura).
  async function autoSaveItem(it, fields, restore) {
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, ...fields } : x)));
    try {
      await updateItem(it.id, fields);
    } catch (e) {
      console.error("Errore salvataggio modifica:", e);
    }
    // Quantità arrivata a zero: proponi la lista invece del semplice "salvata".
    const m = fields.qty != null ? String(fields.qty).replace(",", ".").match(/-?\d+(\.\d+)?/) : null;
    if (m && parseFloat(m[0]) === 0) {
      showToast(<>Hai finito <strong>{it.name}</strong></>, async () => {
        await addToShoppingMerged([{ name: it.name, qty: "1" }]);
        dismissToast();
      }, "In lista spesa");
      return;
    }
    showToast(<strong>Modifica salvata</strong>, async () => {
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, ...restore } : x)));
      try { await updateItem(it.id, restore); } catch (e) { console.error("Errore ripristino:", e); }
      dismissToast();
    }, "Annulla", "ink");
  }

  // Imposta/cambia la scadenza dal pannello (stesso flusso con Annulla).
  async function setItemExpiry(it, expiry) {
    await autoSaveItem(it, { expiry: expiry || null }, { expiry: it.expiry || null });
  }

  async function saveEdit() {
    const orig = items.find((x) => x.id === editId);
    const name = editName.trim() || (orig ? orig.name : "");
    const fields = { name, qty: normalizeWeight(editQty.trim()), category: editCat, expiry: editExpiry || null };
    try {
      await updateItem(editId, fields);
      setItems((prev) => prev.map((x) => (x.id === editId ? { ...x, ...fields } : x)));
    } catch (e) {
      console.error("Errore modifica:", e);
    }
    setEditId(null);
  }

  // Unisce prodotti in arrivo (scontrino) gestendo il merge per nome, poi
  // ricarica la dispensa dal DB per avere gli id reali delle nuove righe.
  async function mergeItems(incoming) {
    const working = [...items];
    const toInsert = [];
    const toUpdate = [];
    for (const raw of incoming) {
      const name = String(raw.name || "").trim();
      if (!name) continue;
      const qty = normalizeWeight(String(raw.qty || "1").trim());
      const cat = CATEGORIES.includes(raw.category) ? raw.category : "Altro";
      const idx = working.findIndex((x) => x.name.trim().toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        const merged = normalizeWeight(mergeQty(working[idx].qty, qty));
        working[idx] = { ...working[idx], qty: merged };
        toUpdate.push({ id: working[idx].id, qty: merged });
      } else {
        toInsert.push({ name, qty, category: cat });
        working.push({ name, qty, category: cat });
      }
    }
    try {
      for (const u of toUpdate) await updateItem(u.id, { qty: u.qty });
      if (toInsert.length) await insertMany(toInsert);
      const rows = await fetchPantry();
      setItems(rows);
    } catch (e) {
      console.error("Errore aggiornamento da scontrino:", e);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  // --- Lista della spesa ---

  // Aggiorna lo storico acquisti (per i suggerimenti e i "frequenti").
  function bumpShopHistory(names) {
    setShopHist((prev) => {
      const next = bumpedHistory(prev, names);
      saveHistory(session.user.id, next);
      return next;
    });
  }

  // Reparto di un articolo: correzione manuale (per nome) o stima automatica.
  // Le correzioni che puntano a categorie non più esistenti vengono ignorate.
  const catForShopping = (name) => {
    const manual = shopCats[norm(name)];
    return CATEGORIES.includes(manual) ? manual : (guessCategory(name) || "Altro");
  };

  // Aggiunge alla lista fondendo i duplicati per nome (le quantità si
  // sommano) e registrando lo storico. entries: [{ name, qty }]
  async function addToShoppingMerged(entries) {
    const byNorm = new Map(shopping.map((x) => [norm(x.name), x]));
    const updates = new Map(); // id esistente -> nuova qty
    const inserts = new Map(); // nome normalizzato -> { name, qty }
    for (const e of entries || []) {
      const name = String(e.name || "").trim();
      if (!name) continue;
      const qty = normalizeWeight(String(e.qty || "1").trim() || "1");
      const k = norm(name);
      const ex = byNorm.get(k);
      if (ex) updates.set(ex.id, normalizeWeight(mergeQty(updates.get(ex.id) ?? ex.qty, qty)));
      else if (inserts.has(k)) inserts.get(k).qty = normalizeWeight(mergeQty(inserts.get(k).qty, qty));
      else inserts.set(k, { name, qty });
    }
    let newRows = [];
    try {
      for (const [id, qty] of updates) await updateShopping(id, { qty });
      if (inserts.size) newRows = await insertManyShopping([...inserts.values()]);
    } catch (e) { console.error("Errore aggiunta spesa:", e); }
    // I nuovi inserimenti vanno in cima; i duplicati restano dove sono
    // (si aggiorna solo la quantità).
    setShopping((prev) => [
      ...newRows,
      ...prev.map((x) => (updates.has(x.id) ? { ...x, qty: updates.get(x.id) } : x)),
    ]);
    bumpShopHistory((entries || []).map((e) => e.name));
    return { added: newRows.length, merged: updates.size };
  }

  // Aggiunta manuale alla spesa: correzione ortografica locale (stesso
  // dizionario della dispensa, zero AI) + prima lettera maiuscola.
  async function addShoppingItem(name, qty) {
    const res = await addToShoppingMerged([{ name: correctName(String(name)), qty }]);
    return { merged: res.merged > 0 };
  }

  // Salvataggio automatico dal pannello di modifica della spesa (come quello
  // della dispensa) ma SILENZIOSO: nessun toast "Modifica salvata".
  // Nome/quantità sul DB, reparto nelle impostazioni.
  async function autoSaveShopping(it, fields) {
    const { category, ...rowFields } = fields;
    if (Object.keys(rowFields).length) {
      setShopping((prev) => prev.map((x) => (x.id === it.id ? { ...x, ...rowFields } : x)));
      try { await updateShopping(it.id, rowFields); } catch (e) { console.error("Errore salvataggio spesa:", e); }
    }
    if (CATEGORIES.includes(category)) {
      setShopCats((prev) => ({ ...prev, [norm(rowFields.name ?? it.name)]: category }));
    }
  }

  // Aggiunta a voce per la spesa: estrae i prodotti dalla frase e li
  // aggiunge alla lista (con merge dei duplicati).
  async function handleShoppingVoice(transcript) {
    if (!transcript) { setShopVoiceOpen(false); return; }
    setShopVoiceProcessing(true);
    try {
      const prompt =
        `Questa è una frase detta a voce che elenca cose da comprare: "${transcript}". ` +
        `Estrai TUTTI i prodotti citati. ${NAME_RULES} ` +
        `Per la quantità: se indicata ("6 uova", "due litri di latte") mettila nel campo "qty" ` +
        `(numero oppure unità metriche come "500 g"/"1 l"), MAI nel nome; altrimenti "1". ` +
        `Rispondi SOLO con JSON valido senza markdown: {"items":[{"name":"...","qty":"..."}]}`;
      const parsed = await callClaude([{ type: "text", text: prompt }], 600);
      const list = Array.isArray(parsed?.items) ? parsed.items : [];
      setShopVoiceProcessing(false);
      setShopVoiceOpen(false);
      if (!list.length) { showToast("Non ho riconosciuto prodotti. Riprova."); return; }
      const res = await addToShoppingMerged(list);
      const tot = res.added + res.merged;
      showToast(`${tot} ${tot === 1 ? "prodotto aggiunto" : "prodotti aggiunti"} alla lista`);
    } catch (e) {
      console.error(e);
      setShopVoiceProcessing(false);
      setShopVoiceOpen(false);
      showToast("Errore nell'elaborare la voce. Riprova.");
    }
  }
  async function toggleShoppingItem(id, checked) {
    if (checked) {
      const it = shopping.find((x) => x.id === id);
      if (it) showToast(<><strong>{it.name}</strong> spostato nel carrello</>, undefined, undefined, undefined, 3500);
    }
    setShopping((prev) => prev.map((x) => (x.id === id ? { ...x, checked } : x)));
    try { await updateShopping(id, { checked }); }
    catch (e) { console.error("Errore aggiornamento spesa:", e); }
  }
  async function removeShoppingItem(id) {
    const it = shopping.find((x) => x.id === id);
    try {
      await deleteShopping(id);
      setShopping((prev) => prev.filter((x) => x.id !== id));
      if (it) {
        showToast(<><strong>{it.name}</strong> rimosso dalla lista</>, async () => {
          try {
            const row = await insertShopping({ name: it.name, qty: it.qty });
            setShopping((prev) => [row, ...prev]);
            dismissToast();
          } catch (e) { console.error("Errore ripristino spesa:", e); }
        });
      }
    } catch (e) { console.error("Errore rimozione spesa:", e); }
  }
  // Seleziona/deseleziona tutti gli articoli della spesa.
  async function toggleAllShopping() {
    if (!shopping.length) return;
    const target = !shopping.every((x) => x.checked);
    const toChange = shopping.filter((x) => x.checked !== target);
    setShopping((prev) => prev.map((x) => ({ ...x, checked: target })));
    try {
      await Promise.all(toChange.map((x) => updateShopping(x.id, { checked: target })));
    } catch (e) { console.error("Errore selezione totale spesa:", e); }
  }
  async function adjustShoppingQty(it, delta) {
    const next = adjustQty(it.qty, delta);
    if (next === it.qty) return;
    // In lista non si scende sotto un passo (1 pz, 50 g, 0,25 kg/l).
    const m = String(next).replace(",", ".").match(/-?\d+(\.\d+)?/);
    if (delta < 0 && m && parseFloat(m[0]) <= 0) return;
    setShopping((prev) => prev.map((x) => (x.id === it.id ? { ...x, qty: next } : x)));
    try { await updateShopping(it.id, { qty: next }); }
    catch (e) { console.error("Errore aggiornamento quantità spesa:", e); }
  }
  // Rimuove i barrati, con possibilità di Annulla (li re-inserisce barrati).
  async function clearCheckedShopping() {
    const checked = shopping.filter((x) => x.checked);
    if (!checked.length) return;
    try {
      await deleteShoppingItems(checked.map((x) => x.id));
      setShopping((prev) => prev.filter((x) => !x.checked));
      showToast(
        `${checked.length} ${checked.length === 1 ? "articolo rimosso" : "articoli rimossi"} dalla lista`,
        async () => {
          try {
            const rows = await insertManyShopping(
              checked.map(({ name, qty }) => ({ name, qty, checked: true }))
            );
            setShopping((prev) => [...rows, ...prev]);
            dismissToast();
          } catch (e) { console.error("Errore ripristino lista:", e); }
        }
      );
    } catch (e) { console.error("Errore rimozione barrati:", e); }
  }
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
  // Aggiunge alla lista spesa gli ingredienti mancanti (chi è già in lista
  // viene saltato, senza toccarne la quantità).
  async function addMissingToShopping(names) {
    const existing = new Set(shopping.map((s) => norm(s.name)));
    const toAdd = (names || []).filter(Boolean).filter((n) => !existing.has(norm(n)));
    if (!toAdd.length) return;
    await addToShoppingMerged(toAdd.map((name) => ({ name, qty: "1" })));
  }

  // "Cosa mi manca": true se l'ingrediente trova corrispondenza in dispensa.
  function hasIngredient(name) {
    return !!findMatch(name, items);
  }

  // Sposta una categoria su/giù di una posizione rispetto a quelle visibili.
  function moveCategory(cat, dir) {
    const visible = grouped.map((g) => g.cat);
    const i = visible.indexOf(cat);
    const target = visible[i + dir];
    if (!target) return;
    setCatOrder((order) => {
      const arr = order.filter((c) => c !== cat);
      const ti = arr.indexOf(target);
      if (ti < 0) return order;
      arr.splice(dir > 0 ? ti + 1 : ti, 0, cat);
      return arr;
    });
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

  // --- Trascinamento categorie ---
  function onDragStart(e, cat) {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignora */ }
    dragCatRef.current = cat;
    setDragCat(cat);
  }
  function onDragMove(e) {
    if (!dragCatRef.current) return;
    const y = e.clientY;
    for (const cat in cardRefs.current) {
      const el = cardRefs.current[cat];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) {
        if (cat !== dragCatRef.current) moveInOrder(setCatOrder, dragCatRef.current, cat);
        break;
      }
    }
  }
  function onDragEnd() {
    dragCatRef.current = null;
    setDragCat(null);
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
      ], 1000);
      const raw = Array.isArray(parsed.items) ? parsed.items : [];
      // Rete di sicurezza: anche se l'AI non aggrega, uniamo qui i prodotti
      // con lo stesso nome sommando le quantità compatibili (mergeQty).
      const byName = new Map();
      for (const it of raw) {
        const name = String(it?.name || "").trim();
        if (!name) continue;
        const k = norm(name);
        const qty = normalizeWeight(String(it?.qty || "1").trim() || "1");
        if (byName.has(k)) {
          const ex = byName.get(k);
          ex.qty = normalizeWeight(mergeQty(ex.qty, qty));
        } else {
          byName.set(k, { name, qty, category: it?.category });
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
    let category = guessCategory(raw) || "Altro";
    if (raw) {
      try {
        const parsed = await aiCleanName(raw);
        if (parsed && parsed.name) {
          name = String(parsed.name).trim();
          category = CATEGORIES.includes(parsed.category) ? parsed.category : (guessCategory(name) || "Altro");
        }
      } catch (e) { console.error(e); }
    }
    name = name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";
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
        `Rispondi SOLO con JSON valido senza markdown: {"items":[{"name":"...","qty":"...","category":"..."}]} ` +
        `Categorie possibili: ${CATEGORIES.join(", ")}.`;
      const parsed = await callClaude([{ type: "text", text: prompt }], 800);
      const list = Array.isArray(parsed?.items) ? parsed.items : [];
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

  // Cambio scheda con dissolvenza (View Transition).
  function changeView(v) {
    if (v !== view) animateUI(() => setView(v));
  }

  // --- Ricette ---

  // Riga di preferenze alimentari iniettata in tutti i prompt di cucina.
  const prefLine = foodPrefs.trim()
    ? `Preferenze alimentari dell'utente, da rispettare SEMPRE: ${foodPrefs.trim()}. `
    : "";

  // Cache delle proposte per occasione (per utente, 24h): riaprire
  // un'occasione non consuma chiamate AI; "Altre idee" forza la rigenerazione.
  const IDEAS_TTL = 24 * 60 * 60 * 1000;
  const ideasKey = () => `dispensa-ideas-${session.user.id}`;
  function loadIdeasCache() {
    try { return JSON.parse(localStorage.getItem(ideasKey())) || {}; } catch { return {}; }
  }
  function saveIdeasCache(modeId, list) {
    try {
      const all = loadIdeasCache();
      all[modeId] = { ideas: list, ts: Date.now() };
      localStorage.setItem(ideasKey(), JSON.stringify(all));
    } catch { /* niente cache */ }
  }

  async function chooseMode(m, force = false) {
    // Richiesta libera ("Cosa ti va?"): niente cache, sempre fresca.
    if (!force && !m.custom) {
      const hit = loadIdeasCache()[m.id];
      if (hit && Array.isArray(hit.ideas) && hit.ideas.length && Date.now() - hit.ts < IDEAS_TTL) {
        animateUI(() => {
          setMode(m); setRecipe(null); setIdeas(hit.ideas); setRecipeErr(""); setLoadingIdeas(false);
        });
        return;
      }
    }
    animateUI(() => {
      setMode(m); setRecipe(null); setIdeas([]); setRecipeErr(""); setLoadingIdeas(true);
    });
    const fast = m.id === "Pranzo veloce" ? "Ogni ricetta deve essere pronta entro 20 minuti. " : "";
    const ask = m.custom
      ? `L'utente chiede: "${m.id}". Proponi esattamente 4 ricette diverse che soddisfino questa richiesta usando principalmente `
      : `Voglio idee per la categoria "${m.id}". Proponi esattamente 4 ricette diverse che usino principalmente `;
    const prompt =
      `Sei uno chef esperto di cucina casalinga. Questi sono gli alimenti nella mia dispensa: ${pantryStr}. ` +
      `${prefLine}${ask}ingredienti della mia dispensa (puoi assumere disponibili sale, acqua e olio). ${fast}` +
      `Rispondi SOLO con JSON valido senza markdown: ` +
      `{"recipes":[{"title":"...","description":"breve, max 14 parole","time":"es. 15 min","difficulty":"Facile|Media|Elaborata","imageQuery":"2-4 parole IN INGLESE per cercare una foto del piatto, es. spaghetti tomato"}]}`;
    try {
      const parsed = await callClaude([{ type: "text", text: prompt }], 1200);
      const list = Array.isArray(parsed.recipes) ? parsed.recipes : [];
      animateUI(() => { setIdeas(list); setLoadingIdeas(false); });
      if (!m.custom && list.length) saveIdeasCache(m.id, list);
      if (list.length) {
        fetchPhotos(list.map((r) => r.imageQuery || r.title)).then((urls) => {
          const withPhotos = list.map((r, i) => (urls[i] ? { ...r, image: urls[i] } : r));
          setIdeas(withPhotos);
          if (!m.custom) saveIdeasCache(m.id, withPhotos);
        });
      }
    } catch (err) {
      console.error(err);
      setRecipeErr(err?.status === 429
        ? "Limite di richieste AI raggiunto. Attendi qualche secondo e riprova."
        : "Errore nel generare le proposte. Riprova.");
      setLoadingIdeas(false);
    }
  }

  // "Cosa ti va?": proposte su una richiesta libera dell'utente.
  function askCustom(text) {
    const t = String(text || "").trim();
    if (!t) return;
    chooseMode({ id: t, icon: "✨", custom: true });
  }

  // Porzioni di partenza: la preferenza dell'utente, altrimenti quelle
  // della ricetta. Ogni cambio manuale viene ricordato ("a casa siamo in X").
  function initialServings(r) {
    return prefServings || Number(r?.servings) || 2;
  }
  function changeServings(n) {
    const v = Math.max(1, n);
    setServings(v);
    setPrefServings(v);
  }

  const savedByTitle = (title) =>
    savedRecipes.find((r) => norm(r.title) === norm(String(title || "")));

  async function openRecipe(title) {
    // Se è già nel ricettario, si apre da lì: istantanea e senza quota AI.
    const saved = savedByTitle(title);
    if (saved?.data?.steps?.length) {
      animateUI(() => {
        setRecipe({ ...saved.data, image: saved.data.image || saved.image || undefined });
        setServings(initialServings(saved.data));
        setRecipeErr(""); setLoadingRecipe(false); setCookDone("");
      });
      return;
    }
    animateUI(() => {
      setRecipe(null); setRecipeErr(""); setLoadingRecipe(true); setCookDone("");
    });
    const prompt =
      `Sei uno chef esperto. Dammi la ricetta completa e dettagliata per "${title}". ` +
      `Usa principalmente gli ingredienti della mia dispensa: ${pantryStr}. ${prefLine}` +
      `Indica le grammature per il numero di porzioni nel campo "servings". ` +
      `IMPORTANTISSIMO: usa SOLO unità di misura metriche (g, kg, ml, l) — mai cups, oz, tbsp, tsp. ` +
      `Per ogni passaggio che richiede attesa o cottura indica i minuti nel campo "timer" (numero), altrimenti null. ` +
      `Rispondi SOLO con JSON valido senza markdown: ` +
      `{"title":"...","servings":2,"time":"...","imageQuery":"2-4 parole IN INGLESE per la foto del piatto","ingredients":[{"name":"...","qty":"120 g"}],"steps":[{"text":"...","timer":10}]}`;
    try {
      // Spazio abbondante: le ricette lunghe troncavano il JSON (errore 502).
      const parsed = await callClaude([{ type: "text", text: prompt }], 2500);
      animateUI(() => { setRecipe(parsed); setServings(initialServings(parsed)); setLoadingRecipe(false); });
      fetchPhotos([parsed.imageQuery || parsed.title]).then((urls) => {
        if (urls[0]) setRecipe((prev) => (prev && prev.title === parsed.title ? { ...prev, image: urls[0] } : prev));
      });
    } catch (err) {
      console.error(err);
      setRecipeErr(err?.status === 429
        ? "Limite di richieste AI raggiunto. Attendi qualche secondo e riprova."
        : "Errore nel generare la ricetta. Riprova.");
      setLoadingRecipe(false);
    }
  }

  // --- Ricettario (salvate + cucinate) ---

  // Apre una ricetta del ricettario (nessuna chiamata AI).
  function openSavedRecipe(row) {
    if (!row?.data) return;
    animateUI(() => {
      setMode(null); setIdeas([]); setRecipeErr(""); setCookDone(""); setLoadingRecipe(false);
      setRecipe({ ...row.data, image: row.data.image || row.image || undefined });
      setServings(initialServings(row.data));
    });
  }

  // Aggiorna stato + copia locale insieme (la copia locale è la fonte sicura).
  function commitRecipes(next) {
    setSavedRecipes(next);
    saveSavedRecipes(session.user.id, next);
  }
  // Sincronizza una riga sul DB "best effort": se la tabella manca o c'è un
  // errore non si mostra nulla all'utente (la copia locale ha già salvato).
  // Quando l'upsert riesce, rimpiazza la riga locale con quella reale (id DB).
  function syncRecipeUpsert(localId, fields) {
    upsertSavedRecipe(fields)
      .then((row) => {
        if (!row) return;
        setSavedRecipes((prev) => {
          const next = prev.map((r) => (r.id === localId ? row : r));
          saveSavedRecipes(session.user.id, next);
          return next;
        });
      })
      .catch((e) => console.warn("Sync ricetta sul DB non riuscito (tengo il locale).", e?.message || e));
  }

  // Cuore sulla ricetta aperta: salva/rimuove dal ricettario (local-first).
  function toggleSaveRecipe() {
    if (!recipe) return;
    const ex = savedByTitle(recipe.title);
    if (ex && ex.saved) {
      // Tolto il cuore: se mai cucinata si elimina, altrimenti resta nello storico.
      if (ex.cooked_count > 0) {
        commitRecipes(savedRecipes.map((r) => (r.id === ex.id ? { ...r, saved: false } : r)));
        updateSavedRecipe(ex.id, { saved: false }).catch(() => {});
      } else {
        commitRecipes(savedRecipes.filter((r) => r.id !== ex.id));
        deleteSavedRecipe(ex.id).catch(() => {});
      }
    } else if (ex) {
      commitRecipes(savedRecipes.map((r) => (r.id === ex.id ? { ...r, saved: true } : r)));
      updateSavedRecipe(ex.id, { saved: true }).catch(() => {});
    } else {
      const id = localRecipeId();
      const row = {
        id, title: recipe.title, data: recipe, image: recipe.image || null,
        saved: true, cooked_count: 0, last_cooked_at: null, created_at: new Date().toISOString(),
      };
      commitRecipes([row, ...savedRecipes]);
      syncRecipeUpsert(id, { title: recipe.title, data: recipe, image: recipe.image || null, saved: true });
    }
  }

  // Registra una cottura nello storico (chiamata da "Ho cucinato questo").
  function recordCookedRecipe() {
    if (!recipe) return;
    const ex = savedByTitle(recipe.title);
    const now = new Date().toISOString();
    if (ex) {
      const fields = { cooked_count: (ex.cooked_count || 0) + 1, last_cooked_at: now };
      commitRecipes(savedRecipes.map((r) => (r.id === ex.id ? { ...r, ...fields } : r)));
      updateSavedRecipe(ex.id, fields).catch(() => {});
    } else {
      const id = localRecipeId();
      const row = {
        id, title: recipe.title, data: recipe, image: recipe.image || null,
        saved: false, cooked_count: 1, last_cooked_at: now, created_at: now,
      };
      commitRecipes([row, ...savedRecipes]);
      syncRecipeUpsert(id, {
        title: recipe.title, data: recipe, image: recipe.image || null,
        saved: false, cooked_count: 1, last_cooked_at: now,
      });
    }
  }

  // Elimina una riga del ricettario (con Annulla).
  function removeSavedRecipe(row) {
    commitRecipes(savedRecipes.filter((r) => r.id !== row.id));
    deleteSavedRecipe(row.id).catch(() => {});
    showToast(<><strong>{row.title}</strong> rimossa dal ricettario</>, () => {
      const id = localRecipeId();
      const back = { ...row, id };
      commitRecipes([back, ...savedRecipes.filter((r) => r.id !== row.id)]);
      syncRecipeUpsert(id, {
        title: row.title, data: row.data, image: row.image, saved: row.saved,
        cooked_count: row.cooked_count, last_cooked_at: row.last_cooked_at,
      });
      dismissToast();
    });
  }

  function backToModes() {
    animateUI(() => { setMode(null); setIdeas([]); setRecipe(null); setRecipeErr(""); setCookDone(""); });
  }
  function backToIdeas() {
    animateUI(() => { setRecipe(null); setRecipeErr(""); setCookDone(""); });
  }

  // --- Scadenze: prodotti che scadono entro 7 giorni (o già scaduti) ---
  const isExpiring = (x) => {
    const d = daysUntilExpiry(x.expiry);
    return d !== null && d <= 7;
  };
  const expiringItems = items.filter(isExpiring);

  // Se il filtro scadenze resta attivo ma non c'è più nulla, si spegne da solo.
  useEffect(() => {
    if (expFilter && expiringItems.length === 0) setExpFilter(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiringItems.length]);

  // Un prodotto è "finito" se la sua quantità numerica è 0.
  const isOut = (x) => {
    const m = String(x.qty).replace(",", ".").match(/-?\d+(\.\d+)?/);
    return !!m && parseFloat(m[0]) === 0;
  };

  // "Finito → in lista": dalla riga del prodotto esaurito.
  async function finishedToShopping(it) {
    await addToShoppingMerged([{ name: it.name, qty: "1" }]);
    showToast(<><strong>{it.name}</strong> aggiunto alla lista della spesa</>);
  }

  // "Cucina con questi": manda i prodotti in scadenza alle Ricette.
  function cookWithExpiring() {
    const names = expiringItems.filter((x) => !isOut(x)).map((x) => x.name).slice(0, 8);
    if (!names.length) return;
    changeView("ricette");
    askCustom(`qualcosa per usare subito: ${names.join(", ")}`);
  }

  // --- Derivati ---
  const q = norm(search);
  function sortList(list) {
    const arr = [...list];
    if (sort === "nome") {
      arr.sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
    } else if (sort === "scadenza") {
      arr.sort((a, b) => {
        const da = a.expiry ? daysUntilExpiry(a.expiry) : Infinity;
        const db = b.expiry ? daysUntilExpiry(b.expiry) : Infinity;
        return da - db;
      });
    } else {
      // "recenti": più recenti in cima (created_at desc)
      arr.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    }
    return arr;
  }
  const grouped = catOrder
    .map((c) => {
      let list = items.filter((x) => x.category === c);
      if (q) list = list.filter((x) => norm(x.name).includes(q));
      if (expFilter) list = list.filter(isExpiring);
      return { cat: c, list: sortList(list) };
    })
    .filter((g) => g.list.length > 0);
  const total = items.length;
  const allCollapsed = grouped.length > 0 && grouped.every((g) => collapsed[g.cat]);

  // Apri/chiudi tutte le categorie visibili: se almeno una è aperta le chiude
  // tutte, altrimenti le apre tutte.
  function toggleAllCategories() {
    const anyOpen = grouped.some((g) => !collapsed[g.cat]);
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const g of grouped) next[g.cat] = anyOpen;
      return next;
    });
  }
  const orderedModes = modeOrder.map((id) => MODES.find((m) => m.id === id)).filter(Boolean);

  const baseServings = recipe ? (Number(recipe.servings) || 2) : 1;
  const factor = servings / baseServings;

  // --- "Ho cucinato questo" ---

  // Per le righe che la matematica locale non risolve (es. "1 pacco" meno
  // "320 g"), l'AI stima quanto rimane usando i formati tipici delle
  // confezioni italiane; la stima arriva precompilata e si può correggere.
  async function estimateCookRows(rows) {
    const pending = rows.filter((r) => !r.auto);
    if (!pending.length) return;
    setCookEstimating(true);
    try {
      const prompt =
        `Sei un assistente di cucina italiano. Per ogni prodotto ti do la quantità in dispensa ` +
        `(a volte in pezzi/pacchi/confezioni) e quanto ne è stato usato in una ricetta. ` +
        `Stima quanto rimane VEROSIMILMENTE, basandoti sui formati tipici delle confezioni italiane ` +
        `(es. pasta 500 g, riso 1 kg, passata 700 g, tonno 80 g, latte 1 l). ` +
        `Esprimi il rimanente in unità metriche (g, kg, ml, l) oppure in pezzi se più sensato; "0" se finito. ` +
        `Prodotti: ${JSON.stringify(pending.map((p) => ({ nome: p.name, in_dispensa: p.before, usato: p.used })))} ` +
        `Rispondi SOLO con JSON valido senza markdown: {"items":[{"nome":"...","rimane":"..."}]}`;
      const parsed = await callClaude([{ type: "text", text: prompt }], 400);
      const map = new Map((parsed?.items || []).map((x) => [norm(x.nome), String(x.rimane ?? "").trim()]));
      setCookRows((prev) => prev.map((r) => {
        if (r.auto) return r;
        const est = map.get(norm(r.name));
        return est ? { ...r, after: est, estimated: true } : r;
      }));
    } catch (e) {
      console.warn("Stima AI non disponibile:", e?.message || e);
    }
    setCookEstimating(false);
  }

  function openCookModal() {
    if (!recipe) return;
    const rows = [];
    const seen = new Set();
    for (const ing of (recipe.ingredients || [])) {
      const match = findMatch(ing.name, items);
      if (!match || seen.has(match.id)) continue;
      seen.add(match.id);
      const used = scaleQty(ing.qty, factor);
      const sub = subtractQty(match.qty, used);
      rows.push({
        itemId: match.id, name: match.name, used,
        before: match.qty, after: sub.ok ? sub.value : match.qty, auto: sub.ok,
      });
    }
    setCookRows(rows);
    setCookOpen(true);
    estimateCookRows(rows); // parte in background, precompila le righe ambigue
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
        "In lista spesa"
      );
    }
  }

  const inputCls =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200";

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
      <div className={`mx-auto max-w-md px-5 pt-7 ${view === "dispensa" ? "pb-52" : "pb-28"}`}>
        {view === "dispensa" && (
          <PantryTab
            onOpenProfile={() => setProfileOpen(true)}
            userInitial={(session.user.email || "?").trim().charAt(0).toUpperCase()}
            search={search} setSearch={setSearch} sort={sort} setSort={setSort}
            grouped={grouped} cardRefs={cardRefs}
            onMoveCat={moveCategory}
            onAutoSave={autoSaveItem} onSetExpiry={setItemExpiry} removeItem={removeItem}
            expiringCount={expiringItems.length} expFilter={expFilter} setExpFilter={setExpFilter}
            onCookExpiring={cookWithExpiring} isOut={isOut} onToShopping={finishedToShopping}
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

      {/* Il badge conta solo ciò che resta da comprare */}
      <BottomNav view={view} setView={changeView} shoppingCount={shopping.filter((s) => !s.checked).length} />

      {view === "dispensa" && (
        <AddFab
          menuOpen={addMenuOpen}
          setMenuOpen={setAddMenuOpen}
          onManual={() => setManualOpen(true)}
          onPhoto={() => setReceiptOpen(true)}
          onBarcode={() => setBarcodeOpen(true)}
          onVoice={() => setVoiceOpen(true)}
        />
      )}

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
          <div className="relative flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-2xl bg-tomato/15" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-tomato/10 text-5xl">🧾</div>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-tomato" />
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight text-ink">Sto analizzando lo scontrino…</p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-stone-500">
              Identifico i prodotti e li aggiungo automaticamente alla tua lista.
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
          onClearPantry={() => setConfirmClear(true)}
          onLogout={logout}
        />
      )}

      {confirmClear && (
        <ConfirmClearModal onCancel={() => setConfirmClear(false)} onConfirm={clearPantry} />
      )}

      {cookOpen && (
        <CookModal
          rows={cookRows}
          estimating={cookEstimating}
          onClose={() => setCookOpen(false)}
          onSetAfter={setRowAfter}
          onRemoveRow={removeRow}
          onApply={applyCooked}
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

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} actionLabel={toast.actionLabel} actionTone={toast.actionTone} />}
    </div>
  );
}
