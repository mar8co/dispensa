# ARCHITECTURE.md — Dispensa

> Architettura completa dell'app. Collegati: `HANDOFF.md` (stato/ripresa) ·
> `CLAUDE.md` (regole). Tutto in italiano, unità metriche.

---

## 1. Visione d'insieme

Dispensa è una **SPA React servita come PWA**, con backend **Supabase** (Postgres
+ Auth + Realtime) e tre **proxy serverless** (Vercel) per le integrazioni che
richiedono segreti (AI Gemini, foto Pexels, cancellazione account).

```
┌──────────────────────── Browser (PWA, iPhone) ────────────────────────┐
│  React 18 + Vite + Tailwind                                            │
│   App.jsx ──(auth gate)──> Dispensa.jsx (composition root)            │
│     ├─ hooks: useAuth, useOnline, useTimersTicker,                    │
│     │         useRecipes, useShopping, usePantry                      │
│     ├─ components: PantryTab / ShoppingTab / RecipesTab / Sheet / ... │
│     └─ lib: supabase, db, claude, pantry, recipes, history, ...       │
│                                                                       │
│   supabase-js ──────────────► Supabase (Postgres, RLS, Realtime, Auth)│
│   fetch /api/claude ─┐                                                 │
│   fetch /api/photo  ─┼──► Vercel functions (api/*) ──► server/* core   │
│   fetch /api/account ┘         │ verifica token Supabase               │
│                                ├─► Google Gemini (AI)                  │
│                                └─► Pexels (foto)                       │
└───────────────────────────────────────────────────────────────────────┘
```

In **sviluppo** (`npm run dev`) gli endpoint `/api/*` sono serviti da un
middleware Vite (`vite.config.js → devApi`) che riusa **lo stesso core**
(`server/*`) delle function Vercel: comportamento identico in locale e in prod.

---

## 2. Struttura delle cartelle

```
dispensa/
├─ api/                     # Serverless functions Vercel (thin wrapper)
│  ├─ claude.js             #   POST /api/claude  → server/claude.js
│  ├─ photo.js              #   POST /api/photo   → server/photo.js
│  └─ account.js            #   POST /api/account → server/account.js
├─ server/                  # Core dei proxy (framework-agnostic, condiviso)
│  ├─ claude.js             #   proxy AI (Gemini) + auth + rate-limit
│  ├─ photo.js              #   proxy foto (Pexels) + auth
│  └─ account.js            #   cancellazione account (service role)
├─ scripts/
│  └─ generate-icons.mjs    # genera i PNG PWA da icon.svg (sharp)
├─ supabase/
│  ├─ schema.sql            # tabelle base + RLS (pantry_items, user_settings)
│  ├─ migration-2.sql       # expiry + shopping_items
│  ├─ migration-3.sql       # Realtime (replica identity + publication)
│  ├─ migration-4.sql       # saved_recipes (ricettario)
│  └─ migration-5.sql       # ai_usage + funzione bump_ai_usage (rate-limit)
├─ src/
│  ├─ main.jsx              # entry (monta App, registra SW/tema)
│  ├─ App.jsx               # gate auth (spinner / login / app)
│  ├─ Dispensa.jsx          # COMPOSITION ROOT (stato, effetti, Realtime, render)
│  ├─ constants.js          # categorie, ordini, CAT_ICON (emoji), prompt, seed
│  ├─ index.css             # palette (variabili CSS) + CSS PWA/Vaul
│  ├─ hooks/
│  │  ├─ useAuth.js         # sessione Supabase
│  │  ├─ useOnline.js       # stato connessione
│  │  ├─ useTimersTicker.js # tick dei timer di cottura
│  │  ├─ usePantry.jsx      # dominio dispensa
│  │  ├─ useShopping.jsx    # dominio lista spesa
│  │  └─ useRecipes.jsx     # dominio ricette
│  ├─ lib/
│  │  ├─ supabase.js        # client Supabase (anon)
│  │  ├─ db.js              # TUTTE le query (confine data layer)
│  │  ├─ claude.js          # client AI/foto (→ /api/*)
│  │  ├─ pantry.js          # logica pura (quantità, categorie, q.b., ½, match)
│  │  ├─ pantry.test.js     # 46 test Vitest
│  │  ├─ recipes.js         # helper ricette
│  │  ├─ history.js         # storico acquisti (suggerimenti)
│  │  ├─ cache.js           # cache locale (snapshot iniziale veloce)
│  │  ├─ timers.js          # timer cottura + allarme
│  │  ├─ theme.js           # tema chiaro/scuro/auto (localStorage)
│  │  └─ tour.js            # stato + step del tutorial
│  └─ components/           # presentazione (vedi §8)
├─ vite.config.js           # React + proxy dev /api/* + PWA/manifest
├─ tailwind.config.js       # token colore → variabili CSS
├─ eslint.config.js         # flat config
└─ .github/workflows/ci.yml # CI: lint + test + build su push/PR
```

