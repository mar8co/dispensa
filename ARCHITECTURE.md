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
│  ├─ account.js            #   POST /api/account → server/account.js
│  ├─ push.js              #   POST /api/push    → server/push.js (solo cron)
│  ├─ receipt.js           #   POST /api/receipt → server/receipt.js (verifica IAP)
│  └─ appstore-notify.js   #   POST /api/appstore-notify → ASSN V2 (Apple → noi)
├─ server/                  # Core dei proxy (framework-agnostic, condiviso)
│  ├─ claude.js             #   proxy AI (Gemini) + auth + rate-limit
│  ├─ photo.js              #   proxy foto (Pexels) + auth
│  ├─ account.js            #   cancellazione account (service role)
│  ├─ push.js              #   cron notifiche scadenze: sceglie Web Push o APNs per riga
│  ├─ apns.js              #   invio APNs (HTTP/2 + JWT ES256, zero dipendenze)
│  ├─ appstore.js          #   App Store Server API: JWT ES256, decode JWS, stato sub
│  └─ receipt.js           #   verifica ricevute IAP + notifiche V2 → entitlements
├─ capacitor.config.json    # guscio nativo iOS (Fase 3): appId, webDir=dist
├─ ios/                     # progetto Xcode generato da Capacitor (SPM, non CocoaPods)
│  ├─ App/App/Info.plist    #   permessi camera/foto/microfono + solo verticale
│  └─ App/App/StoreKitPlugin.swift  # plugin StoreKit 2 locale (IAP, fase 3)
├─ scripts/
│  ├─ generate-icons.mjs    # genera i PNG PWA da icon.svg (sharp)
│  ├─ generate-splash.mjs   # genera le splash iOS (public/splash/*): icona + wordmark (sharp)
│  └─ assets/               # font Hanken ExtraBold (TTF + OFL) per il wordmark delle splash
├─ supabase/
│  ├─ schema.sql            # tabelle base + RLS (pantry_items, user_settings)
│  ├─ migration-2.sql       # expiry + shopping_items
│  ├─ migration-3.sql       # Realtime (replica identity + publication)
│  ├─ migration-4.sql       # saved_recipes (ricettario)
│  ├─ migration-5.sql       # ai_usage + funzione bump_ai_usage (rate-limit)
│  ├─ migration-6.sql       # dispensa familiare: households + household_id + backfill
│  ├─ migration-7.sql       # inviti (household_invites) + accept_invite
│  ├─ migration-8.sql       # switch RLS dati a is_household_member (il "flip")
│  ├─ migration-9.sql       # username membri + espulsione (set_username, remove_member)
│  ├─ migration-10.sql      # push scadenze: push_subscriptions + save_push_subscription + cron pg_cron/pg_net
│  └─ migration-11.sql      # piano pasti: meal_plan (RLS household, Realtime, unique per slot)
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
│  │  ├─ useRecipes.jsx     # dominio ricette
│  │  └─ useMealPlan.jsx    # dominio piano pasti (settimana + helper data locali)
│  ├─ lib/
│  │  ├─ supabase.js        # client Supabase (anon)
│  │  ├─ db.js              # TUTTE le query (confine data layer)
│  │  ├─ push.js            # opt-in notifiche push (web + APNs nel nativo)
│  │  ├─ api.js             # base URL proxy /api/* (vuota sul web, dominio nel nativo)
│  │  ├─ native.js          # ponte Capacitor: isNative, deep link login
│  │  ├─ ads.js             # AdMob banner (solo nativo, solo free) — fase 3
│  │  ├─ premium.js         # piani/prezzi/id abbonamento — fase 3
│  │  ├─ storekit.js        # ponte JS al plugin StoreKit 2 + syncReceipt — fase 3
│  │  ├─ claude.js          # client AI/foto (→ /api/*)
│  │  ├─ pantry.js          # logica pura (quantità, categorie, q.b., ½, match)
│  │  ├─ pantry.test.js     # 46 test Vitest
│  │  ├─ recipes.js         # helper ricette
│  │  ├─ history.js         # storico acquisti (suggerimenti)
│  │  ├─ outbox.js          # coda scritture offline (v2: insert/update/delete)
│  │  ├─ sync.js            # replay idempotente della coda + id client (uuid)
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

