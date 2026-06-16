# ARCHITECTURE.md — "La Mia Dispensa"

> Architettura completa dell'app. Collegati: `HANDOFF.md` (stato/ripresa) · `CLAUDE.md` (regole).

---

## 1. Visione d'insieme
PWA React **client-heavy** con un sottile strato serverless solo per nascondere le API key e fare da proxy ai servizi esterni. Tutto lo stato dell'app vive nel client (`Dispensa.jsx`); la persistenza è su Supabase (Postgres) con una **cache localStorage** per l'avvio istantaneo/offline-read e **Realtime** per la sincronizzazione tra dispositivi.

```
┌────────────────────────── Browser (PWA) ──────────────────────────┐
│  React 18 + Vite + Tailwind                                        │
│  App.jsx (auth gate) → Dispensa.jsx (god component, stato globale) │
│   ├─ PantryTab / ShoppingTab / RecipesTab / BottomNav / modali     │
│   ├─ lib/ (pantry, db, claude, cache, history, recipes, timers,    │
│   │        theme, tour, supabase)                                  │
│   └─ store esterni: timers (module-level), tour (useSyncExternal)  │
│                                                                    │
│  localStorage: cache items/shopping/settings, history, ricettario, │
│                timer, tema, flag onboarding, cache idee 24h         │
└───────────┬───────────────────────────────────────┬───────────────┘
            │ supabase-js (auth, CRUD, Realtime)     │ fetch /api/*
            ▼                                         ▼
   ┌──────────────────┐                   ┌──────────────────────────┐
   │ Supabase         │                   │ Vercel serverless         │
   │ Postgres + RLS   │                   │ api/claude.js  → Gemini    │
   │ Realtime + Auth  │                   │ api/photo.js   → Pexels    │
   └──────────────────┘                   │ (verificano il token       │
                                          │  Supabase; key SOLO qui)   │
                                          └──────────────────────────┘
```

In **sviluppo** (`npm run dev`) gli endpoint `/api/*` sono serviti da un middleware Vite (`devApi` in `vite.config.js`) che usa **lo stesso core** `server/*` delle serverless function: parità dev/prod.

## 2. Struttura delle cartelle
```
dispensa/
├─ index.html                 # entry; monta #root, font Hanken Grotesk
├─ vite.config.js             # plugin react + PWA + middleware dev /api
├─ tailwind.config.js         # mappa i token CSS → classi Tailwind
├─ postcss.config.js
├─ package.json               # scripts: dev / build / preview
├─ dispensa-ui.jsx            # LEGACY monolite originale (NON usato)
│
├─ api/                       # serverless Vercel (wrapper sottili)
│   ├─ claude.js              #   → server/claude.js
│   └─ photo.js               #   → server/photo.js
├─ server/                    # CORE proxy, framework-agnostic
│   ├─ claude.js              #   auth token + traduzione Anthropic↔Gemini
│   └─ photo.js               #   auth token + Pexels
│
├─ supabase/                  # da eseguire nel SQL Editor (idempotenti)
│   ├─ schema.sql             #   pantry_items + user_settings + RLS
│   ├─ migration-2.sql        #   pantry_items.expiry + shopping_items
│   ├─ migration-3.sql        #   Realtime (replica identity + publication)
│   └─ migration-4.sql        #   saved_recipes
│
├─ scripts/generate-icons.mjs # genera i PNG icona da public/icon.svg (sharp)
├─ public/                    # icon.svg + pwa-*.png + favicon + manifest assets
│
└─ src/
    ├─ main.jsx               # createRoot + applyTheme + scrollRestoration manual
    ├─ App.jsx                # auth gate (spinner / Auth / Dispensa)
    ├─ Dispensa.jsx           # GOD COMPONENT: stato globale + tutta la logica
    ├─ constants.js           # categorie, reparti, occasioni, prompt, seed/demo
    ├─ index.css              # design tokens (RGB), dark mode, keyframe, anti-zoom iOS
    ├─ hooks/useAuth.js       # sessione Supabase (onAuthStateChange)
    ├─ components/            # vedi §8
    └─ lib/                   # vedi §6 e §7
```