> Nota: alla root esistono anche `dispensa-ui.jsx` (prototipo monolitico storico,
> non usato a runtime) e `public/mockups/*` (riferimenti di design).

---

## 3. Database e relazioni

Postgres su Supabase. **Tutte** le tabelle utente hanno `user_id uuid default
auth.uid()` e **RLS** con policy `auth.uid() = user_id` (select/insert/update/
delete). L'unico legame è verso `auth.users(id)` con `on delete cascade`.

```
auth.users (gestita da Supabase)
   │ 1
   ├──< pantry_items     (id, user_id, name, qty:text, category, expiry:date, created_at)
   ├──< shopping_items   (id, user_id, name, qty:text, checked:bool, created_at)
   ├──< saved_recipes    (id, user_id, title, data:jsonb, image, saved:bool,
   │                       cooked_count:int, last_cooked_at, created_at)
   │                       UNIQUE(user_id, title)  → upsert per (utente, titolo)
   ├──  user_settings    (user_id PK, settings:jsonb, updated_at)   [1-a-1]
   └──< ai_usage         (user_id, day:date, count:int) PK(user_id, day)
                          scritta SOLO dal service role via bump_ai_usage()
```

Dettagli rilevanti:

- **`qty` è `text`** (non numerico): può valere `"3"`, `"0.5"`, `"500 g"`,
  `"1 kg"`, `"q.b."`, `"poca quantità"`, ecc. La logica di parsing/aritmetica è
  in `pantry.js` (`normalizeWeight`, `mergeQty`, `scaleQty`, `subtractQty`,
  `adjustQty`, supporto al mezzo pezzo ½).
- **Realtime** (migration-3): `pantry_items` e `shopping_items` hanno
  `replica identity full` e sono nella publication `supabase_realtime`. Servono
  per il sync multi-dispositivo (gli eventi DELETE/UPDATE portano la riga vecchia
  completa, incluso `user_id`, per filtro/RLS).
- **`user_settings.settings`** (jsonb) contiene: ordine categorie, ordine
  occasioni/"modi", stato collassato, porzioni preferite, preferenze alimentari,
  reparti corretti a mano per la spesa, vista "per reparto".
- **`ai_usage` + `bump_ai_usage(p_uid)`** (security definer): contatore atomico
  giornaliero per il rate-limit AI; usato solo dal proxy col service role. Se la
  migration non è applicata, il proxy semplicemente non limita (best-effort).

---

## 4. API e integrazioni esterne

Tutte protette: il client allega `Authorization: Bearer <access_token>` Supabase;
il proxy fa `supabase.auth.getUser(token)` e rifiuta con 401 se non valido.

| Endpoint | Core | Esterno | Note |
|---|---|---|---|
| `POST /api/claude` | `server/claude.js` | Google Gemini `gemini-2.5-flash` | Traduce blocchi Anthropic↔Gemini; `responseMimeType: application/json`; `thinkingBudget: 0` sui 2.5; tetto `max_tokens` 1–2048; tetto payload; rate-limit per utente/giorno. Risponde nel formato `{ content:[{type:"text",text}] }` che il client si aspetta. |
| `POST /api/photo` | `server/photo.js` | Pexels | Riceve una lista di query, restituisce un URL foto per ciascuna. Mai bloccante per il client (`fetchPhotos` torna `[]` in errore). |
| `POST /api/account` | `server/account.js` | Supabase (service role) | Cancellazione account utente. |

Altre integrazioni **dal client** (senza proxy, perché pubbliche):

- **Open Food Facts** (`BarcodeScanModal.jsx`): lookup prodotto da EAN/UPC.
- **Web APIs**: `getUserMedia` (fotocamera scontrino), ZXing (barcode), Web Share
  (condividi lista), Wake Lock (schermo acceso), View Transitions, Speech (voce
  via componente dedicato).

