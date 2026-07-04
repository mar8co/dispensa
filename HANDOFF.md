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

## Prossimo obiettivo: app nativa (iOS, poi Android) + monetizzazione

> **Stato: solo pianificazione — nessuna riga di codice scritta per questo.**
> Le prossime chat su questo repo (`dispensa`) ripartono da qui.

**Traguardo**: trasformare **questa PWA** in una vera **app nativa pubblicata
sull'App Store** (e più avanti su Google Play), introducendo la
**monetizzazione**: **pubblicità** e **abbonamenti**. Oggi Dispensa è gratuita,
personale/familiare, senza pubblicità né livelli a pagamento — questa
iniziativa cambierà entrambe le cose.

**Non è "Cambusa"**: esiste un repo **separato**, `cambusa`, che è un
tentativo nativo (Expo/React Native) pensato da zero come concorrente di
Dispensa per l'App Store. **Questa iniziativa è diversa**: riguarda la
conversione diretta di **questo** codice (React/Vite/Tailwind/Supabase) in app
nativa, non lo sviluppo di Cambusa. Se in una chat futura non è chiaro su
quale dei due repo si sta lavorando, chiedilo prima di agire.

### Decisioni aperte (da affrontare CON l'utente a inizio della prossima chat)

Nessuna di queste è ancora decisa — vanno proposte con opzioni + una
raccomandazione (regola generale in `CLAUDE.md`), mai assunte in autonomia:

1. **Come "impacchettare" l'app nativa.** Lo stack attuale (React + Vite +
   Tailwind, già PWA) si presta a un **wrapper** (es. Capacitor) che riusa
   quasi tutto il codice esistente, alternativa a un rewrite nativo
   (Swift/Kotlin o React Native, come Cambusa). È la strada più rapida e
   coerente col resto del progetto, ma **va confermata con l'utente**, non
   assunta a priori.
2. **Cosa resta gratuito vs cosa diventa a pagamento** (feature-split
   free/Pro): condivisione nucleo familiare? tetto AI più alto (oggi
   `ai_usage`/`AI_DAILY_LIMIT`)? niente pubblicità per gli abbonati? Va deciso
   prima di disegnare qualunque paywall.
3. **Pubblicità**: quale network (es. AdMob), dove mostrarla (banner? tra le
   ricette?) senza rompere la cura UX già presente, e gestione
   dell'**App Tracking Transparency** (obbligatoria su iOS se si traccia per
   ads personalizzate).
4. **Abbonamenti**: Apple **richiede StoreKit/In-App Purchase** per contenuti
   digitali sbloccati dentro l'app — non si può fatturare con Stripe/altro
   bypassando IAP (rischio concreto di rifiuto in review, linea guida 3.1.1).
   Va deciso il prezzo, cosa sblocca, e come sincronizzare lo stato
   "abbonato" col backend Supabase (tabella entitlements + verifica ricevute,
   es. App Store Server Notifications).
5. **Account sviluppatore**: serve comunque l'**Apple Developer Program** (99
   $/anno) per pubblicare — lo stesso già citato nell'appendice "Continua con
   Apple" più sotto. Se non ancora attivo, è un prerequisito.

### Vincoli noti da rispettare da subito

- Niente **pagamento diretto** (Stripe ecc.) per sbloccare funzioni dentro
  l'app iOS: viola le linee guida Apple e fa rifiutare l'app in review. Gli
  abbonamenti passano SEMPRE da IAP/StoreKit.
- **Chiavi/API mai nel client** (regola già in CLAUDE.md) vale a maggior
  ragione per le chiavi ads/IAP.
- Mantenere lo **stile UX curato** già presente: la pubblicità non deve
  rompere i pattern esistenti (`Sheet.jsx`, `ProductFields.jsx`, `Button.jsx`,
  palette).

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
| Test | Vitest (`src/lib/pantry.js` + `src/lib/history.js`, **68 test**) |
| Lint | ESLint flat config (`eslint.config.js`) |
| Generazione icone | `sharp` (`scripts/generate-icons.mjs`) |

Comandi: `npm run dev` (porta 5173, con proxy `/api/*` locale), `npm run build`,
`npm run lint`, `npm test`.

---

## Funzionalità completate

