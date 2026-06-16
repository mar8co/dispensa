# CLAUDE.md — Regole permanenti del progetto "La Mia Dispensa"

> Questo file vale per **ogni** conversazione su questo repo. Leggerlo PRIMA di modificare qualsiasi cosa.
> Documenti collegati: `HANDOFF.md` (stato e ripresa lavoro) · `ARCHITECTURE.md` (architettura).

---

## 0. Le 6 regole non negoziabili
1. **Rispondi SEMPRE in italiano.**
2. **Solo unità metriche**: g, kg, ml, l. Mai cups/oz/tbsp/tsp (vale anche nei prompt AI e nei dati demo).
3. **API key MAI nel client.** `GEMINI_API_KEY` e `PEXELS_API_KEY` vivono solo nelle env server (`server/*`, serverless Vercel, middleware dev). Nel bundle client possono finire SOLO le var `VITE_*` (URL e anon key Supabase).
4. **Workflow di rilascio**: `edit → npm run build → git commit → git push origin main` (Vercel auto-deploy). **Committa/pusha solo quando l'utente lo chiede.** Messaggio di commit terminante con:
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
5. **Mockup prima delle modifiche visive**: l'utente è molto attento all'UX/UI e di solito vuole vedere mockup (via widget di visualizzazione) prima di applicare cambiamenti estetici. Offrirli.
6. **Non rompere il pattern proxy** "stile Anthropic ↔ Gemini" (vedi §5): prompt e formato lato client non devono cambiare.

## 1. Convenzioni di codice
- **JavaScript + JSX** (NON TypeScript). React 18, function components + hooks.
- **Commenti in italiano**, densità media: spiegano il *perché* (scelte iOS, anti-quota, gotcha), non il banale. Mantenere lo stile dei file vicini.
- **Niente librerie nuove** senza motivo forte (vedi §4). Preferire funzioni pure in `lib/`.
- **Logica pura** (categorie, quantità, scadenze) va in `src/lib/pantry.js`, testabile in isolamento.
- **Naming**: handler `onX`/`handleX`, stato in `Dispensa.jsx` passato ai figli via props. Le funzioni di `lib/` sono pure o lato-effetto isolato (db/network).
- **Persistenza locale**: chiavi `localStorage` con prefisso `dispensa-…` (es. `dispensa-onboarded-<uid>`, `dispensa-ideas-<uid>`, `dispensa-timers`).
- **Import**: i componenti pesanti si caricano lazy (`BarcodeScanModal`, `ReceiptScanModal`).
- Dopo ogni modifica significativa: `npm run build` deve passare (è la verifica autorevole; il preview richiede login).

## 2. Standard UX/UI da rispettare ("stile editoriale")
- **Palette**: sfondo avorio **#F7F6F1** (token `cream`), testo **ink** (#1a1a1a), accento **rosso pomodoro `tomato` #d6442f** (700 = #b8351f), righe sottili `hair`. Font UNICO **Hanken Grotesk** (sans + `font-display` con tracking stretto; NON serif).
- **Palette via CSS variables** in `index.css` (terne RGB), mappate da Tailwind con `rgb(var(--x) / <alpha-value>)`.
- **Dark mode**: `prefers-color-scheme` + override manuale `:root[data-theme="…"]`. **I due blocchi scuri devono restare identici.**
- ⚠️ **TRAPPOLA**: il token Tailwind `white` è **TEMATO** (si scurisce in dark). Su fondi scuri *letterali* (fotocamera, chip nere, scrim, overlay) usare **`text-[#fff]` / `bg-[#fff]` / `bg-black`**, non `text-white`/`bg-white`.
- **Navbar**: pillola flottante centrata `bg-cream/80 backdrop-blur-md`; ordine **Dispensa · Spesa · [+] · Ricette · Profilo**; scheda attiva con pillola `tomato/10`; "+" centrale rialzato con menù a **semicerchio** (4 modalità: A mano · Foto · Barcode · Voce).
- **Bottom-sheet** (`Sheet.jsx`) per quasi tutti i modali (maniglia, drag-to-dismiss, sfondo `bg-black/40`).
- **Input in alto, non in basso**: su iOS la tastiera copre ciò che è fisso in basso → ricerca/aggiunta sono **sticky-top**.
- **Pattern coerenti**: chips unità pz/g/kg/l, stepper −/+ , toast in basso con azione (Annulla/Stop), swipe-to-delete in due tempi, skeleton durante il caricamento AI, View Transitions tra schede.
- **Auto-save ovunque** nei pannelli prodotto/spesa: niente bottone "Salva" (nome al blur, qty con debounce, resto al tap). Mostrare conferma con toast + Annulla.

