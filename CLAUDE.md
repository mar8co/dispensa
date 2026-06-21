# CLAUDE.md — Regole permanenti del progetto "Dispensa"

> Questo file vale per **ogni** conversazione su questo repo. Leggerlo PRIMA di modificare qualsiasi cosa.
> Documenti collegati: `HANDOFF.md` (stato e ripresa lavoro) · `ARCHITECTURE.md` (architettura).
> L'app si chiama **"Dispensa"** (ex "La Mia Dispensa"); la cartella/repo resta `dispensa`.

---

## 0. Le regole non negoziabili
1. **Rispondi SEMPRE in italiano.** App, commenti del codice e testi UI sono in italiano.
2. **Solo unità metriche**: g, kg, ml, l. Mai cups/oz/tbsp/tsp (vale anche nei prompt AI e nei dati demo). Le quantità di conteggio come numero ("3", "6").
3. **API key MAI nel client.** `GEMINI_API_KEY`, `PEXELS_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` vivono solo nelle env server (`server/*`, serverless Vercel, middleware dev). Nel bundle client possono finire SOLO le var `VITE_*` (URL e anon key Supabase).
4. **Workflow di rilascio**: `edit → npm run build → git commit → git push origin main` (Vercel auto-deploy). **Committa e pusha SEMPRE in automatico** dopo ogni modifica con build verde, senza che l'utente lo chieda (preferenza esplicita). Messaggio di commit terminante con:
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
5. **Mockup prima delle modifiche visive**: l'utente è molto attento all'UX/UI e di solito vuole vedere mockup (via widget di visualizzazione) prima di applicare cambiamenti estetici. Offrirli.
6. **Non rompere il pattern proxy** "stile Anthropic ↔ Gemini" (vedi §5): prompt e formato lato client non devono cambiare.

## 1. Verifica e qualità (test / CI / lint)
- Dopo ogni modifica significativa: **`npm run build` deve passare** (è la verifica autorevole; il preview locale mostra solo il login).
- Quando tocchi logica esegui anche **`npm test`** (Vitest, 34 test su `src/lib/pantry.js`) e **`npm run lint`** (ESLint flat config, regole `eslint-plugin-react-hooks`).
- La **CI** (`.github/workflows/ci.yml`) ripete `npm ci → lint → test → build` su ogni push/PR: tienila verde.
- Mantieni **0 warning ESLint** (stato attuale). Se aggiungi un `// eslint-disable-…`, motivalo con un commento (es. i 3 effetti once-mount in `Dispensa.jsx`).
- Se aggiungi logica di quantità/categorie/scadenze in `pantry.js`, **aggiungi i relativi test** in `pantry.test.js`.
- Riferisci onestamente cosa è verificato e cosa no: tutorial e viste interne richiedono login → spesso **non verificabili da Claude**, vanno provati sul telefono dall'utente.

## 2. Convenzioni di codice
- **JavaScript + JSX** (NON TypeScript). React 18, function components + hooks. Indentazione 2 spazi, virgolette doppie, punto e virgola.
- **Commenti in italiano**, densità media: spiegano il *perché* (scelte iOS, anti-quota, gotcha), non il banale. Mantenere lo stile dei file vicini.
- **Niente librerie nuove** senza motivo forte (vedi §4). Preferire funzioni pure in `lib/`.
- **Logica pura** (categorie, quantità, scadenze) va in `src/lib/pantry.js`, testabile in isolamento (e testata).
- **Naming**: componenti `PascalCase.jsx`, librerie `camelCase.js`, handler `onX`/`handleX`. Stato in `Dispensa.jsx` passato ai figli via props. Le funzioni di `lib/` sono pure o con lato-effetto isolato (db/network).
- **Persistenza locale**: chiavi `localStorage` con prefisso `dispensa-…` (es. `dispensa-onboarded-<uid>`, `dispensa-ideas-<uid>`, `dispensa-timers`).
- **Import**: i componenti pesanti si caricano lazy (`BarcodeScanModal`, `ReceiptScanModal`).
- Bersagli tutorial via attributo `data-tour="kebab-case"`.

