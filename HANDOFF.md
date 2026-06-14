# HANDOFF — "La Mia Dispensa" (PWA dispensa + ricette)

> Documento auto-contenuto per riprendere lo sviluppo in una nuova conversazione.
> Rispondere SEMPRE in italiano. Unità metriche (g/kg/ml/l) — mai cups/oz.

---

## 1. Obiettivo dell'app
App personale (in italiano) per gestire la dispensa di casa e cucinare con ciò che si ha. Chiude un **ciclo completo**: registri la spesa (a mano / voce / barcode / foto scontrino) → la dispensa sa cosa hai → l'AI propone ricette con quegli ingredienti → cucini (timer + scala-dispensa automatico) → ciò che manca va in lista spesa → ricominci. 3 schede: **Dispensa**, **Spesa**, **Ricette**.

## 2. Stack tecnologico
- **Frontend**: React 18.3 + Vite 6 + Tailwind v3.4 (PostCSS). PWA con `vite-plugin-pwa` (Workbox `generateSW`, `/api` escluso dalla cache).
- **Backend dati/auth**: Supabase (Postgres + RLS + Realtime + Auth magic-link & Google).
- **AI**: Google **Gemini `gemini-2.5-flash`** (free tier, `thinkingConfig.thinkingBudget=0`) dietro proxy serverless. NON Anthropic.
- **Foto ricette**: Pexels (free) dietro proxy.
- **Barcode**: `@zxing/browser` + `@zxing/library` + Open Food Facts.
- **Icone UI**: `lucide-react`. **Icona app**: `sharp` genera i PNG da `public/icon.svg`.
- **Hosting**: Vercel (auto-deploy a ogni push su `main`). Repo GitHub **PUBBLICO** `mar8co/dispensa`.
- **Produzione**: https://la-dispensa-omega.vercel.app
- **Dir locale**: `C:\Users\pasqu\Downloads\dispensa`

## 3. Struttura del progetto
```
src/
  App.jsx                 # gate auth (mostra Auth o Dispensa)
  Dispensa.jsx            # ~1400 righe: STATO GLOBALE + logica di tutta l'app (god component)
  main.jsx                # mount + applyTheme()
  constants.js            # CATEGORIES, AISLE_ORDER, PICKER_CATS, CAT_ICON, MODES, RECEIPT_PROMPT, NAME_RULES, SEED_DATA, DEMO_DATA
  index.css               # variabili CSS (palette light/dark), keyframe, anti-zoom iOS
  components/
    Auth.jsx              # login magic-link + Google (logo = /icon.svg)
    PantryTab.jsx         # scheda Dispensa: vista "indice", pannello prodotto auto-save, barra reparti sticky
    ShoppingTab.jsx       # scheda Spesa: input in-line sticky, pannello modifica, swipe, sposta-in-dispensa
    RecipesTab.jsx        # scheda Ricette: occasioni, 4 proposte (header sticky), dettaglio, ricettario
    BottomNav.jsx         # navbar flottante a pillola (centrata) + slot "+"
    AddFab.jsx            # "+" in-flow nella navbar (solo Dispensa) + speed-dial
    Sheet.jsx             # bottom-sheet riutilizzabile (maniglia, drag-to-dismiss)
    ManualAddModal.jsx    # aggiunta a mano (sheet): chips unità, categoria auto visibile
    VoiceAddModal.jsx     # dettatura (Web Speech API), UI assistente
    ReceiptScanModal.jsx  # fotocamera integrata scontrino (getUserMedia, guida, nitidezza, galleria)
    ReviewScanModal.jsx   # revisione prodotti riconosciuti (sheet): stepper + chips unità
    BarcodeScanModal.jsx  # scanner codice a barre (lazy)
    CookModal.jsx         # "Ho cucinato": aggiorna dispensa + stima AI quantità
    CookingMode.jsx       # modalità cucina fullscreen (step, wake lock, timer)
    StepTimer.jsx         # timer di un passaggio (vista su lib/timers.js)
    TimerBar.jsx          # barretta timer flottante globale
    ProfileSheet.jsx      # profilo: email, tema, preferenze alimentari, svuota dispensa, logout
    ConfirmClearModal.jsx # conferma svuota dispensa (sheet)
    Onboarding.jsx        # tutorial primo accesso (11 schede)
    Toast.jsx             # toast con azione (Annulla/Stop, tone tomato/ink, durata)
    AddMenu.jsx, ProfileTab.jsx  # ORFANI (non usati)
  hooks/useAuth.js        # sessione Supabase
  lib/
    supabase.js           # client
    db.js                 # query Supabase (pantry/shopping/settings/saved_recipes)
    claude.js             # callClaude (proxy /api/claude), fetchPhotos (/api/photo), fileToBase64
    pantry.js             # PURO: guessCategory, correctName(Levenshtein), parseQty, mergeQty, subtractQty,
                          #       adjustQty/qtyStep/atMinQty (passi per unità), normalizeWeight, findMatch, scadenze
    cache.js              # mirror localStorage di items/shopping/settings (offline read)
    history.js            # storico acquisti (suggerimenti spesa) in localStorage
    recipes.js            # ricettario local-first (localStorage) + id locali
    timers.js             # store globale timer (module-level + localStorage) + allarme audio/vibrazione
    theme.js              # tema auto/chiaro/scuro (localStorage + data-theme + meta theme-color)
server/claude.js, server/photo.js   # core proxy (framework-agnostic)
api/claude.js, api/photo.js         # serverless Vercel (wrappano server/*)
vite.config.js            # plugin react + PWA + middleware dev /api (devApi factory)
supabase/                 # schema.sql, migration-2/3/4.sql
scripts/generate-icons.mjs  # genera i PNG icona da public/icon.svg (node scripts/generate-icons.mjs)
public/icon.svg + *.png   # icona app (dispensa a scaffali, stile clay)
```

