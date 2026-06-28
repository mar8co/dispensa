# HANDOFF — Dispensa

> Documento di passaggio di consegne. Da solo (con `CLAUDE.md` e `ARCHITECTURE.md`)
> è sufficiente per riprendere lo sviluppo in una chat nuova senza leggere la
> cronologia precedente.
> **Rispondere SEMPRE in italiano. Unità metriche (g/kg/ml/l), mai cups/oz.**

---

## Obiettivo dell'app

**Dispensa** (nome interno storico: "La Mia Dispensa") è una **PWA personale** per:

1. **Gestire la dispensa di casa** — cosa hai, quanto, e quando scade.
2. **Lista della spesa** — con vista "per reparto" (giro del supermercato) e un
   "carrello" per spuntare ciò che prendi e poi spostarlo in dispensa.
3. **Cucinare con quello che hai** — suggerimenti di ricette generati dall'AI a
   partire dai prodotti in dispensa, salvabili nel ricettario, con modalità
   "cucina" passo-passo + timer.

Target d'uso: **iPhone, Safari / PWA installata** (standalone). Tutto il design è
mobile-first e molto curato sul piano UX. L'utente è una sola persona (uso
personale), risponde in **italiano**: UI e commenti del codice sono in italiano.

---

## Stack tecnologico

| Area | Tecnologia |
|---|---|
| UI | React 18.3 + Vite 6 |
| Stile | Tailwind CSS 3.4 (token via variabili CSS) |
| PWA | vite-plugin-pwa (Workbox, `generateSW`, `registerType: autoUpdate`) |
| Backend dati | Supabase (Postgres + RLS + Realtime + Auth) |
| AI | Google Gemini (`gemini-2.5-flash`) dietro un **proxy serverless** stile Anthropic |
| Foto ricette | Pexels (dietro proxy) |
| Barcode | `@zxing/browser` + `@zxing/library` + Open Food Facts |
| Bottom sheet | **Vaul** 1.1.2 (drag-to-dismiss) + `@radix-ui/react-dialog` (transitiva) |
| Icone | `lucide-react` + emoji per le categorie |
| Hosting | Vercel (serverless functions in `api/`) |
| Test | Vitest (su `src/lib/pantry.js`, 46 test) |
| Lint | ESLint flat config (`eslint.config.js`) |
| Generazione icone | `sharp` (`scripts/generate-icons.mjs`) |

Comandi: `npm run dev` (porta 5173, con proxy `/api/*` locale), `npm run build`,
`npm run lint`, `npm test`.

---

## Funzionalità completate