Postgres su Supabase. **Dispensa familiare (multi-household)** attiva: i dati
condivisi (`pantry_items`, `shopping_items`, `saved_recipes`) hanno una colonna
`household_id` e la **RLS** è basata sull'appartenenza al nucleo
(`is_household_member(household_id)`), con un ripiego difensivo
`household_id is null and auth.uid() = user_id` per non nascondere righe non
taggate. `user_id` resta come audit. Le tabelle **personali** (`user_settings`,
`ai_usage`) restano con RLS `auth.uid() = user_id`. Tabelle nucleo:
`households`, `household_members` (con `email` + `username` denormalizzati e
`role` `owner`/`member`), `household_invites` (vedi migration-6/7/8/9).
Legami verso `auth.users(id)` con `on delete cascade`.

**Funzioni SECURITY DEFINER del nucleo** (bypassano la RLS in modo controllato):
`is_household_member(hid)` (appartenenza, evita ricorsione nelle policy),
`accept_invite(code)` (l'invitato non è ancora membro; valida il codice, si
aggiunge e **eredita lo username** già scelto), `set_username(name)` (aggiorna il
proprio `username` su tutte le membership; non esiste una policy UPDATE),
`remove_member(household_id, target)` (solo l'**owner** può togliere **altri**
membri: la policy `members_delete_self` permette di rimuovere solo se stessi).

