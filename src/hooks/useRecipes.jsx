// Stato e logica delle Ricette: proposte per occasione (con cache 24h),
// richiesta libera "Cosa ti va?", apertura ricetta completa, gestione porzioni
// e ricettario (preferiti + cucinate, local-first con sync best-effort sul DB).
//
// Confine: il flusso "Ho cucinato" (CookModal) che scala la dispensa resta in
// Dispensa.jsx perché tocca pantry e lista spesa (verranno assorbiti dai
// prossimi hook usePantry/useShopping). L'hook espone qui solo
// recordCookedRecipe, usata da quel flusso a cottura conclusa.
//
// L'hook riceve da Dispensa le dipendenze trasversali (sessione, preferenze,
// stringa dispensa per i prompt, helper UI) e restituisce stato + setter +
// funzioni, così l'orchestrazione del tutorial e il CookModal possono ancora
// leggere/scrivere lo stato ricette.
import { useState } from "react";
import { callClaude, fetchPhotos } from "../lib/claude.js";
import { RECIPES_SCHEMA, RECIPE_CONTEXTS } from "../constants.js";
import { norm, stripParens } from "../lib/pantry.js";
import { upsertSavedRecipe, updateSavedRecipe, deleteSavedRecipe } from "../lib/db.js";
import { loadSavedRecipes, saveSavedRecipes, localRecipeId } from "../lib/recipes.js";
import { tourSignal, TOUR_RECIPE } from "../lib/tour.js";