## 3. Pattern architetturali da seguire
- **God component `Dispensa.jsx`**: detiene lo stato globale e passa props/callback ai figli. Finché non si fa il refactor (TODO), **nuova logica di stato condivisa va qui**, non duplicata nei figli.
- **Dati cache-first**: leggere prima da `localStorage` (`lib/cache.js`), poi fare refresh da Supabase; **Realtime** tiene sincronizzate `pantry_items` e `shopping_items`; le impostazioni (`user_settings`, jsonb) si applicano dal DB **solo se più recenti** della cache (confronto timestamp).
- **Layer dati isolato**: tutte le query Supabase stanno in `src/lib/db.js`. I componenti non chiamano Supabase direttamente (eccetto auth/session in `lib/claude.js`, `lib/supabase.js`).
- **AI dietro proxy**: il client usa `callClaude(content, maxTokens)` e `fetchPhotos(queries)` da `lib/claude.js`; mai chiamare Gemini/Pexels direttamente.
- **Stato fuori da React quando serve persistere tra schede**: i timer vivono in uno store module-level (`lib/timers.js`); il tutorial in uno store esterno (`lib/tour.js`, `useSyncExternalStore`).
- **Tutorial**: aggiungere passi → modificare `STEPS` in `lib/tour.js`; aggiungere bersagli → attributo `data-tour="…"`; far avanzare un passo d'azione → chiamare `tourSignal('nome')` nell'handler reale (è un no-op se il tutorial non è attivo o non aspetta quel segnale).

## 4. Librerie approvate (e cosa evitare)
**Approvate / già in uso** — non aggiungerne altre senza necessità:
- `react`, `react-dom` (18.3)
- `@supabase/supabase-js` (dati/auth/realtime)
- `lucide-react` (icone UI)
- `@zxing/browser`, `@zxing/library` (barcode)
- `vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `tailwindcss`, `postcss`, `autoprefixer`, `sharp` (dev/build)

**Da evitare salvo richiesta esplicita**: librerie di state management (Zustand/Redux), UI kit (MUI, ecc.), date lib pesanti, framework CSS alternativi, SDK Anthropic/OpenAI nel client, qualunque dipendenza che porti una API key nel bundle.

## 5. Il pattern proxy AI (capirlo prima di toccarlo)
- Il **client** (`lib/claude.js`) manda a `/api/claude` un payload "stile Anthropic": `{ content: [{type:"text"|"image", …}], max_tokens }` + header `Authorization: Bearer <token Supabase>`.
- Il **core** `server/claude.js` (condiviso tra serverless Vercel `api/claude.js` e middleware dev in `vite.config.js`): verifica il token Supabase (→ 401 se manca/invalid), traduce i blocchi nel formato Gemini, chiama Gemini con la **API key server**, ritraduce la risposta nel formato che il client si aspetta (`{ content:[{type:"text",text}] }`).
- Sui modelli `2.5` imposta `thinkingConfig.thinkingBudget=0` e `responseMimeType:"application/json"` (i prompt chiedono già JSON).
- Stesso schema per `/api/photo` → Pexels (`server/photo.js`).
- **Conseguenza pratica**: per cambiare provider AI si tocca SOLO `server/claude.js`; prompt e client restano invariati. Non spostare la traduzione nel client.

## 6. Cose da evitare (gotcha che hanno già morso)
- `text-white`/`bg-white` su fondi scuri letterali → usare `#fff` (§2).
- `position: fixed` dentro un contenitore con `transform` → si ancora al genitore, non al viewport. Overlay globali (menù "+", `TourCoach`) vanno renderizzati a livello pagina.
- `<input type="date">` invisibile sopra un'icona su iOS → serve `overflow-hidden` sul contenitore; **non** salvare la scadenza dall'`onChange` di un input invisibile (iOS imposta "oggi").
- Effetti con closure che leggono draft di stato (es. pannello prodotto): **includere tutti i draft nelle dipendenze** (bug scadenza: mancava `expDraft`).
- Non far partire chiamate AI nel tutorial (usa i dati demo di `lib/tour.js`): consuma quota e richiede rete.
- Non committare segreti; non rendere il repo privato (i deploy Vercel si bloccano, §HANDOFF §8).

## 7. Modalità di lavoro nelle future conversazioni
- **Leggi prima** `HANDOFF.md` (stato, cosa è/non è deployato) e questo file.
- Per richieste grandi/ambigue, **chiarisci 1–2 scelte chiave** prima di scrivere centinaia di righe (l'utente apprezza decisioni mirate, non panoramiche).
- **Modifiche visive → mockup prima.**
- Lavora in modo **decisionale**: quando hai abbastanza per agire, agisci; dai una raccomandazione, non un sondaggio.
- Mantieni lo **stile dei file vicini** (commenti italiani, Tailwind, naming).
- Dopo le modifiche: `npm run build`; riferisci onestamente cosa è verificato e cosa no (il tutorial e le viste interne richiedono login, spesso non verificabili da Claude).
- **Non** committare/pushare senza richiesta esplicita dell'utente.

## 8. Info che una nuova istanza dovrebbe conoscere
- App **personale**, single-user di fatto (ma multi-utente via RLS). iPhone Safari/PWA è il dispositivo target.
- Repo **pubblico** `mar8co/dispensa` → Vercel auto-deploy su `main`. Produzione: https://la-dispensa-omega.vercel.app
- Esiste un file legacy `dispensa-ui.jsx` nella root (monolite originale, **non** usato dall'app). Componenti orfani: `AddMenu.jsx`, `ProfileTab.jsx` (non importati).
- Memoria persistente di Claude su questo progetto: `project_dispensa.md` (indice in `MEMORY.md`).
