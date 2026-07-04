// Stato e logica della Lista della spesa: collezione articoli, aggiunta con
// merge dei duplicati, modifica/spunta/rimozione, vista per reparto, aggiunta a
// voce e storico acquisti (per suggerimenti e "frequenti").
//
// Confine: lo spostamento "Sposta in dispensa" (moveCheckedToPantry) resta in
// Dispensa.jsx perché è un bridge verso la dispensa (scrive pantry_items); usa
// le funzioni qui esposte (shopping, setShopping, bumpShopHistory,
// setMovingChecked) insieme a mergeItems della dispensa. I reparti corretti a
// mano (shopCats) e la vista per reparto (byAisle) restano impostazioni in
// Dispensa e sono passati qui dove servono.
import { useState } from "react";
import { callClaude, aiErrorMessage } from "../lib/claude.js";
import { enqueue } from "../lib/outbox.js";
import { newLocalId } from "../lib/sync.js";
import {
  norm, normalizeWeight, mergeQty, correctName, adjustQty, guessCategory,
} from "../lib/pantry.js";
import { CATEGORIES, NAME_RULES } from "../constants.js";
import {
  updateShopping, insertShopping, insertManyShopping,
  deleteShopping, deleteShoppingItems,
} from "../lib/db.js";
import { loadHistory, saveHistory, bumpedHistory } from "../lib/history.js";
import { tourSignal } from "../lib/tour.js";