## 4. Stato attuale
### Completato
- **Dispensa**: vista "indice" (sezioni full-width, righe `nome … qty`, puntini guida); barra reparti **sticky** (chips scorrevoli + freccia che espande tutti i reparti); ricerca **sticky** con icona ordinamento (Recenti/A-Z/Scadenza); pannello prodotto **auto-save** (nome blur, qty debounce 800ms, categoria a chips, calendario, elimina) con toast "Modifica salvata · Annulla"; striscia scadenze + "Cucina con questi"; prodotti finiti (qty 0) → "metti in lista"; riordino categorie con frecce su/giù.
- **Spesa**: input in-line **sticky** in cima (no popup) con suggerimenti/frequenti; "Aggiungi" = Invio (pointerdown, tastiera resta); merge duplicati; per-reparto (ordine supermercato `AISLE_ORDER`); spunta = "Nel carrello"; pannello modifica = come dispensa; **"Sposta in dispensa"** grande nella barra fissa; condividi lista; wake-lock; correzione ortografica locale.
- **Ricette**: 12 occasioni riordinabili + campo libero "Cosa ti va?"; 4 proposte (cache 24h per occasione + "Altre idee"; header categoria **sticky**); foto Pexels (fade-in); dettaglio con grammature scalabili (**default 1 porzione**, preferenza ricordata), "cosa mi manca" → spesa, timer per passaggio, **Modalità cucina** fullscreen; **ricettario** (cuore/preferiti + storico cucinate) **local-first**.
- **Input multimodali**: foto scontrino (fotocamera integrata + overlay "Sto analizzando…" + deduplica AI/client), barcode, voce, manuale.
- **Quantità/unità**: parser per famiglie (peso/volume/conteggio), passi per unità (pz±1, g±50, kg/l±0,25), cambio unità = reset al default; stima AI nel "Ho cucinato" per pacchi↔grammi.
- **Timer globali**: continuano cambiando scheda; allarme a raffiche ripetute (~30s o fino a "Stop") + vibrazione + notifica; barretta flottante.
- **UI/UX moderna**: dark mode (auto + manuale), View Transitions, skeleton, bottom-sheet, navbar flottante a pillola con indicatore attivo + "+" in-flow, light mode avorio #F7F6F1.
- **Onboarding** primo accesso (demo + tutorial + pulizia).
- **Profilo**: tema, preferenze alimentari (iniettate nei prompt), svuota dispensa, logout con conferma.

