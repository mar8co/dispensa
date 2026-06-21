# HANDOFF — "Dispensa" (PWA dispensa + ricette)

> Documento auto-contenuto per riprendere lo sviluppo in una **nuova conversazione**.
> Leggere anche `CLAUDE.md` (regole permanenti) e `ARCHITECTURE.md` (architettura completa).
> **Rispondere SEMPRE in italiano. Unità metriche (g/kg/ml/l) — mai cups/oz.**

Ultimo aggiornamento: 21 giugno 2026. Tutto **committato e pushato** su `main` (ultimo commit `a003b60`). **Commit/push automatici dopo ogni build verde** (vedi CLAUDE.md §0.4).

**Novità di questa sessione (21 giu 2026):**
- ✅ **Refactor incrementale di `Dispensa.jsx` COMPLETATO**: estratti 5 custom hook (`useOnline` → `useTimersTicker` → `useRecipes` → `useShopping` → `usePantry`), un commit per hook con build+test+CI verdi. `Dispensa.jsx` è ora la **composition root** (vedi §4 e §7).
- ✅ **Classificazione più accurata**: dizionario `CATEGORY_KEYWORDS` ampliato (tutti i formati di pasta + sinonimi/varianti) e nuovo helper `categorize(name, aiCategory)` (dizionario-first, AI fallback) applicato ai flussi import. Test saliti a **34**.
- ✅ **Scanner come bottom-sheet scuro**: nuovo componente condiviso `CameraScanShell` (usato da scontrino e barcode); non più a tutto schermo, palette bianco-su-scuro coerente. `Sheet` ha ora `panelClass`/`handleClass` per il tema scuro.
- Ritocchi UI: rimosso il glow rosso sotto il "+" (`AddFab`); testo tutorial e placeholder dettatura.

---

## 1. Obiettivo dell'app
App **personale** (in italiano) per gestire la dispensa di casa e cucinare con ciò che si ha. Chiude un **ciclo completo**:
registri la spesa (a mano / voce / barcode / foto di scontrino o prodotti) → la dispensa sa cosa hai → l'AI propone ricette con quegli ingredienti → cucini (timer + scala-dispensa automatico) → ciò che manca va in lista spesa → ricominci.
3 schede: **Dispensa**, **Spesa**, **Ricette** (+ Profilo nella navbar). L'app si chiama **"Dispensa"** (ex "La Mia Dispensa"); la cartella/repo resta `dispensa`.

## 2. Stack tecnologico
- **Frontend**: React 18.3 + Vite 6 + Tailwind v3.4 (PostCSS). PWA con `vite-plugin-pwa` (Workbox `generateSW`, `/api` escluso dalla cache).
- **Backend dati/auth**: Supabase (Postgres + RLS + Realtime + Auth magic-link & Google).
- **AI**: Google **Gemini `gemini-2.5-flash`** (free tier, `thinkingConfig.thinkingBudget=0`) dietro proxy serverless. **NON Anthropic** (il client però parla "stile Anthropic", vedi §8 e CLAUDE.md §5).
- **Foto ricette**: **Pexels** (free) dietro proxy.
- **Barcode**: `@zxing/browser` + `@zxing/library` + Open Food Facts.
- **Icone UI**: `lucide-react`. **Icona app**: `sharp` genera i PNG da `public/icon.svg`.
- **Qualità/CI**: **Vitest** (`npm test` → 34 test su `src/lib/pantry.js`), **ESLint** flat config (`npm run lint`, regola `react-hooks`), **GitHub Actions** (`.github/workflows/ci.yml`: `npm ci → lint → test → build` su ogni push/PR). Lint attuale: **0 errori, 0 warning**.
- **Hosting**: Vercel (auto-deploy a ogni push su `main`). Repo GitHub **PUBBLICO** `mar8co/dispensa`.
- **Produzione**: https://la-dispensa-omega.vercel.app
- **Dir locale**: `C:\Users\pasqu\Downloads\dispensa` (Windows, PowerShell).

