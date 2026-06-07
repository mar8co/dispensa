import { useState, useEffect, useRef } from "react";
import { Loader2, Package, ChefHat, ShoppingCart, LogOut } from "lucide-react";

import {
  CATEGORIES, MODES, RECEIPT_PROMPT, SEED_DATA,
} from "./constants.js";
import {
  guessCategory, correctName,
  normalizeWeight, mergeQty, scaleQty, subtractQty, findMatch,
  adjustQty, norm, daysUntilExpiry,
} from "./lib/pantry.js";
import { callClaude, fileToBase64 } from "./lib/claude.js";
import { supabase } from "./lib/supabase.js";
import {
  fetchPantry, insertItem, insertMany, updateItem,
  deleteItem, deleteItems, deleteAllPantry,
  fetchSettings, saveSettings,
  fetchShopping, insertShopping, insertManyShopping,
  updateShopping, deleteShopping, deleteShoppingItems,
} from "./lib/db.js";

import { loadCache, saveCache } from "./lib/cache.js";

import PantryTab from "./components/PantryTab.jsx";
import RecipesTab from "./components/RecipesTab.jsx";
import ShoppingTab from "./components/ShoppingTab.jsx";
import CookModal from "./components/CookModal.jsx";
import ConfirmClearModal from "./components/ConfirmClearModal.jsx";
import ReviewScanModal from "./components/ReviewScanModal.jsx";
import Toast from "./components/Toast.jsx";

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
  const [grams, setGrams] = useState(false);
  const [newExpiry, setNewExpiry] = useState("");
  const [adding, setAdding] = useState(false);

  // ricerca / ordinamento
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recenti");

  // modifica
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editCat, setEditCat] = useState(CATEGORIES[0]);
  const [editExpiry, setEditExpiry] = useState("");

  // lista della spesa
  const [shopping, setShopping] = useState([]);
  const [movingChecked, setMovingChecked] = useState(false);

  // toast / undo
  const [toast, setToast] = useState(null); // { message, onUndo? }
  const toastTimer = useRef(null);

  // stato connessione (per indicatore offline)
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // scontrino
  const [processing, setProcessing] = useState(false);
  const [receiptMsg, setReceiptMsg] = useState("");
  const [receiptErr, setReceiptErr] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanItems, setScanItems] = useState([]);

  // ricette
  const [mode, setMode] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [servings, setServings] = useState(1);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipeErr, setRecipeErr] = useState("");

  // "Ho cucinato questo"
  const [cookOpen, setCookOpen] = useState(false);
  const [cookRows, setCookRows] = useState([]);
  const [cookDone, setCookDone] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // Applica le impostazioni (da cache o da DB) a catOrder/modeOrder.
  // NB: lo stato "collassato" NON viene ripristinato: le categorie partono
  // sempre chiuse a ogni apertura/ricarica dell'app (default voluto).
  function applySettings(s) {
    if (!s || typeof s !== "object") return;
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
        setItems(rows);
        try { applySettings(await fetchSettings()); } catch (e) { console.error(e); }
        try { setShopping(await fetchShopping()); } catch (e) { console.error(e); }
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
      settings: { collapsed, catOrder, modeOrder },
    });
  }, [items, shopping, collapsed, catOrder, modeOrder, loaded]);

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

  // Mostra un toast (con eventuale azione "Annulla") per ~6 secondi.
  function showToast(message, onUndo) {
    clearTimeout(toastTimer.current);
    setToast({ message, onUndo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }
  function dismissToast() {
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  // --- Persistenza impostazioni (jsonb sincronizzato) ---
  useEffect(() => {
    if (!loaded) return;
    saveSettings({ collapsed, catOrder, modeOrder }).catch((e) =>
      console.error("Errore salvataggio impostazioni:", e)
    );
  }, [collapsed, catOrder, modeOrder, loaded]);

  const pantryStr = items.map((i) => `${i.name} (${i.qty})`).join(", ");

  // --- Operazioni dispensa (scrivono su Supabase + aggiornano lo stato) ---
  async function addManual() {
    const raw = newName.trim();
    if (!raw || adding) return;
    const n = String(newQty).trim() || "1";
    const qty = normalizeWeight(grams ? `${n} gr` : n);
    setAdding(true);
    let name = correctName(raw);
    let category = guessCategory(name) || "Altro";
    try {
      const prompt =
        `Sei un assistente per una dispensa italiana. Dall'input dell'utente estrai SOLO il nome dell'alimento, ` +
        `togliendo marca, grammature, formati e parole promozionali, ma mantenendo le qualità rilevanti ` +
        `(es. "greco", "integrale", "fresco", "in scatola"). ` +
        `Esempi: "Meteora yogurt greco 500g" -> "Yogurt greco"; "ceci la fiammante 400g" -> "Ceci". ` +
        `Assegna una categoria tra: ${CATEGORIES.join(", ")}. Input: "${raw}". ` +
        `Rispondi SOLO con JSON valido senza markdown: {"name":"...","category":"..."}`;
      const parsed = await callClaude([{ type: "text", text: prompt }], 200);
      if (parsed && parsed.name) {
        const s = String(parsed.name).trim();
        name = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        category = CATEGORIES.includes(parsed.category) ? parsed.category : (guessCategory(name) || "Altro");
      }
    } catch (e) {
      console.error(e);
    }
    const expiry = newExpiry || null;
    try {
      const existing = items.find((x) => x.name.trim().toLowerCase() === name.toLowerCase());
      if (existing) {
        const merged = normalizeWeight(mergeQty(existing.qty, qty));
        const fields = { qty: merged };
        if (expiry) fields.expiry = expiry; // aggiorna la scadenza solo se indicata
        await updateItem(existing.id, fields);
        setItems((prev) => prev.map((x) => (x.id === existing.id ? { ...x, ...fields } : x)));
      } else {
        const row = await insertItem({ name, qty, category, expiry });
        setItems((prev) => [...prev, row]);
      }
    } catch (e) {
      console.error("Errore aggiunta prodotto:", e);
    }
    setNewName(""); setNewQty("1"); setNewExpiry(""); setAdding(false);
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

  // +/- rapido sulla quantità (senza entrare in modifica).
  async function adjustItemQty(it, delta) {
    const next = adjustQty(it.qty, delta);
    if (next === it.qty) return;
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, qty: next } : x)));
    try {
      await updateItem(it.id, { qty: next });
    } catch (e) {
      console.error("Errore aggiornamento quantità:", e);
    }
  }

  function startEdit(it) {
    setEditId(it.id); setEditName(it.name); setEditQty(it.qty);
    setEditCat(it.category); setEditExpiry(it.expiry || "");
  }

  async function saveEdit() {
    const orig = items.find((x) => x.id === editId);
    const name = editName.trim() || (orig ? orig.name : "");
    const fields = { name, qty: editQty.trim(), category: editCat, expiry: editExpiry || null };
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
  async function addShoppingItem(name, qty) {
    try {
      const row = await insertShopping({ name, qty });
      setShopping((prev) => [...prev, row]);
    } catch (e) { console.error("Errore aggiunta spesa:", e); }
  }
  async function toggleShoppingItem(id, checked) {
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
            setShopping((prev) => [...prev, row]);
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
    const cur = parseFloat(String(it.qty).replace(",", ".")) || 1;
    if (delta < 0 && cur <= 1) return; // minimo 1 nella lista spesa
    const next = adjustQty(it.qty, delta);
    if (next === it.qty) return;
    setShopping((prev) => prev.map((x) => (x.id === it.id ? { ...x, qty: next } : x)));
    try { await updateShopping(it.id, { qty: next }); }
    catch (e) { console.error("Errore aggiornamento quantità spesa:", e); }
  }
  async function clearCheckedShopping() {
    const ids = shopping.filter((x) => x.checked).map((x) => x.id);
    if (!ids.length) return;
    try {
      await deleteShoppingItems(ids);
      setShopping((prev) => prev.filter((x) => !x.checked));
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
      showToast(`${checked.length} ${checked.length === 1 ? "prodotto spostato" : "prodotti spostati"} in dispensa`);
    } catch (e) { console.error("Errore spostamento in dispensa:", e); }
    setMovingChecked(false);
  }
  // Aggiunge alla lista spesa gli ingredienti mancanti (no duplicati per nome).
  async function addMissingToShopping(names) {
    const existing = new Set(shopping.map((s) => s.name.trim().toLowerCase()));
    const toAdd = (names || [])
      .filter(Boolean)
      .filter((n) => !existing.has(n.trim().toLowerCase()));
    if (!toAdd.length) return;
    try {
      const rows = await insertManyShopping(toAdd.map((name) => ({ name, qty: "1" })));
      setShopping((prev) => [...prev, ...rows]);
    } catch (e) { console.error("Errore aggiunta mancanti:", e); }
  }

  // "Cosa mi manca": true se l'ingrediente trova corrispondenza in dispensa.
  function hasIngredient(name) {
    return !!findMatch(name, items);
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
  async function handleReceipt(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setReceiptErr(""); setReceiptMsg(""); setProcessing(true);
    try {
      const data64 = await fileToBase64(file);
      const media_type = file.type || "image/jpeg";
      const parsed = await callClaude([
        { type: "image", source: { type: "base64", media_type, data: data64 } },
        { type: "text", text: RECEIPT_PROMPT },
      ], 1000);
      const list = Array.isArray(parsed.items) ? parsed.items : [];
      if (!list.length) setReceiptErr("Nessun alimento riconosciuto nell'immagine.");
      else {
        // Non aggiunge subito: apre la modale di revisione per nome/categoria.
        setScanItems(list);
        setScanOpen(true);
      }
    } catch (err) {
      console.error(err);
      setReceiptErr("Impossibile leggere l'immagine. Riprova con una foto più nitida.");
    } finally {
      setProcessing(false);
      input.value = "";
    }
  }

  // Conferma dei prodotti rivisti nella modale: vengono aggiunti alla dispensa.
  async function confirmScan(reviewed) {
    setScanOpen(false);
    const valid = (reviewed || []).filter((x) => String(x.name || "").trim());
    if (valid.length) {
      await mergeItems(valid);
      setReceiptMsg(`${valid.length} prodotti aggiunti.`);
    }
    setScanItems([]);
  }

  // --- Ricette ---
  async function chooseMode(m) {
    setMode(m); setRecipe(null); setIdeas([]); setRecipeErr(""); setLoadingIdeas(true);
    const fast = m.id === "Pranzo veloce" ? "Ogni ricetta deve essere pronta entro 20 minuti. " : "";
    const prompt =
      `Sei uno chef esperto di cucina casalinga. Questi sono gli alimenti nella mia dispensa: ${pantryStr}. ` +
      `Voglio idee per la categoria "${m.id}". Proponi esattamente 4 ricette diverse che usino principalmente ` +
      `ingredienti della mia dispensa (puoi assumere disponibili sale, acqua e olio). ${fast}` +
      `Rispondi SOLO con JSON valido senza markdown: ` +
      `{"recipes":[{"title":"...","description":"breve, max 14 parole","time":"es. 15 min","difficulty":"Facile|Media|Elaborata"}]}`;
    try {
      const parsed = await callClaude([{ type: "text", text: prompt }], 1000);
      setIdeas(Array.isArray(parsed.recipes) ? parsed.recipes : []);
    } catch (err) {
      console.error(err);
      setRecipeErr("Errore nel generare le proposte. Riprova.");
    } finally {
      setLoadingIdeas(false);
    }
  }

  async function openRecipe(title) {
    setRecipe(null); setRecipeErr(""); setLoadingRecipe(true); setCookDone("");
    const prompt =
      `Sei uno chef esperto. Dammi la ricetta completa e dettagliata per "${title}". ` +
      `Usa principalmente gli ingredienti della mia dispensa: ${pantryStr}. ` +
      `Indica le grammature per il numero di porzioni nel campo "servings". ` +
      `IMPORTANTISSIMO: usa SOLO unità di misura metriche (g, kg, ml, l) — mai cups, oz, tbsp, tsp. ` +
      `Per ogni passaggio che richiede attesa o cottura indica i minuti nel campo "timer" (numero), altrimenti null. ` +
      `Rispondi SOLO con JSON valido senza markdown: ` +
      `{"title":"...","servings":2,"time":"...","ingredients":[{"name":"...","qty":"120 g"}],"steps":[{"text":"...","timer":10}]}`;
    try {
      const parsed = await callClaude([{ type: "text", text: prompt }], 1500);
      setRecipe(parsed);
      setServings(1);
    } catch (err) {
      console.error(err);
      setRecipeErr("Errore nel generare la ricetta. Riprova.");
    } finally {
      setLoadingRecipe(false);
    }
  }

  function backToModes() { setMode(null); setIdeas([]); setRecipe(null); setRecipeErr(""); setCookDone(""); }
  function backToIdeas() { setRecipe(null); setRecipeErr(""); setCookDone(""); }

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
  }

  const inputCls =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200";

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <div className="mx-auto max-w-md px-4 pt-6 pb-8">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4.5" y="3.5" width="15" height="15" rx="1.6" fill="white" fillOpacity="0.18" />
              <line x1="4.5" y1="6.8" x2="19.5" y2="6.8" />
              <line x1="12" y1="6.8" x2="12" y2="18.5" />
              <circle cx="10.6" cy="12.5" r="0.75" fill="white" stroke="none" />
              <circle cx="13.4" cy="12.5" r="0.75" fill="white" stroke="none" />
              <line x1="6.8" y1="18.5" x2="6.8" y2="20.3" />
              <line x1="17.2" y1="18.5" x2="17.2" y2="20.3" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold leading-tight">Ciao! Hai fame?</h1>
            <p className="flex items-center gap-2 text-xs text-stone-500">
              <span>{total} prodotti · {grouped.length} categorie</span>
              {!online && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  offline
                </span>
              )}
            </p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            aria-label="Esci"
            title="Esci"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-stone-200/70 p-1">
          <button
            onClick={() => setView("dispensa")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
              view === "dispensa" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"
            }`}
          >
            <Package className="h-4 w-4" /> Dispensa
          </button>
          <button
            onClick={() => setView("ricette")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
              view === "ricette" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"
            }`}
          >
            <ChefHat className="h-4 w-4" /> Ricette
          </button>
          <button
            onClick={() => setView("spesa")}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
              view === "spesa" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"
            }`}
          >
            <ShoppingCart className="h-4 w-4" /> Spesa
            {shopping.length > 0 && (
              <span className="ml-0.5 rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">
                {shopping.length}
              </span>
            )}
          </button>
        </div>

        {view === "dispensa" && (
          <PantryTab
            inputCls={inputCls}
            processing={processing} receiptMsg={receiptMsg} receiptErr={receiptErr} handleReceipt={handleReceipt}
            search={search} setSearch={setSearch} sort={sort} setSort={setSort}
            grouped={grouped} collapsed={collapsed} setCollapsed={setCollapsed} cardRefs={cardRefs}
            allCollapsed={allCollapsed} onToggleAll={toggleAllCategories}
            dragCat={dragCat} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}
            onAdjustQty={adjustItemQty}
            editId={editId} editName={editName} setEditName={setEditName} editQty={editQty} setEditQty={setEditQty}
            editCat={editCat} setEditCat={setEditCat} editExpiry={editExpiry} setEditExpiry={setEditExpiry}
            startEdit={startEdit} saveEdit={saveEdit} setEditId={setEditId} removeItem={removeItem}
            setConfirmClear={setConfirmClear}
            newName={newName} setNewName={setNewName} newQty={newQty} setNewQty={setNewQty}
            grams={grams} setGrams={setGrams} adding={adding} addManual={addManual}
            newExpiry={newExpiry} setNewExpiry={setNewExpiry}
          />
        )}

        {view === "ricette" && (
          <RecipesTab
            orderedModes={orderedModes} mode={mode} modeCardRefs={modeCardRefs}
            dragMode={dragMode} onModeDragStart={onModeDragStart} onModeDragMove={onModeDragMove}
            onModeDragEnd={onModeDragEnd} chooseMode={chooseMode}
            ideas={ideas} loadingIdeas={loadingIdeas} openRecipe={openRecipe} backToModes={backToModes}
            recipe={recipe} loadingRecipe={loadingRecipe} recipeErr={recipeErr}
            servings={servings} setServings={setServings} factor={factor} backToIdeas={backToIdeas}
            openCookModal={openCookModal} cookDone={cookDone}
            hasIngredient={hasIngredient} onAddMissing={addMissingToShopping}
          />
        )}

        {view === "spesa" && (
          <ShoppingTab
            inputCls={inputCls}
            shopping={shopping}
            onAdd={addShoppingItem}
            onToggle={toggleShoppingItem}
            onDelete={removeShoppingItem}
            onAdjustQty={adjustShoppingQty}
            onToggleAll={toggleAllShopping}
            onMoveChecked={moveCheckedToPantry}
            onClearChecked={clearCheckedShopping}
            movingChecked={movingChecked}
          />
        )}
      </div>

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
        />
      )}

      {scanOpen && (
        <ReviewScanModal
          initialItems={scanItems}
          onCancel={() => { setScanOpen(false); setScanItems([]); }}
          onConfirm={confirmScan}
        />
      )}

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} />}
    </div>
  );
}