```
auth.users (gestita da Supabase)
   │ 1
   ├──< pantry_items     (id, user_id, name, qty:text, category, expiry:date, created_at)
   ├──< shopping_items   (id, user_id, name, qty:text, checked:bool, created_at)
   ├──< saved_recipes    (id, user_id, title, data:jsonb, image, saved:bool,
   │                       cooked_count:int, last_cooked_at, created_at)
   │                       UNIQUE(user_id, title)  → upsert per (utente, titolo)
   ├──  user_settings    (user_id PK, settings:jsonb, updated_at)   [1-a-1]
   │                       (gli avvisi scadenza hanno cadenza automatica 7/3/1 gg: nessuna preferenza)
   ├──< ai_usage         (user_id, day:date, count:int) PK(user_id, day)
   │                       scritta SOLO dal service role via bump_ai_usage()
   ├──< push_subscriptions (id, user_id, platform 'web'|'ios', created_at,
   │                       web:  endpoint UNIQUE, p256dh, auth
   │                       ios:  apns_token UNIQUE)
   │                       una riga per dispositivo; RLS per-utente; letta dal
   │                       cron col service role. Upsert via
   │                       save_push_subscription() / save_apns_token()
   │                       (SECURITY DEFINER). Vincolo di forma: ogni riga è
   │                       completa per la sua piattaforma (migration-10/12).
   └──< meal_plan        (id, household_id, user_id, date, slot pranzo|cena,
                          title, data:jsonb ricetta completa o NULL=piatto
                          libero, cooked_at, created_at)
                          UNIQUE (coalesce(household_id,user_id), date, slot)
                          RLS is_household_member + Realtime (come pantry/shopping)
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
| `POST /api/push` | `server/push.js` (+ `server/apns.js`) | Supabase (service role) + Web Push + APNs | **Solo cron** (pg_cron): protetto da `CRON_SECRET`, non da token utente. Ricava lo slot (pranzo/cena/sera) dall'ora di Roma, legge scadenze e subscription e invia sul canale giusto per riga: `web-push` per la PWA, **APNs** (HTTP/2 + JWT ES256, senza dipendenze) per l'app iOS. Pulisce le iscrizioni morte (404/410 · Unregistered/BadDeviceToken). |
| `POST /api/receipt` | `server/receipt.js` (+ `server/appstore.js`) | Supabase (service role) + App Store Server API | Verifica IAP **su richiesta del client** (token utente): interroga Apple (JWT ES256), controlla che l'`appAccountToken` combaci con l'uid (anti-furto), scrive `entitlements` col service role. |
| `POST /api/appstore-notify` | `server/receipt.js` | App Store Server API | **App Store Server Notifications V2** (Apple → noi): rinnovi/rimborsi/scadenze. Non crede al contenuto della notifica: la usa per sapere quale sub ricontrollare, poi riprende la verità dall'API. Mappa l'utente via `appAccountToken` o riga esistente. Risponde 200 anche quando ignora (niente retry infiniti). |

Altre integrazioni **dal client** (senza proxy, perché pubbliche):

- **Open Food Facts** (`BarcodeScanModal.jsx`): lookup prodotto da EAN/UPC.
- **Web APIs**: `getUserMedia` (fotocamera scontrino), ZXing (barcode), Web Share
  (condividi lista), Wake Lock (schermo acceso), View Transitions, Speech (voce
  via componente dedicato).

Variabili d'ambiente (server, su Vercel / `.env.local` per il dev):
`GEMINI_API_KEY` (+ opz. `GEMINI_MODEL`), `PEXELS_API_KEY`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (rate-limit/account **e push**),
`AI_DAILY_LIMIT` (opz., default 80). **Push**: `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY` (mai nel client), `VAPID_SUBJECT` (mailto:), `CRON_SECRET`
(anche nel Vault Supabase come `dispensa_cron_secret`, letto dal cron). Client:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`
(la VAPID pubblica, per iscriversi alle push). **App nativa (fase 3)**:
`VITE_API_BASE` (dominio dei proxy nella build Capacitor) e, per le push
iOS, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_P8`, `APNS_BUNDLE_ID`,
`APNS_PRODUCTION`. **Abbonamenti (IAP, fase 3)**: `APPSTORE_KEY_ID`,
`APPSTORE_ISSUER_ID`, `APPSTORE_KEY_P8` (chiave App Store Server API / In-App
Purchase), `APPSTORE_BUNDLE_ID` (opz., default `com.mar8co.dispensa`),
`APPSTORE_ENVIRONMENT` (opz.: `sandbox` per provare prima la sandbox in
TestFlight).

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
- *Voce*: `VoiceAddModal` → trascrizione → `callClaude` estrae prodotti →
  `ReviewScanModal` (revisione). Nel riepilogo "Aggiungi altri prodotti"
  ri-detta e **accoda** (`onAddMore` + `voiceAppendRef` in `Dispensa.jsx`).
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
(Opzionale) pill di **contesto/umore** (`RECIPE_CONTEXTS`: fresco, caldo,
leggero…) + **stagione automatica** dalla data → selezione occasione/"modo" →
`useRecipes` costruisce il prompt con dispensa, preferenze, **stagione e
contesto** → `callClaude` genera ricette → `fetchPhotos` (Pexels) per le foto →
preferiti/cucinate su `saved_recipes` (upsert per titolo). La cache idee (24h,
localStorage) è chiavata su **occasione + pill + stagione**. **Modalità cucina**:
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
| `ShoppingTab.jsx` | Scheda Spesa: carrello, per-reparto, controlli in alto, barra azioni in basso, empty-state "Hai preso tutto!", autocompletamento del campo (chip di testo da storico + dispensa + `PRODUCT_CATALOG`, matching tollerante `foldKey` = `matchKey` + accent-fold), microfono↔X. |
| `RecipesTab.jsx` | Scheda Ricette: generazione AI, occasioni, preferiti/cucinate, display "q.b." (`isQbIngredient`). |
| `CookModal.jsx` | "Ho cucinato": 3 corsie di scalatura della dispensa. |
| `CookingMode.jsx`, `StepTimer.jsx`, `TimerBar.jsx` | Modalità cucina passo-passo + timer. |
| `Sheet.jsx` | Bottom sheet condiviso (Vaul) — base di TUTTI i fogli. |
| `ProductFields.jsx` | Vista prodotto condivisa (nome/categoria/scadenza/quantità/unità), usata ovunque si mostri o modifichi un prodotto. Riga quantità `flex-nowrap` (stepper in pill); il box scadenza apre `ExpiryCalendar`. |
| `ExpiryCalendar.jsx` | Calendario scadenza **in-app** (rimpiazza il date picker nativo iOS): niente preselezione, scorciatoie Oggi/Domani/Tra 3 gg, in-flow. Usato da `ProductFields`. |
| `CameraScanShell.jsx` | Guscio comune alle due fotocamere (barcode/scontrino). |
| `BarcodeScanModal.jsx` / `ReceiptScanModal.jsx` | Scanner (lazy-loaded). |
| `ReviewScanModal.jsx` | Conferma prodotti rilevati prima dell'insert. Dal flusso voce (prop `onAddMore`) mostra "Aggiungi altri prodotti": ri-detta e accoda. |
| `ManualAddModal.jsx` / `VoiceAddModal.jsx` | Aggiunta manuale / a voce. |
| `AddFab.jsx` / `AddMenu.jsx` / `BottomNav.jsx` | FAB "+", menu aggiunta, navigazione. |
| `ProfileSheet.jsx` / `SettingsSheet.jsx` / `ProfileTab.jsx` / `PrivacySheet.jsx` | Profilo = "chi sei" (Nome/username, Dispensa familiare, Esigenze alimentari, Svuota/Esci) con ⚙️ in alto a destra che apre **SettingsSheet** = "come si comporta l'app" (Face ID, toggle notifiche push, tema, tutorial, privacy/elimina account). |
| `HouseholdSection.jsx` | **Dispensa condivisa** nel Profilo: membri (username + corona sull'owner + "Rimuovi"), inviti/entra-con-codice, switch nucleo attivo, esci, popup conferma espulsione. |
| `Auth.jsx` | Login a pagina intera (magic-link, Google, Apple, Face ID/passkey), stile "manifesto": headline "Cosa c'è in dispensa?" con wavy underline tomato su "dispensa" + mensole di emoji-categoria con slot "+" + sottotitolo "La tua cucina, in tasca. Meno sprechi (verde fisso `#43A047`). Zero pensieri". |
| `SplashIntro.jsx` | **Intro splash** montata in `App.jsx`: riprende la splash nativa iOS (icona + "Dispensa") e disegna la sottolineatura ondulata tomato, poi sfuma nell'app. Animazione su tutte le piattaforme; rispetta `prefers-reduced-motion`. Stili `.splash-*` in `index.css`. |
| `PaywallSheet.jsx` | **Paywall Premium** (fase 3): due piani affiancati, annuale evidenziato, prezzo barrato = 12 mensilità (Omnibus-safe). Prezzi/id da `lib/premium.js`. Aperto dal tab Piano Alimentare (non-Pro), da Impostazioni, dal deep-link `?view=piano`. |
| `PushNudge.jsx` | **Soft-ask notifiche** reso da `PantryTab` sotto il banner scadenze (gated `canNudge={!tour.active}`): invita ad attivare le push nel momento contestuale. Si auto-nasconde se non supportate / già attive / già rifiutato (`dispensa-pushnudge-dismissed`). Riusa `enablePush` di `lib/push.js`. |
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

