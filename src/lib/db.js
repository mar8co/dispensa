// Layer dati su Supabase: sostituisce il vecchio wrapper localStorage.
//
// - pantry_items: una riga per prodotto, protetta da RLS per-utente.
//   user_id viene impostato automaticamente dal DB (default auth.uid()).
// - user_settings: una riga jsonb per utente con ordine categorie/occasioni
//   e stato collassato, sincronizzata tra dispositivi.

import { supabase } from "./supabase.js";

// ---------- Prodotti dispensa ----------

const PANTRY_COLS = "id, name, qty, category, expiry, created_at";

export async function fetchPantry() {
  const { data, error } = await supabase
    .from("pantry_items")
    .select(PANTRY_COLS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function insertItem({ name, qty, category, expiry = null }) {
  const { data, error } = await supabase
    .from("pantry_items")
    .insert({ name, qty, category, expiry: expiry || null })
    .select(PANTRY_COLS)
    .single();
  if (error) throw error;
  return data;
}

// Inserimento multiplo (seed iniziale + prodotti da scontrino nuovi).
export async function insertMany(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from("pantry_items")
    .insert(rows.map(({ name, qty, category, expiry = null }) => ({ name, qty, category, expiry: expiry || null })))
    .select(PANTRY_COLS);
  if (error) throw error;
  return data || [];
}

export async function updateItem(id, fields) {
  const { error } = await supabase
    .from("pantry_items")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id) {
  const { error } = await supabase.from("pantry_items").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteItems(ids) {
  if (!ids.length) return;
  const { error } = await supabase.from("pantry_items").delete().in("id", ids);
  if (error) throw error;
}

export async function deleteAllPantry() {
  // RLS limita comunque la cancellazione alle righe dell'utente corrente.
  const { error } = await supabase
    .from("pantry_items")
    .delete()
    .not("id", "is", null);
  if (error) throw error;
}

// ---------- Impostazioni utente ----------

// Restituisce { settings, updatedAt }: il timestamp serve al chiamante per
// capire se le impostazioni del DB sono più fresche di quelle in cache locale.
export async function fetchSettings() {
  const { data, error } = await supabase
    .from("user_settings")
    .select("settings, updated_at")
    .maybeSingle();
  if (error) throw error;
  return data ? { settings: data.settings, updatedAt: data.updated_at } : null;
}

export async function saveSettings(settings) {
  // getSession legge la sessione locale (niente rete): il salvataggio parte
  // subito e ha più probabilità di completarsi se l'app viene chiusa al volo.
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: userId, settings, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

// ---------- Lista della spesa ----------

const SHOPPING_COLS = "id, name, qty, checked, created_at";

export async function fetchShopping() {
  const { data, error } = await supabase
    .from("shopping_items")
    .select(SHOPPING_COLS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function insertShopping({ name, qty = "1" }) {
  const { data, error } = await supabase
    .from("shopping_items")
    .insert({ name, qty })
    .select(SHOPPING_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function insertManyShopping(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from("shopping_items")
    .insert(rows.map(({ name, qty = "1" }) => ({ name, qty })))
    .select(SHOPPING_COLS);
  if (error) throw error;
  return data || [];
}

export async function updateShopping(id, fields) {
  const { error } = await supabase.from("shopping_items").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteShopping(id) {
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteShoppingItems(ids) {
  if (!ids.length) return;
  const { error } = await supabase.from("shopping_items").delete().in("id", ids);
  if (error) throw error;
}