- **Auth** Supabase: magic-link (email), Google OAuth, Apple OAuth (vedi "in
  sviluppo" per Apple). Gate in `src/App.jsx`; logout dal Profilo.
- **Dispensa**: lista prodotti per categoria (collassabili), ricerca, ordinamento
  (persistito per-utente), stepper quantità con **mezzo pezzo (½)**, scadenze con
  banner ("scaduti" vs "in scadenza entro 7 gg", su due righe se entrambi),
  suggerimento "sta finendo" (solo nel pannello prodotto), "Cucina con questo".
- **Aggiunta prodotti**: manuale, a voce (dettatura → AI estrae prodotti),
  **scontrino** (foto → AI), **codice a barre** (ZXing + Open Food Facts).
- **Lista della spesa**: aggiunta manuale/voce, merge duplicati, vista "per
  reparto" o piatta, **carrello** (campo `checked`) con reparto "Nel carrello",
  "Sposta in dispensa", condivisione lista, wake-lock ("schermo sempre acceso").
- **Ricette**: generazione AI in base alla dispensa, occasioni/"modi" (Pranzo
  veloce, Schiscetta, ecc.), preferiti (❤️), cucinate (contatore), **modalità
  cucina** passo-passo con **timer**, scala porzioni, foto Pexels.
- **"Ho cucinato"** (CookModal): scala le quantità della dispensa con 3 corsie
  (q.b. non scalato / a confezione / calcolo esatto).
- **Sync multi-dispositivo** via Supabase Realtime (pantry + shopping) e
  `user_settings` (jsonb).
- **PWA**: installabile, offline shell, tema chiaro/scuro/auto (per-dispositivo).
- **Tutorial** guidato (TourCoach).
- **Privacy Policy** (sheet, link nel login e nel Profilo).
- **Sicurezza**: chiavi AI/Pexels mai nel client (proxy con verifica token
  Supabase), rate-limit AI per utente/giorno (best-effort).

---

## Funzionalità in sviluppo / da rifinire

1. **"Continua con Apple"** — il codice è pronto (`Auth.jsx → signInApple`), ma
   richiede **configurazione esterna** (Apple Developer + Supabase). Vedi guida in
   fondo. Finché non è configurato, il pulsante dà errore "provider not enabled".
2. **Placeholder ricerca ricette** — l'utente vuole un testo che comunichi che la
   ricerca accetta "voglie/umore" e non solo ingredienti, in **una sola riga**
   senza andare a capo. **Decisione aperta**. Candidato consigliato:
   `Cosa ti va? fresco, veloce, coi funghi…`.

---

## Bug noti / da verificare

- **OCR scontrini lunghi** — migliorato: l'anteprima resta **dentro l'app**
  (bottom-sheet, scelta UX dell'utente — niente fotocamera nativa), ma ora si
  chiede la **massima risoluzione** al track (constraints alti +
  `applyConstraints` sulle capabilities), l'anteprima è **grande** (`h-[64vh]`)
  e l'overlay **non è più restrittivo** (si riempie il riquadro senza
  allontanare lo scontrino). Il frame catturato è ridimensionato a 2000px
  (`src/lib/image.js → videoFrameToBase64`). Per scontrini molto lunghi resta la
  **galleria** (foto a piena risoluzione scattata con l'app Fotocamera). Limite
  onesto: la preview in-app su iPhone arriva ~1080–1440p (non i 12 MP del
  nativo). **Da provare sul telefono.**
- **Barcode camera** — regressione (camera nera) dopo il passaggio dei bottom
  sheet a Vaul, **risolta** con **callback-ref** in `BarcodeScanModal.jsx` (la
  scansione parte quando il `<video>` è davvero montato). **Da confermare sul
  dispositivo reale**: non verificabile dal preview (serve camera + login).
- **Ricette che sparivano dopo ~1 giorno** — **risolto**: al load la lista locale
  viene sovrascritta dal DB **solo se il DB ha righe** (non si azzera il locale su
  fetch vuota transitoria). Tenere d'occhio.
- **View Transition congelata** su iOS (tutorial / tap rapidi) — mitigato
  serializzando le transizioni (`animateUI`, una alla volta). Se ricompare un
  "freeze" dopo nuove animazioni, è quasi sempre lì.

---

## File più importanti

| File | Ruolo |
|---|---|
| `src/Dispensa.jsx` | **Composition root**: stato condiviso, effetti, Realtime, bridge tra hook, render delle schede e di tutte le modali. |
| `src/lib/pantry.js` | **Logica pura** (categorizzazione, quantità, q.b., low, match, ½). Coperto da test (`pantry.test.js`). |
| `src/lib/db.js` | Tutte le query Supabase (pantry / shopping / recipes / settings). **Confine del data layer.** |
| `src/lib/supabase.js` | Client Supabase (anon key pubblica, protetta da RLS). |
| `src/lib/claude.js` | Client AI lato browser → `/api/claude` e `/api/photo`. `callClaude(content, maxTokens, opts)` con `opts.schema` (responseSchema), `opts.temperature`, timeout (AbortController) e retry. |
| `src/lib/image.js` | Ridimensiona la foto scontrino a 2000px (JPEG) prima dell'OCR AI: `videoFrameToBase64` (frame anteprima live) e `fileToResizedBase64` (galleria). |
| `server/claude.js` | **Core del proxy AI** (Gemini), condiviso da Vercel e dev locale; verifica token, rate-limit, traduzione Anthropic↔Gemini, **responseSchema + temperature**. |
| `vite.config.js` | Plugin React, **proxy `/api/*` in dev**, config PWA/manifest. |
| `src/hooks/usePantry.jsx`, `useShopping.jsx`, `useRecipes.jsx` | Stato + logica dei tre domini. |
| `src/hooks/useOnline.js`, `useTimersTicker.js`, `useAuth.js` | Hook di supporto. |
| `src/components/Sheet.jsx` | **Bottom sheet condiviso (Vaul)**: cambiarlo cambia il drag di TUTTI i fogli. |
| `src/constants.js` | Categorie, ordini reparto, **emoji categorie (`CAT_ICON`)**, prompt AI, seed/demo. |
| `src/index.css` | **Palette** (variabili CSS, light + blocchi dark) e CSS PWA/Vaul. |
| `supabase/schema.sql` + `migration-2..5.sql` | Schema DB completo (vedi ARCHITECTURE). |

---

## Decisioni tecniche prese

- **God component → hook**: `Dispensa.jsx` scomposto in hook
  (`useOnline → useTimersTicker → useRecipes → useShopping → usePantry`), un hook
  per dominio. Resta un **composition root** che fa da bridge (es.
  `moveCheckedToPantry` vive in Dispensa perché collega spesa e dispensa).
- **Proxy AI stile Anthropic**: il client manda blocchi `{type:"text"|"image"}`
  invariati; `server/claude.js` li traduce in/da Gemini. Cambiare provider non
  tocca client né prompt.
- **Chiavi server-only**: `GEMINI_API_KEY`, `PEXELS_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` **mai** nel bundle. Solo `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY` sono pubbliche (protette da RLS).
- **RLS ovunque**: ogni tabella ha policy `auth.uid() = user_id`; `user_id`
  default `auth.uid()`.
- **Realtime** su `pantry_items` e `shopping_items` (replica identity full);
  `user_settings` sincronizzato a parte.
- **Bottom sheet unico (Vaul)**: `Sheet.jsx` montato già aperto (`open=true`) così
  il `<video>` delle fotocamere è subito nel DOM.
- **q.b. disaccoppiato**: `isStapleQb` (non scalare nel CookModal, ristretto) ≠
  `isQbIngredient` (mostrare "q.b." nel display ricetta, ampio: Spezie+Condimenti
  +limone/lime). Pesto/sugo/maionese restano scalabili.
- **Carrello = campo `checked`** degli `shopping_items` (nessuna tabella nuova).
- **Toast**: `bottom-32` (appena sopra il FAB) su tutte le schede; si alza a
  `bottom-44` **solo** sulla Spesa quando c'è la barra "Sposta in dispensa"
  (carrello non vuoto), per non coprirla. Condizione in `Dispensa.jsx`:
  `raised={view === "spesa" && shopping.some(s => s.checked)}`.
  Lo stepper quantità committa **subito a 0** (toast "Hai finito" immediato).
- **View Transition serializzata** (`animateUI`, una per volta) per evitare freeze
  su iOS.
- **Icone categoria = emoji** (`CAT_ICON`), identiche tra Dispensa e Spesa (scelta
  esplicita dell'utente: niente icone lineari).

---

## Todo prioritari

1. **Verificare sul telefono**: (a) scatto scontrino dalla **fotocamera nativa**
   `<input capture>` su uno scontrino lungo reale; (b) fix camera barcode (Vaul
   callback-ref); (c) torcia barcode dove supportata.
2. **Configurare Apple Sign-In** (Apple Developer + Supabase) — guida sotto.
3. **Decidere il placeholder ricerca ricette** e applicarlo (1 riga, no a-capo).
4. Eventuali rifiniture UX su Spesa (altezze barra/nav sul dispositivo reale).

---

## Cose da NON modificare (senza motivo esplicito)

- **Data layer Supabase**: nomi tabelle, colonne, query in `src/lib/db.js`, e i
  campi degli item. Le feature UI si appoggiano ai campi esistenti.
- **API key nel client**: mai. Ogni nuova integrazione passa da un proxy in
  `server/` + `api/`.
- **`src/lib/pantry.js`** senza aggiornare i test (`pantry.test.js`).
- **Blocchi `[data-theme]` in `index.css`**: le terne RGB di light e dark devono
  restare allineate (stessi token).
- **Serializzazione di `animateUI`** (una View Transition per volta).
- **`Sheet.jsx` montato `open=true`** (necessario per le fotocamere).

---

## Istruzioni per riprendere in una chat nuova

1. Leggi **`CLAUDE.md`** (regole/convenzioni) e **`ARCHITECTURE.md`** (mappa
   tecnica). Con questo file bastano: non serve la cronologia.
2. **Ambiente**: Windows + PowerShell (shell primaria); disponibile anche Bash
   (POSIX). Working dir: `C:\Users\pasqu\Downloads\dispensa`.
3. **`.env.local`** già presente in locale. Servono almeno `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` e, per AI/foto, `GEMINI_API_KEY` / `PEXELS_API_KEY`
   (lette dal proxy dev). Project ref Supabase: `tikcnxwqynpytysrrtaz`.
4. **Flusso di lavoro atteso dall'utente**:
   - Refactor **incrementali**, mai big-bang.
   - Dopo ogni modifica: `npm run lint`, `npm test`, `npm run build` **verdi**.
   - **Committa e pusha SEMPRE in automatico** dopo build verde su questo
     progetto, senza chiedere. Branch `main`, remoto `origin`
     (github.com/mar8co/dispensa).
   - Messaggi di commit in italiano, che finiscono con:
     `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
   - **Nota commit su Windows/PowerShell**: messaggi con virgolette/emoji rompono
     `-m` e gli here-string. Pattern collaudato: scrivere il messaggio in
     `.git/COMMIT_EDITMSG_TMP` e fare `git commit -F .git/COMMIT_EDITMSG_TMP`.
5. **Verifica preview**: molte feature sono dietro login Supabase + camera, quindi
   spesso **non** verificabili dal preview; in quei casi fidarsi di lint/build e
   far provare all'utente sul telefono.

---

## Appendice — Configurare "Continua con Apple"

Prerequisito: **Apple Developer Program (99 $/anno)**. Callback Supabase:
`https://tikcnxwqynpytysrrtaz.supabase.co/auth/v1/callback`

1. **App ID** con capability *Sign in with Apple* (annota il **Team ID**).
2. **Services ID** (es. `com.<nome>.dispensa.web`) → Configure → Primary App ID =
   l'App ID; Domains = `tikcnxwqynpytysrrtaz.supabase.co` (+ dominio Vercel);
   Return URL = il callback qui sopra. **Salva.**
3. **Key** *Sign in with Apple* → scarica il **`.p8`** (una volta sola), annota il
   **Key ID**.
4. **Supabase → Authentication → Providers → Apple**: enable; *Client IDs* = il
   Services ID; genera il secret incollando **Team ID + Key ID + contenuto .p8**.
5. **Supabase → Authentication → URL Configuration**: Site URL = dominio prod;
   Redirect URLs = `https://<dominio>/**` e `http://localhost:5173/**`.
6. Il codice non va toccato (`signInWithOAuth({ provider: "apple" })` è già
   corretto, con `redirectTo: window.location.origin`).