- **Notifiche push scadenze** — ✅ **IMPLEMENTATA (Fase 1, 2026-07-05)**.
  Tabella `push_subscriptions` (RLS per utente, migration-10), endpoint
  `api/push.js` → `server/push.js` (**solo cron**, protetto da `CRON_SECRET`,
  non da token utente), **cron pg_cron + pg_net** dentro Supabase (non Vercel
  Cron) che 3×/giorno interroga le scadenze e invia via `web-push` (dipendenza
  solo server), chiavi VAPID nelle env. Opt-in per dispositivo dal Profilo
  (permesso da gesto utente), 3 promemoria in ora di Roma (14:30/18:30/21:45),
  avvisi a cadenza automatica 7/3/1 gg dalla scadenza (selettore rimosso il
  2026-07-20), digest multi-household.
  **Design DST-safe**: pg_cron in UTC → 6 job (gemelli CET/CEST), lo slot lo
  ricava il server dall'ora di Roma. Su iOS richiede PWA installata (iOS 16.4+).
  Restano i passi manuali (migration, Vault, env Vercel) e la prova sul telefono.
- **Piano pasti settimanale** — ✅ **v1 IMPLEMENTATA (Fase 2, 2026-07-14)**.
  Agenda verticale dentro Ricette (segmented "Idee | Piano"), slot
  pranzo+cena, piatto da ricettario/AI/testo libero, "Ho cucinato" dal piano
  via `cookMealFromPlan` → CookModal (scala e marca `cooked_at`), mancanti
  alla spesa dal foglio slot, giorni passati compressi, Realtime nel canale
  esistente. Tabella `meal_plan` (migration-11 manuale). Componenti:
  `useMealPlan` + `PlanWeek` (+ `PlanDaySheet` in RecipesTab). Restano:
  esecuzione migration, prova telefono, deep-link 18:30 → Piano, paywall
  free/Pro (fase 3).
