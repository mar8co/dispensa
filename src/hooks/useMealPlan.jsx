// Dominio "piano pasti" (FASE 2): settimana visibile e voci pianificate, con
// il pattern ottimistico degli altri hook (stato locale subito, poi DB; il
// Realtime riconcilia tra dispositivi — canale in Dispensa.jsx, come per
// dispensa e spesa). Non importa altri hook: i ponti (CookModal, spesa)
// restano nel composition root.
import { useState, useEffect } from "react";
import { fetchMealPlan, insertMeal, updateMeal, deleteMeal } from "../lib/db.js";

// --- Helper di data (ora LOCALE: il piano è "di casa", niente UTC) ---

// "YYYY-MM-DD" della data locale (Date#toISOString sposterebbe il giorno
// attorno a mezzanotte, perché passa da UTC).
export function isoDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

// Il lunedì della settimana di `d` (a mezzogiorno: immune ai cambi d'ora).
export function mondayOf(d) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // dom=0 → lun=inizio
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function useMealPlan({ ready, householdId }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [meals, setMeals] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const from = isoDate(weekStart);
  const to = isoDate(addDays(weekStart, 6));

  // Carica la settimana visibile quando l'app è pronta (nucleo risolto) e a
  // ogni cambio settimana/nucleo. In errore (offline) si tiene il locale.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoadingMeals(true);
    fetchMealPlan(from, to)
      .then((rows) => { if (alive) setMeals(rows); })
      .catch((e) => console.warn("Piano pasti non caricato:", e?.message || e))
      .finally(() => { if (alive) setLoadingMeals(false); });
    return () => { alive = false; };
  }, [ready, from, to, householdId]);

  // Sposta la settimana visibile di ±1 (o torna a quella corrente con 0).
  function shiftWeek(delta) {
    setWeekStart((prev) => (delta === 0 ? mondayOf(new Date()) : mondayOf(addDays(prev, delta * 7))));
  }

  // Pianifica (o sostituisce) il piatto di uno slot. `data` è la ricetta
  // completa (formato saved_recipes.data) oppure null per un piatto libero.
  async function planMeal(date, slot, { title, data = null }) {
    const clean = String(title || "").trim();
    if (!clean) return;
    const existing = meals.find((m) => m.date === date && m.slot === slot);
    if (existing) {
      const fields = { title: clean, data, cooked_at: null };
      setMeals((prev) => prev.map((m) => (m.id === existing.id ? { ...m, ...fields } : m)));
      try { await updateMeal(existing.id, fields); } catch (e) { console.error("Piano non salvato:", e); }
      return;
    }
    // Id client-side (come pantry/shopping): la riga locale ha già l'id vero.
    const id = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const row = { id, date, slot, title: clean, data, cooked_at: null, created_at: new Date().toISOString() };
    setMeals((prev) => [...prev, row]);
    try { await insertMeal(row); }
    catch (e) {
      console.error("Piano non salvato:", e);
      setMeals((prev) => prev.filter((m) => m.id !== id));
    }
  }

  async function removeMeal(id) {
    setMeals((prev) => prev.filter((m) => m.id !== id));
    try { await deleteMeal(id); } catch (e) { console.error("Voce piano non rimossa:", e); }
  }

  // Segna cucinato (dal CookModal per le ricette, dalla spunta per i liberi).
  async function markMealCooked(id) {
    const cooked_at = new Date().toISOString();
    setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, cooked_at } : m)));
    try { await updateMeal(id, { cooked_at }); } catch (e) { console.error("Cucinato non salvato:", e); }
  }

  // Porzioni pianificate per una voce-ricetta: vivono DENTRO data
  // (planServings), così non serve una colonna dedicata. "Ho cucinato" dal
  // piano scala la dispensa in proporzione (planServings / servings base).
  async function setMealServings(id, n) {
    const meal = meals.find((m) => m.id === id);
    if (!meal?.data) return; // i piatti liberi non hanno porzioni
    const data = { ...meal.data, planServings: Math.max(1, Number(n) || 1) };
    setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, data } : m)));
    try { await updateMeal(id, { data }); } catch (e) { console.error("Porzioni non salvate:", e); }
  }

  return {
    weekStart, shiftWeek, meals, setMeals, loadingMeals,
    planMeal, removeMeal, markMealCooked, setMealServings,
  };
}