## 3. Standard UX/UI ("stile editoriale")
- **Palette**: sfondo avorio **#F7F6F1** (token `cream`), testo **ink**, accento **rosso pomodoro `tomato`** (700 più scuro), righe sottili `hair`. Font UNICO **Hanken Grotesk** (sans + `font-display` con tracking stretto; NON serif).
- **Palette via CSS variables** in `index.css` (terne RGB), mappate da Tailwind con `rgb(var(--x) / <alpha-value>)`.
- **Dark mode**: `prefers-color-scheme` + override manuale `:root[data-theme="…"]`. **I due blocchi scuri devono restare identici.**
- ⚠️ **TRAPPOLA**: il token Tailwind `white`/`black` è **TEMATO** (si scurisce in dark). Su fondi scuri *letterali* (fotocamera, chip nere, scrim, overlay, testo su `bg-tomato`) usare **`text-[#fff]` / `bg-[#fff]` / `bg-[#111]`**, non `text-white`/`bg-white`.
- **Navbar**: pillola flottante centrata `bg-cream/80 backdrop-blur-md`; ordine **Dispensa · Spesa · [+] · Ricette · Profilo**; scheda attiva con pillola `tomato/10`; "+" centrale rialzato con menù a **semicerchio** (4 modalità: A mano · Foto · Barcode · Voce).
- **Bottom-sheet** (`Sheet.jsx`) per quasi tutti i modali (maniglia, drag-to-dismiss, sfondo scuro); blocca lo scroll di sfondo, contenuto scrollabile con `overscroll-contain`.
- **Input in alto, non in basso**: su iOS la tastiera copre ciò che è fisso in basso → ricerca/aggiunta sono **sticky-top**.
- **Pattern coerenti**: chips unità pz/g/kg/l, stepper −/+, toast in basso con azione (Annulla/Stop), swipe-to-delete in due tempi, skeleton durante il caricamento AI, View Transitions tra schede, animazioni morbide (`cubic-bezier(0.22,1,0.36,1)`).
- **Auto-save ovunque** nei pannelli prodotto/spesa: niente bottone "Salva" (nome al blur, qty/scadenza con debounce, resto al tap). Confermare con toast "Modifica salvata · Annulla".
- **Icone `lucide-react`** nei pulsanti d'azione (no emoji lì; emoji ok per categorie/occasioni). Es. "Cucina con questo" usa `Sparkles`.
- **Privacy** ed **"Elimina account"** restano **discreti** (link piccoli in fondo al Profilo): non rovinare l'estetica.
- **Mobile-first**, target iPhone Safari/PWA: rispetta `env(safe-area-inset-*)`, anti-zoom iOS (input ≥16px / regole in `index.css`).

