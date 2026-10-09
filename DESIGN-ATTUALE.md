# DESIGN-ATTUALE — Dispensa ("manifesto svizzero", dal 30/09/2026; aggiornato all'08/10/2026)

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
  | Ricette (Idee, proposte, Piano Alimentare) | **arancio** `#ff7a1a` (dal 09/10, prima verde `#22b35e`; si cambia in una riga: `PAGE_COLOR.ricette` in `lib/colors.js`) |
  | Fogli del Piano (pasto, "Aggiungi al piano") e "Aggiorna la dispensa" (Ho cucinato) | **nero** (testo crema, azione gialla; dal 09/10; classi in `FOGLIO_NERO`, `lib/colors.js`) |
  | Ricetta aperta, modalità cucina | **stesso colore delle Ricette** (dal 09/10, prima bianco); gli ingredienti stanno in una card bianca |
  | Profilo (pannello da sinistra) | **blu** `#3572e8`, lo stesso dell'avatar (testi secondari neri) |
  | Impostazioni | dentro il Profilo (blu) dal 09/10; il pannello arancio non esiste più |
  | Privacy (foglio) | **beige** `#dcceb3` |
  | Premium (paywall) | **rosa** `#ffb5d0` |
  | Fogli dove si scrive (a mano, voce, revisione) | **bianco** (default di `Sheet`) |
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
- **Impostazioni**: dal 09/10 stanno **dentro il Profilo** (`SettingsSection`: Premium,
  notifiche, "Svuota dispensa", "Esci" con conferma in linea, privacy / elimina account). Face ID e
  "Rivedi il tutorial" sono stati tolti il 09/10.
  L'ingranaggio in testata è stato tolto: in alto a destra restano solo luce e condivisione della Spesa.
- **Menu laterale** (`Sheet` con `side`, come il menu di Expense Track): il **Profilo entra da
  sinistra** ed è l'unico pannello laterale; alto quanto lo schermo, largo l'88%, senza maniglia,
  con la **X a tratto spesso** (`IconaChiudi.jsx`) in alto a destra; si chiudono anche toccando
  fuori o trascinando. Nel Profilo non c'è più l'ingranaggio. Gli altri fogli salgono dal basso.
- **Pillole su fondo colorato**: quelle delle categorie in Dispensa e delle occasioni in Ricette
  ("Fresco", "Caldo"…) hanno il fondo **bianco** (nere da accese).
- **Pannello di modifica aperto** (Dispensa, Spesa): un tocco fuori lo chiude e **non fa
  nient'altro** (`lib/outsideTap.js`; eccezione: gli avvisi).
- **Pannelli laterali e barra di stato**: velo e pannello restano staccati dal bordo alto
  (14 px, o la zona sicura se maggiore): iOS colora la barra di stato con gli elementi fissi che
  toccano quel bordo. Non rimetterli a `top: 0`. Nello stacco c'è una fascia fissa del colore della
  pagina (`bg-sfondo`): serve sulla Spesa bianca, dove lo stacco da solo non bastava (09/10).
- **Velo del "+"**: esiste nel DOM solo a menu aperto (se resta, iOS tiene grigia la barra di stato).
- **Titolo Dispensa**: solo "Hai fame?" (il "Ciao 👋" è stato tolto il 01/10).
- **Spesa, "Sposta in dispensa" + cestino**: una volta sola, tra la lista da prendere e "Nel
  carrello" (non in alto, non in fondo, non fissi).
- **"+"**: tondo **bianco** col bordo spesso (2,5 px, come Expense Track) e il "+" neri, alto quanto la barra (52 px), **sulla stessa
  riga** e staccato di 10 px; **su tutte le schede** (aggiunge sempre alla dispensa); le 4 azioni
  salgono in colonna sopra di lui ("A mano" la più vicina), etichette a sinistra, velo nero senza
  sfocatura.
