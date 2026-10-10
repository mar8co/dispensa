# CLAUDE.md — Regole permanenti del progetto "Dispensa"

> Questo file vale per **ogni** conversazione su questo repo. Leggerlo PRIMA di
> modificare qualsiasi cosa. Collegati: `HANDOFF.md` (stato e ripresa) ·
> `ARCHITECTURE.md` (architettura) · `DESIGN-ATTUALE.md` (veste grafica
> "manifesto svizzero", dal 2026-09-30). L'app si chiama **"Dispensa"** (ex "La Mia
> Dispensa"); repo GitHub `mar8co/dispensa`, cartella locale
> **`C:\Users\pasqu\Downloads\APP\dispensa`** (spostata lì a ottobre 2026: non è
> più in `Downloads\dispensa`). Online: https://la-dispensa-omega.vercel.app
> (Vercel pubblica da solo a ogni push su `main`).

---

## Regole permanenti (non negoziabili)

1. **Rispondere SEMPRE in italiano.** UI, testi, commenti del codice e messaggi di
   commit sono in italiano. **Unità metriche** (g/kg/ml/l) ovunque, mai cups/oz.
2. **API key MAI nel client.** Gemini, Pexels e il service-role Supabase vivono
   solo lato server (`server/*` + `api/*`). Nel bundle finiscono solo
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (anon, protetta da RLS).
3. **Non toccare il data layer** (tabelle, colonne, query di `src/lib/db.js`, campi
   degli item) salvo richiesta esplicita. Le feature UI usano i campi esistenti.
4. **Build verde prima di consegnare**: `npm run lint` (0 warning), `npm test`
   (162/162), `npm run build`. Se tocchi `pantry.js`/`history.js`/`parse.js`/
   `suggest.js`, aggiorna i rispettivi test (`*.test.js` accanto al file).
5. **Committa e pusha in automatico** dopo build verde (preferenza dell'utente su
   questo progetto), senza chiedere. Branch `main`, remoto `origin`. Eccezione:
   per lavori grandi a più blocchi (es. un restyle) l'utente può chiedere un
   ramo a parte, pubblicato su `main` solo a lavoro finito (dopo `git fetch`).
6. **Refactor incrementali, mai big-bang.** Un cambiamento coerente per commit.

---

## Convenzioni di codice

- **React funzionale + hook.** Niente classi. Niente TypeScript (è un progetto JS
  `.jsx`/`.js`).
- **Logica pura in `src/lib/`** (testabile), stato/effetti negli **hook**
  `src/hooks/`, presentazione nei **componenti** `src/components/`.
- **Commenti in italiano** che spiegano il *perché*, densi quanto il codice
  circostante (lo stile del repo è molto commentato: rispettalo).
- **ESLint flat config** (`eslint.config.js`): `react-hooks`, `no-unused-vars` con
  `varsIgnorePattern: ^[A-Z_]`. Quindi le variabili non usate **minuscole** danno
  errore: rimuovile (non rinominarle in maiuscolo per aggirare il lint).
- **Colori solo dai token** (`tailwind.config.js`): `sfondo` (colore della
  schermata), `ink`, `tenue`, `riga`, `crema`, i colori pieni (`arancio`,
  `giallo`, `verde`, `rosa`, `sabbia`...) e `rosso-azione`. Niente grigi fissi
  (`stone-*`) né nomi della veste vecchia (`cream`, `tomato`...): non esistono
  più. Un solo tema (chiaro): niente classi `dark:`.
- **localStorage**: chiavi sempre con prefisso `dispensa-*`, per-uid dove ha senso
  (es. `dispensa-sort-<uid>`).
- **Commit su Windows/PowerShell**: messaggi multilinea/con emoji → scrivere in
  `.git/COMMIT_EDITMSG_TMP` e `git commit -F`. I messaggi finiscono con la riga
  `Co-Authored-By:` del modello in uso (es. `Claude Opus 5.5 <noreply@anthropic.com>`).