### Limiti noti (non bug)
- I **timer non suonano** a telefono bloccato/app chiusa (limite web/PWA: nessuna scheduled-notification senza push infra). Suonano al rientro in primo piano.
- **Quota Gemini free** esauribile: limite/minuto (~1 min reset) e /giorno (reset ~09:00 ora IT). `callClaude` fa 2 retry con backoff su 429/500/502/503.
- **Modifiche offline** non persistite (cache è sola lettura).
- `migration-4.sql` (saved_recipes) potrebbe NON essere stata eseguita su Supabase → i preferiti funzionano comunque in locale (local-first), ma NON si sincronizzano tra dispositivi finché non si esegue.

### Bug aperti
- Nessuno noto al momento dell'handoff.

## 5. Architettura
- **`Dispensa.jsx` è il god component**: tiene TUTTO lo stato (items, shopping, settings, ricette, modali, timer ticker) e passa props/callback ai figli. È il principale debito tecnico.
- **Dati**: caricamento **cache-first** (localStorage) poi refresh da Supabase; **Realtime** su `pantry_items` e `shopping_items`; impostazioni in `user_settings` (jsonb) sincronizzate con confronto timestamp (le impostazioni DB si applicano solo se più recenti della cache — fix anti-regressione).
- **AI proxy**: client manda blocchi "stile Anthropic" a `/api/claude`; `server/claude.js` li traduce in formato Gemini e ritraduce la risposta (così prompt/client non cambiano se si cambia provider). Endpoint **protetto**: verifica token Supabase → 401 senza. Stessa cosa per `/api/photo` → Pexels. **In dev**, `vite.config.js` espone gli stessi endpoint via middleware (`devApi`).
- **Segreti SOLO server**: `GEMINI_API_KEY`, `PEXELS_API_KEY` vivono in `.env.local` (gitignored) e nelle env di Vercel. Mai nel bundle client.
- **Timer**: store **module-level** in `lib/timers.js` (fuori da React) + mirror localStorage; un ticker in `Dispensa.jsx` (setInterval 500ms + on focus/visibility) chiama `checkTimers()` che fa scattare allarme/notifica/toast.
- **Quantità**: tutta la matematica è in `lib/pantry.js` (funzioni pure).

