// Layer dati su Supabase: sostituisce il vecchio wrapper localStorage.
//
// - pantry_items: una riga per prodotto, protetta da RLS per-utente.
//   user_id viene impostato automaticamente dal DB (default auth.uid()).
// - user_settings: una riga jsonb per utente con ordine categorie/occasioni
//   e stato collassato, sincronizzata tra dispositivi.

import { supabase } from "./supabase.js";

// ---------- Household attivo (dispensa familiare) ----------
// Il nucleo attivo della sessione viene iniettato come household_id su tutti
// gli inserimenti di dati condivisi (dispensa/spesa). Impostato all'avvio dopo
// aver risolto il nucleo dell'utente. Finché è null, gli insert restano come
// prima (nessun household_id): l'app funziona comunque, la RLS è ancora
// per-utente. Il filtro delle query e lo switch RLS arrivano nella fase 3.
let activeHouseholdId = null;
export function setActiveHousehold(id) { activeHouseholdId = id || null; }
export function getActiveHousehold() { return activeHouseholdId; }
const withHousehold = () => (activeHouseholdId ? { household_id: activeHouseholdId } : {});

const HOUSEHOLD_COLS = "id, name, created_by, created_at";

export async function fetchHouseholds() {
  const { data, error } = await supabase
    .from("households")
    .select(HOUSEHOLD_COLS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Crea un nuovo nucleo e rende l'utente corrente owner (usato all'occorrenza
// e, in futuro, dalla UI "crea/invita"). L'id è generato lato client (uuid):
// così non serve il returning select dell'insert, che la RLS nasconderebbe
// (l'appartenenza viene creata subito DOPO).
export async function createHousehold(name = "La mia dispensa") {
  const { data: s } = await supabase.auth.getSession();
  const userId = s?.session?.user?.id;
  if (!userId) throw new Error("Non autenticato.");
  const id = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const { error } = await supabase.from("households").insert({ id, name });
  if (error) throw error;
  const { error: mErr } = await supabase
    .from("household_members")
    .insert({ household_id: id, user_id: userId, role: "owner", email: s?.session?.user?.email ?? null });
  if (mErr) throw mErr;
  return { id, name, created_by: userId, created_at: new Date().toISOString() };
}

// Garantisce che l'utente abbia almeno un nucleo (per i nuovi iscritti, che
// non sono coperti dal backfill della migrazione).
export async function ensurePersonalHousehold() {
  const existing = await fetchHouseholds();
  if (existing.length) return existing;
  return [await createHousehold("La mia dispensa")];
}

// --- Inviti e membri (fase 4) ---

// Genera un codice invito breve per il nucleo (valido 7 giorni, vedi DB).
export async function createInvite(householdId) {
  const raw = (crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-z0-9]/gi, "");
  const code = raw.slice(0, 8).toUpperCase();
  const { error } = await supabase
    .from("household_invites")
    .insert({ code, household_id: householdId });
  if (error) throw error;
  return code;
}

// Accetta un invito tramite codice (RPC security definer). Ritorna l'id del
// nucleo a cui ti sei unito, oppure null se il codice non è valido/scaduto.
export async function acceptInvite(code) {
  const { data, error } = await supabase.rpc("accept_invite", { invite_code: String(code || "").trim() });
  if (error) throw error;
  return data || null;
}

export async function fetchMembers(householdId) {
  const { data, error } = await supabase
    .from("household_members")
    .select("user_id, role, email, username, joined_at")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Il mio nome (username) scelto nel Profilo. Denormalizzato su ogni membership,
// quindi ne basta una qualsiasi.
export async function getMyUsername() {
  const { data: s } = await supabase.auth.getSession();
  const userId = s?.session?.user?.id;
  if (!userId) return "";
  const { data, error } = await supabase
    .from("household_members")
    .select("username")
    .eq("user_id", userId)
    .not("username", "is", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.username || "";
}

// Imposta il mio nome su tutte le mie membership (via funzione SECURITY DEFINER).
export async function setUsername(name) {
  const { error } = await supabase.rpc("set_username", { new_username: String(name || "") });
  if (error) throw error;
}

// Il creatore fa uscire un membro dal nucleo (via funzione SECURITY DEFINER).
export async function removeMember(householdId, targetUserId) {
  const { error } = await supabase.rpc("remove_member", {
    p_household_id: householdId,
    p_target: targetUserId,
  });
  if (error) throw error;
}

// Esce dal nucleo (rimuove la propria appartenenza).
export async function leaveHousehold(householdId) {
  const { data: s } = await supabase.auth.getSession();
  const userId = s?.session?.user?.id;
  if (!userId) throw new Error("Non autenticato.");
  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function renameHousehold(householdId, name) {
  const { error } = await supabase
    .from("households")
    .update({ name })
    .eq("id", householdId);
  if (error) throw error;
}

// ---------- Prodotti dispensa ----------

const PANTRY_COLS = "id, name, qty, category, expiry, created_at";

export async function fetchPantry() {
  let q = supabase
    .from("pantry_items")
    .select(PANTRY_COLS)
    .order("created_at", { ascending: true });
  // Filtro per nucleo attivo SOLO se risolto (altrimenti nessun filtro: la RLS
  // per-utente scopa comunque alle righe dell'utente). Guardato = sicuro.
  if (activeHouseholdId) q = q.eq("household_id", activeHouseholdId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function insertItem({ name, qty, category, expiry = null }) {
  const { data, error } = await supabase
    .from("pantry_items")
    .insert({ name, qty, category, expiry: expiry || null, ...withHousehold() })
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
    .insert(rows.map(({ name, qty, category, expiry = null }) => ({ name, qty, category, expiry: expiry || null, ...withHousehold() })))
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

// ---------- Ricettario (salvate + cucinate) ----------

const RECIPE_COLS = "id, title, data, image, saved, cooked_count, last_cooked_at, created_at";

export async function fetchSavedRecipes() {
  const { data, error } = await supabase
    .from("saved_recipes")
    .select(RECIPE_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Upsert per (utente, titolo): aggiorna solo i campi passati.
export async function upsertSavedRecipe(fields) {
  const { data, error } = await supabase
    .from("saved_recipes")
    .upsert(fields, { onConflict: "user_id,title" })
    .select(RECIPE_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSavedRecipe(id, fields) {
  const { error } = await supabase.from("saved_recipes").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteSavedRecipe(id) {
  const { error } = await supabase.from("saved_recipes").delete().eq("id", id);
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
  // Più recenti in cima: i nuovi inserimenti appaiono in alto nella lista.
  let q = supabase
    .from("shopping_items")
    .select(SHOPPING_COLS)
    .order("created_at", { ascending: false });
  if (activeHouseholdId) q = q.eq("household_id", activeHouseholdId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function insertShopping({ name, qty = "1" }) {
  const { data, error } = await supabase
    .from("shopping_items")
    .insert({ name, qty, ...withHousehold() })
    .select(SHOPPING_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function insertManyShopping(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from("shopping_items")
    .insert(rows.map(({ name, qty = "1", checked = false }) => ({ name, qty, checked, ...withHousehold() })))
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
