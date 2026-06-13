// Ricettario (salvate + cucinate) con copia locale per-utente. Funziona
// anche se la tabella Supabase non esiste ancora: lo stato vive in
// localStorage e il DB è una sincronizzazione "best effort" sopra.
const keyFor = (uid) => `dispensa-recipes-${uid}`;

export function loadSavedRecipes(uid) {
  try {
    const r = JSON.parse(localStorage.getItem(keyFor(uid)));
    return Array.isArray(r) ? r : null;
  } catch {
    return null;
  }
}

export function saveSavedRecipes(uid, arr) {
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(arr || []));
  } catch { /* niente persistenza locale */ }
}

// Id per le righe create localmente (quando il DB non è disponibile).
export function localRecipeId() {
  return "loc-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