export function useShopping({ session, showToast, dismissToast, shopCats, setShopCats }) {
  const uid = session.user.id;

  // lista della spesa
  const [shopping, setShopping] = useState([]);
  const [movingChecked, setMovingChecked] = useState(false);
  const [shopHist, setShopHist] = useState(() => loadHistory(uid)); // storico per suggerimenti
  const [shopVoiceOpen, setShopVoiceOpen] = useState(false);
  const [shopVoiceProcessing, setShopVoiceProcessing] = useState(false);

  // Aggiorna lo storico acquisti (per i suggerimenti e i "frequenti").
  function bumpShopHistory(names) {
    setShopHist((prev) => {
      const next = bumpedHistory(prev, names);
      saveHistory(uid, next);
      return next;
    });
  }

  // --- Scrittura resiliente all'offline (outbox v2) ---
  // Lo stato locale è già ottimistico; la scrittura sul DB parte in background
  // e, se fallisce (offline), finisce nell'outbox. Il replay vive in
  // Dispensa.jsx (dopo la risoluzione del nucleo) via lib/sync.js → applyOp.
  function persistUpdate(id, fields) {
    updateShopping(id, fields).catch(() => enqueue(uid, { table: "shopping", type: "update", id, fields }));
  }
  function persistDelete(id) {
    deleteShopping(id).catch(() => enqueue(uid, { table: "shopping", type: "delete", id }));
  }
  function persistInsertMany(rows) {
    insertManyShopping(rows).catch(() => {
      for (const r of rows) enqueue(uid, { table: "shopping", type: "insert", id: r.id, row: r });
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
    const restore = new Set(); // id di articoli da riportare dal carrello alla lista
    const inserts = new Map(); // nome normalizzato -> { name, qty }
    for (const e of entries || []) {
      const name = String(e.name || "").trim();
      if (!name) continue;
      const qty = normalizeWeight(String(e.qty || "1").trim() || "1");
      const k = norm(name);
      const ex = byNorm.get(k);
      if (ex) {
        updates.set(ex.id, normalizeWeight(mergeQty(updates.get(ex.id) ?? ex.qty, qty)));
        // Se era già nel carrello (acquistato), ri-aggiungerlo è un NUOVO
        // bisogno: torna in lista (checked=false), non resta tra i presi.
        if (ex.checked) restore.add(ex.id);
      }
      else if (inserts.has(k)) inserts.get(k).qty = normalizeWeight(mergeQty(inserts.get(k).qty, qty));
      else inserts.set(k, { name, qty });
    }
    // Righe nuove con id client-side definitivo: stato aggiornato SUBITO
    // (in cima; i duplicati restano dove sono, cambia solo la quantità),
    // persistenza in background resiliente all'offline.
    const newRows = [...inserts.values()].map((e) => ({ id: newLocalId(), name: e.name, qty: e.qty }));
    setShopping((prev) => [
      ...newRows.map((r) => ({ ...r, checked: false, created_at: new Date().toISOString() })),
      ...prev.map((x) => {
        if (!updates.has(x.id)) return x;
        const next = { ...x, qty: updates.get(x.id) };
        if (restore.has(x.id)) next.checked = false; // riportato in lista
        return next;
      }),
    ]);
    for (const [id, qty] of updates) persistUpdate(id, restore.has(id) ? { qty, checked: false } : { qty });
    if (newRows.length) persistInsertMany(newRows);
    bumpShopHistory((entries || []).map((e) => e.name));
    return { added: newRows.length, merged: updates.size, restored: restore.size };
  }

  // Aggiunta manuale alla spesa: correzione ortografica locale (stesso
  // dizionario della dispensa, zero AI) + prima lettera maiuscola.
  async function addShoppingItem(name, qty) {
    const res = await addToShoppingMerged([{ name: correctName(String(name)), qty }]);
    tourSignal("shopping-added");
    return { merged: res.merged > 0, restored: res.restored > 0 };
  }

  // Salvataggio automatico dal pannello di modifica della spesa (come quello
  // della dispensa) ma SILENZIOSO: nessun toast "Modifica salvata".
  // Nome/quantità sul DB, reparto nelle impostazioni.
  async function autoSaveShopping(it, fields) {
    const { category, ...rowFields } = fields;
    if (Object.keys(rowFields).length) {
      setShopping((prev) => prev.map((x) => (x.id === it.id ? { ...x, ...rowFields } : x)));
      persistUpdate(it.id, rowFields);
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
      showToast(aiErrorMessage(e, "Errore nell'elaborare la voce. Riprova."));
    }
  }
  async function toggleShoppingItem(id, checked) {
    if (checked) {
      const it = shopping.find((x) => x.id === id);
      if (it) showToast(<><strong>{it.name}</strong> spostato nel carrello</>, undefined, undefined, undefined, 3500);
    }
    setShopping((prev) => prev.map((x) => (x.id === id ? { ...x, checked } : x)));
    persistUpdate(id, { checked });
  }
  async function removeShoppingItem(id) {
    const it = shopping.find((x) => x.id === id);
    setShopping((prev) => prev.filter((x) => x.id !== id));
    persistDelete(id);
    if (it) {
      // Undo con id NUOVO: se la delete è ancora in coda offline, il replay
      // resta corretto (prima cancella il vecchio id, poi inserisce il nuovo).
      showToast(<><strong>{it.name}</strong> rimosso dalla lista</>, () => {
        const row = { id: newLocalId(), name: it.name, qty: it.qty };
        setShopping((prev) => [{ ...row, checked: false, created_at: new Date().toISOString() }, ...prev]);
        insertShopping(row).catch(() => enqueue(uid, { table: "shopping", type: "insert", id: row.id, row }));
        dismissToast();
      });
    }
  }
  // Seleziona/deseleziona tutti gli articoli della spesa.
  async function toggleAllShopping() {
    if (!shopping.length) return;
    const target = !shopping.every((x) => x.checked);
    const toChange = shopping.filter((x) => x.checked !== target);
    setShopping((prev) => prev.map((x) => ({ ...x, checked: target })));
    toChange.forEach((x) => persistUpdate(x.id, { checked: target }));
  }
  async function adjustShoppingQty(it, delta) {
    const next = adjustQty(it.qty, delta);
    if (next === it.qty) return;
    // In lista non si scende sotto un passo (1 pz, 50 g, 0,25 kg/l).
    const m = String(next).replace(",", ".").match(/-?\d+(\.\d+)?/);
    if (delta < 0 && m && parseFloat(m[0]) <= 0) return;
    setShopping((prev) => prev.map((x) => (x.id === it.id ? { ...x, qty: next } : x)));
    persistUpdate(it.id, { qty: next });
  }
  // Rimuove i barrati, con possibilità di Annulla (li re-inserisce barrati).
  async function clearCheckedShopping() {
    const checked = shopping.filter((x) => x.checked);
    if (!checked.length) return;
    setShopping((prev) => prev.filter((x) => !x.checked));
    deleteShoppingItems(checked.map((x) => x.id)).catch(() => {
      for (const x of checked) enqueue(uid, { table: "shopping", type: "delete", id: x.id });
    });
    showToast(
      `${checked.length} ${checked.length === 1 ? "articolo rimosso" : "articoli rimossi"} dalla lista`,
      () => {
        const rows = checked.map(({ name, qty }) => ({ id: newLocalId(), name, qty, checked: true }));
        setShopping((prev) => [
          ...rows.map((r) => ({ ...r, created_at: new Date().toISOString() })),
          ...prev,
        ]);
        persistInsertMany(rows);
        dismissToast();
      }
    );
  }
  // Aggiunge alla lista spesa gli ingredienti mancanti (chi è già in lista
  // viene saltato, senza toccarne la quantità).
  async function addMissingToShopping(names) {
    const existing = new Set(shopping.map((s) => norm(s.name)));
    const toAdd = (names || []).filter(Boolean).filter((n) => !existing.has(norm(n)));
    if (!toAdd.length) return;
    await addToShoppingMerged(toAdd.map((name) => ({ name, qty: "1" })));
  }

  // "Finito → in lista": dalla riga del prodotto esaurito in dispensa.
  async function finishedToShopping(it) {
    await addToShoppingMerged([{ name: it.name, qty: "1" }]);
    showToast(<><strong>{it.name}</strong> aggiunto alla lista della spesa</>);
  }

  return {
    // stato + setter (i setter servono ai effetti condivisi e al bridge
    // moveCheckedToPantry, rimasti in Dispensa)
    shopping, setShopping,
    movingChecked, setMovingChecked,
    shopHist,
    shopVoiceOpen, setShopVoiceOpen,
    shopVoiceProcessing,
    // funzioni
    bumpShopHistory, catForShopping, addToShoppingMerged, addShoppingItem,
    autoSaveShopping, handleShoppingVoice, toggleShoppingItem, removeShoppingItem,
    toggleAllShopping, adjustShoppingQty, clearCheckedShopping,
    addMissingToShopping, finishedToShopping,
  };
}