- **Auth** Supabase: magic-link (email), Google OAuth, Apple OAuth, **Face ID/
  passkey** (WebAuthn, vedi "in sviluppo" per Apple e passkey). Login **a pagina
  intera** (niente card), redesign "manifesto" del 2026-07-03: headline
  "Cosa c'è in dispensa?" con sottolineatura wavy tomato su "dispensa",
  **due mensole di emoji-categoria** (da `CAT_ICON`) con slot "+" tratteggiato,
  sottotitolo "La tua cucina, in tasca. **Meno sprechi.** Zero pensieri."
  ("Meno sprechi" in verde brand fisso `#43A047`, non tematizzato), riga di
  provider a icona (Apple/Google/**Face ID**), "OPPURE", email con CTA nero
  pieno. Il pulsante Face ID chiama
  `signInWithPasskey()`; l'attivazione della passkey vive nel **Profilo**
  (`registerPasskey()`, richiede sessione attiva). Gate in `src/App.jsx`; logout
  dal Profilo.
- **Dispensa**: lista prodotti per categoria (collassabili), ricerca, ordinamento
  (persistito per-utente), stepper quantità con **mezzo pezzo (½)**, scadenze con
  banner ("scaduti" vs "in scadenza entro 7 gg", su due righe se entrambi),
  suggerimento "sta finendo" (solo nel pannello prodotto), "Cucina con questo".
- **Aggiunta prodotti**: manuale, a voce (dettatura → AI estrae prodotti →
  **riepilogo** `ReviewScanModal`; da lì **"Aggiungi altri prodotti"** ri-apre la
  dettatura e **accoda** i nuovi senza ricominciare da capo),
  **scontrino** (foto → AI), **codice a barre in raffica** (ZXing + Open Food
  Facts): lo scanner resta acceso, ogni bip accumula in un vassoio di chips
  (ri-scansione = quantità +1, tocco sulla chip = togli), "Fatto (N)" apre la
  revisione unica. Il FAB "+" compare **solo nella Dispensa** (nella Spesa c'è
  il campo inline; destinazioni diverse = niente ambiguità). L'overlay "Sto
  analizzando…" ha **Annulla** (aborta la richiesta AI).
- **Lista della spesa**: aggiunta manuale/voce, **autocompletamento** mentre
  scrivi (chip con emoji-reparto sotto il campo; pool storico acquisti → nomi in
  dispensa → **catalogo prodotti** `PRODUCT_CATALOG`/`CATALOG_NAMES` in
  constants.js; match a 3 livelli — prefisso del nome, prefisso di una parola
  qualsiasi es. "cotto"→"Prosciutto cotto", match a metà parola — esclude ciò
  che è già in lista). Il **microfono** nel campo diventa **X** (svuota) mentre
  scrivi, torna microfono a campo vuoto. Merge duplicati (solo tra righe NON
  barrate); **ri-aggiungere un prodotto già nel carrello NON lo tocca — crea
  una riga nuova in lista** (nuovo bisogno d'acquisto separato, es. un'altra
  patata comprata a parte). Vista "per reparto" o piatta, **carrello** (campo
  `checked`) con reparto "Nel carrello", "Sposta in dispensa", condivisione
  lista, wake-lock.
- **Ricette**: generazione AI in base alla dispensa, occasioni/"modi" (Pranzo
  veloce, Schiscetta, ecc.), preferiti (❤️), cucinate (contatore), **modalità
  cucina** passo-passo con **timer**, scala porzioni, foto Pexels.
- **"Ho cucinato"** (CookModal): scala le quantità della dispensa con 3 corsie
  (q.b. non scalato / a confezione / calcolo esatto).
- **Sync multi-dispositivo** via Supabase Realtime (pantry + shopping) e
  `user_settings` (jsonb).
- **Dispensa condivisa (multi-household)** — completa: nuclei, inviti con codice
  (7 gg), entra-con-codice, switch del nucleo attivo, esci. Ogni membro ha un
  **Nome (username)** impostabile dal Profilo (mostrato al posto della mail); il
  **creatore** è marcato con l'icona **corona** e può **far uscire** i membri con
  popup di conferma. Vedi `HouseholdSection.jsx` + migration-6/7/8/9.
- **Scrittura offline (outbox v2)** — coda di mutazioni per **dispensa e
  spesa** (`src/lib/outbox.js` + `src/lib/sync.js`): insert/update/delete con
  **id uuid generati lato client** (`newLocalId`), stato ottimistico immediato
  e replay idempotente al ritorno online (`applyOp`; duplicato di insert =
  successo). Il replay parte da `Dispensa.jsx` dopo la risoluzione del nucleo,
  così gli insert rigiocati ricevono l'`household_id` giusto. Niente più
  fallimenti silenziosi: aggiunte/eliminazioni funzionano anche offline.
- **Code-split per scheda** — le schede/scanner pesanti sono `React.lazy` in
  `Dispensa.jsx` (ZXing e affini caricati on-demand).
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
2. **Face ID / passkey (WebAuthn)** — codice pronto e **gratuito** (nessun servizio
   esterno): opt-in `experimental: { passkey: true }` in `src/lib/supabase.js`,
   pulsante "Accedi con Face ID" nel login (`signInWithPasskey()`) e riga di
   attivazione nel Profilo (`registerPasskey()`). Manca solo l'**abilitazione dal
   dashboard Supabase** (Authentication → Passkeys) — vedi guida in fondo. È una
   feature **beta** di Supabase (l'API può cambiare). Nota UX: la registrazione
   richiede una sessione attiva, quindi la prima volta si entra con email/Google e
   si attiva il Face ID dal Profilo; dagli accessi successivi il pulsante funziona.
3. **Placeholder ricerca ricette** — l'utente vuole un testo che comunichi che la
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
  serializzando le transizioni (`animateUI`, una alla volta) e, dal 2026-07-02,
  **blindato**: niente animazione a pagina non visibile + watchdog che forza
  `skipTransition()` dopo 1,5 s (lo snapshot congelato non può più intercettare
  i tocchi all'infinito).
- **Pulsanti che smettevano di rispondere** (navbar + metodi di inserimento,
  intermittente dopo apertura/chiusura di fogli) — root cause individuata nel
  `pointer-events: none` residuo sul body (race Radix/Vaul con smontaggi bruschi
  dei drawer e fogli sovrapposti). Fix in `Sheet.jsx`: invariante allo
  smontaggio — quando l'ultimo drawer lascia il DOM, il blocco viene rimosso.
  **Da confermare sul telefono con uso prolungato.**
- **Navbar a metà schermo** dopo chiudi/riapri la PWA (iOS standalone),
  segnalato dall'utente il 2026-07-03 — `src/lib/viewportFix.js` ripara la
  posizione al ritorno in foreground (nudge di scroll invisibile +, solo se non
  basta, un reflow completo del body gated dalla rilevazione). Il primo giro
  usava `window.innerHeight` per la rilevazione, ma al resume è stale insieme
  al rect della navbar (scarto ~0) → il reflow non scattava e il bug **persisteva**.
  **Migliorato**: la rilevazione ora usa `visualViewport.height` (viewport
  davvero visibile) + aggancio agli eventi `resize`/`scroll` di `visualViewport`.
  **Da riconfermare sul telefono.**

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
| `src/lib/viewportFix.js` | Ripara la navbar (e altri `position: fixed`) quando iOS li lascia ancorati a un viewport vecchio al ritorno in foreground della PWA. Installato in `main.jsx`. |
| `server/claude.js` | **Core del proxy AI** (Gemini), condiviso da Vercel e dev locale; verifica token, rate-limit, traduzione Anthropic↔Gemini, **responseSchema + temperature**. |
| `vite.config.js` | Plugin React, **proxy `/api/*` in dev**, config PWA/manifest. |
| `src/hooks/usePantry.jsx`, `useShopping.jsx`, `useRecipes.jsx` | Stato + logica dei tre domini. |
| `src/hooks/useOnline.js`, `useTimersTicker.js`, `useAuth.js` | Hook di supporto. |
| `src/components/Sheet.jsx` | **Bottom sheet condiviso (Vaul)**: cambiarlo cambia il drag di TUTTI i fogli. |
| `src/components/Button.jsx` | **Bottone d'azione condiviso**: varianti `primary`/`secondary`/`cook`/`danger`. Stile unico per funzione (primario = tomato). |
| `src/components/ProductFields.jsx` | **Vista prodotto condivisa** (nome · categoria-emoji→pillole · elimina / box scadenza→`ExpiryCalendar` · stepper in pill · unità): usata da pannello Dispensa, modifica Spesa, Aggiungi a mano e Revisione scansione. Riga quantità `flex-nowrap` (mai a capo). Presentazionale: la logica resta nei chiamanti. |
| `src/components/ExpiryCalendar.jsx` | **Calendario scadenza in-app** (rimpiazza il date picker nativo iOS): niente preselezione, scorciatoie Oggi/Domani/Tra 3 gg, navigazione mese, in-flow (funziona anche nei bottom sheet). |
| `src/constants.js` | Categorie, ordini reparto, **emoji categorie (`CAT_ICON`)**, prompt AI, seed/demo. |
| `src/index.css` | **Palette** (variabili CSS, light + blocchi dark) e CSS PWA/Vaul. |
| `src/components/HouseholdSection.jsx` | UI **Dispensa condivisa** nel Profilo: membri (username + corona sul creatore + "Rimuovi"), inviti, entra-con-codice, switch nucleo, esci, popup conferma espulsione. |
| `src/components/ProfileSheet.jsx` | Foglio Profilo (ibrido): **Nome (username)** al posto della mail, **Esigenze alimentari** (box 2 righe sempre visibile), `HouseholdSection`, Impostazioni (tema), azioni, privacy/elimina account. |
| `supabase/schema.sql` + `migration-2..9.sql` | Schema DB completo (vedi ARCHITECTURE). `migration-6/7/8` = **dispensa familiare** (schema, inviti, switch RLS a household); `migration-9` = **username + espulsione** (colonna `username`, `set_username`/`remove_member` security definer, `accept_invite` eredita lo username). |

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
- **Dispensa familiare (multi-household)** — COMPLETA (migration-6/7/8/9 eseguite).
  I dati condivisi (`pantry_items`/`shopping_items`/`saved_recipes`) hanno
  `household_id` e RLS `is_household_member(household_id)` (ripiego difensivo
  `household_id is null and auth.uid() = user_id`). `user_settings`/`ai_usage`
  restano per-utente. Nucleo attivo in `localStorage` (`dispensa-active-household-*`),
  iniettato negli insert e nel filtro query da `db.js` (`setActiveHousehold`);
  UI in `HouseholdSection.jsx`; inviti via `accept_invite` (security definer).
  Realtime filtra per `household_id`.
  - **Username**: colonna `household_members.username` (denormalizzata su tutte le
    righe dell'utente). `set_username` (security definer) la scrive; `getMyUsername`
    la legge; `accept_invite` la eredita nei nuovi nuclei. In UI si mostra
    `username || email` con fallback.
  - **Espulsione (solo owner)**: `remove_member(household_id, target)` security
    definer (la policy `members_delete_self` permette di togliere solo se stessi);
    verifica che il chiamante sia `owner`, vieta auto-rimozione e rimozione di un
    altro owner. Popup di conferma "Vuoi far uscire **Nome** dalla Dispensa
    condivisa?".
- **Realtime** su `pantry_items` e `shopping_items` (replica identity full);
  `user_settings` sincronizzato a parte.
- **Bottom sheet unico (Vaul)**: `Sheet.jsx` montato già aperto (`open=true`) così
  il `<video>` delle fotocamere è subito nel DOM.
- **Quantità ricette** (`formatRecipeQty`): `q.b.` solo per olio/sale/pepe; le
  spezie sono **cucchiaini** (numero + 🥄, scalati con le porzioni, mai la parola);
  pezzi/cucchiaini con **frazioni** (½ ⅓ ¼ ⅔ ¾, aggancio ±0,04); pesi/volumi in
  g/ml/kg/l; **mai parentesi** nel qty. I cucchiaini nel **CookModal** sono scorte
  q.b. (non sottratte): `isSpoonQty`. `isStapleQb` resta per le scorte del CookModal.
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
- **Viewport fix al resume** (`src/lib/viewportFix.js`): su iOS standalone il
  ritorno in foreground può lasciare i `position: fixed` (navbar) ancorati a
  un viewport vecchio. Approccio a due tempi per non avere effetti collaterali
  nel caso normale: nudge di scroll invisibile, poi (solo se la navbar risulta
  ancora fuori posto, misurata via `[data-navbar]`) un reflow completo
  gated dalla rilevazione. Ascolta `pageshow`/`focus`/`visibilitychange`/
  `orientationchange`/`resize`.

---

## Todo prioritari

1. **App nativa + monetizzazione** — punto di partenza della prossima chat:
   vedi la sezione dedicata "Prossimo obiettivo" in cima a questo documento.
   Prima si allineano le decisioni aperte con l'utente, poi si parte.
2. **Verificare sul telefono**: (a) **anteprima scontrino in-app** (bottom-sheet,
   niente fotocamera nativa — scelta UX dell'utente) su uno scontrino lungo reale;
   (b) **barcode in raffica** (vassoio, ri-scansione ×2, Fatto (N)) con prodotti
   reali; (c) torcia barcode dove supportata; (d) **offline end-to-end**
   (aggiungi/elimina in aereo → riaccendi la rete → replay outbox v2);
   (e) fix anti-freeze (uso prolungato con entra/esci da fotocamera/voce/profilo);
   (f) **bug navbar a metà schermo** dopo chiudi/riapri la PWA (segnalato
   dall'utente il 2026-07-03 con screenshot) — **risolto**: `src/lib/
   viewportFix.js` (installato in `main.jsx`) ripara la navbar al ritorno in
   foreground con un nudge di scroll invisibile e, solo se non basta, un
   reflow completo gated dalla rilevazione della posizione reale (vedi
   "Decisioni tecniche prese"). **Da confermare sul telefono** con l'uso
   reale (chiudi/riapri più volte, sfondo/primo piano, rotazione);
   (g) **username + espulsione membri** con più account condivisi (migration-9 già
   eseguita, feature confermata funzionante dall'utente il 2026-07-01).
3. **Configurare Apple Sign-In** (Apple Developer + Supabase) — guida sotto.
   *(Prerequisito comunque necessario per l'app nativa, vedi punto 1.)*
4. **Decidere il placeholder ricerca ricette** e applicarlo (1 riga, no a-capo).
   *(Nota: distinto dal placeholder "Esigenze alimentari" nel Profilo, già fatto.)*
5. Eventuali rifiniture UX su Spesa (altezze barra/nav sul dispositivo reale).

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

---

## Appendice — Configurare l'accesso con Face ID (passkey/WebAuthn)

**Gratuito**: nessun servizio esterno né costi. Le passkey (Face ID/Touch ID)
sono uno standard WebAuthn gestito da Supabase + dispositivo. È una feature
**beta** di Supabase (`experimental: { passkey: true }`, già impostato in
`src/lib/supabase.js`): l'API può cambiare senza preavviso.

Serve solo abilitarla dal dashboard:

1. **Supabase → Authentication → Passkeys**: attiva *Enable Passkey
   authentication*.
2. Compila i **Relying Party** (il dashboard li precompila da Site URL e nome
   progetto — di solito basta confermare):
   - **Display Name**: nome mostrato nel prompt (es. `Dispensa`).
   - **RP ID**: il **dominio nudo** dell'app (es. `dispensa.vercel.app`), senza
     schema/porta/path. In locale è `localhost`.
   - **Origins**: fino a 5 origini permesse (es. `https://dispensa.vercel.app`,
     `http://localhost:5173`).
3. Salva. Requisito lato client: `@supabase/supabase-js` ≥ 2.105 (ok, in repo).

Flusso (nessun codice da toccare):
- **Attivazione** (una volta per dispositivo): l'utente entra con email/Google →
  Profilo → **Impostazioni → Face ID → "Attiva"** → `registerPasskey()` (richiede
  sessione attiva). Al successo si scrive il flag locale `dispensa-passkey-<uid>`.
- **Accesso**: nel login il pulsante **Face ID** chiama `signInWithPasskey()`
  (l'utente sceglie l'account dal prompt di sistema; non serve digitare l'email).

> Note: la passkey si sincronizza via **iCloud Keychain** tra i dispositivi Apple
> dell'utente. Il flag `dispensa-passkey-<uid>` è solo un indicatore UX locale
> (per-dispositivo): se non c'è passkey registrata, `signInWithPasskey()` dà un
> errore gestito e restano email/Google/Apple. La riga Face ID nel Profilo e il
> pulsante nel login compaiono solo dove **WebAuthn è supportato**
> (`window.PublicKeyCredential`).