Variabili d'ambiente (server, su Vercel / `.env.local` per il dev):
`GEMINI_API_KEY` (+ opz. `GEMINI_MODEL`), `PEXELS_API_KEY`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (opz., rate-limit/account),
`AI_DAILY_LIMIT` (opz., default 80). Client: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`.

---

## 5. Gestione dello stato

- **Niente librerie di stato globale** (no Redux/Zustand). Lo stato vive in React
  e si compone in `Dispensa.jsx`.
- **`Dispensa.jsx` = composition root**: possiede lo stato condiviso (vista
  corrente, collapsed, ordini, toast, flag delle modali, porzioni/preferenze) e
  invoca gli hook di dominio nell'ordine `useOnline → useTimersTicker →
  useRecipes → useShopping → usePantry`.
- **Hook di dominio** (`usePantry`, `useShopping`, `useRecipes`): incapsulano la
  collezione e le sue operazioni (CRUD optimistic + chiamate `db.js`). Non si
  importano tra loro: se serve un ponte (es. spostare i barrati della spesa in
  dispensa) il bridge è una funzione in `Dispensa.jsx` passata agli hook.
- **Persistenza**:
  - **DB** per i dati (pantry/shopping/recipes) — sorgente di verità multi-device,
    riconciliata via Realtime.
  - **`user_settings`** (jsonb) per le preferenze cross-device.
  - **localStorage** (`dispensa-*`) per ciò che è per-dispositivo (tema) o cache
    locale (`cache.js`, snapshot iniziale per partenza istantanea) o per-uid
    (ultimo ordinamento spesa, storico acquisti).
- **Pattern optimistic**: si aggiorna `setItems/setShopping/...` subito, poi si
  scrive sul DB; un evento Realtime riallinea (e copre l'altro dispositivo).
- **Caricamento iniziale**: si mostra subito la cache locale, poi si fa la fetch;
  per le ricette si **adotta il DB solo se ha righe** (per non azzerare il locale
  su una fetch vuota transitoria — fix del bug "ricette sparite").

---

## 6. Flussi principali

**Avvio / Auth**
`main.jsx` applica tema + registra SW → `App.jsx` usa `useAuth` (spinner mentre
verifica la sessione) → se assente mostra `Auth.jsx` (magic-link / Google / Apple)
→ se presente monta `Dispensa key={user.id}` (rimonta pulito al cambio utente).

**Aggiungere un prodotto** (FAB → AddMenu)
- *Manuale*: `ManualAddModal` → `usePantry` (correzione nome locale + categoria
  via `categorize`).
- *Voce*: `VoiceAddModal` → trascrizione → `callClaude` estrae prodotti → insert.
- *Scontrino*: `ReceiptScanModal` → anteprima live in-app alla massima
  risoluzione del track (constraints + `applyConstraints`) → cattura frame →
  resize a 2000px (`lib/image.js → videoFrameToBase64`) → `callClaude` (immagine,
  output strutturato `ITEMS_SCHEMA`) → `ReviewScanModal` → insert multiplo.
  Fallback galleria (`fileToResizedBase64`) per scontrini molto lunghi.
- *Barcode*: `BarcodeScanModal` (ZXing, callback-ref sul `<video>`) → Open Food
  Facts → `ReviewScanModal`.

**Lista della spesa** (`ShoppingTab`)
Aggiunta (testo/voce) con merge duplicati → tocco riga = mette **nel carrello**
(`checked=true`, reparto "Nel carrello") → "Sposta in dispensa"
(`moveCheckedToPantry`, bridge in Dispensa) crea/merge i prodotti in dispensa e
rimuove i barrati. Controlli "Per reparto" e "Seleziona tutto" in alto; barra
"Sposta in dispensa" + cestino in basso solo a carrello pieno.

**Ricette** (`RecipesTab`)
Selezione occasione/"modo" → `useRecipes` costruisce il prompt con la dispensa e
le preferenze → `callClaude` genera ricette → `fetchPhotos` (Pexels) per le foto →
preferiti/cucinate su `saved_recipes` (upsert per titolo). **Modalità cucina**:
passi + `StepTimer`/`TimerBar` (timer in `timers.js`, tick in `useTimersTicker`).

**"Ho cucinato"** (`CookModal`)
Scala le quantità della ricetta e applica alla dispensa con 3 corsie: **q.b.**
(staples non scalati), **a confezione** (pezzi vs grammi → stepper, niente
math/AI), **calcolo esatto** (stessa unità → `subtractQty`).

**Sync**
Effetto in `Dispensa.jsx`: un canale Realtime `realtime-dispensa` ascolta
INSERT/UPDATE/DELETE su `pantry_items` e `shopping_items` filtrati per `user_id` e
applica `upsert`/`remove` agli stati locali.

---

## 7. Stile / tema

- **Tailwind** con colori mappati a **variabili CSS** (`tailwind.config.js`:
  `rgb(var(--token) / <alpha-value>)`). Cambiare il tema = cambiare le variabili in
  `index.css`, senza toccare i componenti.
- **Token principali**: `cream` (sfondo), `paper`, `ink` (#0A0A0A), `hair`,
  `white` (tematizzato), `tomato`/`tomato-700`, scala `stone-*`, `amber-100/700`.
  La scala `stone` e `amber` sono **ridefinite** sui token CSS: altre scale
  Tailwind di default (emerald, sky, ecc.) restano disponibili ma **non
  tematizzate**.
- **Dark mode**: `data-theme="dark"` sul `<html>` (gestito da `theme.js`); i meta
  `theme-color` seguono. I blocchi light/dark in `index.css` devono restare
  allineati per token.
- **Bottom sheet**: `Sheet.jsx` (Vaul) con CSS dedicato per `prefers-reduced-
  motion`. `panelClass`/`handleClass` per varianti (es. fotocamere su sfondo
  scuro).

---

## 8. Componenti principali

| Componente | Ruolo |
|---|---|
| `PantryTab.jsx` | Scheda Dispensa: categorie, ricerca, ordinamento, stepper ½, scadenze, "sta finendo", "Cucina con questo". |
| `ShoppingTab.jsx` | Scheda Spesa: carrello, per-reparto, controlli in alto, barra azioni in basso, empty-state "Hai preso tutto!". |
| `RecipesTab.jsx` | Scheda Ricette: generazione AI, occasioni, preferiti/cucinate, display "q.b." (`isQbIngredient`). |
| `CookModal.jsx` | "Ho cucinato": 3 corsie di scalatura della dispensa. |
| `CookingMode.jsx`, `StepTimer.jsx`, `TimerBar.jsx` | Modalità cucina passo-passo + timer. |
| `Sheet.jsx` | Bottom sheet condiviso (Vaul) — base di TUTTI i fogli. |
| `CameraScanShell.jsx` | Guscio comune alle due fotocamere (barcode/scontrino). |
| `BarcodeScanModal.jsx` / `ReceiptScanModal.jsx` | Scanner (lazy-loaded). |
| `ReviewScanModal.jsx` | Conferma prodotti rilevati prima dell'insert. |
| `ManualAddModal.jsx` / `VoiceAddModal.jsx` | Aggiunta manuale / a voce. |
| `AddFab.jsx` / `AddMenu.jsx` / `BottomNav.jsx` | FAB "+", menu aggiunta, navigazione. |
| `ProfileSheet.jsx` / `ProfileTab.jsx` / `PrivacySheet.jsx` | Profilo, tema, logout, privacy. |
| `Auth.jsx` | Login (magic-link, Google, Apple). |
| `Toast.jsx` | Toast/undo, posizione adattiva (`raised` su Spesa). |
| `TourCoach.jsx` | Tutorial guidato (`tour.js`). |

---

## 9. Scelte architetturali e motivazioni

- **Hook per dominio + composition root**: nasce dalla scomposizione di un god
  component. Mantiene gli hook indipendenti e testabili, con i ponti espliciti in
  un solo posto. *Motivo*: evitare dipendenze cicliche pantry↔shopping.
- **Logica pura isolata (`pantry.js`)**: tutta l'aritmetica fragile (quantità
  testuali, ½, q.b., match nomi) è pura e coperta da test. *Motivo*: è la parte
  più soggetta a regressioni.
- **Proxy "stile Anthropic" su Gemini**: l'astrazione del formato disaccoppia
  client/prompt dal provider. *Motivo*: poter cambiare modello/fornitore senza
  riscrivere i prompt (e tenere la key lato server).
- **Supabase + RLS come unico backend dati**: zero server custom per i dati,
  sicurezza a livello di riga, Realtime gratuito. *Motivo*: app personale ma
  multi-dispositivo, con il minimo di superficie da mantenere.
- **PWA con Workbox autoUpdate**: installabile e usabile offline (shell), aggiorna
  da sola. *Motivo*: esperienza "app nativa" su iPhone senza App Store.
- **Vaul per i sheet**: un solo componente per il drag-to-dismiss su tutti i
  fogli. *Motivo*: coerenza del gesto e meno codice; il montaggio `open=true`
  risolve i problemi di timing delle fotocamere.

---

## 10. Scalabilità futura (considerazioni)

- **Multi-utenza reale**: l'impianto (Auth + RLS + `user_id`) è già pronto; per una
  condivisione tra utenti (es. dispensa familiare) servirebbe un modello di
  ownership a gruppi (tabella `households` + join) e policy aggiornate.
- **Costi/quota AI**: già presenti tetto `max_tokens`, tetto payload e rate-limit
  per utente/giorno (`ai_usage`). Per crescere: cache dei suggerimenti, batch,
  modelli più economici per task semplici.
- **Bundle**: il chunk principale supera i 500 kB (warning Vite) e ZXing è già
  lazy-loaded. Margini: code-split per scheda, `manualChunks`.
- **Offline write**: oggi l'offline è solo "shell"; una coda di mutazioni
  (outbox) + replay al ritorno online renderebbe robusta la scrittura offline.
- **Migrazioni DB**: sono file SQL numerati da eseguire a mano nel SQL Editor;
  crescendo conviene adottare le migrazioni gestite della Supabase CLI.
- **Test**: oggi coprono `pantry.js`. Estendere a `recipes.js`, agli hook (con
  mock di `db.js`) e ai flussi critici (scala dispensa dopo "Ho cucinato").