- **App nativa iOS + monetizzazione** — **Fase 3, quasi tutta implementata
  (2026-07-20)**, dettagli in `HANDOFF.md` → "Prossimo obiettivo". Scelte:
  **Capacitor** (progetto `ios/`, build su CI macOS GitHub Actions — l'utente
  non ha un Mac), abbonamenti **StoreKit 2 fatti in casa**, **AdMob solo
  banner**. Fatto: wrapper, push APNs (migration-12, `server/apns.js`), login
  via deep link (`dispensa://auth`, `lib/native.js`), splash nativa,
  entitlements (migration-13: tabella `entitlements` sola-SELECT + `is_pro`
  per-nucleo; gate nelle policy DB e nel proxy AI), paywall
  (`PaywallSheet`+`lib/premium.js`), AdMob+ATT (`lib/ads.js`).
  **StoreKit 2 + verifica ricevute — FATTI (codice, 2026-07-21)**: plugin
  Swift locale (`ios/App/App/StoreKitPlugin.swift`) + ponte `lib/storekit.js`;
  `purchasePremium()` compra davvero e chiama `/api/receipt`, che valida con
  l'App Store Server API (`server/appstore.js`) e scrive `entitlements` col
  service role; `/api/appstore-notify` gestisce le notifiche V2. **Manca (azioni
  Apple)**: creare i 2 prodotti su App Store Connect, la chiave App Store Server
  API + env `APPSTORE_*` su Vercel, l'URL notifiche, poi firma + TestFlight.
  IAP obbligatorio (niente Stripe in-app). **Cambusa** è un repo separato
  (rewrite RN), non questo.
- **Multi-utenza reale**: **fatta** — dispensa familiare con `households` +
  `household_members` + RLS `is_household_member`, inviti, username ed espulsione
  (migration-6/7/8/9). Estensioni possibili: ruoli più granulari, cronologia "chi
  ha aggiunto cosa", trasferimento della proprietà del nucleo.
- **Costi/quota AI**: già presenti tetto `max_tokens`, tetto payload e rate-limit
  per utente/giorno (`ai_usage`). Per crescere: cache dei suggerimenti, batch,
  modelli più economici per task semplici.
- **Bundle**: il chunk principale supera i 500 kB (warning Vite) e ZXing è già
  lazy-loaded. Margini: code-split per scheda, `manualChunks`.
- **Offline write**: **outbox v2** (`src/lib/outbox.js` + `src/lib/sync.js`) —
  insert/update/delete per **dispensa e spesa** con id uuid client-side
  (`newLocalId`), replay idempotente (`applyOp`) avviato da `Dispensa.jsx` dopo
  la risoluzione del nucleo. Estensione possibile: ricettario e impostazioni.
- **Migrazioni DB**: sono file SQL numerati da eseguire a mano nel SQL Editor;
  crescendo conviene adottare le migrazioni gestite della Supabase CLI.
- **Test**: oggi coprono `pantry.js`. Estendere a `recipes.js`, agli hook (con
  mock di `db.js`) e ai flussi critici (scala dispensa dopo "Ho cucinato").