## 4. Librerie approvate (e cosa evitare)
**Approvate / già in uso** — non aggiungerne altre senza necessità:
- `react`, `react-dom` (18.3); `@supabase/supabase-js`; `lucide-react`; `@zxing/browser`+`@zxing/library` (barcode, lazy)
- dev/build: `vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `tailwindcss`, `postcss`, `autoprefixer`, `sharp`, `vitest`, `eslint` (+ `eslint-plugin-react-hooks`)
- servizi esterni: Gemini, Pexels, Open Food Facts, Web APIs del browser

**Da evitare salvo richiesta esplicita**: state manager (Zustand/Redux), UI kit (MUI…), date lib pesanti, framework CSS alternativi, SDK Anthropic/OpenAI nel client, qualunque dipendenza che porti una API key nel bundle.

## 5. Il pattern proxy AI (capirlo prima di toccarlo)
- Il **client** (`lib/claude.js`) manda a `/api/claude` un payload "stile Anthropic": `{ content: [{type:"text"|"image", …}], max_tokens }` + header `Authorization: Bearer <token Supabase>`.
- Il **core** `server/claude.js` (condiviso tra serverless Vercel `api/claude.js` e middleware dev `devApi` in `vite.config.js`): verifica il token Supabase (→ 401), traduce i blocchi in formato Gemini, chiama Gemini con la **API key server**, ritraduce nella forma attesa dal client (`{ content:[{type:"text",text}] }`).
- Sui modelli `2.5` imposta `thinkingConfig.thinkingBudget=0` e `responseMimeType:"application/json"` (i prompt chiedono già JSON).
- **Indurimento (sicurezza)**: cap dimensione payload (~9 MB → 413), `max_tokens` clampato 1..2048, **rate-limit per utente/giorno** best-effort via `admin.rpc("bump_ai_usage")` se `SUPABASE_SERVICE_ROLE_KEY` è presente (tabella `ai_usage`, `migration-5.sql`; default 80, env `AI_DAILY_LIMIT`; non blocca se non configurato → 429 se superato).
- Stesso schema per `/api/photo` → Pexels (`server/photo.js`). Cancellazione account: `/api/account` → `server/account.js` (verifica token, poi `admin.auth.admin.deleteUser`; dati via FK cascade).
- **Conseguenza pratica**: per cambiare provider AI si tocca SOLO `server/claude.js`; prompt e client restano invariati. Non spostare la traduzione nel client.

## 6. Pattern architetturali da seguire (dettagli in ARCHITECTURE.md)
- **`Dispensa.jsx` è la composition root** (ex god component): lo stato è stato estratto in custom hook per dominio (`src/hooks/`: `usePantry`, `useShopping`, `useRecipes`, `useTimersTicker`, `useOnline`). Dispensa compone gli hook e tiene solo gli **effetti condivisi** (load cache-first, persistenza impostazioni, cache mirror, Realtime) e l'**orchestrazione cross-dominio** (tutorial, flussi scan/voce/barcode, CookModal, bridge `moveCheckedToPantry`/`cookWith*`). **Nuova logica di stato va nell'hook del dominio giusto**; se tocca più domini resta in Dispensa come bridge. Confini e ordine (`useShopping` prima di `usePantry`) in HANDOFF §7/§11. Eventuali nuove estrazioni: sempre **incrementali** (un pezzo per volta, build+test+CI verdi, commit) — mai big-bang.
- **Dati cache-first**: leggere prima da `localStorage` (`lib/cache.js`), poi refresh da Supabase; **Realtime** sincronizza `pantry_items` e `shopping_items`; `user_settings` (jsonb) si applica dal DB **solo se più recente** della cache (confronto `updated_at`).
- **Layer dati isolato**: tutte le query Supabase stanno in `src/lib/db.js`; i componenti non chiamano Supabase direttamente (eccetto auth/session in `lib/supabase.js`, `lib/claude.js`).
- **AI dietro proxy**: il client usa `callClaude(content, maxTokens)` e `fetchPhotos(queries)` da `lib/claude.js`; mai chiamare Gemini/Pexels direttamente.
- **Stato fuori da React quando serve persistere tra schede**: timer in store module-level (`lib/timers.js`); tutorial in store esterno (`lib/tour.js`, `useSyncExternalStore`).
- **Tutorial**: aggiungere passi → `STEPS` in `lib/tour.js`; aggiungere bersagli → `data-tour="…"`; far avanzare un passo d'azione → `tourSignal('nome')` nell'handler reale (no-op se il tutorial non è attivo o non aspetta quel segnale). Il tutorial ha **13 passi** (vedi HANDOFF §5).
- **`qty` come testo**; matematica in `lib/pantry.js`. **Ricettario local-first** (`lib/recipes.js`, funziona senza `migration-4`).

## 7. Cose da evitare (gotcha che hanno già morso)
- ❌ `text-white`/`bg-white`/`text-black` su fondi letterali → usare `[#fff]`/`[#111]` (§3).
- ❌ Mettere segreti nel client o committarli; rendere il repo privato (i deploy Vercel si bloccano — vedi HANDOFF §8).
- ❌ Big-bang refactor del god component.
- ❌ Reintrodurre un seed permanente: il primo accesso popola `DEMO_DATA` e il tutorial li pulisce a fine giro.
- ❌ Tradurre i testi UI in inglese o usare unità imperiali (anche nei prompt/dati demo).
- ❌ Far partire chiamate AI nel tutorial: usa i dati demo di `lib/tour.js` (consuma quota e richiede rete).
- ⚠️ `position: fixed` dentro un contenitore con `transform` si ancora al genitore: overlay globali (menù "+", `TourCoach`) vanno renderizzati a livello pagina.
- ⚠️ `<input type="date">` invisibile sopra un'icona su iOS → serve `overflow-hidden`; **non** salvare la scadenza dall'`onChange` di un input invisibile (iOS imposta "oggi"). Salvare con **debounce + flush alla chiusura**; l'effetto di chiusura DEVE includere `expDraft` nelle dipendenze (stale closure già successa).
- ⚠️ I pannelli del tutorial (tooltip/banner/card) DEVONO fare `stopPropagation` sul `pointerdown`, altrimenti il "tocco fuori" chiude il pannello prodotto / apre la tastiera (bug già capitato).
- ⚠️ iOS cachea nome e icona della PWA: per aggiornarli va rimossa e re-installata. Dopo aver toccato `public/icon.svg`, rigenera i PNG con `node scripts/generate-icons.mjs`.

## 8. Modalità di lavoro nelle future conversazioni
- **Leggi prima** `HANDOFF.md` (stato, cosa è/non è deployato) e questo file.
- **Refactor incrementale di `Dispensa.jsx` in custom hooks: COMPLETATO** (5 hook estratti). Possibile passo successivo: estrarre anche scan/voce/barcode e CookModal. Vedi HANDOFF §4/§7/§10.
- **Pubblicazione store**: bloccata su Windows (serve Mac/servizio cloud + Apple Developer 99 €/anno). Quando si affronterà: wrapper (Capacitor/PWABuilder) + Sign in with Apple + stringhe permessi + gestione voce in WKWebView. Vedi HANDOFF §8/§10.
- Per nuove feature AI restare nel **free tier Gemini** (preferenza utente: niente piani a pagamento per l'AI per ora); sfruttare/estendere le cache (idee 24h) per non bruciare quota.
- Per richieste grandi/ambigue, **chiarisci 1–2 scelte chiave** prima di scrivere centinaia di righe. Lavora in modo **decisionale**: quando hai abbastanza per agire, agisci; dai una raccomandazione, non un sondaggio. Mantieni lo **stile dei file vicini**.

## 9. Info che una nuova istanza dovrebbe conoscere
- App **personale**, single-user di fatto (ma multi-utente via RLS). iPhone Safari/PWA è il dispositivo target. L'utente è molto attento all'UX/UI, risponde in italiano, vuole commit/push automatici.
- Ambiente di lavoro **Windows + PowerShell** (lo strumento Bash usa sintassi POSIX). Dir: `C:\Users\pasqu\Downloads\dispensa`.
- Repo **pubblico** `mar8co/dispensa` → Vercel auto-deploy su `main`. Produzione: https://la-dispensa-omega.vercel.app
- SQL Supabase da eseguire in ordine: `schema → migration-2 → migration-3 → migration-4 → migration-5` (idempotenti). `SUPABASE_SERVICE_ROLE_KEY` è configurata su Vercel (serve a "Elimina account" e rate-limit).
- Esiste un file legacy `dispensa-ui.jsx` nella root (monolite originale, **non** usato). Componenti orfani: `AddMenu.jsx`, `ProfileTab.jsx` (non importati).
- Memoria persistente di Claude su questo progetto: `project_dispensa.md` + `feedback_dispensa_autocommit.md` (indice in `MEMORY.md`).
