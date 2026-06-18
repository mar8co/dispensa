# HANDOFF — "La Mia Dispensa" (PWA dispensa + ricette)

> Documento auto-contenuto per riprendere lo sviluppo in una **nuova conversazione**.
> Leggere anche `CLAUDE.md` (regole permanenti) e `ARCHITECTURE.md` (architettura completa).
> **Rispondere SEMPRE in italiano. Unità metriche (g/kg/ml/l) — mai cups/oz.**

Ultimo aggiornamento: 17 giugno 2026 (icona app "frigo", occasione "Schiscetta", pulsante "Cucina con questo" — tutto **committato e pushato**, ultimo commit `e0178c9`). **Commit/push automatici (vedi CLAUDE.md §0.4).** App rinominata da "La Mia Dispensa" a **"Dispensa"** (manifest, title, login; su iOS la PWA va re-installata per aggiornare nome/icona).

---

## 1. Obiettivo dell'app
App **personale** (in italiano) per gestire la dispensa di casa e cucinare con ciò che si ha. Chiude un **ciclo completo**:
registri la spesa (a mano / voce / barcode / foto scontrino) → la dispensa sa cosa hai → l'AI propone ricette con quegli ingredienti → cucini (timer + scala-dispensa automatico) → ciò che manca va in lista spesa → ricominci.
3 schede: **Dispensa**, **Spesa**, **Ricette** (+ Profilo nella navbar).

## 2. Stack tecnologico
- **Frontend**: React 18.3 + Vite 6 + Tailwind v3.4 (PostCSS). PWA con `vite-plugin-pwa` (Workbox `generateSW`, `/api` escluso dalla cache).
- **Backend dati/auth**: Supabase (Postgres + RLS + Realtime + Auth magic-link & Google).
- **AI**: Google **Gemini `gemini-2.5-flash`** (free tier, `thinkingConfig.thinkingBudget=0`) dietro proxy serverless. **NON Anthropic** (il client però parla "stile Anthropic", vedi §5).
- **Foto ricette**: **Pexels** (free) dietro proxy.
- **Barcode**: `@zxing/browser` + `@zxing/library` + Open Food Facts.
- **Icone UI**: `lucide-react`. **Icona app**: `sharp` genera i PNG da `public/icon.svg`.
- **Hosting**: Vercel (auto-deploy a ogni push su `main`). Repo GitHub **PUBBLICO** `mar8co/dispensa`.
- **Produzione**: https://la-dispensa-omega.vercel.app
- **Dir locale**: `C:\Users\pasqu\Downloads\dispensa` (Windows, PowerShell).