export function useRecipes({
  session,
  foodPrefs,
  pantryStr,
  prefServings,
  setPrefServings,
  tourActive,
  setCookDone,
  showToast,
  dismissToast,
  animateUI,
  scrollToTop,
}) {
  const uid = session.user.id;

  // ricette
  const [mode, setMode] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [servings, setServings] = useState(1);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipeErr, setRecipeErr] = useState("");
  const [savedRecipes, setSavedRecipes] = useState(() => loadSavedRecipes(uid) || []); // ricettario (salvate + cucinate)

  // Riga di preferenze alimentari iniettata in tutti i prompt di cucina.
  const prefLine = foodPrefs.trim()
    ? `Preferenze alimentari dell'utente, da rispettare SEMPRE: ${foodPrefs.trim()}. `
    : "";

  // --- Contesto/umore delle proposte (pill) + stagione automatica ---
  // Le pill scelte dall'utente sono override espliciti; la stagione (dalla data)
  // è la base sempre attiva, così d'estate le proposte sono già fresche/leggere.
  const [recipeContext, setRecipeContext] = useState([]); // id delle pill attive
  // Pill in conflitto: selezionarne una deseleziona quelle incompatibili.
  // "Caldo" esclude sia "Fresco" sia "Senza cottura"; Fresco e Senza cottura
  // invece convivono (es. insalata fredda). Le altre restano libere.
  const CONTEXT_CONFLICTS = {
    fresco: ["caldo"],
    caldo: ["fresco", "senzacottura"],
    senzacottura: ["caldo"],
  };
  function toggleRecipeContext(id) {
    setRecipeContext((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const conflicts = CONTEXT_CONFLICTS[id] || [];
      return [...prev.filter((x) => !conflicts.includes(x)), id];
    });
  }
  function currentSeason() {
    const m = new Date().getMonth(); // 0-11
    if (m === 11 || m <= 1) return "inverno";
    if (m <= 4) return "primavera";
    if (m <= 7) return "estate";
    return "autunno";
  }
  const SEASON_HINT = {
    estate: "Siamo in piena estate e fa caldo: privilegia piatti freschi, leggeri e veloci; evita zuppe calde, brasati e lunghe cotture al forno.",
    inverno: "Siamo in inverno e fa freddo: vanno benissimo piatti caldi e confortanti, zuppe, brasati, cotture al forno.",
    primavera: "Siamo in primavera: piatti freschi e colorati, con verdure di stagione.",
    autunno: "Siamo in autunno: piatti di stagione (zucca, funghi, legumi), comfort food tiepido.",
  };
  // Frase di contesto iniettata nel prompt (stagione + eventuali pill).
  function contextPrompt() {
    const hints = recipeContext
      .map((id) => RECIPE_CONTEXTS.find((c) => c.id === id)?.hint)
      .filter(Boolean);
    const season = `${SEASON_HINT[currentSeason()]} `;
    const pills = hints.length ? `Inoltre rispetta queste richieste dell'utente: ${hints.join("; ")}. ` : "";
    return season + pills;
  }
  // Chiave cache: occasione + pill attive + stagione (così cambiando contesto
  // non rivedi la lista vecchia, e la stagione non resta "congelata").
  function ideasCacheKey(m) {
    return `${m.id}|${[...recipeContext].sort().join(",")}|${currentSeason()}`;
  }

  // Cache delle proposte per occasione (per utente, 24h): riaprire
  // un'occasione non consuma chiamate AI; "Altre idee" forza la rigenerazione.
  const IDEAS_TTL = 24 * 60 * 60 * 1000;
  const ideasKey = () => `dispensa-ideas-${uid}`;
  function loadIdeasCache() {
    try { return JSON.parse(localStorage.getItem(ideasKey())) || {}; } catch { return {}; }
  }
  function saveIdeasCache(key, list) {
    try {
      const all = loadIdeasCache();
      all[key] = { ideas: list, ts: Date.now() };
      localStorage.setItem(ideasKey(), JSON.stringify(all));
    } catch { /* niente cache */ }
  }

  async function chooseMode(m, force = false) {
    scrollToTop(); // le 5 proposte partono sempre dall'alto
    // Richiesta libera ("Cosa ti va?"): niente cache, sempre fresca.
    if (!force && !m.custom) {
      const hit = loadIdeasCache()[ideasCacheKey(m)];
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
    const fast =
      m.id === "Pranzo veloce" ? "Ogni ricetta deve essere pronta entro 20 minuti. "
      : m.id === "Schiscetta" ? "Ricette veloci e facili, comode da preparare in anticipo, trasportare nel tupperware e mangiare il giorno dopo (al lavoro, a scuola, fuori): buone anche fredde/a temperatura ambiente o semplici da riscaldare. "
      : "";
    const ask = m.custom
      ? `L'utente chiede: "${m.id}". Proponi esattamente 5 ricette diverse che soddisfino questa richiesta usando principalmente `
      : `Voglio idee per la categoria "${m.id}". Proponi esattamente 5 ricette diverse che usino principalmente `;
    const prompt =
      `Sei uno chef esperto di cucina casalinga. Questi sono gli alimenti nella mia dispensa: ${pantryStr}. ` +
      `${prefLine}${ask}ingredienti della mia dispensa (puoi assumere disponibili sale, acqua e olio). ${fast}${contextPrompt()}` +
      `Rispondi SOLO con JSON valido senza markdown: ` +
      `{"recipes":[{"title":"...","description":"breve, max 14 parole","time":"es. 15 min","difficulty":"Facile|Media|Elaborata","imageQuery":"2-4 parole IN INGLESE per cercare una foto del piatto, es. spaghetti tomato"}]}`;
    try {
      // Schema strutturato per blindare la forma; niente temperature bassa qui:
      // per le proposte serve varietà (default creativo del modello).
      const parsed = await callClaude([{ type: "text", text: prompt }], 1500, { schema: RECIPES_SCHEMA });
      const list = Array.isArray(parsed.recipes) ? parsed.recipes : [];
      animateUI(() => { setIdeas(list); setLoadingIdeas(false); });
      if (!m.custom && list.length) saveIdeasCache(ideasCacheKey(m), list);
      if (list.length) {
        fetchPhotos(list.map((r) => r.imageQuery || r.title)).then((urls) => {
          const withPhotos = list.map((r, i) => (urls[i] ? { ...r, image: urls[i] } : r));
          setIdeas(withPhotos);
          if (!m.custom) saveIdeasCache(ideasCacheKey(m), withPhotos);
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

  // Porzioni di partenza: 1 persona di default (la preferenza dell'utente,
  // se impostata cambiando le porzioni a mano, ha la precedenza).
  function initialServings() {
    return prefServings || 1;
  }
  function changeServings(n) {
    const v = Math.max(1, n);
    setServings(v);
    setPrefServings(v);
  }

  const savedByTitle = (title) =>
    savedRecipes.find((r) => norm(r.title) === norm(String(title || "")));

  async function openRecipe(title) {
    // Durante il tutorial la ricetta d'esempio è precaricata (niente AI).
    if (tourActive && norm(title) === norm(TOUR_RECIPE.title)) {
      scrollToTop();
      animateUI(() => {
        setRecipe(TOUR_RECIPE); setServings(initialServings(TOUR_RECIPE));
        setRecipeErr(""); setLoadingRecipe(false); setCookDone("");
      });
      tourSignal("recipe-opened");
      return;
    }
    scrollToTop(); // la ricetta parte dall'alto
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
      `IMPORTANTISSIMO: per pesi e volumi usa SOLO unità metriche (g, kg, ml, l) — mai cups/oz. ` +
      `Nel nome di ogni ingrediente NON usare MAI parentesi né chiarimenti tra parentesi (es. scrivi "Insalata", non "Insalata (da lattuga)"): solo il nome semplice del prodotto. ` +
      `Dosi: metti "q.b." nel campo "qty" SOLO per olio, sale e pepe. Per le spezie e gli aromi secchi (curcuma, paprika, cumino, peperoncino, origano, cannella, noce moscata, zenzero in polvere, curry…) NON usare "q.b.": indica la dose in cucchiaini, es. "1 cucchiaino", "2 cucchiaini", "0,5 cucchiaino" (sempre "cucchiaino", mai "cucchiaio"). Per tutto il resto usa grammi/ml o il numero di pezzi. NON usare MAI parentesi nel campo "qty". ` +
      `Per ogni passaggio che richiede attesa o cottura indica i minuti nel campo "timer" (numero), altrimenti null. ` +
      `Rispondi SOLO con JSON valido senza markdown: ` +
      `{"title":"...","servings":2,"time":"...","imageQuery":"2-4 parole IN INGLESE per la foto del piatto","ingredients":[{"name":"...","qty":"120 g"}],"steps":[{"text":"...","timer":10}]}`;
    try {
      // Spazio abbondante: le ricette lunghe troncavano il JSON (errore 502).
      const parsed = await callClaude([{ type: "text", text: prompt }], 2500);
      // Rete di sicurezza: se l'AI mette comunque parentesi nei nomi degli
      // ingredienti, le togliamo (altrimenti vengono troncate e confondono).
      const clean = Array.isArray(parsed?.ingredients)
        ? { ...parsed, ingredients: parsed.ingredients.map((ing) => ({ ...ing, name: stripParens(ing?.name) })) }
        : parsed;
      animateUI(() => { setRecipe(clean); setServings(initialServings(clean)); setLoadingRecipe(false); });
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
    saveSavedRecipes(uid, next);
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
          saveSavedRecipes(uid, next);
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
      tourSignal("recipe-saved");
    } else {
      const id = localRecipeId();
      const row = {
        id, title: recipe.title, data: recipe, image: recipe.image || null,
        saved: true, cooked_count: 0, last_cooked_at: null, created_at: new Date().toISOString(),
      };
      commitRecipes([row, ...savedRecipes]);
      syncRecipeUpsert(id, { title: recipe.title, data: recipe, image: recipe.image || null, saved: true });
      tourSignal("recipe-saved");
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
    scrollToTop();
  }
  function backToIdeas() {
    animateUI(() => { setRecipe(null); setRecipeErr(""); setCookDone(""); });
    scrollToTop();
  }

  return {
    // stato + setter (i setter servono all'orchestrazione del tutorial e al CookModal in Dispensa)
    mode, setMode,
    ideas, setIdeas,
    recipe, setRecipe,
    servings, setServings,
    loadingIdeas, setLoadingIdeas,
    loadingRecipe, setLoadingRecipe,
    recipeErr, setRecipeErr,
    savedRecipes, setSavedRecipes,
    // contesto/umore (pill) delle proposte
    recipeContext, toggleRecipeContext,
    // funzioni
    chooseMode, askCustom,
    initialServings, changeServings,
    savedByTitle,
    openRecipe, openSavedRecipe,
    commitRecipes,
    toggleSaveRecipe, recordCookedRecipe, removeSavedRecipe,
    backToModes, backToIdeas,
  };
}
