// Stato e logica della Dispensa: collezione prodotti, form di aggiunta a mano,
// ricerca/ordinamento/filtro scadenze, derivati (raggruppamento per categoria,
// prodotti in scadenza, "finito") e operazioni CRUD con merge per nome.
//
// Confine: i flussi di input multimodale (scontrino/voce/barcode) e il modale
// "Ho cucinato" restano in Dispensa.jsx perché orchestrano modali e
// attraversano più domini (ricette + spesa); usano mergeItems/items/setItems
// esposti qui. L'ordine categorie (catOrder) resta un'impostazione in Dispensa
// ed è passato qui per il raggruppamento e il riordino. bumpShopHistory e
// addToShoppingMerged arrivano da useShopping (l'aggiunta registra lo storico;
// un prodotto finito si rimette in lista).
import { useState, useEffect } from "react";
import {
  guessCategory, correctName, normalizeWeight, mergeQty, findMatch,
  norm, daysUntilExpiry,
} from "../lib/pantry.js";
import { CATEGORIES } from "../constants.js";
import {
  insertItem, insertMany, updateItem, deleteItem, deleteAllPantry, fetchPantry,
} from "../lib/db.js";
import { tourSignal } from "../lib/tour.js";

export function usePantry({
  showToast,
  dismissToast,
  catOrder,
  setCatOrder,
  bumpShopHistory,
  addToShoppingMerged,
}) {
  const [items, setItems] = useState([]);

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

  const [confirmClear, setConfirmClear] = useState(false);

  // --- Scadenze: prodotti che scadono entro 7 giorni (o già scaduti) ---
  const isExpiring = (x) => {
    const d = daysUntilExpiry(x.expiry);
    return d !== null && d <= 7;
  };
  const expiringItems = items.filter(isExpiring);
  // Conteggi separati per il banner: già scaduti (giorni < 0) e in scadenza
  // (0–7 giorni). Insieme coprono esattamente expiringItems.
  const expiredCount = items.filter((x) => { const d = daysUntilExpiry(x.expiry); return d !== null && d < 0; }).length;
  const expiringSoonCount = items.filter((x) => { const d = daysUntilExpiry(x.expiry); return d !== null && d >= 0 && d <= 7; }).length;

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

  // --- Derivati: lista raggruppata per categoria (con ricerca/filtro/ordine) ---
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
    if (result) tourSignal("product-added");
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
      }, "metti nella lista");
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

  // "Cosa mi manca": true se l'ingrediente trova corrispondenza in dispensa.
  function hasIngredient(name) {
    return !!findMatch(name, items);
  }

  return {
    // stato + setter (items/setItems servono agli effetti condivisi, ai flussi
    // scan e al CookModal rimasti in Dispensa)
    items, setItems,
    newName, setNewName, newQty, setNewQty, newUnit, setNewUnit,
    newCat, setNewCat, newExpiry, setNewExpiry, adding,
    search, setSearch, sort, setSort, expFilter, setExpFilter,
    confirmClear, setConfirmClear,
    // derivati
    grouped, expiringItems, expiredCount, expiringSoonCount, isOut, hasIngredient,
    // funzioni
    mergeItems, addManual, submitManual, removeItem, clearPantry,
    autoSaveItem, setItemExpiry, moveCategory,
  };
}
