// Ricettario di base — SECONDI DI CARNE.
import { R, QB } from "../ricetta.js";

export default [
  R("Cotoletta alla milanese", "20 min", `Fettine di vitello:2|Uova:1|Pangrattato:80 g|Burro:40 g|Limone:0,5|Sale:q.b.`, [
    "Batti le fettine, passale nell'uovo sbattuto e poi nel pangrattato premendo bene.",
    "Friggile nel burro spumeggiante, tre minuti per lato.@6",
    "Sala e servi con uno spicchio di limone.",
  ]),
  R("Cotolette di pollo al forno", "30 min", `Petto di pollo:300 g|Uova:1|Pangrattato:80 g|Parmigiano:20 g|${QB}`, [
    "Passa le fettine nell'uovo e poi nel pangrattato mescolato al parmigiano.",
    "Disponile su una teglia con carta forno e un filo d'olio.",
    "Cuoci a 200° girandole a metà.@20",
  ]),
  R("Scaloppine al limone", "15 min", `Fettine di vitello:300 g|Limone:1|Farina:20 g|Burro:30 g|Sale:q.b.`, [
    "Infarina le fettine e rosolale nel burro.@4",
    "Sala, versa il succo di limone e fai addensare.@2",
  ]),
  R("Scaloppine al vino bianco", "15 min", `Fettine di vitello:300 g|Vino bianco:80 ml|Farina:20 g|Burro:30 g|Sale:q.b.`, [
    "Infarina le fettine e rosolale nel burro.@4",
    "Sfuma col vino, sala e lascia restringere il fondo.@3",
  ]),
  R("Scaloppine ai funghi", "25 min", `Fettine di vitello:300 g|Funghi:250 g|Farina:20 g|Aglio:1|Prezzemolo:q.b.|${QB}`, [
    "Salta i funghi a fette con olio e aglio.@8",
    "Rosola a parte le fettine infarinate.@4",
    "Unisci carne e funghi, sala e finisci col prezzemolo.",
  ]),
  R("Saltimbocca alla romana", "15 min", `Fettine di vitello:300 g|Prosciutto crudo:60 g|Salvia:q.b.|Vino bianco:60 ml|Burro:30 g`, [
    "Su ogni fettina appoggia prosciutto e una foglia di salvia e ferma con uno stecchino.",
    "Rosola nel burro, prima dal lato della carne poi dall'altro.@4",
    "Sfuma col vino e fai restringere.@2",
  ]),
  R("Pizzaiola", "25 min", `Fettine di manzo:300 g|Passata di pomodoro:300 g|Aglio:1|Origano:q.b.|${QB}`, [
    "Scotta le fettine in padella calda e tienile da parte.@2",
    "Nella stessa padella cuoci la passata con aglio, origano e sale.@10",
    "Rimetti la carne nel sugo e cuoci ancora qualche minuto.@5",
  ]),
  R("Straccetti di manzo con rucola", "10 min", `Straccetti di manzo:300 g|Rucola:60 g|Parmigiano:30 g|Aceto balsamico:q.b.|${QB}`, [
    "Salta gli straccetti in padella rovente con un filo d'olio.@2",
    "Sala e servili sulla rucola con scaglie di parmigiano e aceto balsamico.",
  ]),
  R("Tagliata con rucola e grana", "15 min", `Tagliata:400 g|Rucola:60 g|Grana Padano:30 g|${QB}|Pepe:q.b.`, [
    "Cuoci la carne su piastra rovente, tre-quattro minuti per lato.@7",
    "Lasciala riposare, poi affettala in diagonale.@3",
    "Servi su rucola con scaglie di grana, olio, sale e pepe.",
  ]),
  R("Bistecca ai ferri", "12 min", `Bistecche:2|Rosmarino:q.b.|${QB}|Pepe:q.b.`, [
    "Porta la carne a temperatura ambiente e scalda bene la piastra.",
    "Cuoci le bistecche senza muoverle, poi girale.@6",
    "Sala, pepa e condisci con un filo d'olio e rosmarino.",
  ]),
  R("Spezzatino con patate", "90 min", `Spezzatino:400 g|Patate:3|Carote:1|Cipolla:1|Passata di pomodoro:100 g|Vino rosso:100 ml|${QB}`, [
    "Rosola la carne a fuoco vivo, poi aggiungi cipolla e carota tritate.@8",
    "Sfuma col vino, unisci la passata, copri d'acqua calda e cuoci coperto.@50",
    "Aggiungi le patate a pezzi e porta a cottura.@25",
  ]),
  R("Spezzatino con piselli", "80 min", `Spezzatino:400 g|Piselli:250 g|Cipolla:1|Passata di pomodoro:150 g|Vino bianco:100 ml|${QB}`, [
    "Rosola la carne con la cipolla.@8",
    "Sfuma col vino, aggiungi passata e acqua calda e cuoci coperto.@50",
    "Unisci i piselli e finisci la cottura.@15",
  ]),
  R("Arrosto di vitello", "80 min", `Arrosto:600 g|Carote:1|Cipolla:1|Vino bianco:150 ml|Rosmarino:q.b.|${QB}`, [
    "Rosola la carne da tutti i lati in una casseruola.@8",
    "Aggiungi verdure a pezzi, rosmarino e vino, copri e cuoci a fuoco basso girando ogni tanto.@60",
    "Lascia riposare, affetta e servi col fondo frullato.",
  ]),
  R("Polpettone al forno", "60 min", `Macinato misto:400 g|Uova:1|Pangrattato:50 g|Parmigiano:40 g|Prosciutto cotto:60 g|${QB}`, [
    "Impasta macinato, uovo, pangrattato, parmigiano e sale.",
    "Stendi l'impasto, farcisci col prosciutto e arrotola a salame.",
    "Cuoci in forno a 180° con un filo d'olio.@45",
  ]),
  R("Polpette al forno", "35 min", `Macinato:300 g|Uova:1|Pangrattato:40 g|Parmigiano:30 g|Prezzemolo:q.b.|${QB}`, [
    "Impasta tutti gli ingredienti e forma le polpette.",
    "Disponile in teglia con un filo d'olio.",
    "Cuoci a 200° girandole a metà.@20",
  ]),
  R("Polpette in bianco", "25 min", `Macinato:300 g|Uova:1|Pangrattato:40 g|Farina:20 g|Vino bianco:80 ml|Limone:0,5|${QB}`, [
    "Forma le polpette con macinato, uovo, pangrattato e sale, poi infarinale.",
    "Rosolale in olio da tutti i lati.@6",
    "Sfuma con vino e succo di limone e cuoci coperto.@8",
  ]),
  R("Hamburger con cipolle", "20 min", `Hamburger:2|Cipolle:2|Aceto balsamico:q.b.|${QB}`, [
    "Stufa le cipolle affettate con olio, sale e un goccio d'acqua.@12",
    "Aggiungi l'aceto balsamico e fai caramellare.@2",
    "Cuoci gli hamburger in padella calda e servili con le cipolle.@8",
  ]),
  R("Ragù di carne", "90 min", `Macinato misto:400 g|Passata di pomodoro:500 g|Cipolla:1|Carote:1|Sedano:1|Vino rosso:100 ml|${QB}`, [
    "Soffriggi cipolla, carota e sedano tritati.@5",
    "Rosola bene il macinato, poi sfuma col vino.@8",
    "Aggiungi la passata, sala e cuoci a fuoco bassissimo, semicoperto.@70",
  ]),
  R("Chili con carne", "45 min", `Macinato di manzo:300 g|Fagioli neri:240 g|Passata di pomodoro:300 g|Cipolla:1|Peperoncino:q.b.|Cumino:1 cucchiaino|${QB}`, [
    "Rosola la cipolla e il macinato.@8",
    "Aggiungi passata, spezie e sale e cuoci.@20",
    "Unisci i fagioli scolati e finisci la cottura.@10",
  ]),
  R("Pollo alla cacciatora", "50 min", `Cosce di pollo:4|Pomodori pelati:300 g|Cipolla:1|Olive nere:40 g|Vino bianco:100 ml|Rosmarino:q.b.|${QB}`, [
    "Rosola il pollo da tutti i lati.@8",
    "Aggiungi la cipolla, sfuma col vino e unisci pelati, olive e rosmarino.",
    "Cuoci coperto a fuoco basso.@35",
  ]),
  R("Pollo al curry", "25 min", `Petto di pollo:300 g|Latte di cocco:200 ml|Cipolla:0,5|Curry:2 cucchiaini|${QB}`, [
    "Rosola la cipolla e il pollo a bocconcini.@6",
    "Aggiungi il curry e il latte di cocco, sala e cuoci finché la salsa si addensa.@12",
  ]),
  R("Pollo ai peperoni", "40 min", `Sovracosce di pollo:4|Peperoni:2|Cipolla:1|Passata di pomodoro:150 g|${QB}`, [
    "Rosola il pollo.@8",
    "Aggiungi cipolla e peperoni a listarelle e cuoci qualche minuto.@5",
    "Unisci la passata, sala e cuoci coperto.@25",
  ]),
  R("Pollo arrosto", "70 min", `Pollo intero:1|Limone:1|Rosmarino:q.b.|Aglio:2|${QB}|Pepe:q.b.`, [
    "Massaggia il pollo con olio, sale e pepe e mettici dentro limone, aglio e rosmarino.",
    "Cuoci in forno a 200° bagnando ogni tanto col fondo.@60",
    "Lascia riposare qualche minuto prima di tagliare.",
  ]),
  R("Pollo alla birra", "45 min", `Cosce di pollo:4|Birra:330 ml|Cipolla:1|Rosmarino:q.b.|${QB}`, [
    "Rosola il pollo con la cipolla affettata.@8",
    "Versa la birra, aggiungi il rosmarino e sala.",
    "Cuoci a fuoco medio finché la birra si riduce a salsa.@30",
  ]),
  R("Pollo alle mandorle", "20 min", `Petto di pollo:300 g|Mandorle:50 g|Salsa di soia:40 ml|Farina:20 g|Olio di semi:q.b.`, [
    "Tosta le mandorle in padella e tienile da parte.@2",
    "Infarina il pollo a bocconcini e rosolalo in olio.@6",
    "Aggiungi salsa di soia, un goccio d'acqua e le mandorle e fai addensare.@3",
  ]),
  R("Bocconcini di pollo al limone", "15 min", `Bocconcini di pollo:300 g|Limone:1|Farina:20 g|Prezzemolo:q.b.|${QB}`, [
    "Infarina i bocconcini e rosolali in olio.@6",
    "Sala, versa il succo di limone e fai addensare.@2",
    "Completa col prezzemolo.",
  ]),
  R("Petto di pollo alla piastra", "12 min", `Petto di pollo:300 g|Limone:0,5|Origano:q.b.|${QB}`, [
    "Cuoci le fettine su piastra ben calda, tre minuti per lato.@6",
    "Condisci con olio, sale, limone e origano.",
  ]),
  R("Pollo con panna e funghi", "25 min", `Petto di pollo:300 g|Funghi:200 g|Panna da cucina:150 ml|Cipolla:0,5|${QB}`, [
    "Rosola il pollo a pezzi con la cipolla.@6",
    "Aggiungi i funghi a fette e cuoci.@6",
    "Versa la panna, sala e fai addensare.@4",
  ]),
  R("Pollo e verdure in padella", "20 min", `Petto di pollo:300 g|Zucchine:1|Peperoni:1|Carote:1|Salsa di soia:q.b.|Olio di semi:q.b.`, [
    "Salta le verdure a striscioline a fuoco vivo.@5",
    "Aggiungi il pollo a striscioline e cuoci.@6",
    "Condisci con salsa di soia.",
  ]),
  R("Spiedini di pollo", "25 min", `Petto di pollo:300 g|Peperoni:1|Zucchine:1|Paprika:1 cucchiaino|${QB}`, [
    "Taglia pollo e verdure a cubetti, condisci con olio, sale e paprika e infilza alternandoli.",
    "Cuoci su piastra calda girando spesso.@12",
  ]),
  R("Ali di pollo al forno", "50 min", `Ali di pollo:600 g|Paprika:2 cucchiaini|Aglio in polvere:1 cucchiaino|${QB}`, [
    "Condisci le ali con olio, sale e spezie.",
    "Disponile in teglia e cuoci a 200° girandole a metà, finché sono croccanti.@40",
  ]),
  R("Tacchino al latte", "30 min", `Fesa di tacchino:300 g|Latte:250 ml|Farina:20 g|Burro:20 g|Salvia:q.b.|Sale:q.b.`, [
    "Infarina le fettine e rosolale nel burro con la salvia.@4",
    "Copri col latte, sala e cuoci finché si forma una crema.@15",
  ]),
  R("Fesa di tacchino al limone", "15 min", `Fesa di tacchino:300 g|Limone:1|Farina:20 g|${QB}`, [
    "Infarina le fettine e rosolale in olio.@4",
    "Sala e aggiungi il succo di limone, lasciando addensare.@2",
  ]),
  R("Involtini di pollo", "30 min", `Petto di pollo:300 g|Prosciutto cotto:80 g|Fontina:80 g|Vino bianco:80 ml|${QB}`, [
    "Su ogni fettina metti prosciutto e formaggio, arrotola e ferma con uno stecchino.",
    "Rosola gli involtini in olio.@6",
    "Sfuma col vino, sala e cuoci coperto.@10",
  ]),
  R("Salsiccia e patate al forno", "50 min", `Salsicce:4|Patate:4|Rosmarino:q.b.|${QB}`, [
    "Taglia le patate a spicchi e condiscile in teglia con olio, sale e rosmarino.",
    "Aggiungi le salsicce bucherellate.",
    "Cuoci a 200° mescolando a metà.@40",
  ]),
  R("Salsiccia e fagioli", "30 min", `Salsicce:4|Fagioli cannellini:480 g|Passata di pomodoro:200 g|Aglio:1|Salvia:q.b.|${QB}`, [
    "Rosola le salsicce a pezzi.@8",
    "Aggiungi aglio, salvia, passata e fagioli scolati.",
    "Cuoci a fuoco basso.@15",
  ]),
  R("Salsiccia e friarielli", "25 min", `Salsicce:4|Friarielli:500 g|Aglio:2|Peperoncino:q.b.|${QB}`, [
    "Rosola le salsicce in padella.@12",
    "Nella stessa padella salta i friarielli con aglio e peperoncino.@8",
    "Riunisci tutto e servi.",
  ]),
  R("Salsiccia e peperoni", "30 min", `Salsicce:4|Peperoni:3|Cipolla:1|${QB}`, [
    "Rosola le salsicce a pezzi.@8",
    "Aggiungi cipolla e peperoni a listarelle, sala e cuoci coperto.@18",
  ]),
  R("Lonza al latte", "50 min", `Lonza:500 g|Latte:500 ml|Aglio:1|Salvia:q.b.|Burro:20 g|Sale:q.b.`, [
    "Rosola la lonza nel burro con aglio e salvia.@6",
    "Copri col latte, sala e cuoci a fuoco basso girando ogni tanto.@40",
    "Affetta e servi con la salsa frullata.",
  ]),
  R("Braciole di maiale in padella", "15 min", `Braciole:2|Aglio:1|Rosmarino:q.b.|Vino bianco:60 ml|${QB}`, [
    "Rosola le braciole con aglio e rosmarino.@8",
    "Sfuma col vino, sala e fai restringere.@2",
  ]),
  R("Costine al forno", "90 min", `Costine:800 g|Paprika:2 cucchiaini|Miele:20 g|Aglio:2|${QB}`, [
    "Massaggia le costine con olio, sale, paprika, miele e aglio schiacciato.",
    "Cuocile coperte con alluminio a 160°.@60",
    "Scopri, alza a 200° e fai dorare.@20",
  ]),
  R("Fegato alla veneziana", "25 min", `Fegato:300 g|Cipolle:2|Burro:20 g|${QB}`, [
    "Stufa le cipolle affettate sottili con olio e burro.@15",
    "Alza il fuoco, aggiungi il fegato a listarelle e cuoci pochissimo.@3",
    "Sala solo alla fine.",
  ]),
  R("Involtini di carne al sugo", "40 min", `Fettine di manzo:300 g|Prosciutto crudo:60 g|Parmigiano:30 g|Passata di pomodoro:300 g|Aglio:1|${QB}`, [
    "Farcisci le fettine con prosciutto e parmigiano, arrotola e ferma con uno stecchino.",
    "Rosola gli involtini.@5",
    "Aggiungi passata, aglio e sale e cuoci coperto.@25",
  ]),
  R("Carpaccio rucola e grana", "5 min", `Carpaccio:200 g|Rucola:50 g|Grana Padano:30 g|Limone:0,5|${QB}`, [
    "Stendi le fettine nel piatto.",
    "Condisci con olio, limone e sale, poi copri con rucola e scaglie di grana.",
  ]),
  R("Bresaola rucola e grana", "5 min", `Bresaola:120 g|Rucola:50 g|Grana Padano:30 g|Limone:0,5|Olio EVO:q.b.`, [
    "Disponi la bresaola nel piatto.",
    "Aggiungi rucola e scaglie di grana e condisci con olio e limone.",
  ]),
  R("Vitello tonnato", "60 min", `Arrosto:400 g|Tonno in scatola:160 g|Maionese:100 g|Capperi:15 g|Acciughe:2|Sale:q.b.`, [
    "Lessa la carne in acqua salata e lasciala raffreddare nel brodo.@45",
    "Frulla tonno, maionese, acciughe e metà dei capperi fino a una salsa liscia.",
    "Affetta sottile la carne e coprila con la salsa e i capperi rimasti.",
  ]),
  R("Wurstel e patate in padella", "25 min", `Wurstel:4|Patate:3|Cipolla:0,5|${QB}`, [
    "Lessa le patate a cubetti per pochi minuti.@6",
    "Saltale in padella con la cipolla finché sono dorate.@8",
    "Aggiungi i wurstel a rondelle e rosola.@4",
  ]),
];
