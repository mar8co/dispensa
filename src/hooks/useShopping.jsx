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
import { useState, useEffect } from "react";
import { callClaude } from "../lib/claude.js";
import { enqueue, flush } from "../lib/outbox.js";
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

  // --- Scrittura resiliente all'offline (outbox) ---
  // Lo stato locale è già ottimistico; qui ci assicuriamo che la scrittura sul
  // DB avvenga, e se fallisce (offline) la mettiamo in coda per rigiocarla al
  // ritorno online. v1: solo UPDATE di articoli esistenti (spunta/qty/nome).
  function applyOp(op) {
    if (op.type === "update") return updateShopping(op.id, op.fields);
    return Promise.resolve();
  }
  function persistUpdate(id, fields) {
    updateShopping(id, fields).catch(() => enqueue(uid, { type: "update", id, fields }));
  }
  // Rigioca la coda al ritorno online (e una volta all'avvio, se c'è roba).
  useEffect(() => {
    const onOnline = () => { flush(uid, applyOp); };
    window.addEventListener("online", onOnline);
    flush(uid, applyOp);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    tourSignal("shopping-added");
    return { merged: res.merged > 0 };
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
      showToast("Errore nell'elaborare la voce. Riprova.");
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
