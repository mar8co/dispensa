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

## Prossimo obiettivo: push scadenze → piano pasti → app nativa + monetizzazione

> **Stato (agg. 2026-07-16): Fase 1 (push scadenze) COMPLETA e verificata** —
> migration-10 eseguita, secret nel Vault, env Vercel impostate, prima
> subscription registrata dal telefono dell'utente (confermato in produzione:
> tabella, i 6 cron job attivi, secret nel Vault, VAPID nel bundle client,
> endpoint `/api/push` protetto). Le prossime chat ripartono dalla **Fase 2**
> (piano pasti — anch'essa v1 implementata, vedi sotto: manca solo
> migration-11 + prova telefono). Le due feature preparano il lancio nativo:
> le push sono il motore di retention, il piano pasti la feature Pro di punta.

### Fase 1 — Notifiche push per le scadenze — ✅ COMPLETA E VERIFICATA

> **Decisioni prese (2026-07-05)**: 3 promemoria/giorno in ora di Roma —
> **14:30** "hai cucinato? aggiorna la dispensa", **18:30** scadenze /
> "cosa cuciniamo stasera" (apre le Ricette), **21:45** "com'era la cena?
> aggiorna la dispensa". Avvisi scadenza a **cadenza automatica 7/3/1 giorni
> prima** (2026-07-20: rimosso il selettore 1/3/7 — nessuna impostazione,
> tre richiami distanziati invece della ripetizione quotidiana).
> Opt-in **per dispositivo**; digest **multi-household**: nuclei dell'utente
> + prodotti personali. Copy **caldo e diretto**. Schema `push_subscriptions`
> **minimale** (opzione A). Scheduler **pg_cron + pg_net** (non Vercel Cron).
> Dominio prod: `https://la-dispensa-omega.vercel.app`.
>
> **Setup completato (2026-07-16)**: `migration-10.sql` eseguita
> (`push_subscriptions` + RLS), secret `dispensa_cron_secret` nel Vault, env
> su Vercel impostate (`VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`,
> `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`), PWA installata e
> toggle attivato nel Profilo (subscription registrata). Verificato in
> produzione: 6 job cron `active`, VAPID nel bundle client, `/api/push`
> protetto (401 senza secret, 405 su GET). Resta solo la conferma finale di
> un invio reale ricevuto sul telefono (`select public.dispensa_push_ping();`
> dentro una finestra oraria, o attendere il prossimo slot naturale).
>
> **File**: `supabase/migration-10.sql`, `server/push.js`, `api/push.js`,
> `public/push-sw.js` (importato nel SW via `workbox.importScripts`),
> `src/lib/push.js`, `src/lib/db.js` (save/deletePushSubscription),
> `src/components/ProfileSheet.jsx` (riga "Avvisami delle scadenze"),
> `src/components/PushNudge.jsx` (soft-ask contestuale sotto il banner scadenze
> della Dispensa: secondo punto d'accesso per l'attivazione, one-shot, gated su
> PWA installata + non già attive + non già rifiutato; flag
> `dispensa-pushnudge-dismissed`),
> `src/Dispensa.jsx` (deep-link `?view=` + `pushDays` nelle impostazioni).
> **Design DST-safe**: pg_cron gira in UTC, quindi 6 job (le due varianti
> CET/CEST di ogni orario) e lo slot lo ricava il server dall'ora di Roma
> (±20 min): un solo gemello per stagione invia davvero.

<details><summary>Progetto originario Fase 1 (per contesto storico)</summary>

**Perché**: oggi le scadenze sono passive — il banner "in scadenza" si vede
solo aprendo l'app; se non la apri, il latte scade in silenzio. Le push
chiudono il buco e sono il prerequisito di retention per la monetizzazione.

**Architettura prevista** (coerente coi proxy esistenti — dettagli da
confermare in chat prima di scrivere codice):

