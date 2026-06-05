// Layer dati su Supabase: sostituisce il vecchio wrapper localStorage.
//
// - pantry_items: una riga per prodotto, protetta da RLS per-utente.
//   user_id viene impostato automaticamente dal DB (default auth.uid()).
// - user_settings: una riga jsonb per utente con ordine categorie/occasioni
//   e stato collassato, sincronizzata tra dispositivi.

import { supabase } from "./supabase.js";

// ---------- Prodotti dispensa ----------

export async function fetchPantry() {
  const { data, error } = await supabase
    .from("pantry_items")
    .select("id, name, qty, category")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function insertItem({ name, qty, category }) {
  const { data, error } = await supabase
    .from("pantry_items")
    .insert({ name, qty, category })
    .select("id, name, qty, category")
    .single();
  if (error) throw error;
  return data;
}

// Inserimento multiplo (seed iniziale + prodotti da scontrino nuovi).
export async function insertMany(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from("pantry_items")
    .insert(rows.map(({ name, qty, category }) => ({ name, qty, category })))
    .select("id, name, qty, category");
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

export async function fetchSettings() {
  const { data, error } = await supabase
    .from("user_settings")
    .select("settings")
    .maybeSingle();
  if (error) throw error;
  return data?.settings || null;
}

export async function saveSettings(settings) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: userId, settings, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}