## 3. Funzionalità completate
- **Dispensa** (`PantryTab.jsx`): vista "indice" (sezioni full-width, righe `nome … qty` con puntini guida); barra reparti **sticky** (chips scorrevoli + freccia che espande tutti i reparti); ricerca **sticky** con icona ordinamento (Recenti / A-Z / Scadenza); pannello prodotto **auto-save** (nome al blur, qty debounce 800 ms, unità pz/g/kg/l, categoria inline emoji+nome+chevron→chips, elimina) con toast "Modifica salvata · Annulla"; **scadenza a comparsa**: il box "Data di scadenza" è nascosto di default e si apre (transizione `max-height`+fade, 300 ms) solo al tocco dell'icona calendario (evidenziata in tomato se c'è una data); la "X" svuota e richiude il box; badge scadenza sempre visibile nella riga a riposo; striscia "in scadenza entro 7 giorni" + "Cucina con questi"; prodotti finiti (qty 0) → "metti nella lista della spesa"; riordino categorie con frecce su/giù; **pulsante "Cucina con questo"** (icona Sparkles, outline rosso, in fondo al pannello) → apre le Ricette con proposte su quel prodotto (`cookWithProduct` → `changeView("ricette")` + `askCustom(nome)`).
- **Spesa** (`ShoppingTab.jsx`): input in-line **sticky** in cima con suggerimenti/frequenti; "Aggiungi" = Invio (pointerdown, la tastiera resta aperta); merge duplicati; vista **per reparto** (ordine supermercato `AISLE_ORDER`); spunta = sezione "Nel carrello"; pannello modifica come in dispensa; **"Sposta in dispensa"** grande nella barra fissa; condividi lista; wake-lock; swipe-to-delete in due tempi; correzione ortografica locale.
- **Ricette** (`RecipesTab.jsx`): 12 occasioni riordinabili (drag; "Svuota dispensa" sostituita da **"🍱 Schiscetta"**, 2ª dopo "Pranzo veloce", con prompt mirato a pasti veloci/portabili nel tupperware) + campo libero "Cosa ti va?" reso **sticky** in alto nella vista occasioni; 4 proposte (cache 24h per occasione + "Altre idee"; header categoria **sticky**); foto Pexels (fade-in); dettaglio con grammature scalabili (**default 1 porzione**, preferenza ricordata), "cosa mi manca" → spesa, **timer per passaggio**, **Modalità cucina** fullscreen; **ricettario** (cuore/preferiti + storico cucinate) **local-first**.
- **Input multimodali**: **Foto** (`ReceiptScanModal.jsx`) per **scontrino, prodotti o screenshot dell'app della spesa** — titolo "Aggiungi alla dispensa", sottotitolo galleria/screenshot, badge "Posiziona... e scatta", riquadro guida `w-[66%]`; overlay analisi (`Dispensa.jsx`, `processing`): illustrazione `public/analisi-spesa.png` (140px, niente più box/emoji) + spinner + "Sto analizzando la spesa…" / "li aggiungo alla dispensa"; deduplica AI/client; barcode (lazy), voce (Web Speech API), manuale.
- **Bottom-sheet** (`Sheet.jsx`): **scroll di sfondo bloccato** mentre un foglio è aperto (body `position:fixed`+restore, contatore per fogli annidati) e contenuto scrollabile internamente (`overscroll-contain`) — niente scroll-bleed col menu profilo.
- **Occhiello rosso sticky** (tutte e 3 le schede): l'eyebrow ("La tua dispensa" / "La tua lista" / "Ricette") è dentro il blocco sticky, sopra la barra di scrittura, e resta visibile durante lo scroll (il titolone grande scorre via). ⚠️ In Dispensa gli offset degli sticky a valle sono tarati a mano: barra reparti `top-[4.5rem]`, `scrollMarginTop` salto-reparto 124px (verificare sul telefono che non ci sia gap/overlap tra ricerca e reparti).
- **Quantità/unità** (`lib/pantry.js`): parser per famiglie (peso/volume/conteggio), passi per unità (pz±1, g±50, kg/l±0,25), cambio unità = reset al default dell'unità; stima AI nel "Ho cucinato" per pacchi↔grammi.
- **Timer globali** (`lib/timers.js`): continuano cambiando scheda; allarme a raffiche ripetute (~30 s o fino a "Stop") + vibrazione + notifica; barretta flottante (`TimerBar.jsx`).
- **Tutorial interattivo primo accesso** (`lib/tour.js` + `TourCoach.jsx`) — **NUOVO, vedi §5/§6**: spotlight che guida azioni reali; ripetibile da Profilo.
- **UI/UX**: dark mode (auto + manuale), View Transitions, skeleton, bottom-sheet, navbar flottante a pillola (Dispensa · Spesa · [+] · Ricette · Profilo) con "+" centrale a semicerchio, light mode avorio #F7F6F1.
- **Profilo** (`ProfileSheet.jsx`): tema, preferenze alimentari (iniettate nei prompt ricetta), **"Rivedi il tutorial"**, svuota dispensa, logout con conferma.