## 3. Funzionalità completate
- **Dispensa** (`PantryTab.jsx`): vista "indice" (sezioni full-width, righe `nome … qty` con puntini guida); barra reparti **sticky** (chips scorrevoli + freccia che espande tutti i reparti); ricerca **sticky** con icona ordinamento (Recenti / A-Z / Scadenza); occhiello rosso "La tua dispensa" dentro il blocco sticky; pannello prodotto **auto-save** (nome al blur, qty debounce 800 ms, unità pz/g/kg/l, categoria inline emoji+nome+chevron→chips, elimina) con toast "Modifica salvata · Annulla"; **scadenza a comparsa** (box "Data di scadenza" nascosto, si apre al tocco dell'icona calendario con transizione `max-height`+fade; la "X" svuota e richiude; al tap sull'icona prova `input.showPicker()` con fallback `focus()`); badge scadenza nella riga a riposo; striscia "in scadenza entro 7 giorni" + "Cucina con questi"; prodotti finiti (qty 0) → "metti nella lista della spesa"; riordino categorie con frecce su/giù; **pulsante "Cucina con questo"** (icona Sparkles, outline rosso, in fondo al pannello) → apre le Ricette con proposte su quel prodotto (`cookWithProduct` → `changeView("ricette")` + `askCustom(nome)`).
- **Spesa** (`ShoppingTab.jsx`): input in-line **sticky** in cima (+ occhiello "La tua lista") con suggerimenti/frequenti; "Aggiungi" = Invio (pointerdown, la tastiera resta aperta); merge duplicati; vista **per reparto** (ordine supermercato `AISLE_ORDER`); spunta = sezione "Nel carrello"; pannello modifica come in dispensa; **"Sposta in dispensa"** grande nella barra fissa; condividi lista; wake-lock; swipe-to-delete in due tempi; correzione ortografica locale.
- **Ricette** (`RecipesTab.jsx`): 12 occasioni riordinabili (drag) — "Svuota dispensa" sostituita da **"🍱 Schiscetta"** (2ª dopo "Pranzo veloce", prompt mirato a pasti veloci/portabili nel tupperware) + campo libero "Cosa ti va?" **sticky** in alto (con occhiello "Ricette"); 4 proposte (cache 24h per occasione + "Altre idee"; header categoria sticky); foto Pexels (fade-in); dettaglio con grammature scalabili (**default 1 porzione**, preferenza ricordata), "cosa mi manca" → spesa, **timer per passaggio**, **Modalità cucina** fullscreen; **ricettario** (cuore/preferiti + storico cucinate) **local-first**.
- **Input multimodali**: **Foto** (`ReceiptScanModal.jsx`, lazy) per **scontrino, prodotti o screenshot dell'app della spesa** — titolo "Aggiungi alla dispensa", sottotitolo galleria/screenshot, badge "Posiziona lo scontrino o la spesa nel riquadro e scatta" (centrato), riquadro guida `w-[66%]`; overlay analisi (`Dispensa.jsx`, `processing`): illustrazione `public/analisi-spesa.png` (140px) + spinner + "Sto analizzando la spesa…"; deduplica AI/client via `ReviewScanModal`; **barcode** (lazy + Open Food Facts), **voce** (Web Speech API), **manuale** (`ManualAddModal`). **Scontrino e barcode condividono `CameraScanShell`** (bottom-sheet scuro a metà pagina, testi/icone bianchi, riquadro guida `border-[#fff]/85` + scrim; lo scontrino più alto del barcode). **Categoria dizionario-first**: i flussi import passano da `categorize(name, aiCategory)` (il dizionario locale vince sulle varianti note — es. formati di pasta — l'AI è fallback) prima della revisione.
- **Bottom-sheet** (`Sheet.jsx`): **scroll di sfondo bloccato** mentre un foglio è aperto (body `position:fixed`+restore, contatore per fogli annidati) e contenuto scrollabile internamente (`overscroll-contain`).
- **Quantità/unità** (`lib/pantry.js`): parser per famiglie (peso/volume/conteggio), passi per unità (pz±1, g±50, kg/l±0,25), cambio unità = reset al default; stima AI nel "Ho cucinato" per pacchi↔grammi. **Coperto da 29 unit test** (`pantry.test.js`).
- **Timer globali** (`lib/timers.js`): continuano cambiando scheda; allarme a raffiche (~30 s o fino a "Stop") + vibrazione + notifica; barretta flottante (`TimerBar.jsx`).
- **Tutorial interattivo primo accesso** (`lib/tour.js` + `TourCoach.jsx`): 13 passi, ripetibile da Profilo — vedi §5.
- **UI/UX**: dark mode (auto + manuale), View Transitions, skeleton, navbar flottante a pillola (Dispensa · Spesa · [+] · Ricette · Profilo) con "+" centrale a semicerchio (A mano · Foto · Barcode · Voce), light mode avorio #F7F6F1.
- **Profilo** (`ProfileSheet.jsx`): tema, preferenze alimentari (iniettate nei prompt ricetta), "Rivedi il tutorial", "Svuota dispensa", logout con conferma; in fondo (discreti) i link **"Privacy"** (apre `PrivacySheet.jsx`) e **"Elimina account"** (con conferma).
- **Sicurezza/conformità (Fase 1 store)**: vedi §8.
- **Icona app**: **frigo aperto con prodotti**, stile geometrico piatto, forme cream su fondo nero, dettaglio rosso (un pomodoro). `public/icon.svg` (512, full-bleed, zona sicura per maskable) → PNG via `node scripts/generate-icons.mjs`.

