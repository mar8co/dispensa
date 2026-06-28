# CLAUDE.md — Regole permanenti del progetto "Dispensa"

> Questo file vale per **ogni** conversazione su questo repo. Leggerlo PRIMA di
> modificare qualsiasi cosa. Collegati: `HANDOFF.md` (stato e ripresa) ·
> `ARCHITECTURE.md` (architettura). L'app si chiama **"Dispensa"** (ex "La Mia
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
   (46/46), `npm run build`. Se tocchi `pantry.js`, aggiorna `pantry.test.js`.
5. **Committa e pusha in automatico** dopo build verde (preferenza dell'utente su
   questo progetto), senza chiedere. Branch `main`, remoto `origin`.
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
- **Nessun bianco letterale tematizzato**: per superfici/testi bianchi usa il
  token `white` (che diventa scuro in dark mode); il **nero scrim** resta
  letterale (`bg-black/40`, `text-[#fff]` nelle UI fotocamera su sfondo scuro).
- **localStorage**: chiavi sempre con prefisso `dispensa-*`, per-uid dove ha senso
  (es. `dispensa-sort-<uid>`, `dispensa-theme`).
- **Commit su Windows/PowerShell**: messaggi multilinea/con emoji → scrivere in
  `.git/COMMIT_EDITMSG_TMP` e `git commit -F`. I messaggi finiscono con
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Standard UX/UI da rispettare

- **Mobile-first, iPhone Safari/PWA.** Tutto va pensato per una mano sola, target
  tocco ≥ 44px, rispetto di `env(safe-area-inset-*)`.
- **Palette** (variabili CSS in `src/index.css`, mappate ai token Tailwind):
  - Light: `--cream 244 241 233` (sfondo), `--ink 10 10 10` (#0A0A0A), `--tomato
    255 67 6` (#FF4306), `--tomato-700 214 54 0`.
  - Dark: definito nei blocchi `[data-theme="dark"]` e media query; **i token
    devono restare allineati** a quelli light (stessi nomi).
  - Tomato in dark: `255 96 56`.
- **Icone categoria = emoji** da `CAT_ICON` (constants.js), **identiche** tra
  Dispensa e Spesa. Non sostituirle con icone lineari.
- **Bottom sheet**: sempre via `Sheet.jsx` (Vaul). Non creare modali ad-hoc.
- **Toast** (`Toast.jsx`): `bottom-32` (appena sopra il FAB "+") su tutte le
  schede; **eccezione** `bottom-44` solo sulla Spesa quando c'è la barra "Sposta
  in dispensa" (carrello non vuoto), per non coprirla. La condizione vive in
  `Dispensa.jsx`: `raised={view === "spesa" && shopping.some(s => s.checked)}`.
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
  per-dispositivo (tema) o per-uid (ultimo ordinamento spesa).

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