## 3. Flussi principali
### 3.1 Avvio (cache-first)
1. `main.jsx` applica il tema salvato e disattiva lo scroll-restoration nativo.
2. `App.jsx` → `useAuth` verifica la sessione (spinner). Se assente → `Auth` (magic-link / Google). Se presente → `Dispensa key={user.id}`.
3. `Dispensa` monta: legge la **cache** (`lib/cache.js`) e mostra subito items/shopping/settings; poi fa **refresh** da Supabase (pantry, shopping, settings, saved_recipes), applica eventuali migrazioni di categoria, e si iscrive al **Realtime**.
4. **Primo accesso** (DB vuoto + nessuna cache + non onboarded): inserisce `DEMO_DATA` e avvia il **tutorial** (`startTour(true)`); a fine tutorial cancella i dati demo e segna `dispensa-onboarded-<uid>=1`.

### 3.2 Ciclo "spesa → dispensa → ricetta → spesa"
- **Aggiunta dispensa**: a mano (`correctName`+`guessCategory` locali, no AI) · voce/scontrino/barcode (AI estrae e categorizza → `ReviewScanModal` per conferma → `mergeItems`).
- **Ricette**: scelta occasione (`MODES`) o richiesta libera → `callClaude` genera 4 proposte (cache 24h) → apertura ricetta (`callClaude` ricetta completa con grammature) → foto Pexels (`fetchPhotos`).
- **Cottura**: timer per passaggio (`StepTimer`/`lib/timers.js`), Modalità cucina fullscreen, "Ho cucinato" (`CookModal`) scala la dispensa (matematica locale + stima AI per pacchi↔grammi).
- **Mancanti** → lista spesa (`addMissingToShopping`); a spesa fatta, "Sposta in dispensa".

### 3.3 Tutorial interattivo (store esterno + spotlight)
- `lib/tour.js` tiene `{active, index, firstRun}` (store `useSyncExternalStore`) e l'array `STEPS`.
- `TourCoach.jsx` legge lo stato, trova il bersaglio via `data-tour`, disegna spotlight/banner/card e blocca i tocchi fuori dal bersaglio.
- L'app emette `tourSignal('nome')` negli handler reali; `Dispensa.jsx` orchestra vista/modali/contenuti demo per ogni passo. Dettagli in `HANDOFF.md` §5.

### 3.4 Salvataggio impostazioni (anti-regressione)
`user_settings` è un jsonb (ordine categorie/occasioni, byAisle, shopCats, prefServings, foodPrefs). Al salvataggio si scrive `updated_at`; al load, le impostazioni del DB si applicano **solo se più recenti** della cache locale (evita che una scrittura non ancora arrivata al DB venga sovrascritta da una vecchia).