## 4. Funzionalità in sviluppo / non finite
- ✅ **Refactor `Dispensa.jsx` in custom hooks — COMPLETATO** (era il debito tecnico principale). Estratti in `src/hooks/`: `useOnline`, `useTimersTicker`, `useRecipes`, `useShopping`, `usePantry` — uno per commit, build+test+CI verdi a ogni passo. `Dispensa.jsx` è ora la **composition root**: compone gli hook e tiene solo l'orchestrazione trasversale (tutorial, flussi scan/voce/barcode, CookModal, bridge `moveCheckedToPantry`/`cookWith*`) e gli **effetti condivisi** (load cache-first, persistenza impostazioni, cache mirror, Realtime). Confini in §7.
- **Wrapper iOS / pubblicazione App Store** — bloccato (utente su Windows, serve Mac o build cloud). Vedi §10 e §8.
- Tutto il resto delle feature è completo e in produzione.

## 5. Tutorial interattivo (stato attuale)
Sostituisce il vecchio onboarding (file `Onboarding.jsx` **eliminato**).

**Principi:**
- Passi "Ricette"/"Scontrino" **simulati** se servissero (dati demo `TOUR_RECIPE`/`TOUR_IDEA`/`TOUR_SCAN`): niente chiamate AI / quota durante il tour. La ricetta demo è "Cous cous con tonno, zucchine e feta" (ingredienti presenti in `DEMO_DATA`).
- Tono **informale, in prima persona** ("lo metto", "ti propongo", "ti segnalo"). Niente indicatore "Passo X di N". Sui passi d'azione: badge "👆 Tocca l'elemento" + "salta" sulla stessa riga (tranne dove `noSkip`).

**Architettura:**
- `src/lib/tour.js` — store esterno (`useSyncExternalStore`) + array `STEPS` + contenuti demo. API: `useTourState()`, `startTour(firstRun)`, `stopTour()`, `tourGoNext()`, `tourSignal(name)`, `visibleSteps()`.
- `src/components/TourCoach.jsx` — 3 rese: **card** (riquadro centrale: welcome/done), **banner** (striscia; supporta `pos:"bottom"`; ha un **contenitore full-screen** che blocca i tocchi sulla pagina dietro così tappare vicino ad "Avanti" non apre la tastiera, ma i pulsanti del riquadro restano interattivi), **spotlight** (4 pannelli scuri + anello + tooltip, transizioni morbide). Lo spotlight **mantiene l'ultima posizione** se il bersaglio sparisce un istante (niente flicker verso banner). Tooltip/banner/card fanno `stopPropagation` sul `pointerdown` (così non chiudono il pannello prodotto sotto). `whitespace-pre-line` rispetta gli a-capo (`\n`) nei testi.
- **13 passi (stesso elenco al primo accesso e in replay):**
  1. `welcome` (card) — "Benvenuto! 👋"
  2. `pantry` (banner) — "Questa è la tua dispensa"
  3. `open-product` (spotlight `pantry-first-item`, azione `product-opened`)
  4. `qty` (spotlight `qty-stepper`, azione `qty-changed`)
  5. `expiry-open` (spotlight `expiry-field`, azione `expiry-opened`)
  6. `cook-with` (spotlight `cook-with`, "Avanti") — spiega "Cucina con questo"
  7. `add-open` (spotlight `add-fab`, azione `add-menu-opened`, **`noSkip`** = niente "salta") — tocca il "+"
  8. `add-modes` (banner `pos:"bottom"`, "Avanti") — mostra le 4 modalità col menu aperto
  9. `go-spesa` (spotlight `tab-spesa`, azione `view-spesa`)
  10. `spesa-info` (banner, "Avanti") — spiega la scheda Spesa
  11. `go-ricette` (spotlight `tab-ricette`, azione `view-ricette`)
  12. `ricette-info` (banner, "Avanti") — spiega la scheda Ricette
  13. `done` (card, "Inizia ora" senza freccia)
