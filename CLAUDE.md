# CLAUDE.md — Regole permanenti del progetto "Dispensa"

> Questo file vale per **ogni** conversazione su questo repo. Leggerlo PRIMA di
> modificare qualsiasi cosa. Collegati: `HANDOFF.md` (stato e ripresa) ·
> `ARCHITECTURE.md` (architettura) · `DESIGN-ATTUALE.md` (veste grafica
> "manifesto svizzero", dal 2026-09-30). L'app si chiama **"Dispensa"** (ex "La Mia
> Dispensa"); cartella/repo: `dispensa`.

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
   (69/69), `npm run build`. Se tocchi `pantry.js`/`history.js`, aggiorna i
   rispettivi test (`pantry.test.js` / `history.test.js`).
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
  `usePageColor`: Dispensa arancio `#ff7a1a`, Spesa giallo, Ricette verde,
  ricetta aperta bianca), inchiostro nero, Inter Tight, titoli `.gigante`,
  etichette `.micro`, righe sottili al posto delle card, pillole e tondi.
  Niente `backdrop-filter`/`filter: blur`/`mix-blend-mode`, animazioni solo
  `transform`/`opacity`. Per vedere le schermate senza login:
  `/anteprima.html` in `npm run dev`.
- **Icone categoria = emoji** da `CAT_ICON` (constants.js), **identiche** tra
  Dispensa e Spesa. Non sostituirle con icone lineari.
- **Bottom sheet**: sempre via `Sheet.jsx` (Vaul). Non creare modali ad-hoc.
- **Vista prodotto**: sempre via `ProductFields.jsx` (nome · categoria-emoji →
  pillole · elimina / box scadenza → `ExpiryCalendar` in-app · stepper in pill ·
  unità) ovunque si mostri o modifichi un prodotto. La riga quantità è
  `flex-nowrap` (mai a capo: cede solo il box scadenza, troncato). Non ricreare
  quei campi a mano.
- **Bottoni d'azione**: usa `Button.jsx` (varianti per funzione: `primary` nero
  pieno = conferma/commit · `secondary` col bordo = alternativa/Annulla · `cook`
  col bordo + icona = genera/cucina · `danger` rosso = elimina). Non creare
  bottoni ad-hoc con classi inline per le azioni standard. Il **primario è
  nero** (scelta dell'utente del 2026-09-30, prima era pomodoro).
  Restano bespoke solo i casi speciali (FAB, otturatore fotocamera, navbar,
  stepper ±, chip/pill, strisce dentro i banner).
- **Posizioni sopra la barra** (variabili in `src/index.css`: `--nav-bottom`
  12px + zona sicura, `--nav-h` 52px, `--sopra-nav`, `--banner-h`): il "+"
  della Dispensa sta sulla riga della barra (slot `addSlot` di `BottomNav`);
  l'**avviso** (`Toast.jsx`, prop `bottom` decisa in `Dispensa.jsx`) sta a
  `--sopra-nav` su tutte le schede,
  sopra la barra "Sposta in dispensa" quando il carrello non è vuoto
  (`cartBar`/`DOCK_TOP`); con la tastiera aperta va in alto. Se cambia la barra
  si cambiano solo le variabili.
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
  (ordini, collassato, porzioni, preferenze); in localStorage ciò che è
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

1. Leggi `HANDOFF.md` + `ARCHITECTURE.md` prima di agire.
2. Per modifiche UX: punta prima il file giusto (vedi tabella in HANDOFF), fai un
   cambiamento mirato, poi lint/test/build, poi commit+push automatico.
3. Quando una scelta è davvero dell'utente (estetica/prodotto), proponi **opzioni
   con una raccomandazione**, non un sondaggio infinito; per il resto, agisci.
4. Se l'utente segnala un comportamento "di prima", **controlla la cronologia git**
   (`git log -S "<testo>"`, `git show <commit>^:<file>`) prima di reimplementare a
   memoria: spesso il comportamento esiste già in un commit precedente.
5. Aggiorna questi tre documenti quando cambi qualcosa di strutturale.

---

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
  AdMob banner + ATT. **Prossimo obiettivo = StoreKit 2 + verifica ricevute
  + primo build su TestFlight** (sbloccato dall'account Apple Developer).
  Migration 11/12/13 sono SQL manuali (eccezione esplicita alla regola 3);
  lo **schema concreto va proposto all'utente prima**.
  Le scelte UX (mockup con opzioni) precedono sempre il codice.
  Free vs Premium: free = dispensa+spesa+ricette con pubblicità e **5
  generazioni AI/giorno**; **Premium (1,99€/mese · 14,99€/anno, 7gg prova)
  = Piano Alimentare + niente pubblicità + AI illimitata + invitare membri**.
  **Non confondere con "Cambusa"**, repo separato (competitor
  nativo RN/Expo di Dispensa): questa iniziativa converte *questo* codice.