## 4. Funzionalità in sviluppo / non finite
- **Icona dell'app — FINALIZZATA** (commit `1b6e710`): **frigo aperto con prodotti**, stile geometrico piatto, forme cream su **fondo nero**, **dettaglio rosso** (un pomodoro). `public/icon.svg` (512, full-bleed, contenuto nella zona sicura per maskable) + PNG da `node scripts/generate-icons.mjs`. iOS cache l'icona PWA: per vederla va rimossa e re-installata.
- **"Scegli icona" in Profilo — NON si fa** (scelta utente): una PWA non può cambiare l'icona sulla Home a runtime (nessuna alternate-icon API), quindi un selettore sarebbe inutile. Resta un'unica icona.
- TODO prioritari: vedi §10.

## 5. Tutorial interattivo (la novità principale di questa sessione)
Sostituisce il vecchio onboarding a 11 schede informative (file `Onboarding.jsx` **eliminato**).

**Decisioni concordate con l'utente:**
- I passi "Ricette" e "Scontrino" sono **simulati** (ricetta demo precaricata `TOUR_RECIPE` → niente chiamata AI / quota / attesa; scansione scontrino mostrata come esempio `TOUR_SCAN` → niente fotocamera). Funziona sempre, offline e a costo zero.
- Blocco **rigido guidato**: a ogni passo è toccabile **solo** l'elemento evidenziato; il resto è bloccato. Resta sempre "Esci dal tutorial" (+ un "salta" discreto, per non restare mai bloccati se un segnale non scatta).

