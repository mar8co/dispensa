// Ricettario di base — UOVA, VERDURE, LEGUMI, CONTORNI.
import { R, QB } from "../ricetta.js";

export default [
  R("Uova strapazzate", "8 min", `Uova:4|Burro:15 g|Latte:30 ml|Sale:q.b.`, [
    "Sbatti le uova col latte e un pizzico di sale.",
    "Cuocile nel burro a fuoco basso mescolando, finché sono cremose.@3",
  ]),
  R("Uova al tegamino", "6 min", `Uova:4|Burro:15 g|Sale:q.b.|Pepe:q.b.`, [
    "Sciogli il burro in padella e rompi dentro le uova.",
    "Cuoci a fuoco dolce finché l'albume è rappreso e il tuorlo ancora morbido.@4",
  ]),
  R("Omelette al formaggio", "8 min", `Uova:4|Fontina:60 g|Burro:15 g|Sale:q.b.`, [
    "Sbatti le uova col sale e versale nel burro caldo.",
    "Quando si rapprendono aggiungi il formaggio, piega a metà e cuoci ancora un minuto.@4",
  ]),
  R("Omelette prosciutto e formaggio", "10 min", `Uova:4|Prosciutto cotto:60 g|Emmental:50 g|Burro:15 g|Sale:q.b.`, [
    "Versa le uova sbattute nel burro caldo.",
    "Farcisci con prosciutto e formaggio, piega e finisci la cottura.@4",
  ]),
  R("Frittata di cipolle", "20 min", `Uova:4|Cipolle:2|Parmigiano:30 g|${QB}`, [
    "Stufa le cipolle affettate in olio.@10",
    "Versa le uova sbattute con parmigiano e sale.",
    "Cuoci coperto, gira e finisci l'altro lato.@6",
  ]),
  R("Frittata di spinaci", "20 min", `Uova:4|Spinaci:250 g|Parmigiano:30 g|Aglio:1|${QB}`, [
    "Salta gli spinaci con olio e aglio finché appassiscono.@4",
    "Versa le uova sbattute con parmigiano e sale.",
    "Cuoci coperto, gira e completa.@6",
  ]),
  R("Frittata di pasta", "20 min", `Spaghetti:150 g|Uova:3|Parmigiano:40 g|Pancetta:50 g|${QB}`, [
    "Mescola la pasta già cotta con uova, parmigiano, pancetta e sale.",
    "Versa in padella con olio caldo e compatta.",
    "Cuoci a fuoco medio, gira e dora l'altro lato.@12",
  ]),
  R("Frittata al forno con verdure", "35 min", `Uova:4|Zucchine:1|Peperoni:1|Cipolla:0,5|Parmigiano:30 g|${QB}`, [
    "Salta le verdure a dadini in olio.@8",
    "Mescolale alle uova sbattute con parmigiano e sale e versa in una teglia foderata.",
    "Cuoci a 180°.@20",
  ]),
  R("Uova in purgatorio", "15 min", `Uova:4|Passata di pomodoro:300 g|Aglio:1|Peperoncino:q.b.|Basilico:q.b.|${QB}`, [
    "Cuoci la passata con olio, aglio e peperoncino.@6",
    "Rompi le uova nel sugo, copri e cuoci finché l'albume è sodo.@5",
  ]),
  R("Parmigiana di melanzane", "70 min", `Melanzane:2|Passata di pomodoro:400 g|Mozzarella:2|Parmigiano:60 g|Basilico:q.b.|${QB}`, [
    "Taglia le melanzane a fette e grigliale o friggile.@15",
    "In pirofila alterna strati di melanzane, passata condita, mozzarella, parmigiano e basilico.",
    "Cuoci a 180° e lascia riposare prima di servire.@35",
  ]),
  R("Melanzane a funghetto", "25 min", `Melanzane:2|Pomodorini:200 g|Aglio:1|Basilico:q.b.|${QB}`, [
    "Rosola le melanzane a cubetti in olio con l'aglio.@12",
    "Aggiungi i pomodorini e cuoci ancora.@6",
    "Sala e profuma col basilico.",
  ]),
  R("Melanzane grigliate", "20 min", `Melanzane:2|Aglio:1|Prezzemolo:q.b.|Aceto:q.b.|${QB}`, [
    "Taglia le melanzane a fette e grigliale su piastra calda.@10",
    "Condiscile con olio, aglio, prezzemolo, sale e un goccio d'aceto.",
  ]),
  R("Melanzane ripiene", "50 min", `Melanzane:2|Macinato:200 g|Passata di pomodoro:150 g|Parmigiano:30 g|Pangrattato:20 g|${QB}`, [
    "Taglia le melanzane a metà, svuotale e rosola la polpa col macinato.@8",
    "Aggiungi la passata, riempi le barchette e copri con parmigiano e pangrattato.",
    "Cuoci a 180°.@30",
  ]),
  R("Caponata", "45 min", `Melanzane:2|Sedano:2|Cipolla:1|Olive verdi:50 g|Capperi:15 g|Passata di pomodoro:150 g|Aceto:30 ml|Zucchero:10 g|${QB}`, [
    "Friggi le melanzane a cubetti e tienile da parte.@10",
    "Soffriggi cipolla e sedano, aggiungi olive, capperi e passata.@10",
    "Unisci le melanzane, aceto e zucchero e cuoci ancora. Si serve fredda.@8",
  ]),
  R("Peperonata", "35 min", `Peperoni:3|Cipolla:1|Passata di pomodoro:150 g|${QB}`, [
    "Stufa la cipolla affettata in olio.@4",
    "Aggiungi i peperoni a listarelle e la passata, sala.",
    "Cuoci coperto a fuoco basso.@25",
  ]),
  R("Peperoni ripieni", "55 min", `Peperoni:2|Macinato:200 g|Riso:60 g|Parmigiano:30 g|Passata di pomodoro:100 g|${QB}`, [
    "Lessa il riso a metà cottura e mescolalo a macinato, parmigiano, passata e sale.@7",
    "Taglia i peperoni a metà, svuotali e riempili.",
    "Cuoci a 180° con un filo d'olio.@40",
  ]),
  R("Zucchine ripiene", "45 min", `Zucchine:4|Macinato:200 g|Parmigiano:30 g|Uova:1|Pangrattato:20 g|${QB}`, [
    "Taglia le zucchine a metà per il lungo e scavale.",
    "Mescola la polpa tritata con macinato, uovo, parmigiano e sale e riempi le barchette.",
    "Spolvera di pangrattato e cuoci a 180°.@30",
  ]),
  R("Zucchine alla scapece", "25 min", `Zucchine:4|Aglio:1|Menta:q.b.|Aceto:30 ml|${QB}`, [
    "Friggi le zucchine a rondelle finché sono dorate.@10",
    "Condiscile con aceto, aglio a fettine, menta e sale.",
    "Lascia riposare almeno mezz'ora.",
  ]),
  R("Zucchine gratinate", "30 min", `Zucchine:3|Pangrattato:40 g|Parmigiano:30 g|${QB}`, [
    "Taglia le zucchine a rondelle e disponile in teglia.",
    "Copri con pangrattato, parmigiano, olio e sale.",
    "Cuoci a 200° finché sono dorate.@20",
  ]),
  R("Verdure grigliate", "25 min", `Zucchine:2|Melanzane:1|Peperoni:1|Aglio:1|Prezzemolo:q.b.|${QB}`, [
    "Taglia le verdure a fette e grigliale su piastra calda.@12",
    "Condisci con olio, aglio, prezzemolo e sale.",
  ]),
  R("Verdure al forno", "45 min", `Patate:2|Zucchine:1|Peperoni:1|Carote:2|Cipolla:1|Rosmarino:q.b.|${QB}`, [
    "Taglia tutte le verdure a pezzi simili.",
    "Condisci in teglia con olio, sale e rosmarino.",
    "Cuoci a 200° mescolando a metà.@35",
  ]),
  R("Ratatouille", "45 min", `Melanzane:1|Zucchine:2|Peperoni:1|Pomodori:3|Cipolla:1|Aglio:1|${QB}`, [
    "Soffriggi cipolla e aglio.",
    "Aggiungi peperoni e melanzane a cubetti, poi zucchine e pomodori.@10",
    "Sala e cuoci coperto a fuoco basso.@25",
  ]),
  R("Spinaci saltati", "10 min", `Spinaci:400 g|Aglio:1|${QB}`, [
    "Rosola l'aglio in olio.",
    "Aggiungi gli spinaci e saltali finché appassiscono, poi sala.@4",
  ]),
  R("Spinaci al burro e parmigiano", "10 min", `Spinaci:400 g|Burro:25 g|Parmigiano:30 g|Sale:q.b.`, [
    "Lessa gli spinaci e strizzali.@3",
    "Saltali nel burro e completa col parmigiano.@2",
  ]),
  R("Broccoli saltati", "15 min", `Broccoli:400 g|Aglio:1|Peperoncino:q.b.|${QB}`, [
    "Lessa i broccoli a cimette.@5",
    "Saltali in padella con olio, aglio e peperoncino.@4",
  ]),
  R("Cavolfiore gratinato", "40 min", `Cavolfiore:1|Besciamella:300 g|Parmigiano:40 g|Sale:q.b.`, [
    "Lessa il cavolfiore a cimette.@8",
    "Mettilo in pirofila, copri di besciamella e parmigiano.",
    "Gratina a 200°.@20",
  ]),
  R("Fagiolini al pomodoro", "30 min", `Fagiolini:400 g|Passata di pomodoro:200 g|Aglio:1|${QB}`, [
    "Lessa i fagiolini.@8",
    "Cuoci la passata con olio e aglio.@5",
    "Unisci i fagiolini e fai insaporire.@8",
  ]),
  R("Fagiolini in insalata", "15 min", `Fagiolini:400 g|Aglio:1|Limone:0,5|${QB}`, [
    "Lessa i fagiolini e scolali.@10",
    "Condisci con olio, limone, aglio a fettine e sale.",
  ]),
  R("Carote in padella", "20 min", `Carote:5|Burro:20 g|Prezzemolo:q.b.|Sale:q.b.`, [
    "Taglia le carote a rondelle.",
    "Cuocile nel burro con un goccio d'acqua, coperte.@15",
    "Sala e completa col prezzemolo.",
  ]),
  R("Piselli al prosciutto", "20 min", `Piselli:400 g|Prosciutto cotto:80 g|Cipolla:0,5|${QB}`, [
    "Soffriggi la cipolla col prosciutto a dadini.@3",
    "Aggiungi i piselli e mezzo bicchiere d'acqua, sala e cuoci.@12",
  ]),
  R("Funghi trifolati", "15 min", `Funghi:400 g|Aglio:1|Prezzemolo:q.b.|${QB}`, [
    "Affetta i funghi.",
    "Saltali a fuoco vivo con olio e aglio.@8",
    "Sala a fine cottura e aggiungi il prezzemolo.",
  ]),
  R("Finocchi gratinati", "40 min", `Finocchi:2|Besciamella:250 g|Parmigiano:40 g|Sale:q.b.`, [
    "Lessa i finocchi a spicchi.@10",
    "Disponili in pirofila con besciamella e parmigiano.",
    "Gratina a 200°.@20",
  ]),
  R("Carciofi in padella", "25 min", `Carciofi:4|Aglio:1|Prezzemolo:q.b.|Limone:0,5|${QB}`, [
    "Pulisci i carciofi, tagliali a spicchi e mettili in acqua e limone.",
    "Cuocili con olio, aglio e mezzo bicchiere d'acqua, coperti.@15",
    "Sala e completa col prezzemolo.",
  ]),
  R("Asparagi con le uova", "15 min", `Asparagi:400 g|Uova:4|Parmigiano:30 g|Burro:20 g|Sale:q.b.`, [
    "Lessa gli asparagi.@6",
    "Cuoci le uova al tegamino nel burro.@4",
    "Servi le uova sugli asparagi col parmigiano.",
  ]),
  R("Cime di rapa saltate", "20 min", `Cime di rapa:500 g|Aglio:2|Peperoncino:q.b.|${QB}`, [
    "Lessa le cime di rapa.@6",
    "Saltale con olio, aglio e peperoncino.@5",
  ]),
  R("Cicoria ripassata", "20 min", `Cicoria:500 g|Aglio:2|Peperoncino:q.b.|${QB}`, [
    "Lessa la cicoria e strizzala.@8",
    "Ripassala in padella con olio, aglio e peperoncino.@5",
  ]),
  R("Cavolo nero saltato", "20 min", `Cavolo nero:400 g|Aglio:1|${QB}`, [
    "Togli la costa centrale alle foglie e lessale.@8",
    "Saltale con olio e aglio e sala.@4",
  ]),
  R("Verza stufata", "30 min", `Verza:0,5|Cipolla:0,5|Pancetta:50 g|${QB}`, [
    "Soffriggi cipolla e pancetta.@4",
    "Aggiungi la verza a striscioline, sala e cuoci coperta con poca acqua.@20",
  ]),
  R("Zucca al forno", "35 min", `Zucca:600 g|Rosmarino:q.b.|Aglio:1|${QB}`, [
    "Taglia la zucca a spicchi.",
    "Condisci con olio, sale, aglio e rosmarino.",
    "Cuoci a 200°.@25",
  ]),
  R("Patate in padella", "25 min", `Patate:4|Rosmarino:q.b.|Aglio:1|${QB}`, [
    "Taglia le patate a cubetti e asciugale.",
    "Cuocile in olio caldo con aglio e rosmarino, girandole poco, finché sono dorate.@18",
    "Sala alla fine.",
  ]),
  R("Purè di patate", "30 min", `Patate:500 g|Latte:150 ml|Burro:40 g|Parmigiano:20 g|Noce moscata:q.b.|Sale:q.b.`, [
    "Lessa le patate con la buccia, pelale e schiacciale.@25",
    "Rimetti sul fuoco con latte caldo e burro, mescolando.@3",
    "Sala e aggiungi parmigiano e noce moscata.",
  ]),
  R("Gateau di patate", "70 min", `Patate:600 g|Uova:2|Prosciutto cotto:100 g|Mozzarella:1|Parmigiano:50 g|Pangrattato:30 g|Burro:20 g|Sale:q.b.`, [
    "Lessa le patate, schiacciale e mescolale a uova, parmigiano e sale.@25",
    "In una teglia imburrata fai uno strato, farcisci con prosciutto e mozzarella e copri col resto.",
    "Spolvera di pangrattato, aggiungi fiocchetti di burro e cuoci a 180°.@30",
  ]),
  R("Crocchette di patate", "45 min", `Patate:500 g|Uova:2|Parmigiano:40 g|Pangrattato:80 g|Olio di semi:q.b.|Sale:q.b.`, [
    "Lessa le patate, schiacciale e impasta con un uovo, parmigiano e sale.@25",
    "Forma dei cilindri, passali nell'altro uovo sbattuto e nel pangrattato.",
    "Friggi in olio caldo finché sono dorati.@4",
  ]),
  R("Polpette di melanzane", "40 min", `Melanzane:2|Uova:1|Pangrattato:80 g|Parmigiano:40 g|Basilico:q.b.|${QB}`, [
    "Lessa o cuoci in forno le melanzane a cubetti, poi strizzale.@15",
    "Impasta con uovo, pangrattato, parmigiano, basilico e sale e forma le polpette.",
    "Cuoci a 200° con un filo d'olio.@18",
  ]),
  R("Polpette di ceci", "30 min", `Ceci in scatola:240 g|Pangrattato:50 g|Aglio:0,5|Prezzemolo:q.b.|Cumino:1 cucchiaino|${QB}`, [
    "Frulla i ceci scolati con aglio, prezzemolo, cumino e sale.",
    "Aggiungi pangrattato fino a un impasto lavorabile e forma le polpette.",
    "Cuoci in padella con olio o in forno a 200°.@15",
  ]),
  R("Burger di lenticchie", "30 min", `Lenticchie in scatola:240 g|Pangrattato:50 g|Cipolla:0,5|Paprika:1 cucchiaino|${QB}`, [
    "Schiaccia le lenticchie scolate con cipolla tritata, paprika e sale.",
    "Aggiungi pangrattato e forma dei burger.",
    "Cuocili in padella con un filo d'olio.@8",
  ]),
  R("Hummus di ceci", "10 min", `Ceci in scatola:240 g|Limone:1|Aglio:0,5|Semi di sesamo:20 g|${QB}`, [
    "Frulla i ceci con succo di limone, aglio, sesamo, olio e sale.",
    "Aggiungi poca acqua fino a una crema liscia.",
  ]),
  R("Fagioli all'uccelletto", "25 min", `Fagioli cannellini:480 g|Passata di pomodoro:200 g|Aglio:2|Salvia:q.b.|${QB}`, [
    "Rosola aglio e salvia in olio.",
    "Aggiungi la passata e cuoci.@5",
    "Unisci i fagioli scolati, sala e fai insaporire.@12",
  ]),
  R("Lenticchie in umido", "35 min", `Lenticchie:200 g|Carote:1|Sedano:1|Cipolla:0,5|Passata di pomodoro:150 g|${QB}`, [
    "Soffriggi il trito di verdure.@5",
    "Aggiungi lenticchie sciacquate, passata e acqua a coprire.",
    "Cuoci finché sono tenere e il fondo è ristretto, poi sala.@25",
  ]),
  R("Ceci al curry", "20 min", `Ceci in scatola:480 g|Latte di cocco:200 ml|Cipolla:0,5|Curry:2 cucchiaini|Spinaci:100 g|${QB}`, [
    "Soffriggi la cipolla col curry.@3",
    "Aggiungi ceci e latte di cocco e cuoci.@10",
    "Unisci gli spinaci e fai appassire.@2",
  ]),
  R("Tofu saltato con verdure", "20 min", `Tofu:200 g|Zucchine:1|Carote:1|Peperoni:1|Salsa di soia:q.b.|Olio di semi:q.b.`, [
    "Rosola il tofu a cubetti finché è dorato.@5",
    "Aggiungi le verdure a striscioline e salta a fuoco vivo.@6",
    "Condisci con salsa di soia.",
  ]),
  R("Mozzarella in carrozza", "20 min", `Pancarré:4 fette|Mozzarella:1|Uova:2|Latte:50 ml|Pangrattato:60 g|Olio di semi:q.b.`, [
    "Chiudi le fette di mozzarella tra due fette di pane e taglia a triangoli.",
    "Passa nell'uovo sbattuto col latte e nel pangrattato.",
    "Friggi in olio caldo finché è dorata.@4",
  ]),
  R("Torta salata ricotta e spinaci", "50 min", `Pasta sfoglia:1|Ricotta:250 g|Spinaci:300 g|Uova:1|Parmigiano:40 g|Sale:q.b.`, [
    "Lessa gli spinaci, strizzali e tritali.@3",
    "Mescolali a ricotta, uovo, parmigiano e sale e versa nella sfoglia stesa in teglia.",
    "Ripiega i bordi e cuoci a 180°.@35",
  ]),
  R("Torta salata zucchine e formaggio", "50 min", `Pasta sfoglia:1|Zucchine:2|Uova:2|Ricotta:150 g|Parmigiano:30 g|${QB}`, [
    "Salta le zucchine a rondelle in olio.@6",
    "Mescola uova, ricotta, parmigiano e sale, unisci le zucchine e versa nella sfoglia.",
    "Cuoci a 180°.@35",
  ]),
];