- I bersagli sono `data-tour="…"` nei componenti (`pantry-first-item`, `qty-stepper`, `expiry-field`, `cook-with`, `add-fab`, `tab-spesa`, `tab-ricette`, `tab-profilo`, …). NB: `unit-chips`, `manual-add`, `shopping-input`, `recipe-search`, `recipe-idea`, `recipe-heart`, `step-timer`, `clear-pantry`, `add-manual-option` non sono più usati da nessun passo (residui inerti — pulizia eventuale).
- **Segnali**: `tourSignal('nome')` negli handler reali; il passo avanza solo se aspetta quel segnale.
- `Dispensa.jsx` orchestra (un `useEffect` su `tour.index` imposta la vista, chiude le modali non pertinenti) e gestisce `tourComplete`/`tourExit`/`replayTour`.
- **Pulizia demo automatica**: al **primo accesso** il caricamento popola `DEMO_DATA` + `startTour(true)`; a fine tour `tourComplete` (e `tourExit`) chiama `tourEmptyDemo()` → svuota dispensa/lista demo; segna `dispensa-onboarded-<uid>=1`. In **replay** (`startTour(false)` da Profilo) gli stessi passi girano ma NON si svuotano dati reali (firstRun=false).

## 6. Bug noti / limiti
**Bug aperti:** nessuno noto. Risolti di recente: scadenza non salvata (stale closure `expDraft`), doppione "Cucina con questo" / mancato "Avanti" sui banner (causa: il tooltip chiudeva il pannello prodotto via il listener "tocco fuori" → risolto con `stopPropagation` + contenitore banner unico full-screen), tastiera aperta tappando vicino ad "Avanti" (risolto dal contenitore banner che cattura i tocchi).

**Limiti noti (NON bug — piattaforma web):**
- I **timer non suonano** a telefono bloccato/app chiusa (no scheduled-notification senza push). Suonano al rientro in primo piano.
- **Quota Gemini free** esauribile (limite/min e /giorno). `callClaude` fa 2 retry con backoff su 429/500/502/503.
- **Modifiche offline non persistite** (cache locale di sola lettura).
- **`showPicker()` su iOS 26.5**: il calendario nativo può non aprirsi al tap dell'icona (fallback `focus()`).
- **Viste dietro login**: il preview locale mostra solo la pagina di accesso → il runtime delle viste interne/tutorial **non è percorribile da Claude**. La build (e lint/test) è la verifica autorevole; provare sul telefono.