- **Web Push su iOS**: funziona da iOS 16.4+ SOLO con PWA **installata**
  (il caso dell'utente). Il permesso va chiesto da un gesto utente esplicito
  (toggle nel Profilo, es. "Avvisami delle scadenze"), mai all'avvio.
- **Nuova tabella `push_subscriptions`** (user_id, endpoint, chiavi p256dh/auth,
  created_at; RLS per utente) — **migration-10.sql**: come sempre file SQL
  manuale che l'utente esegue nel SQL Editor Supabase. Modifica al data layer
  **già autorizzata in linea di principio** (2026-07-04), ma lo schema concreto
  va proposto all'utente prima di scrivere la migration.
- **Endpoint `api/push.js` → `server/push.js`** per registrare/rimuovere la
  subscription (verifica token Supabase come gli altri proxy).
- **Cron Vercel** (`vercel.json` → `crons`) che ogni mattina trova i prodotti
  in scadenza e invia le notifiche con la libreria **`web-push`** (dipendenza
  solo server, giustificata). Chiavi **VAPID** nelle env Vercel (la public key
  può stare nel client; la private MAI).
- **Idea collegata approvata come direzione**: notifica "Hai N prodotti in
  scadenza: vuoi una ricetta per usarli?" che apre le Ricette.

**Decisioni aperte (fase 1)**: orario d'invio, anticipo di default (1/3/7
giorni?), copy delle notifiche, comportamento multi-household (avvisare tutti
i membri del nucleo o solo chi ha attivato il toggle?).

</details>

### Fase 2 — Piano pasti settimanale — ✅ v1 IMPLEMENTATA (manca migration-11 + prova telefono)