**Come funziona (architettura):**
- `src/lib/tour.js` — store esterno (`useSyncExternalStore`) + array `STEPS` (**21 passi al primo accesso**) + contenuti demo (`TOUR_RECIPE`, `TOUR_IDEA`, `TOUR_SCAN` con emoji, `TOUR_MODE`). API: `useTourState()`, `startTour(firstRun)`, `stopTour()`, `tourGoNext()`, `tourSignal(name)`, `visibleSteps(firstRun)`.
- **Revisione testi (17 giu 2026):** tutti i testi riscritti in tono informale e **in prima persona** (l'app "parla": *lo metto, ti segnalo, ti propongo, riconosco*); rimosso l'indicatore "Passo X di N"; nei passi d'azione hint e "salta" sono sulla stessa riga; **rimosso il passo timer**; aggiunto il passo **`recipe-search`** (enfasi sulla barra "Cosa ti va?", informativo, niente AI); il passo **scadenza** è in due tempi (icona → box, segnali `expiry-opened`/`expiry-set`); aggiunto il passo informativo **`cook-with`** che spiega il bottone "Cucina con questo" (`data-tour="cook-with"`); passo **`add-modes`** con `tip:"top"` (tooltip in alto, non copre il menù "+").
- **Svuotamento demo guidato dall'utente:** il vecchio passo `empty` (svuotava in automatico) è ora due passi — `empty-open-profile` (spotlight su Profilo) e `empty-clear` (spotlight su "Svuota dispensa"). Il tap svuota subito i dati demo *senza* la conferma `ConfirmClearModal` (ramo `tour.active` in `onClearPantry`) e avanza. Entrambi esclusi nel replay (`visibleSteps`).
- `src/components/TourCoach.jsx` — overlay: 3 rese → **card** (riquadro centrale: benvenuto/scontrino/svuota/fine), **banner** (striscia in alto sopra le modali), **spotlight** (4 pannelli scuri attorno a un buco luminoso + anello + tooltip). Misura il bersaglio in rAF (segue scroll/animazioni). Se il bersaglio non si trova, ripiega su banner (non si blocca mai).
- I bersagli sono marcati con attributi **`data-tour="…"`** sparsi nei componenti (`add-fab`, `add-manual-option`, `pantry-first-item`, `qty-stepper`, `unit-chips`, `expiry-field`, `tab-spesa`, `tab-ricette`, `tab-profilo`, `shopping-input`, `recipe-search`, `recipe-idea`, `recipe-heart`, `clear-pantry`, `manual-add`). NB: `step-timer`/`tourSignal("timer-started")` restano in `StepTimer.jsx` ma sono **inerti** (passo timer rimosso) — pulizia in sospeso.
- L'app **emette segnali** con `tourSignal('nome')` quando l'utente compie l'azione reale (apre prodotto, cambia qty/unità, apre il "+", sceglie "A mano", aggiunge, cambia scheda, apre/salva ricetta, avvia timer). Il passo avanza solo se aspetta proprio quel segnale (altrimenti no-op).
- `Dispensa.jsx` orchestra: `useTourState()`, un `useEffect` che a ogni passo imposta la vista giusta, chiude le modali non pertinenti e (nelle Ricette) precarica la proposta demo; handler `tourEmptyDemo` / `tourComplete` / `tourExit` / `replayTour`; `openRecipe` ha un ramo demo (no AI) quando `tour.active`.
- **Primo accesso**: il caricamento iniziale popola `DEMO_DATA` e chiama `startTour(true)`; verso la fine **è l'utente** a svuotare i dati demo (Profilo › Svuota dispensa, guidato); si segna `localStorage` `dispensa-onboarded-<uid>=1`. (`tourExit`/"Esci" puliscono comunque i dati demo al primo accesso.)
- **Replay**: Profilo → "Rivedi il tutorial" → `startTour(false)` (NON tocca la dispensa reale; il passo "svuota demo" è escluso).

## 6. Bug noti / limiti
### Bug recentemente risolti (questa sessione)
- **Scadenza non salvata se modificata da sola** (RISOLTO). Causa: stale closure — l'effetto "tocco fuori → chiudi pannello" in `PantryTab.jsx` aveva dipendenze `[openId, qtyDraft, draftName]` **senza `expDraft`**; chiudendo subito dopo aver scelto solo la data, il flush usava un `expDraft` vecchio e la commit veniva scartata. Fix: aggiunto `expDraft` alle dipendenze. (Toccare anche la quantità "sbloccava" il salvataggio: era il sintomo della closure vecchia.)

### Limiti noti (NON bug — limiti della piattaforma web)
- I **timer non suonano** a telefono bloccato/app chiusa (nessuna scheduled-notification senza infrastruttura push). Suonano al rientro in primo piano.
- **Quota Gemini free** esauribile: limite/minuto (~1 min reset) e /giorno (reset ~09:00 ora IT). `callClaude` fa 2 retry con backoff su 429/500/502/503.
- **Modifiche offline non persistite** (la cache locale è di sola lettura).
- `migration-4.sql` (saved_recipes) potrebbe NON essere stata eseguita su Supabase → i preferiti funzionano comunque in locale (local-first) ma NON si sincronizzano tra dispositivi finché non la si esegue.

### Bug aperti
- Nessuno noto. (Il tutorial è stato verificato col build; **non** è stato percorso end-to-end in runtime perché parte solo dopo il login Supabase — vedi §9.)

## 7. File più importanti (dove guardare per primo)
- `src/Dispensa.jsx` — **god component**: stato e logica di tutta l'app (~1600 righe), orchestrazione tutorial.
- `src/lib/tour.js` + `src/components/TourCoach.jsx` — motore tutorial interattivo.
- `src/lib/pantry.js` — categorizzazione e matematica quantità (delicato, funzioni pure).
- `src/constants.js` — 17 categorie, ordine reparti, occasioni (`MODES`), prompt scontrino, `NAME_RULES`, `SEED_DATA`, `DEMO_DATA`.
- `src/lib/db.js` — tutte le query Supabase.
- `server/claude.js` — traduzione "stile Anthropic" ↔ Gemini (+ auth token).
- `vite.config.js` — PWA + middleware dev `/api` (`devApi`).
- `src/index.css` + `tailwind.config.js` — design tokens e dark mode.

## 8. Decisioni tecniche prese
- **Gemini, non Anthropic** (l'account non ha credito API Anthropic; l'abbonamento Claude.ai ≠ API). Modello `gemini-2.5-flash` (i `2.0` davano limite 0 sul free tier). Il client resta "stile Anthropic" così il provider è sostituibile senza toccare prompt/client.
- **Pexels, non immagini AI** (i modelli immagine Gemini free hanno limite 0).
- **Repo pubblico**: su Vercel Hobby + repo privato i deploy venivano bloccati se l'autore del commit ≠ membro team. Reso pubblico (nessun segreto committato).
- **Ricettario local-first** per non mostrare errori se `migration-4` manca.
- **17 categorie** ordinate per frequenza d'uso; **uova → "Altro"** (scelta utente); congelati → sempre "Surgelati" (early-return in `guessCategory`).
- **Default 1 porzione** nelle ricette; preferenza manuale ricordata (`prefServings` in settings).
- **Aggiunta a mano SENZA AI** (solo `correctName`+`guessCategory` locali) per non consumare quota; l'AI resta per scontrino/voce/barcode.
- **Tutorial: passi AI/fotocamera simulati + blocco rigido** (vedi §5).

## 9. Stato git / cosa NON è ancora deployato
- Il **tutorial interattivo** (nuovi `lib/tour.js`, `components/TourCoach.jsx`; `Onboarding.jsx` eliminato; `data-tour`/`tourSignal` in BottomNav/AddFab/PantryTab/ShoppingTab/RecipesTab/StepTimer/ManualAddModal; orchestrazione in `Dispensa.jsx`; "Rivedi il tutorial" in `ProfileSheet.jsx`) e il **fix scadenza** sono **committati e pushati** su `main` (commit `08607b9`, 17 giu 2026). Vercel ha fatto auto-deploy. Nel commit sono inclusi anche `CLAUDE.md`, `ARCHITECTURE.md`, `HANDOFF.md`.
- **Fix UX** (commit `606f2f1`): blocco scroll di sfondo nei bottom-sheet (`Sheet.jsx`), barra "Cosa ti va?" sticky in Ricette, funzione Foto chiarita per scontrino *e* spesa (`ReceiptScanModal.jsx`, `lib/tour.js`, `TourCoach.jsx`). **Committato e pushato.**
- **Scadenza a comparsa** nel pannello prodotto (commit `9ab9734`): box nascosto di default, apertura su tocco calendario con transizione, riga principale in stile mockup; quantità/unità mantenute. **Committato e pushato.**
- **Occhiello rosso sticky** nelle 3 schede (commit `f2dd977`): eyebrow dentro il blocco sticky sopra la barra; offset sticky Dispensa ritarati. **Committato e pushato.**
- **Calendario nativo a un tap** (commit `a1afe20`): l'icona calendario nel pannello prodotto apre subito il selettore data (`input.showPicker()`, fallback `focus()`). **Committato e pushato.**
- ⚠️ Tutte le novità UI vivono **dietro il login Supabase**: build OK ma runtime non ancora percorso da Claude → **da provare sul telefono**.
- **Icona app finalizzata** (commit `1b6e710`, §4): frigo aperto su fondo nero, dettaglio rosso. **Committato e pushato.**

## 10. TODO prioritari
1. **Provare il tutorial end-to-end** sul telefono dopo il login (build OK ma runtime non ancora percorso).
3. **Refactor `Dispensa.jsx`**: spezzare in custom hooks (`usePantry`, `useShopping`, `useRecipes`) o store leggero. Debito principale.
4. **Notifiche scadenze** (push/local) — alto valore (i dati ci sono già).
5. **Coda sync offline-write** (oggi offline è sola lettura).
6. **Dispensa condivisa** col partner (Realtime già presente).
7. Test sulle funzioni pure di `lib/pantry.js`; valutare TypeScript.
8. Aggiornare dipendenze (React 19 / Tailwind 4 / Vite 7) — nessuna urgenza.

## 11. Cose da NON modificare (o con molta cautela)
- **API key MAI nel client** (regola assoluta). `GEMINI_API_KEY`/`PEXELS_API_KEY` solo lato server.
- Non rompere il **pattern proxy** "stile Anthropic" ↔ Gemini (client/prompt non devono cambiare formato).
- Non usare **`text-white`/`bg-white` su fondi scuri letterali** → usare `text-[#fff]`/`bg-[#fff]` (il token Tailwind `white` è TEMATO e si scurisce in dark).
- `<input type="date">` invisibile dentro una label: serve **`overflow-hidden`** (su iOS sfora e ruba i tap). Un elemento **`fixed` dentro un `transform`** si ancora al genitore, non al viewport (overlay del "+" è renderizzato a livello pagina apposta; idem TourCoach).
- Calendario scadenza nel pannello dispensa: il salvataggio passa da un **debounce + flush alla chiusura**; l'effetto di chiusura DEVE includere `expDraft` nelle dipendenze (vedi §6).
- I due blocchi di palette **dark** in `index.css` (media query + `[data-theme="dark"]`) devono restare **identici**.
- Non reintrodurre il **seed permanente** al primo accesso: ora popola `DEMO_DATA` e il tutorial li pulisce.

## 12. Istruzioni per riprendere in una nuova chat
**Ambiente** (Windows, PowerShell):
- Dir: `C:\Users\pasqu\Downloads\dispensa`
- Dev: `npm run dev` (porta 5173). Build: `npm run build`.
- Icone: `node scripts/generate-icons.mjs` dopo aver modificato `public/icon.svg`.

**Workflow modifiche** (rispettare SEMPRE):
`edit → npm run build → git commit → git push origin main` → Vercel auto-deploy.
Commit message: terminare con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
Committare/pushare **sempre in automatico** dopo ogni modifica con build verde (preferenza utente del 17 giu 2026), senza attendere richiesta.

**Verifica**: il preview locale mostra la login page; le viste interne (e il tutorial) richiedono auth Supabase, quindi spesso non sono percorribili da Claude. La **build che passa è la verifica autorevole**; ignorare gli errori HMR transitori durante edit multi-step.

**Config persistente** (NON serve riconfigurare):
- Supabase project ref: `tikcnxwqynpytysrrtaz`. Tabelle: `pantry_items`, `shopping_items`, `user_settings`, `saved_recipes`.
- `.env.local` (gitignored, già presente): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `PEXELS_API_KEY`.
- Env Vercel (già impostate): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `PEXELS_API_KEY`.
- ⚠️ **DA AGGIUNGERE** (Vercel + `.env.local`): **`SUPABASE_SERVICE_ROLE_KEY`** (segreta, solo server) — necessaria per **cancellazione account** (`api/account`) e per il **rate-limit AI** (`server/claude`). Opzionale `AI_DAILY_LIMIT` (default 80). Finché manca: "Elimina account" dà 500; il rate-limit è semplicemente saltato.
- `migration-4.sql` (saved_recipes) e **`migration-5.sql`** (tabella `ai_usage` + funzione `bump_ai_usage` per il rate-limit AI): da eseguire nel SQL Editor di Supabase. L'app funziona anche senza (la mig-5 attiva solo il limite, best-effort).

**Sicurezza/conformità (Fase 1 store — 17 giu 2026):** proxy AI con cap payload + clamp max_tokens + rate-limit per utente/giorno (`server/claude.js`, `migration-5`); **cancellazione account** in `Profilo › Elimina account` (`server/account.js` + `api/account.js`, service role, dati via cascade); **informativa privacy** in-app (`PrivacySheet.jsx`, link discreto nel Profilo). **Sign in with Apple rimandato** a quando si farà il wrapper nativo (richiede account Apple Developer + config Supabase).

**Note sull'utente**: risponde in italiano, usa iPhone Safari/PWA, è molto attento ai dettagli UX/UI; spesso chiede **mockup** prima di applicare modifiche visive (offrirli via widget). iOS cache-a l'icona PWA: per aggiornarla va rimossa e re-installata.
