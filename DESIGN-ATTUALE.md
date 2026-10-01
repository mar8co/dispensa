# DESIGN-ATTUALE — Dispensa ("manifesto svizzero", dal 30/09/2026)

> Veste grafica di oggi, la stessa di Wishlist Viaggi ed Expense Track (guida completa:
> `Downloads/APP/wishlist-viaggi/docs/LINEE-GUIDA-DESIGN.md`). Separa **cosa è solo aspetto**
> (si può cambiare) da **cosa è comportamento** (da conservare: è frutto di prove sull'iPhone
> dell'utente). Prima c'era la veste "editoriale" (avorio, rosso pomodoro, Hanken Grotesk, tema
> chiaro/scuro). Collegati: `CLAUDE.md` · `HANDOFF.md` · `ARCHITECTURE.md`.

## Aspetto

- **Un solo tema, chiaro.** Il tema scuro è stato tolto (30/09, come in Expense Track): niente più
  voce "Aspetto" nelle Impostazioni, niente `theme.js`, `color-scheme: light only`.
- **Un colore pieno per schermata** (fondo e barra di stato). `src/lib/colors.js` → `PAGE_COLOR` +
  `setPageColor` (variabile `--sfondo` in terna RGB + `<meta theme-color>`), applicato da
  `usePageColor` in `App.jsx` (accesso/caricamento) e `Dispensa.jsx` (per scheda):
  | Schermata | Colore |
  |---|---|
  | Dispensa, accesso, caricamento, avvio | **beige** `#dcceb3` (marchio, token `sabbia`; dal 01/10, prima arancio) |
  | Spesa | **bianco** (dal 01/10; prima giallo) |
  | Ricette (Idee, proposte, Piano Alimentare) | **verde** `#22b35e` |
  | Ricetta aperta, modalità cucina | **bianco** |
  | Profilo (pannello da sinistra) | **blu** `#3572e8`, lo stesso dell'avatar (testi secondari neri) |
  | Impostazioni (pannello da destra) | **arancio** `#ff7a1a` |
  | Privacy (foglio) | **beige** `#dcceb3` |
  | Premium (paywall) | **rosa** `#ffb5d0` |
  | Fogli dove si scrive (a mano, voce, revisione, Ho cucinato) | **bianco** (default di `Sheet`) |
  | Conferme (Svuota, far uscire un membro, elimina account) | **giallo** |
  | Fotocamere (scontrino, barcode) | **nero** (accento giallo) |
- Inchiostro sempre nero `#0a0a0a` (`ink`); su nero si scrive in crema `#f3f1ec`. Testo secondario
  `tenue` (nero al 60%), fili `riga` (nero al 16%): trasparenti, così prendono la tinta del fondo.
  Il bianco sul colore solo sul rosso azione `#e02a0d` (ciò che toglie).
- **Carattere Inter Tight** (`@fontsource-variable/inter-tight`, file locali importati in
  `main.jsx`), base 500. Classi in `src/index.css` (`@layer components`): `.gigante` (titoli di
  pagina, clamp 3.4–5.4rem, 800, −0.065em, con `word-spacing` per non incollare le parole),
  `.titolo` (fogli e ricetta, clamp 1.9–2.3rem), `.grande`, `.micro` (etichetta piccola sopra i
  valori, mai maiuscolo), `.num` (cifre tabellari).
- **Righe sottili al posto delle card**: categorie con filetto nero 1.5px, righe con filo 1px. Le
  card restano solo dove servono: pannello prodotto aperto, occasioni e proposte delle Ricette,
  giorni del Piano, piani del Premium.
- **Pillole e cerchi**: `.bottone` (nero, azione principale), `.bottone-chiaro` (bordo),
  `.bottone-rosso`, `.pillola` (scelta: bordo; scelta = piena nera via `aria-pressed`), `.tondo`
  (icone), `.cartellino` (etichette piccolissime), `.link`, `.campo` (solo la riga sotto),
  `.evidenza` (riquadro nero). `Button.jsx` mappa le varianti su queste classi: **il primario è
  nero** (scelta dell'utente del 30/09, prima era pomodoro).
- **Scadenze a cartellini**: rosso pieno = scaduto, nero = oggi/entro 3 giorni, solo bordo = entro
  la settimana, tenue = lontana. Il nome del prodotto resta nero (sul fondo colorato un nome rosso/ambra
  non si leggerebbe); "finito" attenuato.
- Icone lucide a tratto spesso (`svg.lucide { stroke-width: 2.6px }`); **categorie sempre emoji**.
- **Barra in basso** (uguale a Wishlist Viaggi ed Expense Track, 30/09): pillola nera centrata con
  le sole parole Dispensa · Spesa · Ricette, `.92rem` 650, `padding .7rem 1.05rem`, alta 52 px, 12 px
  dal fondo; scheda aperta in crema; **pallino rosso** (senza numero) su Dispensa se ci sono scaduti
  e su Spesa se c'è qualcosa da prendere.
- **Profilo**: avatar tondo **blu** `#3572e8` con l'iniziale bianca (36 px, Nome o mail) in alto a
  sinistra di ogni scheda; accanto, "Offline" quando manca la rete. Lo stesso avatar (48 px) apre
  il pannello Profilo. Avatar col bordo nero di 2 px (come Wishlist).
- **Impostazioni**: ingranaggio in alto a destra su **tutte** le schede (nella Spesa luce e
  condivisione gli stanno accanto, a sinistra). Dentro c'è **"Esci"**, con conferma in linea.
- **Menu laterale** (`Sheet` con `side`, come il menu di Expense Track): il **Profilo entra da
  sinistra**, le **Impostazioni da destra**; alti quanto lo schermo, larghi l'88%, senza maniglia,
  con la **X a tratto spesso** (`IconaChiudi.jsx`) in alto a destra; si chiudono anche toccando
  fuori o trascinando. Nel Profilo non c'è più l'ingranaggio. Gli altri fogli salgono dal basso.
- **Pillole su fondo colorato**: quelle delle categorie in Dispensa e delle occasioni in Ricette
  ("Fresco", "Caldo"…) hanno il fondo **bianco** (nere da accese).
- **Pannello di modifica aperto** (Dispensa, Spesa): un tocco fuori lo chiude e **non fa
  nient'altro** (`lib/outsideTap.js`; eccezioni: avvisi e tutorial).
- **Pannelli laterali e barra di stato**: velo e pannello partono sotto la zona sicura in alto, così
  la barra di stato resta del colore della pagina.
- **Velo del "+"**: esiste nel DOM solo a menu aperto (se resta, iOS tiene grigia la barra di stato).
- **Titolo Dispensa**: solo "Hai fame?" (il "Ciao 👋" è stato tolto il 01/10).
- **Spesa, tutto nel carrello**: compare "Sposta tutto in dispensa" anche in alto, sotto "Per
  reparto"; quello in fondo alla lista resta, col cestino.
- **"+"**: tondo **bianco** col bordo spesso (2,5 px, come Expense Track) e il "+" neri, alto quanto la barra (52 px), **sulla stessa
  riga** e staccato di 10 px; **su tutte le schede** (aggiunge sempre alla dispensa); le 4 azioni
  salgono in colonna sopra di lui ("A mano" la più vicina), etichette a sinistra, velo nero senza
  sfocatura.
- **Avvisi**: pillola nera, azione gialla ("Annulla", "Stop"). Eccezione: "X spostato nel
  carrello" = pillola **verde** col bordo nero, 2,5 s, con "Annulla" (rimette in lista). Barra timer nera.
- **Oggetto simbolo: sacchetto della spesa + cappello da chef** (`components/Barattoli.jsx`, stesso disegno di
  `public/icon.svg`): dietro pieno nero, davanti col colore della superficie. Usato per icona,
  splash, accesso, dispensa vuota, "Sto analizzando la spesa" e il pulsante "Sposta in dispensa".
- **Logo (01/10)**: ricalco vettoriale dell'immagine scelta dall'utente (sacchetto con pane,
  insalata e mela + cappello da chef), un solo tracciato in `components/logoPath.js`, un solo colore.
- **Icona e splash**: logo nero sul beige; splash con la scritta "Dispensa" (immagine
  pronta `scripts/assets/wordmark-dispensa.png`, Inter Tight 800 a −0.04em). Rigenerare con
  `node scripts/generate-icons.mjs` e `node scripts/generate-splash.mjs`.

## Movimento

- Cambio scheda: View Transition del browser come prima (una per volta, `animateUI`); il colore
  del fondo cambia dentro la transizione, senza animare il fondo.
- Fogli: Vaul come prima (trascina giù, tocco fuori). Avvisi: salgono di 24 px in 0,2 s.
- Solo `transform`/`opacity`: il tutorial non anima più posizione e misura del riquadro
  evidenziato (si sposta di colpo). `prefers-reduced-motion` rispettato.

## Da conservare in qualsiasi restyling (comportamento)

1. Niente `filter: blur` / `backdrop-filter` / `mix-blend-mode` su elementi grandi o fissi; niente
   librerie di animazione per elementi ripetuti.
2. Pannello prodotto in linea con salvataggio automatico (tempi, "Annulla", chiusura toccando
   fuori), unità che ripartono dal valore base, calendario scadenze dentro l'app.
3. Spesa: tocco sul nome = modifica, cerchio = carrello, swipe ← elimina / → modifica (soglia 72
   px), "Per reparto" nel giro del supermercato, "Nel carrello", barra "Sposta in dispensa".
4. Barra: Dispensa · Spesa · Ricette; Profilo dall'avatar in alto a sinistra; "+" su tutte le schede;
   pallini su Dispensa (scaduti) e Spesa (da prendere). `data-tour` di schede, avatar e "+" invariati.
5. Tutorial: gli attributi `data-tour` restano su ogni elemento.
6. Emoji delle categorie identiche tra Dispensa e Spesa; testi e microcopy invariati.
7. Posizioni fisse calcolate dalle variabili della barra in `index.css` (`--nav-bottom`, `--nav-h`,
   `--sopra-nav`, `--banner-h`): "+", avviso, timer, spazio in fondo alle pagine.
   La barra "Sposta in dispensa" + cestino della Spesa **non è fissa**: sta in fondo alla lista.
   Spesa: tocco sul **nome** = modifica, tocco sul **resto della riga** = carrello; luce e
   condivisione sulla riga dell'avatar (`#testata-azioni` nella testata di `Dispensa.jsx`). Se cambia la barra, si cambiano solo le variabili.
8. Margini laterali 16 px; campi con testo ≥ 16 px (`.testo-grande`) per evitare lo zoom di iOS.

## Come verificare l'aspetto (pagina di prova)

`npm run dev` → `http://localhost:5173/anteprima.html` monta le schermate **vere** con dati finti,
senza login né Supabase (non entra nella build). Parametri: `vista=dispensa|spesa|ricette|
proposte|ricetta|piano|accesso`, `menu=1`, `toast=1`, `foglio=profilo|impostazioni|premium|
privacy|svuota|aggiungi|revisione|cucinato|voce`. Misurare dal DOM a 393 e 375 px. Dopo una
modifica a `tailwind.config.js` riavviare il server di sviluppo (le classi nuove non compaiono
finché non riparte). Fotocamere, notifiche, gesti e app nativa si provano solo sul telefono.