## 6. Design system e UX/UI
- **Stile "Editoriale"**: sfondo chiaro (avorio **#F7F6F1**, token `--cream`), testo **ink** (#1a1a1a), accento **rosso pomodoro `tomato` #d6442f** (700 = #b8351f), righe sottili `hair`, font UNICO **Hanken Grotesk** (sans + `font-display` con tracking stretto, NON serif).
- **Palette via CSS variables** in `index.css` (terne RGB) + Tailwind che mappa con `rgb(var(--x) / <alpha-value>)`. **Dark mode**: media query `prefers-color-scheme` + override manuale `:root[data-theme=...]` (i due blocchi scuri vanno tenuti identici).
- **TRAPPOLA: il token Tailwind `white` è TEMATO** (si scurisce in dark). Su fondi scuri *letterali* (camera, chip nere, scrim) usare **`text-[#fff]` / `bg-[#fff]`**, non `text-white`.
- **Navbar**: pillola flottante centrata (`bg-cream/70 backdrop-blur-md`), scheda attiva con pillola `tomato/10`; "+" 56px in-flow a destra (solo Dispensa), alzato sopra la riga.
- **Bottom-sheet** (`Sheet.jsx`) per quasi tutti i modali; ricerca/aggiunta in alto (la tastiera iOS copre ciò che è fisso in basso).
- **Componenti chiave coerenti**: chips unità pz/g/kg/l, stepper −/+ rotondi, toast in basso, swipe-to-delete in due tempi.

## 7. File importanti (dove guardare per primo)
- `src/Dispensa.jsx` — stato e logica di tutto.
- `src/lib/pantry.js` — categorizzazione e matematica quantità (delicato).
- `src/constants.js` — categorie (17), ordine reparti, prompt scontrino, dati seed/demo.
- `src/lib/db.js` — tutte le query Supabase.
- `server/claude.js` — traduzione Anthropic↔Gemini.
- `vite.config.js` — PWA + middleware dev /api.
- `src/index.css` + `tailwind.config.js` — design tokens e dark mode.

## 8. Decisioni tecniche prese
- **Gemini, non Anthropic** (l'account non ha credito API; abbonamento Claude.ai ≠ API). Modello `gemini-2.5-flash` (i `2.0` davano limite 0 sul free tier).
- **Pexels, non immagini AI** (i modelli immagine Gemini free hanno limite 0).
- **Repo pubblico**: su Vercel Hobby + repo privato i deploy venivano bloccati se l'autore del commit ≠ membro team. Reso pubblico (nessun segreto committato).
- **Ricettario local-first** per non mostrare errori se `migration-4` manca.
- **17 categorie** ordinate per frequenza d'uso (fresco in alto, spezie/condimenti in fondo); le **uova → "Altro"** (scelta utente), prodotti congelati → sempre "Surgelati" (early-return in `guessCategory`).
- **Default 1 porzione** nelle ricette; preferenza manuale ricordata (`prefServings` in settings).
- **Aggiunta a mano SENZA AI** (solo `correctName`+`guessCategory` locali) per non consumare quota; l'AI resta per scontrino/voce/barcode.

## 9. Cose da NON modificare (o con cautela)
- **API key MAI nel client** (regola assoluta dell'utente).
- Non rompere il **pattern proxy** Anthropic↔Gemini (client/prompt non devono cambiare formato).
- Non usare **`text-white`/`bg-white` su fondi scuri letterali** → usare `#fff` (vedi §6).
- `<input type="date">` invisibile dentro una label: serve **`overflow-hidden`** (su iOS sfora e ruba i tap). Un elemento **`fixed` dentro un `transform`** si ancora al genitore, non al viewport (overlay del "+" è renderizzato a livello pagina apposta).
- Calendario scadenza: **non salvare da `onChange` diretto** (iOS imposta "oggi" alla chiusura); c'è un debounce + toast Annulla.
- I due blocchi di palette **dark** in `index.css` devono restare identici (media query + `[data-theme="dark"]`).
- Non riportare il **seed permanente** sul primo accesso: ora il primo accesso popola DEMO_DATA e l'onboarding li pulisce.

## 10. TODO prioritari
1. **Refactor `Dispensa.jsx`**: spezzare in custom hooks (`usePantry`, `useShopping`, `useRecipes`) o store leggero (Zustand). Debito principale.
2. **Notifiche scadenze** (push/local) — feature ad alto valore (i dati ci sono già).
3. **Coda sync offline-write** (oggi offline è sola lettura).
4. **Dispensa condivisa** col partner (Realtime c'è già).
5. **Scelta tra più suoni** del timer (predisposto).
6. Test sulle funzioni pure di `lib/pantry.js`; valutare TypeScript.
7. Coach-mark interattivi nell'onboarding (oggi è descrittivo a schede).
8. Aggiornare dipendenze (React 19 / Tailwind 4 / Vite 7) — nessuna urgenza.

## 11. Istruzioni per riprendere in una nuova chat
**Ambiente** (Windows, PowerShell):
- Dir: `C:\Users\pasqu\Downloads\dispensa`
- Dev: `npm run dev` (porta 5173). Build: `npm run build`.
- Icone: `node scripts/generate-icons.mjs` dopo aver modificato `public/icon.svg`.

**Workflow modifiche** (rispettare SEMPRE):
`edit → npm run build → git commit → git push origin main` → Vercel auto-deploy.
Commit message: terminare con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

**Verifica**: si può usare il preview locale (login page visibile; le viste interne richiedono auth). La build che passa è la verifica autorevole; ignorare gli errori HMR transitori durante edit multi-step.

**Config persistente** (NON serve riconfigurare):
- Supabase project ref: `tikcnxwqynpytysrrtaz`. Tabelle: `pantry_items`, `user_settings`, `shopping_items`, `saved_recipes`.
- `.env.local` (gitignored, già presente): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `PEXELS_API_KEY`.
- Env Vercel (già impostate): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `PEXELS_API_KEY`.
- `migration-4.sql` (saved_recipes): da eseguire nel SQL Editor di Supabase se si vuole la sync preferiti tra dispositivi (l'app funziona anche senza).

**Note sull'utente**: risponde in italiano, usa iPhone Safari/PWA, è molto attento a dettagli UX/UI; spesso chiede **mockup** prima di applicare modifiche visive (offrirli). iOS cache-a l'icona PWA: per aggiornarla va rimossa e re-installata.