- **Avvisi**: pillola nera, azione gialla ("Annulla", "Stop"). Mettere un prodotto nel carrello non
  dà più nessun avviso (tolto il 09/10: per annullare si ritocca la riga); avvisi della lampadina = pillola **gialla**, 2 s (3 s il suggerimento iniziale). Barra timer nera.
- **Logo / oggetto simbolo (01/10)**: sacchetto della spesa con pane, insalata e mela + cappello da
  chef. È il ricalco vettoriale dell'immagine scelta dall'utente (seconda versione, `a2f865d`): un
  solo tracciato in `components/logoPath.js`, un solo colore (`currentColor`; i vuoti lasciano
  vedere il fondo). Lo disegna `components/Barattoli.jsx` (nome storico) e lo stesso tracciato sta
  in `public/icon.svg`. Usato per icona, splash, accesso, dispensa vuota, "Sto analizzando la
  spesa" e il pulsante "Sposta in dispensa" (lì è a 26 px: i dettagli si impastano un po').
- **Icona e splash**: logo nero sul beige; splash con la scritta "Dispensa" (immagine
  pronta `scripts/assets/wordmark-dispensa.png`, Inter Tight 800 a −0.04em). Rigenerare con
  `node scripts/generate-icons.mjs` e `node scripts/generate-splash.mjs`.

- **Pannello prodotto (09/10)**: zona quantità su due righe — scadenza a sinistra e stepper a
  destra, poi le cinque unità (pz · g · kg · ml · l) larghe uguali; tutti i comandi alti 44 px.
- **Testo secondario sui colori saturi** (arancio delle Ricette, verde): `--tenue-a` passa da 0.6 a
  0.8 (lo imposta `setPageColor`), perché il nero al 60% lì non raggiunge il contrasto leggibile.