## 4. Database (Supabase / Postgres) e relazioni
Tutte le tabelle hanno `user_id uuid` con default `auth.uid()`, FK a `auth.users(id) on delete cascade`, e **RLS** con policy `auth.uid() = user_id` per select/insert/update/delete. Relazione: **`auth.users` 1 — N** ogni tabella applicativa. Non ci sono FK tra tabelle applicative (sono indipendenti, legate solo all'utente).

| Tabella | Colonne | Note |
|---|---|---|
| `pantry_items` | `id`, `user_id`, `name`, `qty (text)`, `category`, `expiry (date, mig-2)`, `created_at` | una riga per prodotto; `qty` è testo (es. "500 g", "3") |
| `shopping_items` | `id`, `user_id`, `name`, `qty (text)`, `checked (bool)`, `created_at` | lista spesa (mig-2) |
| `user_settings` | `user_id (PK)`, `settings (jsonb)`, `updated_at` | una riga per utente |
| `saved_recipes` | `id`, `user_id`, `title`, `data (jsonb)`, `image`, `saved (bool)`, `cooked_count (int)`, `last_cooked_at`, `created_at` | ricettario (mig-4); unique `(user_id, title)` per upsert |

- **Realtime** (mig-3) attivo su `pantry_items` e `shopping_items` (`replica identity full` + publication `supabase_realtime`). NON su `user_settings`/`saved_recipes`.
- **Ordine di esecuzione** SQL: `schema.sql` → `migration-2` → `migration-3` → `migration-4`. Gli script sono idempotenti.
- `migration-4` può non essere stata eseguita: il ricettario è **local-first** e funziona comunque (senza sync cross-device).

## 5. API e integrazioni esterne
| Servizio | Uso | Dove | Auth |
|---|---|---|---|
| **Supabase** | Postgres, Auth (magic-link/Google), Realtime | client `supabase-js` + verifica token nei proxy | anon key (client) / token utente (proxy) |
| **Google Gemini** `gemini-2.5-flash` | proposte ricette, ricetta completa, estrazione scontrino/voce, pulizia nome barcode, stima "ho cucinato" | `server/claude.js` | `GEMINI_API_KEY` (server) |
| **Pexels** | foto dei piatti | `server/photo.js` | `PEXELS_API_KEY` (server) |
| **Open Food Facts** | lookup prodotto da barcode | client (`BarcodeScanModal`) | nessuna |
| **Web APIs** | Web Speech (voce), getUserMedia (scontrino/barcode), Wake Lock (spesa), Notification/Vibrate (timer), Web Share (lista) | client | permessi browser |

**Proxy AI** — il client parla "stile Anthropic", il server traduce in Gemini e ritraduce. Vantaggio: provider sostituibile senza toccare prompt/client; key mai esposta; endpoint protetti dal token Supabase. (Dettagli in `CLAUDE.md` §5.)

## 6. Gestione dello stato
- **Sorgente di verità in-memory**: `Dispensa.jsx` (god component) con `useState`/`useRef` per items, shopping, settings, viste, ricette, modali, draft form, ticker timer. Passa stato e callback ai figli via props.
- **Persistenza remota**: Supabase via `lib/db.js` (CRUD) + Realtime (upsert/remove sugli eventi).
- **Persistenza locale** (`localStorage`):
  - `lib/cache.js` — mirror di items/shopping/settings (avvio istantaneo, lettura offline).
  - `lib/history.js` — storico acquisti (suggerimenti spesa/aggiunta).
  - `lib/recipes.js` — ricettario local-first + id locali (`localRecipeId`).
  - `lib/theme.js` — tema (auto/chiaro/scuro) + `data-theme` + meta `theme-color`.
  - cache idee ricette 24h per occasione (`dispensa-ideas-<uid>`), flag onboarding, swipe-hint.
- **Store fuori da React** (devono sopravvivere ai cambi schermata/componente):
  - `lib/timers.js` — store module-level + mirror localStorage + pub/sub (`subscribeTimers`); un ticker in `Dispensa` (setInterval 500ms + focus/visibility) chiama `checkTimers()` → allarme/notifica/toast.
  - `lib/tour.js` — store esterno (`useSyncExternalStore`) per il tutorial: qualunque componente può `tourSignal()` senza prop-drilling.
- **Strategia di sync**: ottimistica (aggiorna lo stato locale subito, poi scrive sul DB; in errore logga e si affida a cache/realtime). Le impostazioni usano il confronto timestamp (§3.4).

## 7. Libreria `lib/` (responsabilità)
- `supabase.js` — client unico.
- `db.js` — **tutte** le query Supabase (pantry/shopping/settings/saved_recipes).
- `claude.js` — `callClaude` (proxy `/api/claude`, retry 2× su 429/500/502/503, parse JSON robusto), `fetchPhotos` (`/api/photo`), `fileToBase64`.
- `pantry.js` — **funzioni pure**: `guessCategory`, `correctName` (Levenshtein), `parseQty`/`normalizeWeight`/`mergeQty`/`subtractQty`/`scaleQty`/`adjustQty`/`atMinQty` (passi per unità), `findMatch`, `norm`, scadenze (`expiryStatus`/`formatExpiry`/`daysUntilExpiry`).
- `cache.js`, `history.js`, `recipes.js`, `theme.js`, `timers.js`, `tour.js` — vedi §6.

## 8. Componenti principali
- **`App.jsx`** — auth gate. **`Dispensa.jsx`** — god component (orchestrazione + stato).
- **Schede**: `PantryTab` (dispensa, pannello auto-save), `ShoppingTab` (lista, swipe, per reparto), `RecipesTab` (occasioni → proposte → dettaglio → ricettario).
- **Navigazione/azione**: `BottomNav` (pillola + slot "+"), `AddFab` ("+" a semicerchio, 4 modalità), `TimerBar` (timer flottante globale).
- **Modali** (quasi tutti su `Sheet.jsx`): `ManualAddModal`, `VoiceAddModal`, `ReceiptScanModal`, `ReviewScanModal`, `BarcodeScanModal` (lazy), `CookModal`, `CookingMode` (fullscreen), `ConfirmClearModal`, `ProfileSheet`.
- **Tutorial**: `TourCoach` (overlay spotlight). **Utility UI**: `StepTimer`, `Toast`, `Sheet`.
- **Orfani** (non importati): `AddMenu.jsx`, `ProfileTab.jsx`.

## 9. Scelte architetturali e motivazioni
- **God component invece di store**: app personale partita come prototipo; concentrare lo stato ha tenuto basso l'attrito. È il **debito tecnico principale** (refactor pianificato in hooks/store).
- **Cache-first + Realtime**: avvio istantaneo e lettura offline, con convergenza tra dispositivi senza polling.
- **Proxy "stile Anthropic"**: disaccoppia il client dal provider AI; permette di cambiare modello/fornitore in un solo file; tiene le key fuori dal bundle; protegge gli endpoint col token utente.
- **`qty` come testo**: gli alimenti reali hanno quantità eterogenee ("1 barattolo", "500 g", "3"); la matematica è gestita da parser dedicati in `pantry.js` invece di forzare uno schema numerico rigido.
- **Local-first per il ricettario**: l'app resta usabile anche se `migration-4` non è stata eseguita.
- **Store esterni per timer e tutorial**: devono persistere oltre il ciclo di vita dei componenti (timer tra schede; tutorial che pilota più componenti senza prop-drilling).
- **Stessi `server/*` in dev e prod**: niente divergenza di comportamento tra locale e Vercel.

## 10. Considerazioni sulla scalabilità futura
- **Refactor stato**: estrarre `usePantry`/`useShopping`/`useRecipes` o adottare uno store leggero (Zustand) per ridurre il god component e i re-render.
- **Multi-utente reale / dispensa condivisa**: lo schema RLS è già per-utente; servirebbe un modello di "household" condiviso (tabella di membership + policy aggiornate). Realtime già pronto.
- **Sync offline-write**: oggi offline è sola lettura; introdurre una coda di mutation con riconciliazione.
- **Notifiche scadenze/timer affidabili**: richiede infrastruttura push (Web Push + service worker schedulato o backend), oggi assente per i limiti PWA.
- **Costi/quota AI**: il free tier Gemini è il collo di bottiglia; cache idee 24h già mitiga. Eventuale passaggio a tier a pagamento o batching ulteriore.
- **TypeScript + test**: tipizzare `lib/pantry.js` e coprirlo con unit test è il primo passo a basso rischio/alto valore.
- **Code-splitting**: il bundle principale supera 500 kB; valutare `manualChunks` (ZXing è già lazy).