## 7. File più importanti (dove guardare per primo)
- `src/Dispensa.jsx` — **composition root**: compone i 5 hook, tiene l'orchestrazione trasversale (tutorial, scan/voce/barcode, CookModal, bridge `moveCheckedToPantry`/`cookWith*`, `deleteAccount`) e gli effetti condivisi (load, persistenza impostazioni, cache, Realtime).
- `src/hooks/` — stato e logica per dominio:
  - `useOnline.js` (indicatore offline), `useTimersTicker.js` (ticker timer globale).
  - `useRecipes.jsx` (proposte/ricetta/cache idee 24h/ricettario; CookModal resta in Dispensa, l'hook espone `recordCookedRecipe`).
  - `useShopping.jsx` (lista spesa: aggiunta con merge, modifica/spunta, voce, storico; `moveCheckedToPantry` resta in Dispensa come bridge).
  - `usePantry.jsx` (prodotti, form, ricerca/ordine/filtro, derivati `grouped`/`expiringItems`, CRUD con merge; i flussi scan e CookModal restano in Dispensa).
  - `useAuth.js` (sessione Supabase). Ordine di dichiarazione in Dispensa: shopping → pantry (rompe il ciclo: pantry riceve `bumpShopHistory`/`addToShoppingMerged`; `moveCheckedToPantry` usa `mergeItems` in Dispensa).
- `src/lib/tour.js` + `src/components/TourCoach.jsx` — motore tutorial.
- `src/lib/pantry.js` (+ `pantry.test.js`, 34 test) — categorizzazione (`guessCategory`, `categorize` dizionario-first) e matematica quantità (funzioni pure, testate).
- `src/components/CameraScanShell.jsx` — guscio bottom-sheet scuro condiviso dagli scanner (scontrino/barcode); `Sheet.jsx` accetta `panelClass`/`handleClass` per il tema scuro.
- `src/constants.js` — 17 categorie, `AISLE_ORDER`, occasioni `MODES`, prompt scontrino, `NAME_RULES`, `SEED_DATA`, `DEMO_DATA`.
- `src/lib/db.js` — tutte le query Supabase.
- `server/claude.js` — proxy AI "stile Anthropic"↔Gemini (auth token + cap payload + rate-limit). `server/photo.js` — Pexels. `server/account.js` — cancellazione account.
- `api/claude.js` · `api/photo.js` · `api/account.js` — wrapper serverless Vercel.
- `vite.config.js` — PWA + manifest + middleware dev `/api` (`devApi`).
- `src/index.css` + `tailwind.config.js` — design tokens e dark mode.
- `eslint.config.js`, `.github/workflows/ci.yml`, `supabase/*.sql`.

## 8. Decisioni tecniche prese
- **Gemini, non Anthropic** (no credito API Anthropic; Claude.ai ≠ API). Client "stile Anthropic" → provider sostituibile toccando solo `server/claude.js`.
- **Pexels, non immagini AI** (Gemini free non genera immagini).
- **Repo pubblico**: su Vercel Hobby + repo privato i deploy si bloccavano. Nessun segreto committato.
- **`qty` come testo** (es. "1 barattolo", "500 g"): parser dedicati in `pantry.js`.
- **Ricettario local-first**; **default 1 porzione**; **aggiunta a mano senza AI**; **17 categorie** (uova → "Altro"; surgelati → early-return in `guessCategory`).
- **Sicurezza/conformità Fase 1 (per pubblicazione futura):**
  - **Proxy AI indurito** (`server/claude.js`): cap dimensione payload (~9 MB), `max_tokens` 1..2048, **rate-limit per utente/giorno** best-effort (`SUPABASE_SERVICE_ROLE_KEY` + RPC `bump_ai_usage`/tabella `ai_usage` di `migration-5.sql`; default 80, env `AI_DAILY_LIMIT`). Se non configurato, NON blocca.
  - **Cancellazione account** (`server/account.js` + `api/account.js`): verifica token, poi `admin.deleteUser` (service role) → dati via cascade. UI discreta in Profilo.
  - **Privacy policy** in-app (`PrivacySheet.jsx`), link discreto in Profilo.
  - **Sign in with Apple — RIMANDATO** a quando si farà il wrapper nativo (serve account Apple Developer 99 €/anno + config Supabase). Una PWA su Windows **non** può fare build iOS: serve Mac o servizio cloud (Codemagic/PWABuilder, che comunque richiede macOS per l'ipa).
- **Test + CI + ESLint** aggiunti; rimosso codice morto → lint pulito.

## 9. Stato git
Tutto su `main`, pushato, Vercel deploya in automatico. Ultimi commit rilevanti: `9e0c372`→`fa2b4e0` (refactor 5 hook, uno per commit), `1657ae8` (classificazione varianti + scanner coerenti + fix UI "+"/dettatura), `3d30c09` (scanner come bottom-sheet scuro), `a003b60` (testo tutorial). Niente di non committato. ⚠️ Le novità UI vivono **dietro login** (e gli scanner usano fotocamera): build/lint/test verdi, ma runtime da provare sul telefono.

## 10. TODO prioritari
> ✅ Il refactor incrementale di `Dispensa.jsx` in custom hooks è **completato** (vedi §4/§7).
1. **Provare sul telefono** dopo il login: tutorial end-to-end + i due scanner ridisegnati come bottom-sheet (fotocamera).
2. **Pubblicazione store**: serve Mac/servizio cloud + account Apple Developer; poi wrapper (Capacitor o PWABuilder) + Sign in with Apple + stringhe permessi + gestione voce in WKWebView (Web Speech non funziona lì).
3. **Notifiche scadenze** (push/local) — alto valore (dati già presenti).
4. **Coda sync offline-write** (oggi offline è sola lettura).
5. **Dispensa condivisa** col partner (Realtime già presente; serve modello household).
6. Eventuale **ESLint** più severo / TypeScript su `lib/pantry.js`; aggiornare dipendenze (React 19 / Tailwind 4 / Vite 7) — nessuna urgenza.
7. Pulizia residui inerti (`data-tour`/`tourSignal` di timer e step rimossi dal tour).
8. Possibile passo successivo del refactor: estrarre anche i flussi scan/voce/barcode e il CookModal in hook/componenti dedicati (oggi restano in `Dispensa.jsx` come orchestrazione cross-dominio).

## 11. Cose da NON modificare (o con molta cautela)
- **API key MAI nel client**: `GEMINI_API_KEY`/`PEXELS_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY` solo lato server.
- Non rompere il **pattern proxy** "stile Anthropic" ↔ Gemini (client/prompt invariati).
- **`text-white`/`bg-white` su fondi scuri letterali** → usare `text-[#fff]`/`bg-[#fff]` (il token `white` è TEMATO).
- `<input type="date">` invisibile in una label: serve `overflow-hidden`. Un `fixed` dentro un `transform` si ancora al genitore (overlay "+" e `TourCoach` renderizzati a livello pagina apposta).
- Calendario scadenza: salvataggio con **debounce + flush alla chiusura**; l'effetto di chiusura DEVE includere `expDraft` nelle dipendenze.
- I due blocchi di palette **dark** in `index.css` devono restare **identici**.
- Non reintrodurre il seed permanente: il primo accesso popola `DEMO_DATA` e il tutorial li pulisce.
- I pannelli del tutorial (tooltip/banner/card) devono **fermare il `pointerdown`** (altrimenti chiudono il pannello prodotto / aprono la tastiera).
- **Confini degli hook**: gli effetti condivisi (load/cache/Realtime/persistenza impostazioni) e le impostazioni `user_settings` (`catOrder`, `byAisle`, `shopCats`, `prefServings`, `foodPrefs`, `collapsed`) restano in `Dispensa.jsx`; gli hook ne ricevono ciò che serve via parametri e ne restituiscono stato+setter. **Ordine**: `useShopping` prima di `usePantry` (pantry riceve `bumpShopHistory`/`addToShoppingMerged`); `moveCheckedToPantry` resta in Dispensa per rompere il ciclo pantry↔shopping. Non spostare questi pezzi senza ricreare lo stesso schema.
- Nuova logica di stato condivisa va nell'hook del dominio giusto (non duplicata nei figli); se è cross-dominio, resta in `Dispensa.jsx` come bridge.

## 12. Istruzioni per riprendere in una nuova chat
**Ambiente** (Windows, PowerShell): dir `C:\Users\pasqu\Downloads\dispensa`. Dev `npm run dev` (porta 5173). `npm run build` / `npm run lint` / `npm test`. Icone: `node scripts/generate-icons.mjs` dopo aver toccato `public/icon.svg`.

**Workflow** (rispettare SEMPRE): `edit → npm run build (+ lint + test) → git commit → git push origin main` → Vercel auto-deploy. Commit message terminante con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Committare/pushare sempre in automatico** dopo build verde (preferenza utente).

**Config persistente:**
- Supabase project ref: `tikcnxwqynpytysrrtaz`. Tabelle: `pantry_items`, `shopping_items`, `user_settings`, `saved_recipes`, `ai_usage`.
- `.env.local` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `PEXELS_API_KEY`, e (se vuoi cancellazione account/rate-limit in locale) `SUPABASE_SERVICE_ROLE_KEY`, `AI_DAILY_LIMIT`. Vedi `.env.example`.
- Env Vercel: le `VITE_*`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `PEXELS_API_KEY` sono impostate. ⚠️ **`SUPABASE_SERVICE_ROLE_KEY` è stata aggiunta** (necessaria per "Elimina account" e rate-limit). `migration-5.sql` eseguita.
- SQL: eseguire nel SQL Editor in ordine `schema.sql → migration-2 → migration-3 → migration-4 → migration-5` (idempotenti).

**Note sull'utente**: risponde in italiano, usa iPhone Safari/PWA, **molto attento all'UX/UI**; chiede spesso **mockup** prima di modifiche visive (offrirli via widget). iOS cache nome/icona PWA: per aggiornarli va rimossa e re-installata. Memoria persistente di Claude: `project_dispensa.md` + `feedback_dispensa_autocommit.md` (indice in `MEMORY.md`).