---

## Standard UX/UI da rispettare

- **Mobile-first, iPhone Safari/PWA.** Tutto va pensato per una mano sola, target
  tocco ≥ 44px, rispetto di `env(safe-area-inset-*)`.
- **Veste "manifesto svizzero"** (dettagli in `DESIGN-ATTUALE.md`): un colore
  pieno per schermata (`PAGE_COLOR` in `src/lib/colors.js`, applicato con
  `usePageColor`: Dispensa beige `#dccdb2` (token `sabbia`), Spesa bianco, Ricette ROSA
  (dal 09/10 sera; prima arancio, prima ancora verde), ricetta aperta dello stesso colore), inchiostro nero, Inter Tight, titoli `.gigante`,
  etichette `.micro`, righe sottili al posto delle card, pillole e tondi.
  Niente `backdrop-filter`/`filter: blur`/`mix-blend-mode`, animazioni solo
  `transform`/`opacity`. Per vedere le schermate senza login:
  `/anteprima.html` in `npm run dev`.
- **Icone categoria = emoji** da `CAT_ICON` (constants.js), **identiche** tra
  Dispensa e Spesa. Non sostituirle con icone lineari.
- **Bottom sheet**: sempre via `Sheet.jsx` (Vaul). Non creare modali ad-hoc.
- **Vista prodotto**: sempre via `ProductFields.jsx` (nome · categoria-emoji →
  pillole · elimina / box scadenza → `ExpiryCalendar` in-app · stepper dei
  pezzi · in Dispensa la riga dello stato C'è / Sta finendo / Finito) ovunque
  si mostri o modifichi un prodotto. Non ricreare quei campi a mano.
- **Quantità semplici (dal 09/10 sera, scelta dell'utente "di prova")**: in
  dispensa un prodotto ha solo PEZZI e uno STATO (`qtyState`, `pieces`,
  `mergePieces`, `piecesLabel`, `LOW_QTY` in `pantry.js`); il campo `qty` è lo
  stesso di prima (intero = pezzi, "0,5" = sta finendo; i valori vecchi con
  unità valgono un pezzo). "Finito" TOGLIE il prodotto dalla dispensa e lo
  mette in lista. Dopo "Ho cucinato" niente sottrazioni di grammi: `CookModal`
  chiede per ogni prodotto usato "Ce n'è ancora / Sta finendo / Finito"; SOLO
  ciò che si conta a pezzi (almeno 2 in dispensa e la ricetta ne chiede un
  numero: 4 uova, ne usi 2) viene scalato dall'app, con − e + per correggere
  (`cookRow` in `pantry.js`, dal 10/10). La ricetta e
  la lista della spesa continuano a mostrare grammi e litri. Se l'utente dice
  **"torna allo stato delle quantità di prima"**: `git revert` dei commit
  "Quantità semplici" (stato di partenza nel tag `prima-quantita-semplici`).
- **Bottoni d'azione**: usa `Button.jsx` (varianti per funzione: `primary` nero
  pieno = conferma/commit · `secondary` col bordo = alternativa/Annulla · `cook`
  col bordo + icona = genera/cucina · `danger` rosso = elimina). Non creare
  bottoni ad-hoc con classi inline per le azioni standard. Il **primario è
  nero** (scelta dell'utente del 2026-09-30, prima era pomodoro).
  Restano bespoke solo i casi speciali (FAB, otturatore fotocamera, navbar,
  stepper ±, chip/pill, strisce dentro i banner).
- **Posizioni sopra la barra** (variabili in `src/index.css`: `--nav-bottom`
  12px + zona sicura, `--nav-h` 52px, `--sopra-nav`): il "+"
  (su tutte le schede) sta sulla riga della barra (slot `addSlot` di `BottomNav`);
  l'**avviso** (`Toast.jsx`) dall'11/10 sta IN ALTO, fisso, nello spazio vuoto
  della testata tra avatar e azioni (scelta dell'utente: lì non dà fastidio);
  con quello è tornato "Modifica salvata · Annulla" per le modifiche ai
  prodotti di Dispensa e Spesa. I timer attivi stanno a `--sopra-nav`
  ("Sposta in dispensa" + cestino della Spesa stanno tra la lista e "Nel
  carrello", in flusso, non fissi). Se cambia la barra si cambiano solo le variabili.
- **Fogli e pannelli**: dal basso i fogli (`Sheet`); di lato il Profilo (da
  sinistra, blu), che contiene anche le Impostazioni (`SettingsSection`: non c'è
  più un pannello a parte né l'ingranaggio in testata), con `Sheet side="left"|
  "right"`. Velo e pannelli laterali restano **staccati dal bordo alto** (iOS
  colora la barra di stato con ciò che tocca quel bordo): non rimetterli a
  `top: 0`.
- **Pannello di modifica in linea** (Dispensa, Spesa): il tocco fuori chiude e
  non fa altro, tramite `src/lib/outsideTap.js`. Non rimettere un semplice
  listener `pointerdown` che lascia passare il tocco.
- **Logo**: un solo tracciato in `src/components/logoPath.js` (ricalco
  dell'immagine scelta dall'utente), usato da `Barattoli.jsx` e copiato in
  `public/icon.svg`. Dopo averlo cambiato: `node scripts/generate-icons.mjs` e
  `node scripts/generate-splash.mjs`.
- **Feedback immediato**: niente attese percepibili inutili (es. lo stepper
  committa subito quando arriva a 0, così il toast appare all'istante).
- **Microcopy** caldo e diretto, in italiano, breve (sta in una riga su mobile).
- **Rispetta `prefers-reduced-motion`** (già gestito per Vaul in `index.css`).

---

## Librerie approvate

Usa quelle già presenti; **non aggiungere dipendenze senza un buon motivo** (è una
PWA leggera). Approvate:

- `react`, `react-dom`
- `@supabase/supabase-js`
- `lucide-react` (icone UI) + **emoji** (categorie)
- `vaul` (+ `@radix-ui/react-dialog` transitiva) per i bottom sheet
- `@zxing/browser`, `@zxing/library` (barcode)
- `@fontsource-variable/inter-tight` (carattere dell'app, file locali)
- Dev: `vite`, `vite-plugin-pwa`, `tailwindcss`, `vitest`, `eslint`, `sharp`

Per AI usa il **proxy esistente** (`callClaude`), non SDK lato client. Per foto usa
`fetchPhotos` (proxy Pexels).

**Prima il locale, poi l'AI** (dal 09/10): l'AI è l'ultima risorsa, non la
prima. Barcode e voce passano da `src/lib/parse.js` (regole + catalogo) e
chiamano l'AI solo per ciò che resta non riconosciuto; "Puoi farle con quello che hai"
(`src/lib/suggest.js` + `src/data/ricetteBase.js`) propone ricette senza AI; le
ricette generate restano in cache sul dispositivo; il limite giornaliero conta
solo le risposte riuscite e il client mostra quante ne restano
(`src/lib/aiUsage.js`). Una funzione nuova non deve aggiungere chiamate AI se
una regola locale basta.

---

## Pattern architetturali da seguire

- **Composition root**: lo stato condiviso e gli effetti cross-dominio stanno in
  `Dispensa.jsx`; ogni dominio (pantry/shopping/recipes) ha il suo hook. Se due
  domini devono parlarsi, il **bridge** sta in `Dispensa.jsx` (es.
  `moveCheckedToPantry`), non in un hook che ne importa un altro.
- **Ordine degli hook** in Dispensa: `useOnline → useTimersTicker → useRecipes →
  useShopping → usePantry` (usePantry per ultimo perché usa il bridge della
  spesa). Non invertire senza motivo.
- **Optimistic UI + Supabase**: aggiorna lo stato locale subito, poi persiste; il
  **Realtime** riconcilia tra dispositivi.
- **AI stile Anthropic**: i prompt mandano blocchi `{type:"text"|"image"}`; il
  parsing della risposta è JSON (con fallback regex) in `callClaude`. Non cambiare
  il formato lato client.
- **Quantità ricette** (`formatRecipeQty`, display scalato per porzioni): `q.b.`
  solo per olio/sale/pepe; spezie in **cucchiaini** (numero + 🥄, scalati, **mai
  la parola**); pezzi e cucchiaini con **frazioni** (½ ⅓ ¼ ⅔ ¾); pesi/volumi in
  g/ml/kg/l; **mai parentesi** nel campo qty. Nel **CookModal** i cucchiaini sono
  scorte q.b. (mostrati, non sottratti) — vedi `isSpoonQty`/`isStapleQb`.
- **Persistenza impostazioni**: in `user_settings` (jsonb) ciò che è cross-device
  (ordini, porzioni, preferenze); in localStorage ciò che è
  per-dispositivo o per-uid (ultimo ordinamento spesa).

---

## Cose da evitare

- ❌ Mettere chiavi/segreti nel client o committarli.
- ❌ Modificare schema/tabelle/colonne o i campi degli item senza richiesta.
- ❌ Aggiungere dipendenze pesanti o duplicare ciò che `lucide`/`vaul`/`pantry.js`
  già fanno.
- ❌ Avviare **più di una** View Transition insieme (freeze su iOS).
- ❌ Rimontare/aprire i `Sheet` in ritardo (rompe le fotocamere: vanno montati
  `open=true`).
- ❌ Big-bang refactor, o commit che mescolano più cambiamenti scollegati.
- ❌ Icone lineari al posto delle emoji per le categorie.
- ❌ Verificare via preview cose dietro login/camera e spacciarle per testate:
  dillo chiaramente e fai provare sul telefono.

---

## Modalità di lavoro nelle future conversazioni

1. Leggi `HANDOFF.md` + `ARCHITECTURE.md` prima di agire; per l'aspetto,
   `DESIGN-ATTUALE.md`.
2. Per modifiche UX: punta prima il file giusto (vedi tabella in HANDOFF), fai un
   cambiamento mirato, poi lint/test/build, poi commit+push automatico.
3. Quando una scelta è davvero dell'utente (estetica/prodotto), proponi **opzioni
   con una raccomandazione**, non un sondaggio infinito; per il resto, agisci.
4. Se l'utente segnala un comportamento "di prima", **controlla la cronologia git**
   (`git log -S "<testo>"`, `git show <commit>^:<file>`) prima di reimplementare a
   memoria: spesso il comportamento esiste già in un commit precedente.
5. Aggiorna questi documenti (`CLAUDE.md`, `HANDOFF.md`, `ARCHITECTURE.md`,
   `DESIGN-ATTUALE.md`) quando cambi qualcosa di strutturale o di aspetto.
6. Con l'utente: italiano semplice e breve, niente gergo. Dopo ogni modifica
   dire cosa è stato verificato e **cosa non si è potuto provare sull'iPhone**;
   se serve reinstallare la PWA, ricordarlo (i dati stanno sul suo account).
7. Per controllare l'aspetto: `/anteprima.html` a 393 px, misure dal DOM più
   screenshot. Se lo screenshot non riesce (finestra in secondo piano), dirlo.

---

## Stato al 2026-10-08 (da qui riparte la prossima chat)

- **Tutto pubblicato su `main`** (ultimo commit di codice `eac8dcb`), niente
  lavori a metà, nessun ramo aperto.
- **Veste attuale** (dettagli in `DESIGN-ATTUALE.md`): Dispensa e marchio beige
  `#dccdb2`, Spesa bianca, Ricette arancio; avatar blu in alto a sinistra →
  Profilo (pannello blu da sinistra), l'unico menu: dentro ci sono anche le
  Impostazioni e "Esci" (l'ingranaggio in testata è stato tolto il 09/10);
  tutto ciò che è Ricette o Piano è arancio, ricetta aperta compresa; barra nera con
  Dispensa · Spesa · Ricette e "+" bianco su tutte le schede; logo nuovo
  (sacchetto + cappello da chef).
- **Confermato dall'utente sull'iPhone (09/10)**: barra di stato giusta dopo
  il "+", icona nuova sulla Home, barra di stato del colore della pagina con
  Profilo/Impostazioni aperti su Dispensa e Ricette.
- **Ancora da confermare**: la stessa cosa sulla **Spesa (pagina bianca)**, dove
  la barra prendeva ancora il colore del menu. Tentativo del 09/10: fascia
  fissa del colore della pagina nello stacco in cima (`Sheet.jsx`). Se non va,
  prossima idea: un bianco non puro per la Spesa (es. `#fffffe`).
- **Giro del 09/10 (analisi UX + correzioni)**: bug corretti (reparto nello
  spostamento spesa→dispensa, intestazioni fisse, "Ho cucinato" offline, token,
  limite AI, finiti fuori dalle ricette, tutorial interrotto); "Sposta in
  dispensa" apre la revisione con scadenza proposta per i freschi
  (`SHELF_LIFE_DAYS`); niente più avviso a ogni prodotto nel carrello; "Cucina
  con questi prodotti" sempre visibile; foglio del pasto nel Piano nero.
  **Tolti il 09/10**: pubblicità (AdMob e richiesta di tracciamento: erano
  solo ID di prova), tutorial (con i prodotti di esempio nel database vero) e
  Face ID/passkey. Non rimetterli senza richiesta. Ordine del "+" dal basso:
  A mano, Voce, Barcode, Foto.
  **Aggiunti il 09/10**: "finito" scorrendo verso sinistra una riga della
  Dispensa (`PantryRow` + `finishItem`: quantità a zero e prodotto in lista,
  con Annulla); "Sposta in dispensa" apre la revisione solo se ci sono
  freschi; **"Riempi la settimana"** nel Piano (`fillWeek` in Dispensa.jsx +
  `lib/planner.js`: sceglie pranzi e cene dal ricettario partendo dalla
  dispensa, SENZA AI, tenendo il conto di ciò che ogni ricetta consuma, e
  mette i mancanti in lista con la quantità che serve); invitare nella dispensa
  condivisa è gratuito (**`supabase/migration-14.sql` va eseguita a mano**).
  **Esigenze alimentari senza AI** (`lib/prefs.js`): il testo libero del
  Profilo ("no peperoni e no melanzane", "vegetariano", "senza glutine") viene
  tradotto in esclusioni applicate al piano della settimana e a "Puoi farle con
  quello che hai"; il Profilo mostra cosa è stato capito. Ogni nuova funzione
  che propone ricette SENZA AI deve passare da `allowedBy(foodPrefs)`.
  **Semplificazioni del 09/10 sera (decise dall'utente, punto per punto)**:
  "Sposta in dispensa" sposta SUBITO (tolta la revisione con le scadenze
  proposte e `SHELF_LIFE_DAYS`); tolti l'avviso "Modifica salvata", la
  lampada (schermo acceso) della Spesa, il trascinamento delle occasioni, i
  timer e la spunta dei passaggi nella pagina della ricetta (restano nella
  Modalità cucina, ora bottone grande giallo), le pillole Pesce e Verdure
  (doppioni delle occasioni), le pillole per passare da una dispensa
  all'altra; il foglio del pasto nel Piano ha tre azioni (cucinato, cambia,
  rimuovi); l'ordine delle categorie si cambia dal Profilo ("Ordine delle
  categorie", a scomparsa) e non più dalle intestazioni; "Svuota dispensa" sta
  dietro "Elimina account"; Ricette rosa; titoli `.gigante` più bassi.
  **Giro del 09/10 notte**: il "Piano Alimentare" si chiama **"Calendario
  Alimentare"** in tutti i testi (nel codice restano `plan`/`meal_plan`/
  `?view=piano`); "Salva nel calendario del telefono" (`lib/ics.js` + bottone in
  `PlanWeek`: file .ics, eventi tutto il giorno, 🥗 pranzo e 🍳 cena);
  "Puoi farle con quello che hai" è a scomparsa, chiusa di serie; Profilo
  riordinato per uso (Esigenze alimentari → Notifiche → Dispensa condivisa →
  Ordine delle categorie → Esci), ogni sezione = intestazione + riquadro
  bianco; notifiche: nuovo orario delle 11:00 "A pranzo c'è…" (solo se il
  pranzo è nel calendario) e alle 18:30 la cena in calendario ha la
  precedenza (**`supabase/migration-15.sql` va eseguita a mano** per l'orario
  delle 11:00).
  **Giro del 10/10**: riquadro nero **"Oggi"** in cima alla Dispensa
  (scadenze + pasto di oggi dal calendario + quanti prodotti in lista; le due
  righe sotto portano al Calendario e alla Spesa); nel Profilo il riquadro
  bianco lo ha SOLO il campo delle esigenze alimentari (scelta dell'utente:
  non rimettere riquadri bianchi alle altre sezioni); il calendario del
  telefono non passa più da un file: **calendario in abbonamento**
  (`server/calendar.js` + `api/calendar.js`, indirizzo `webcal://` firmato con
  HMAC, nessuna tabella nuova; bottone "Collega al calendario del telefono").
  **Giro del 10/10 (secondo)**: nelle Ricette TOLTE la sezione "Puoi farle con
  quello che hai" e l'intestazione "Idee su misura" (commit `7619403`: se
  l'utente dice "riattiva la modalità premium" va fatto il revert ANCHE di
  questo, la sezione era la parte free); un piatto del calendario si apre
  sulla sua ricetta (riquadro "Oggi" e Calendario Alimentare), le azioni
  cucinato/cambia/rimuovi stanno dietro i tre puntini; il riquadro "Oggi"
  senza scadenze non scrive nulla; il calendario in abbonamento si chiama
  "Dispensa", colore `#DCCDB2`, aggiornamento suggerito ogni 15 minuti; dall'11/10 gli eventi hanno un orario (pranzo 13:00, cena 20:30, inizio = fine) e un avviso che parte in tempo per cucinare (`reminderMinutes`: tempo della ricetta + 10 min, tra 30 min e 2 ore).
  **Notifiche (dall'11/10)**, tutte in `server/push.js` (`userPayloads`) sugli
  orari del cron già esistenti: 11:00 pranzo in calendario (+ il sabato "la
  lista ha N prodotti"); 14:30 "hai mangiato?" (la domenica, a calendario
  vuoto, "organizziamo la settimana?"); 18:30 cena in calendario / scadenze;
  21:45 "per domani ti manca…" se ai pasti di domani manca qualcosa,
  altrimenti "com'era la cena?". In più `server/notify.js` + `api/notify.js`:
  "X ha aggiunto alla lista" agli altri membri della dispensa condivisa (il
  client raggruppa le aggiunte per 12 s, `lib/listNotice.js`).
  **Giro del 10/10 sera**: "Finito" → avviso "è in lista · Non serve" → se premuto,
  secondo avviso "eliminato · Annulla" che rimette il prodotto in dispensa; il
  riquadro "Oggi" tiene i pasti di oggi anche sfogliando altre settimane;
  articoli e concordanze in `lib/italiano.js` (usato anche da `server/push.js`).
  Pulizia: via `fetchIsPro`, le prop morte di `PlanWeek`/`ReviewScanModal`.
  **Restano, per scelta**: filtri di ordinamento, "Cucina con questo
  prodotto", Barcode, "Seleziona tutto", foto dei piatti, Piano dentro Ricette.
  **Scelte dell'utente da non rimettere in discussione**: riga della Spesa con
  tocco sul nome = modifica (resta così) e "+" su tutte le schede (resta).
- **Prossimo lavoro grande**: resta la Fase 3 (prodotti su App Store Connect,
  firma, TestFlight): vedi `HANDOFF.md`.

## Cosa una nuova istanza di Claude deve sapere subito

- L'app è **personale** (un solo utente) ma con **auth + RLS reali**: niente
  scorciatoie che espongano dati o chiavi.
- È **molto curata sull'UX**: dettagli di pochi pixel, microcopy e feedback contano
  per l'utente. Le richieste sono spesso iterazioni fini su UI già esistente.
- Il provider AI è **Gemini**, ma l'interfaccia è "stile Anthropic" per
  portabilità: ragiona sui prompt, non sul provider.
- L'utente lavora da **iPhone**: la prova finale è sul telefono, non nel preview.
- **Roadmap approvata (2026-07-04), in 3 fasi** — sezione dedicata in
  `HANDOFF.md` → "Prossimo obiettivo", da leggere prima di iniziare.
  **Fase 1** push scadenze ✅ e **Fase 2** Piano Alimentare ✅ complete e
  in produzione. **Fase 3** app nativa iOS + monetizzazione: **quasi tutta
  implementata (2026-07-20)** — wrapper Capacitor (progetto `ios/`, build
  verde su CI macOS GitHub Actions), push APNs (migration-12), deep link
  login (`dispensa://auth`), splash nativa, entitlements Premium
  (migration-13, `is_pro`, Premium **per-nucleo**), paywall (`PaywallSheet`),
  (AdMob + ATT c'erano, tolti il 09/10). **Prossimo obiettivo = StoreKit 2 + verifica ricevute
  + primo build su TestFlight** (sbloccato dall'account Apple Developer).
  Migration 11/12/13 sono SQL manuali (eccezione esplicita alla regola 3);
  lo **schema concreto va proposto all'utente prima**.
  Le scelte UX (mockup con opzioni) precedono sempre il codice.
  **DAL 09/10 SERA IL PREMIUM È SPENTO (scelta dell'utente): tutto è libero
  per tutti.** Tolti dal client paywall (`PaywallSheet`), `isPro`, lucchetti,
  cartellino FREE, `lib/premium.js`, `lib/storekit.js`; nel server
  (`server/claude.js`) niente `is_pro` né `premium_only`, resta solo un tetto
  anti-abuso uguale per tutti (`AI_DAILY_CAP`, 80 al giorno). "Puoi farle con
  quello che hai" ora si vede sempre. NON toccati: database (entitlements,
  `is_pro`), `server/receipt.js`, `server/appstore.js`, plugin nativo iOS. Se
  l'utente dice **"riattiva la modalità premium"**: `git revert` del commit
  "Senza Premium" (stato di partenza nel tag `prima-senza-premium`). Quanto
  segue descrive il modello di PRIMA, da ripristinare in quel caso.
  Free vs Premium (aggiornato il 09/10): free = dispensa+spesa+ricette **dal
  ricettario** (il proprio + `data/ricetteBase.js`, solo "Puoi farle con quello che hai" (sezione visibile SOLO nel gratuito): max 5 fattibili o le 2 più vicine; niente AI
  per le ricette), senza pubblicità; foto/barcode/voce usano l'AI solo se serve,
  entro il tetto giornaliero. Le **idee e le ricette su misura con l'AI sono
  solo Premium** (`kind: "recipe"`, verificato in `server/claude.js`). **Premium (1,99€/mese · 14,99€/anno, 7gg prova)
  = Piano Alimentare (con "Riempi la settimana") + ricette AI + AI illimitata**.
  Invitare membri è gratuito dal 09/10 (migration-14).
  **Non confondere con "Cambusa"**, repo separato (competitor
  nativo RN/Expo di Dispensa): questa iniziativa converte *questo* codice.
