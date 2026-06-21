# ARCHITECTURE.md — "Dispensa"

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
   ┌──────────────────┐                   ┌──────────────────────────────┐
   │ Supabase         │                   │ Vercel serverless             │
   │ Postgres + RLS   │                   │ api/claude.js  → Gemini        │
   │ Realtime + Auth  │                   │ api/photo.js   → Pexels        │
   │ ai_usage (RPC)   │                   │ api/account.js → admin delete  │
   └──────────────────┘                   │ (verificano il token Supabase; │
                                          │  key/service-role SOLO qui)    │
                                          └──────────────────────────────┘
```

In **sviluppo** (`npm run dev`) gli endpoint `/api/*` sono serviti da un middleware Vite (`devApi` in `vite.config.js`) che usa **lo stesso core** `server/*` delle serverless function: parità dev/prod. La **CI** (`.github/workflows/ci.yml`) gira `npm ci → lint → test → build` su ogni push/PR.

## 2. Struttura delle cartelle
```
dispensa/
├─ index.html                 # entry; monta #root, font Hanken Grotesk
├─ vite.config.js             # plugin react + PWA + middleware dev /api (devApi)
├─ tailwind.config.js         # mappa i token CSS → classi Tailwind
├─ postcss.config.js
├─ eslint.config.js           # ESLint flat config (+ react-hooks)
├─ package.json               # scripts: dev / build / preview / lint / test
├─ dispensa-ui.jsx            # LEGACY monolite originale (NON usato)
├─ .github/workflows/ci.yml   # CI: lint → test → build
│
├─ api/                       # serverless Vercel (wrapper sottili)
│   ├─ claude.js              #   → server/claude.js
│   ├─ photo.js               #   → server/photo.js
│   └─ account.js             #   → server/account.js (cancellazione account)
├─ server/                    # CORE proxy, framework-agnostic
│   ├─ claude.js              #   auth token + traduzione Anthropic↔Gemini + cap + rate-limit
│   ├─ photo.js               #   auth token + Pexels
│   └─ account.js             #   verifica token + admin.deleteUser (service role)
│
├─ supabase/                  # da eseguire nel SQL Editor (idempotenti, in ordine)
│   ├─ schema.sql             #   pantry_items + user_settings + RLS
│   ├─ migration-2.sql        #   pantry_items.expiry + shopping_items
│   ├─ migration-3.sql        #   Realtime (replica identity + publication)
│   ├─ migration-4.sql        #   saved_recipes
│   └─ migration-5.sql        #   ai_usage + funzione bump_ai_usage (rate-limit)
│
├─ scripts/generate-icons.mjs # genera i PNG icona da public/icon.svg (sharp)
├─ public/                    # icon.svg (frigo), pwa-*.png, favicon, analisi-spesa.png, manifest assets
│
└─ src/
    ├─ main.jsx               # createRoot + applyTheme + scrollRestoration manual
    ├─ App.jsx                # auth gate (spinner / Auth / Dispensa)
    ├─ Dispensa.jsx           # COMPOSITION ROOT: compone gli hook + orchestrazione trasversale + effetti condivisi
    ├─ constants.js           # categorie, reparti, occasioni, prompt, seed/demo
    ├─ index.css              # design tokens (RGB), dark mode, keyframe, anti-zoom iOS
    ├─ hooks/                 # stato e logica per dominio (vedi §6)
    │   ├─ useAuth.js         #   sessione Supabase (onAuthStateChange)
    │   ├─ useOnline.js       #   stato connessione (indicatore offline)
    │   ├─ useTimersTicker.js #   ticker globale dei timer
    │   ├─ useRecipes.jsx     #   ricette: proposte, ricetta, cache idee 24h, ricettario
    │   ├─ useShopping.jsx    #   lista spesa: aggiunta/merge, modifica, voce, storico
    │   └─ usePantry.jsx      #   dispensa: prodotti, form, ricerca/ordine, CRUD, derivati
    ├─ components/            # vedi §8
    └─ lib/                   # vedi §6 e §7 (incl. pantry.test.js)
```

## 3. Flussi principali
### 3.1 Avvio (cache-first)
1. `main.jsx` applica il tema salvato e disattiva lo scroll-restoration nativo.
2. `App.jsx` → `useAuth` verifica la sessione (spinner). Se assente → `Auth` (magic-link / Google). Se presente → `Dispensa key={user.id}`.
3. `Dispensa` monta: legge la **cache** (`lib/cache.js`) e mostra subito items/shopping/settings; poi fa **refresh** da Supabase (pantry, shopping, settings, saved_recipes), applica eventuali migrazioni di categoria, e si iscrive al **Realtime**.
4. **Primo accesso** (DB vuoto + nessuna cache + non onboarded): inserisce `DEMO_DATA` e avvia il **tutorial** (`startTour(true)`); a fine tutorial cancella i dati demo (`tourEmptyDemo`) e segna `dispensa-onboarded-<uid>=1`.

### 3.2 Ciclo "spesa → dispensa → ricetta → spesa"
- **Aggiunta dispensa**: a mano (`correctName`+`guessCategory` locali, no AI) · voce/foto(scontrino o spesa)/barcode (AI estrae e categorizza → `ReviewScanModal` per conferma → `mergeItems`).
- **Ricette**: scelta occasione (`MODES`, include "🍱 Schiscetta") o richiesta libera → `callClaude` genera 4 proposte (cache 24h) → apertura ricetta (`callClaude` ricetta completa con grammature, default 1 porzione) → foto Pexels (`fetchPhotos`). Scorciatoia **"Cucina con questo"** da un prodotto: `cookWithProduct(name)` → `changeView("ricette")` + `askCustom(name)`.
- **Cottura**: timer per passaggio (`StepTimer`/`lib/timers.js`), Modalità cucina fullscreen, "Ho cucinato" (`CookModal`) aggiorna la dispensa a **3 corsie**: q.b. (scorte non scalate — `isStapleQb`/`isQbQty`), a confezione (stepper con ½, niente stima), calcolo esatto (sottrazione tra stesse unità). Niente più chiamata AI di stima.
- **Mancanti** → lista spesa (`addMissingToShopping`); a spesa fatta, "Sposta in dispensa".

### 3.3 Tutorial interattivo (store esterno + spotlight)
- `lib/tour.js` tiene `{active, index, firstRun}` (store `useSyncExternalStore`) e l'array `STEPS` (**13 passi**) + contenuti demo (`TOUR_RECIPE`/`TOUR_IDEA`/`TOUR_SCAN`).
- `TourCoach.jsx` legge lo stato, trova il bersaglio via `data-tour`, disegna **card/banner/spotlight** e blocca i tocchi fuori dal bersaglio (i pannelli fanno `stopPropagation` sul `pointerdown`).
- L'app emette `tourSignal('nome')` negli handler reali; `Dispensa.jsx` orchestra vista/modali/contenuti per ogni passo. Elenco completo dei 13 passi in `HANDOFF.md` §5.

### 3.4 Salvataggio impostazioni (anti-regressione)
`user_settings` è un jsonb (ordine categorie/occasioni, byAisle, shopCats, prefServings, foodPrefs). Al salvataggio si scrive `updated_at`; al load, le impostazioni del DB si applicano **solo se più recenti** della cache locale (evita che una scrittura non ancora arrivata al DB venga sovrascritta da una vecchia).

### 3.5 Cancellazione account (GDPR / store)
Profilo → "Elimina account" (con conferma) → `deleteAccount()` POST `/api/account` con token utente → `server/account.js` verifica il token (anon `getUser`) poi `admin.auth.admin.deleteUser` (service role) → i dati applicativi spariscono per **FK on delete cascade** → `signOut`.

## 4. Database (Supabase / Postgres) e relazioni
Tutte le tabelle applicative hanno `user_id uuid` con default `auth.uid()`, FK a `auth.users(id) on delete cascade`, e **RLS** con policy `auth.uid() = user_id` per select/insert/update/delete. Relazione: **`auth.users` 1 — N** ogni tabella applicativa. Non ci sono FK tra tabelle applicative (sono indipendenti, legate solo all'utente).

| Tabella | Colonne | Note |
|---|---|---|
| `pantry_items` | `id`, `user_id`, `name`, `qty (text)`, `category`, `expiry (date, mig-2)`, `created_at` | una riga per prodotto; `qty` è testo (es. "500 g", "3") |
| `shopping_items` | `id`, `user_id`, `name`, `qty (text)`, `checked (bool)`, `created_at` | lista spesa (mig-2) |
| `user_settings` | `user_id (PK)`, `settings (jsonb)`, `updated_at` | una riga per utente |
| `saved_recipes` | `id`, `user_id`, `title`, `data (jsonb)`, `image`, `saved (bool)`, `cooked_count (int)`, `last_cooked_at`, `created_at` | ricettario (mig-4); unique `(user_id, title)` per upsert |
| `ai_usage` | `user_id`, `day (date)`, `count (int)` | rate-limit AI (mig-5); aggiornata da `bump_ai_usage(p_uid)` security definer |

- **Realtime** (mig-3) attivo su `pantry_items` e `shopping_items` (`replica identity full` + publication `supabase_realtime`). NON su `user_settings`/`saved_recipes`/`ai_usage`.
- **Ordine di esecuzione** SQL: `schema.sql → migration-2 → migration-3 → migration-4 → migration-5`. Gli script sono idempotenti.
- `migration-4` può non essere stata eseguita: il ricettario è **local-first** e funziona comunque (senza sync cross-device). `migration-5` serve al rate-limit AI: senza, il proxy non blocca.

## 5. API e integrazioni esterne
| Servizio | Uso | Dove | Auth |
|---|---|---|---|
| **Supabase** | Postgres, Auth (magic-link/Google), Realtime | client `supabase-js` + verifica token nei proxy | anon key (client) / token utente (proxy) / service role (account+rate-limit, server) |
| **Google Gemini** `gemini-2.5-flash` | proposte ricette, ricetta completa, estrazione foto scontrino/spesa/voce, pulizia nome barcode | `server/claude.js` | `GEMINI_API_KEY` (server) |
| **Pexels** | foto dei piatti | `server/photo.js` | `PEXELS_API_KEY` (server) |
| **Open Food Facts** | lookup prodotto da barcode | client (`BarcodeScanModal`) | nessuna |
| **Web APIs** | Web Speech (voce), getUserMedia (foto/barcode), Wake Lock (spesa), Notification/Vibrate (timer), Web Share (lista) | client | permessi browser |

**Proxy AI** — il client parla "stile Anthropic", il server traduce in Gemini e ritraduce. Vantaggio: provider sostituibile senza toccare prompt/client; key mai esposta; endpoint protetti dal token Supabase. **Indurimento**: cap payload (~9 MB → 413), `max_tokens` clamp 1..2048, rate-limit per utente/giorno (`bump_ai_usage`/`ai_usage`, default 80 via `AI_DAILY_LIMIT`, best-effort). Dettagli in `CLAUDE.md` §5.

## 6. Gestione dello stato
- **Sorgente di verità in-memory**: ripartita in **custom hook per dominio** (`src/hooks/`), composti da `Dispensa.jsx` (composition root) che passa stato e callback ai figli via props:
  - `usePantry` → prodotti, form aggiunta, ricerca/ordine/filtro, derivati (`grouped`, `expiringItems`), CRUD con merge.
  - `useShopping` → lista spesa, storico acquisti, aggiunta a voce.
  - `useRecipes` → proposte/ricetta/porzioni, cache idee 24h, ricettario.
  - `useTimersTicker`/`useOnline` → ticker timer e stato connessione.
  - In `Dispensa.jsx` restano: viste/navigazione, modali (scan/voce/barcode, CookModal, profilo), stato tutorial, le impostazioni `user_settings` (`catOrder`/`collapsed`/`byAisle`/`shopCats`/`modeOrder`/`prefServings`/`foodPrefs`) e gli **effetti condivisi** (vedi sotto). Gli hook ricevono per parametro ciò che serve e restituiscono stato+setter, così gli effetti condivisi e l'orchestrazione del tutorial/CookModal possono leggerli/scriverli. **Ordine**: `useShopping` prima di `usePantry` (rompe il ciclo pantry↔shopping; il bridge `moveCheckedToPantry` resta in Dispensa).
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
- `pantry.js` — **funzioni pure**: `guessCategory` + `categorize(name, aiCategory)` (dizionario-first: il dizionario locale ampliato — formati di pasta e sinonimi/varianti — vince quando riconosce il prodotto, l'AI è fallback), `correctName` (Levenshtein), `parseQty`/`normalizeWeight`/`mergeQty`/`subtractQty`/`scaleQty`/`adjustQty`/`atMinQty` (passi per unità), `findMatch`, `norm`, scadenze (`expiryStatus`/`formatExpiry`/`daysUntilExpiry`). **Coperto da `pantry.test.js` (34 test Vitest).**
- `cache.js`, `history.js`, `recipes.js`, `theme.js`, `timers.js`, `tour.js` — vedi §6.

## 8. Componenti principali
- **`App.jsx`** — auth gate. **`Dispensa.jsx`** — composition root (compone gli hook di `src/hooks/`, orchestrazione trasversale, effetti condivisi).
- **Schede**: `PantryTab` (dispensa, pannello auto-save, "Cucina con questo"), `ShoppingTab` (lista, swipe, per reparto), `RecipesTab` (occasioni → proposte → dettaglio → ricettario).
- **Navigazione/azione**: `BottomNav` (pillola + slot "+"), `AddFab` ("+" a semicerchio, 4 modalità), `TimerBar` (timer flottante globale).
- **Modali** (quasi tutti su `Sheet.jsx`): `ManualAddModal`, `VoiceAddModal`, `ReceiptScanModal` (foto, lazy), `ReviewScanModal`, `BarcodeScanModal` (lazy), `CookModal`, `CookingMode` (fullscreen), `ConfirmClearModal`, `ProfileSheet`, `PrivacySheet`. **Scanner scontrino/barcode** condividono `CameraScanShell` (bottom-sheet **scuro** a metà pagina su `Sheet`, palette bianco-su-nero, riquadro guida con scrim; lo scontrino più alto del barcode) — non più a tutto schermo.
- **Tutorial**: `TourCoach` (overlay card/banner/spotlight). **Utility UI**: `StepTimer`, `Toast`, `Sheet` (con `panelClass`/`handleClass` opzionali per il tema scuro), `CameraScanShell`.
- **Orfani** (non importati): `AddMenu.jsx`, `ProfileTab.jsx`.

## 9. Scelte architetturali e motivazioni
- **Da god component a hook per dominio**: l'app è partita come prototipo con tutto lo stato in `Dispensa.jsx` (basso attrito iniziale). Il debito è stato **ripagato con un refactor incrementale** (un hook per commit, rete test/CI a fare da sicurezza): lo stato vive ora in `usePantry`/`useShopping`/`useRecipes`/`useTimersTicker`/`useOnline`, e `Dispensa.jsx` è la composition root. Scelta di confine: effetti condivisi (load/cache/Realtime/impostazioni) e orchestrazione cross-dominio (tutorial, scan, CookModal) restano in Dispensa, per non spargere logica che tocca più domini.
- **Cache-first + Realtime**: avvio istantaneo e lettura offline, con convergenza tra dispositivi senza polling.
- **Proxy "stile Anthropic"**: disaccoppia il client dal provider AI; permette di cambiare modello/fornitore in un solo file; tiene le key fuori dal bundle; protegge gli endpoint col token utente. Indurito con cap/clamp/rate-limit per la pubblicazione.
- **`qty` come testo**: gli alimenti reali hanno quantità eterogenee ("1 barattolo", "500 g", "3"); la matematica è gestita da parser dedicati in `pantry.js` (testati) invece di forzare uno schema numerico rigido.
- **Local-first per il ricettario**: l'app resta usabile anche se `migration-4` non è stata eseguita.
- **Store esterni per timer e tutorial**: devono persistere oltre il ciclo di vita dei componenti (timer tra schede; tutorial che pilota più componenti senza prop-drilling).
- **Stessi `server/*` in dev e prod**: niente divergenza di comportamento tra locale e Vercel.
- **Cancellazione account + privacy in-app**: requisiti store/GDPR; mantenuti discreti per non intaccare l'estetica.
- **Test + CI + ESLint**: rete di sicurezza per consentire il refactor incrementale e tenere il bundle sano (lint a 0 warning).

## 10. Considerazioni sulla scalabilità futura
- **Refactor stato — fatto**: estratti `useOnline`/`useTimersTicker`/`useRecipes`/`useShopping`/`usePantry`. Prossimo passo opzionale: estrarre anche i flussi scan/voce/barcode e il CookModal (oggi in Dispensa come orchestrazione cross-dominio) in hook/componenti dedicati.
- **Pubblicazione store**: serve Mac/servizio cloud + Apple Developer (99 €/anno); poi wrapper (Capacitor/PWABuilder) + Sign in with Apple + stringhe permessi + gestione Web Speech in WKWebView.
- **Multi-utente reale / dispensa condivisa**: lo schema RLS è già per-utente; servirebbe un modello di "household" condiviso (tabella di membership + policy aggiornate). Realtime già pronto.
- **Sync offline-write**: oggi offline è sola lettura; introdurre una coda di mutation con riconciliazione.
- **Notifiche scadenze/timer affidabili**: richiede infrastruttura push (Web Push + service worker schedulato o backend), oggi assente per i limiti PWA.
- **Costi/quota AI**: il free tier Gemini è il collo di bottiglia; cache idee 24h + rate-limit per utente già mitigano. Eventuale passaggio a tier a pagamento o batching ulteriore (per ora l'utente vuole restare free).
- **TypeScript**: tipizzare `lib/pantry.js` (già testato) è il passo successivo a basso rischio/alto valore.
- **Code-splitting**: il bundle principale supera 500 kB; valutare `manualChunks` (ZXing e modali pesanti sono già lazy).