> **Stato (agg. 2026-07-14): v1 nel codice.** Mockup 1 approvato dall'utente
> (agenda verticale DENTRO Ricette, segmented "Idee | Piano"; "oggi"
> evidenziato in modo discreto: etichetta + bordo tomato tenue). Decisioni
> prese (raccomandate, confermabili): slot **pranzo+cena**; piatto da
> **ricettario / AI / testo libero**; "cucinato" via **CookModal** (scala la
> dispensa, `cooked_at`); giorni passati **attenuati e compressi**.
>
> **Cosa manca (utente)**: eseguire `supabase/migration-11.sql` (tabella
> `meal_plan` + RLS + Realtime) e provare sul telefono. Senza migration la
> scheda Piano mostra errori di fetch in console ma l'app non si rompe.
>
> **File**: `supabase/migration-11.sql`, `src/hooks/useMealPlan.jsx` (dominio,
> helper data in ora locale), `src/components/PlanWeek.jsx` (settimana + foglio
> slot), `RecipesTab.jsx` (segmented Idee|Piano + "Aggiungi al piano" dal
> dettaglio ricetta = via "genera con l'AI"), `Dispensa.jsx` (ponte
> `cookMealFromPlan`: cucinare dal piano scala la dispensa e marca la voce;
> Realtime `meal_plan` nel canale esistente), `db.js` (CRUD household-aware),
> `useRecipes.recordCookedRecipe(cooked?)`.
>
> **Rifiniture v1.1 — FATTE (2026-07-20)**: deep-link 18:30 → Piano (se non
> c'è nulla in scadenza e la cena di stasera è pianificata e non cucinata, la
> notifica diventa "Stasera c'è {piatto} 👨‍🍳" e apre `/?view=piano` →
> RecipesTab parte sulla sotto-vista Piano via prop `startOnPlan`); porzioni
> per voce (in `data.planServings`, stepper nel foglio dello slot; "Ho
> cucinato" scala la dispensa in proporzione planServings/servings). Resta il
> paywall free/Pro (fase 3).

<details><summary>Progetto originario Fase 2 (per contesto storico)</summary>

**Il ciclo che chiude il cerchio "zero sprechi"**: pianifichi la settimana →
la lista della spesa si genera dai soli ingredienti mancanti → cucini
(CookModal scala la dispensa) → la dispensa resta allineata.

**Riusa pezzi esistenti**: `useRecipes` (generazione AI con stagione/contesti/
porzioni), `saved_recipes` (ricettario), `findMatch`/`addMissingToShopping`
(calcolo mancanti, oggi su una ricetta alla volta), `CookModal` (scala).

**Serve di nuovo**: tabella **`meal_plan`** (es. id, household_id, user_id,
date, slot pranzo/cena, titolo+data jsonb della ricetta; RLS
`is_household_member`) — **migration-11.sql** manuale, schema da proporre
prima; una **vista calendario settimanale** (dove vive? scheda nuova o dentro
Ricette? → mockup con opzioni PRIMA di scrivere codice, come da regole).

**Monetizzazione**: pensata come feature **Pro** (ipotesi: free pianifica 2-3
giorni, Pro la settimana + suggerimenti automatici) — la scelta esatta del
paywall si prende nella fase 3, la feature va costruita completa.

**Decisioni aperte (fase 2)**: collocazione UI, slot (solo cena o
pranzo+cena), come si sceglie la ricetta (ricettario vs generazione al volo),
come si segna "cucinato" dal piano, cosa mostrare dei giorni passati.

</details>

### Fase 3 — App nativa (iOS, poi Android) + monetizzazione ← IN CORSO (decisioni PRESE il 2026-07-20)

> **Decisioni prese con l'utente (kickoff 2026-07-20)** — vincolanti per le
> prossime chat:
> 1. **Packaging: Capacitor** (guscio nativo sul codice React/Vite attuale;
>    niente rewrite). Push da migrare ad **APNs** via plugin (il cron
>    pg_cron/server resta, cambia solo il canale d'invio).
> 2. **Free vs Premium**: free = dispensa + spesa + ricette con pubblicità e
>    limite AI giornaliero; **Premium = Piano Alimentare + zero pubblicità +
>    AI senza limiti**.
> 3. **Prezzo: 1,99 €/mese · 14,99 €/anno**, con 7 giorni di prova gratuita.
> 4. **Abbonamenti: FATTI IN CASA con StoreKit 2** (scelta esplicita
>    dell'utente al posto di RevenueCat): serviranno verifica ricevute
>    server-side (App Store Server API, pattern dei proxy esistenti),
>    tabella entitlements (migration-12, schema da proporre prima) e gating
>    `isPro` nel client.
> 5. **Pubblicità: AdMob, SOLO banner** adattivo in fondo a Dispensa e Spesa
>    (mai in fotocamera, cucina o Piano Alimentare), con prompt ATT.
>
> 6. **Build iOS SENZA Mac** (l'utente non ha un Mac, 2026-07-20): si usa
>    la **CI macOS di GitHub Actions** (gratis: il repo è pubblico) per
>    compilare, firmare e caricare su TestFlight. Niente Xcode locale;
>    certificati/provisioning gestiti via App Store Connect API key nei
>    GitHub Secrets.
>
> **Prerequisiti dell'utente**: iscrizione Apple Developer Program
> (99 €/anno) e account AdMob. **Ordine dei lavori tecnici**: wrapper
> Capacitor → push APNs → migration-12 entitlements + gating isPro → paywall
> UI → AdMob + ATT → TestFlight → store listing → submission.
>
> **Checklist tecnica del wrapper** — ✅ **FATTI (step 1, 2026-07-20)**:
> scaffold `ios/` (Capacitor 8 usa **SPM, non CocoaPods** → `cap add ios`
> gira anche da Windows); base URL API configurabile (`src/lib/api.js`,
> `VITE_API_BASE` vuota sul web = fetch relativi invariati, dominio Vercel
> nella build nativa); service worker registrato **solo sul web**
> (`injectRegister: null` + guard `Capacitor.isNativePlatform` in main.jsx);
> `Info.plist` con permessi camera/foto/microfono e solo verticale; workflow
> `.github/workflows/ios.yml` (build senza firma su push, TestFlight a mano).
> **Fatti anche (2026-07-20)**: **splash nativa** di brand generata da
> `generate-splash.mjs` in `Splash.imageset` (chiara + scura; il quadrato
> 2732² è in `scaleAspectFill`, quindi il lockup è dimensionato sulla
> striscia centrale ~46% visibile in portrait); **login via deep link**
> (`dispensa://auth` in `CFBundleURLTypes` + ponte `appUrlOpen` in
> `src/lib/native.js`, gestisce implicit e PKCE; `Auth.jsx` usa
> `authRedirectUrl()`); **push APNs** (vedi sotto).
>
> **PUSH APNs (migration-12)**: `push_subscriptions` ospita ora sia le Web
> Push sia i token APNs (colonne `platform`/`apns_token`, vincolo di forma,
> RPC `save_apns_token`). `server/apns.js` invia via HTTP/2 con JWT ES256
> **senza nuove dipendenze** (attenzione: la firma dev'essere R||S grezza →
> `dsaEncoding: "ieee-p1363"`). `server/push.js` sceglie il canale per riga e
> ripiega sulle sole colonne web se la migration-12 non è ancora applicata.
> Client: `@capacitor/push-notifications`, token salvato in localStorage
> (`dispensa-apns-token`), tocco della notifica → deep link.
>
> **ANCORA DA FARE**: prova reale di getUserMedia (scontrino/barcode) nel
> WKWebView; **env APNs su Vercel** (`APNS_KEY_ID`, `APNS_TEAM_ID`,
> `APNS_KEY_P8`, `APNS_BUNDLE_ID`, `APNS_PRODUCTION`) — richiedono la chiave
> .p8 dal portale Apple, quindi l'account Developer; **eseguire
> migration-12**; aggiungere `dispensa://auth` ai Redirect URL su Supabase.
> Bundle id: `com.mar8co.dispensa` (modificabile finché non si carica il
> primo build su App Store Connect).
>
> **Trappole CI imparate**: i log di Actions non sono leggibili senza login,
> ma le **annotazioni `::error::` sì** → il workflow cattura l'output dei
> comandi e lo rilancia come annotazione. La **CLI Capacitor richiede
> Node >= 22** (con Node 20 `cap copy` esce con `[fatal] The Capacitor CLI
> requires NodeJS >=22.0.0`): entrambi i workflow sono su Node 22.

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

#### Decisioni aperte (fase 3 — da affrontare CON l'utente quando ci si arriva)

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

#### Vincoli noti da rispettare da subito (valgono già dalle fasi 1-2)

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
| Test | Vitest (`src/lib/pantry.js` + `src/lib/history.js`, **69 test**) |
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
  scrivi (chip di solo testo, bg bianco, sotto il campo — niente icona: coerenza
  con "Aggiungi a mano"; pool storico acquisti → nomi in dispensa → **catalogo
  prodotti** `PRODUCT_CATALOG`/`CATALOG_NAMES` in constants.js, ~470 voci). Match
  a 3 livelli (prefisso del nome, prefisso di una parola qualsiasi es.
  "cotto"→"Prosciutto cotto", match a metà parola) su una chiave **tollerante**
  (`foldKey` in ShoppingTab.jsx: `matchKey` di pantry.js per i plurali noti +
  rimozione accenti via `\p{Diacritic}`, così "pomodoro"/"pomodori" e
  "caffe"/"Caffè" si trovano a vicenda). **Nessuna esclusione per il nome già
  scritto per intero**: la pillola resta sempre toccabile (anche digitando
  "Patate" per intero, la chip "Patate" non sparisce). Esclude solo ciò che è
  già in lista. Marche note di biscotti (Gocciole, Pan di Stelle, Pavesini,
  Ringo, Oro Saiwa, Abbracci, Macine, Baiocchi, Galletti, Campagnole,
  Grancereale, Oreo, Digestive) compaiono come suggerimento e si genericizzano
  in "Biscotti"/Dolci all'inserimento (`BRAND_TO_GENERIC` in pantry.js). Il
  **microfono** nel campo diventa **X** (svuota) mentre
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
  **Splash screen iOS**: `apple-touch-startup-image` in `index.html` (icona +
  wordmark "Dispensa" su cream/dark via `prefers-color-scheme`), immagini in
  `public/splash/*` generate da `scripts/generate-splash.mjs` (sharp; il font
  Hanken ExtraBold è bundlato in `scripts/assets/`), escluse dal precache SW
  (le gestisce Safari). Solo iPhone portrait. **Intro in-app** `SplashIntro.jsx`
  (montata in `App.jsx`, stili `.splash-*` in `index.css`): riprende la splash
  nativa e disegna la sottolineatura ondulata tomato (stile login "manifesto"),
  poi sfuma nell'app — dà l'animazione su tutte le piattaforme; la PNG statica è
  il primo fotogramma (nessuno stacco). Rispetta `prefers-reduced-motion`.
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
| `src/components/ProfileSheet.jsx` | Foglio Profilo ("chi sei"): **Nome (username)** al posto della mail, `HouseholdSection`, **Esigenze alimentari** (box 2 righe), azioni dati (Svuota dispensa `data-tour="clear-pantry"`, Esci). ⚙️ in alto a destra apre `SettingsSheet`. |
| `src/components/SettingsSheet.jsx` | Foglio **Impostazioni** ("come si comporta l'app", dal ⚙️ del Profilo): Face ID/passkey, toggle notifiche push (avvisi automatici a 7/3/1 gg dalla scadenza), Aspetto/tema, Rivedi il tutorial, footer Privacy Policy / Elimina account. |
| `supabase/schema.sql` + `migration-2..10.sql` | Schema DB completo (vedi ARCHITECTURE). `migration-6/7/8` = **dispensa familiare** (schema, inviti, switch RLS a household); `migration-9` = **username + espulsione** (colonna `username`, `set_username`/`remove_member` security definer, `accept_invite` eredita lo username); `migration-10` = **push scadenze** (tabella `push_subscriptions` + `save_push_subscription` + cron pg_cron/pg_net). |
| `server/push.js` + `api/push.js` | **Cron notifiche push** (Fase 1): ricava lo slot dall'ora di Roma, legge scadenze/subscription col service role, invia con `web-push`. Protetto da `CRON_SECRET`. |
| `src/lib/push.js` + `public/push-sw.js` | Opt-in push lato client (subscribe/unsubscribe) + handler `push`/`notificationclick` iniettato nel SW Workbox. |

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

1. **Notifiche push scadenze (Fase 1)** — ✅ **completa e verificata** (2026-07-16).
   Setup manuale fatto (migration, Vault, env Vercel, toggle attivato). Resta
   solo la conferma finale di un invio reale ricevuto (test manuale col ping
   SQL o attesa del prossimo slot). Vedi "Prossimo obiettivo → Fase 1".
2. **Piano pasti settimanale (Fase 2)** — ✅ **v1 implementata (2026-07-14)**.
   Resta: eseguire `migration-11.sql` e provare sul telefono (vedi "Prossimo
   obiettivo → Fase 2"). Rifiniture v1.1 elencate lì.
3. **App nativa + monetizzazione (Fase 3)** — dopo le fasi 1-2: decisioni
   aperte dedicate nella sezione in cima.
4. **Verificare sul telefono**: (a) **anteprima scontrino in-app** (bottom-sheet,
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
5. **Configurare Apple Sign-In** (Apple Developer + Supabase) — guida sotto.
   *(Prerequisito comunque necessario per l'app nativa, vedi punto 3.)*
6. **Decidere il placeholder ricerca ricette** e applicarlo (1 riga, no a-capo).
   *(Nota: distinto dal placeholder "Esigenze alimentari" nel Profilo, già fatto.)*
7. Eventuali rifiniture UX su Spesa (altezze barra/nav sul dispositivo reale).

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