- **Login**: la pillola "Meno sprechi." resta **verde** `#22b35e` (scelta dell'utente del 09/10, anche con le Ricette arancio); i provider sono due
  (Apple, Google), più il link via email.
- **"+"**: dal basso verso l'alto A mano, Voce, Barcode, Foto (09/10).
- **Ricette, "Puoi farle con quello che hai" (09/10)**: SOLO nel piano gratuito (con Premium sparisce:
  c'è l'AI). Elenco a righe sottili sopra le occasioni, col cartellino "FREE" a destra del titolo:
  al massimo 5 ricette a cui non manca nulla (titolo, tempo, "hai tutto", cartellino nero "usa ciò che
  scade"); se non ce n'è nessuna, le 2 più vicine col titolo "Ti manca poco" e la riga "ti manca: " seguita
  dai nomi. Ogni riga apre la ricetta completa. Mai l'elenco intero del ricettario.
- **Ricette nel piano gratuito**: il campo "Cosa ti va?" è lo stesso di Premium (scintille), ma "Vai" ha il
  lucchetto e apre il paywall; le occasioni restano visibili sotto "Idee su misura con l'AI" col cartellino
  nero "Premium"; "Aggiungi al piano" nella ricetta ha il lucchetto. Le pillole di contesto solo con Premium.
- **Dispensa, "finito" con un gesto (09/10)**: scorrendo una riga verso sinistra (soglia 72 px, come
  nella Spesa) compare un fondo NERO con "Finito · in lista" e il carrello; al rilascio il prodotto
  diventa "finito" e va in lista, con un solo avviso e "Annulla". Non è rosso perché non elimina nulla.
  Un avviso, una volta sola per dispositivo, spiega il gesto.
- **Piano, "Riempi la settimana" (09/10)**: pulsante nero pieno sotto il selettore della settimana, con
  una riga piccola che dice cosa fa; compare solo se da oggi in poi c'è almeno un pasto libero. Alla
  fine si apre il foglio nero **"Piano pronto"** (`PlanReadySheet.jsx`): un blocco per giorno (giorno in testa; sotto i pasti con sole = pranzo e luna = cena, piatto, cosa manca; il filo separa i giorni); tocco sul piatto = apre la ricetta, tondo con le frecce = ne propone
  un'altra; in fondo "Annulla tutto" e "Va bene" (giallo).
- **Ricetta aperta dal ricettario**: prende tutta la pagina (prima compariva in fondo a "Cosa
  cuciniamo?"); in alto il link "Indietro".
- **Profilo, esigenze alimentari**: sotto il riquadro una riga piccola dice cosa l'app ne ha capito
  ("Nel piano e nelle ricette senza AI escludo: **peperoni, melanzane**."), oppure che in quel testo non
  ha trovato cibi da escludere, con tre esempi.
- **Ricetta aperta, riga fissa in alto (09/10)**: tondo con la freccia + "Altre proposte" (o
  "Indietro"); scorrendo, quando il titolo grande esce dallo schermo, al posto della scritta compare
  il nome del piatto più piccolo (1,25rem, una riga, troncato) e sotto la riga un filo nero.
- **Pillole di contesto delle Ricette (Premium)**: una riga sola che scorre di lato; alle cinque di
  prima si aggiungono Carne, Pollo, Pesce, Verdure, Legumi (una sola alla volta), poi Pasta, Uova, Riso, Zuppa, Insalata, Al forno, Piccante, Pochi ingredienti (si spengono solo
  quelle che si contraddicono, es. Insalata e Zuppa). Sotto, da accese: "Ne tengo
  conto nella ricetta".
- **Semplificazioni del 09/10 sera**: Ricette e ricetta aperta ROSA (`PALETTE.rosa`, prima arancio);
  titoli `.gigante` a `clamp(2.6rem, 12.5vw, 4rem)` (prima 3.4–5.4rem); nella ricetta aperta
  "Modalità cucina" è un bottone grande GIALLO col bordo nero e sotto la riga "Un passaggio alla
  volta, con i timer"; i passaggi sono solo numero + testo (niente spunta, niente timer); intestazioni
  di categoria della Dispensa senza frecce; nel Profilo la sezione a scomparsa "Ordine delle
  categorie" (riquadro bianco, una riga per categoria con frecce su/giù) e, nel riquadro giallo di
  "Elimina account", il link "Voglio solo svuotare la dispensa"; via la lampada dalla testata della
  Spesa e la maniglia dalle card delle occasioni.
- **Quantità semplici (09/10 sera)**: nella riga della Dispensa a destra c'è "×3" solo da due pezzi in
  su (coi puntini di guida); con un pezzo la riga è il solo nome. "Sta finendo" = cartellino giallo
  accanto al nome. Pannello del prodotto: scadenza + stepper dei pezzi, sotto tre pillole larghe
  uguali **C'è · Sta finendo · Finito** (scelta = piena nera); con "Sta finendo" compare la pillola
  "Sta finendo · Metti in lista". Niente più pillole delle unità, da nessuna parte. Foglio nero
  **"Com'è rimasto?"** dopo "Ho cucinato": un prodotto per riga, sotto tre pillole (scelta = gialla),
  "Ce n'è ancora" già scelta.
- **Senza Premium (09/10 sera)**: nessun lucchetto, nessun cartellino "FREE"/"Premium", niente
  riquadro Premium nel Profilo. Nelle Ricette, in ordine: campo "Cosa ti va?", pillole, "Puoi farle
  con quello che hai" (per tutti), intestazione "Idee su misura" e le occasioni.
- **Giro del 09/10 notte**: Profilo in quest'ordine — nome, Esigenze alimentari, Notifiche (riquadro
  bianco: campanella, "Promemoria e avvisi", cosa arriva, pillola Attiva/Disattiva), Dispensa
  condivisa (riquadro bianco coi membri; sotto due pillole PICCOLE "Entra con codice" e "Invita",
  36px, testo 0,8rem), Ordine delle categorie (a scomparsa), poi un filo nero e "Esci", in fondo
  Privacy / Elimina account. Ricette: "Puoi farle con quello che hai" è un'intestazione-bottone con
  numero e freccina, chiusa di serie. La scheda si chiama "Calendario Alimentare"; in fondo alla
  settimana il bottone col bordo "Salva nel calendario del telefono".
- **Sotto-pagine delle Ricette** (proposte di un'occasione, ricetta aperta): la testata con l'avatar non
  c'è; in alto resta solo la riga con la freccia per tornare indietro (09/10).
- **"Aggiungi al piano"** (`PlanDaySheet.jsx`, foglio nero): sotto il titolo il nome della ricetta; un
  giorno per riga con un filo chiaro tra l'uno e l'altro ("Oggi", "Domani", poi il giorno per esteso, con la
  data piccola accanto); a destra le pillole Pranzo (sole) e Cena (luna), alte 44 px. Un pasto già
  occupato è una pillola piena chiara con la spunta e il nome del piatto sotto il giorno; toccarla chiede
  conferma in linea ("La sostituisco?" · Annulla / Sostituisci giallo). Se lì c'è già questa ricetta la
  pillola è spenta.
- **Fili nei fogli neri**: `.foglio-nero .divide-riga …` in `index.css` li rende chiari (crema al 22%);
  prima restavano neri su nero.

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
3. Spesa: tocco sul **nome** = modifica, tocco sul **resto della riga** (o sul cerchio) = carrello,
   swipe ← elimina / → modifica (soglia 72 px), "Per reparto" nel giro del supermercato, "Nel
   carrello", "Sposta in dispensa" + cestino tra la lista e "Nel carrello".
4. Barra: Dispensa · Spesa · Ricette; Profilo dall'avatar in alto a sinistra; "+" su tutte le schede;
   pallini su Dispensa (scaduti) e Spesa (da prendere). 
5. (Il tutorial e gli attributi `data-tour` sono stati tolti il 09/10: al primo accesso la dispensa
   è vuota e la schermata vuota dice come aggiungere i prodotti.)
6. Emoji delle categorie identiche tra Dispensa e Spesa; testi e microcopy invariati.
7. Posizioni fisse calcolate dalle variabili della barra in `index.css` (`--nav-bottom`, `--nav-h`,
   `--sopra-nav`): "+", avviso, timer, spazio in fondo alle pagine.
   "Sposta in dispensa" + cestino della Spesa **non sono fissi**: stanno in flusso tra la lista e
   "Nel carrello". Luce e condivisione stanno sulla riga dell'avatar (`ShoppingTab` le porta con
   un portal in `#testata-azioni`, nella testata di `Dispensa.jsx`). Se cambia la barra, si
   cambiano solo le variabili.
8. Margini laterali 16 px; campi con testo ≥ 16 px (`.testo-grande`) per evitare lo zoom di iOS.

## Come verificare l'aspetto (pagina di prova)

`npm run dev` → `http://localhost:5173/anteprima.html` monta le schermate **vere** con dati finti,
senza login né Supabase (non entra nella build). Parametri: `vista=dispensa|spesa|ricette|
proposte|ricetta|piano|accesso`, `menu=1`, `toast=1`, `foglio=profilo|impostazioni|premium|
privacy|svuota|aggiungi|revisione|cucinato|voce`. Misurare dal DOM a 393 e 375 px. Dopo una
modifica a `tailwind.config.js` riavviare il server di sviluppo (le classi nuove non compaiono
finché non riparte). Fotocamere, notifiche, gesti e app nativa si provano solo sul telefono.

## Ancora da confermare sull'iPhone (08/10)

- Barra di stato con Profilo/Impostazioni aperti: **confermata** su Dispensa e Ricette (09/10); sulla
  **Spesa (bianca)** prendeva ancora il colore del menu → aggiunta la fascia fissa, da riprovare.
- Confermati dall'utente il 09/10: barra di stato dopo il "+" e icona nuova sulla Home.
- Trascinamento per chiudere i pannelli laterali (Profilo verso sinistra, Impostazioni verso destra).
