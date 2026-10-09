// Ricettario di base — ZUPPE, MINESTRE, INSALATE.
import { R, QB } from "../ricetta.js";

export default [
  R("Minestrone", "50 min", `Patate:1|Carote:2|Zucchine:1|Sedano:1|Cipolla:1|Fagioli borlotti:240 g|Passata di pomodoro:50 g|${QB}`, [
    "Taglia tutte le verdure a dadini e soffriggi la cipolla.",
    "Aggiungi le verdure, la passata e un litro d'acqua, sala.",
    "Cuoci a fuoco basso, unendo i fagioli negli ultimi dieci minuti.@40",
  ]),
  R("Passato di verdure", "40 min", `Patate:2|Carote:2|Zucchine:2|Cipolla:0,5|Parmigiano:20 g|${QB}`, [
    "Lessa le verdure a pezzi in acqua salata.@25",
    "Frulla tutto con parte dell'acqua di cottura.",
    "Servi con olio a crudo e parmigiano.",
  ]),
  R("Vellutata di carote", "30 min", `Carote:500 g|Patate:1|Cipolla:0,5|Brodo:600 ml|${QB}`, [
    "Soffriggi la cipolla, aggiungi carote e patata a pezzi.",
    "Copri col brodo e cuoci.@20",
    "Frulla e regola di sale.",
  ]),
  R("Vellutata di zucchine", "25 min", `Zucchine:500 g|Patate:1|Cipolla:0,5|Brodo:500 ml|Parmigiano:20 g|${QB}`, [
    "Soffriggi la cipolla, aggiungi zucchine e patata a pezzi.",
    "Copri col brodo e cuoci.@15",
    "Frulla e completa col parmigiano.",
  ]),
  R("Vellutata di patate e porri", "35 min", `Patate:3|Porri:2|Brodo:700 ml|Burro:20 g|Sale:q.b.`, [
    "Stufa i porri a rondelle nel burro.@5",
    "Aggiungi le patate a cubetti e il brodo e cuoci.@20",
    "Frulla fino a una crema.",
  ]),
  R("Vellutata di broccoli", "30 min", `Broccoli:500 g|Patate:1|Cipolla:0,5|Brodo:600 ml|${QB}`, [
    "Soffriggi la cipolla, aggiungi broccoli e patata.",
    "Copri col brodo e cuoci.@18",
    "Frulla e servi con olio a crudo.",
  ]),
  R("Vellutata di piselli", "20 min", `Piselli:400 g|Cipolla:0,5|Brodo:500 ml|Menta:q.b.|${QB}`, [
    "Soffriggi la cipolla e aggiungi i piselli.",
    "Copri col brodo e cuoci.@10",
    "Frulla con qualche foglia di menta.",
  ]),
  R("Vellutata di cavolfiore", "30 min", `Cavolfiore:1|Patate:1|Cipolla:0,5|Brodo:700 ml|${QB}`, [
    "Soffriggi la cipolla, aggiungi cavolfiore a cimette e patata.",
    "Copri col brodo e cuoci.@20",
    "Frulla e regola di sale.",
  ]),
  R("Crema di funghi", "30 min", `Funghi:400 g|Patate:1|Cipolla:0,5|Brodo:500 ml|Panna da cucina:50 ml|${QB}`, [
    "Soffriggi la cipolla coi funghi a fette.@8",
    "Aggiungi la patata e il brodo e cuoci.@15",
    "Frulla e completa con la panna.",
  ]),
  R("Crema di pomodoro", "25 min", `Pomodori pelati:500 g|Cipolla:0,5|Brodo:300 ml|Basilico:q.b.|Pane:2 fette|${QB}`, [
    "Soffriggi la cipolla, aggiungi pelati e brodo e cuoci.@15",
    "Frulla col basilico.",
    "Servi coi crostini di pane tostato.",
  ]),
  R("Zuppa di ceci", "30 min", `Ceci in scatola:480 g|Passata di pomodoro:100 g|Aglio:1|Rosmarino:q.b.|Pane:2 fette|${QB}`, [
    "Rosola aglio e rosmarino, aggiungi ceci, passata e mezzo litro d'acqua.",
    "Cuoci e frulla un terzo dei ceci per addensare.@20",
    "Servi col pane tostato.",
  ]),
  R("Zuppa di fagioli", "35 min", `Fagioli cannellini:480 g|Carote:1|Sedano:1|Cipolla:0,5|Passata di pomodoro:100 g|${QB}`, [
    "Soffriggi il trito di verdure.@5",
    "Aggiungi fagioli, passata e mezzo litro d'acqua.",
    "Cuoci a fuoco basso e sala.@25",
  ]),
  R("Zuppa di farro e fagioli", "45 min", `Farro:120 g|Fagioli borlotti:240 g|Carote:1|Sedano:1|Cipolla:0,5|Passata di pomodoro:100 g|${QB}`, [
    "Soffriggi il trito di verdure.@5",
    "Aggiungi fagioli, passata, farro e un litro d'acqua.",
    "Cuoci finché il farro è tenero.@30",
  ]),
  R("Zuppa di cipolle", "45 min", `Cipolle:4|Brodo:700 ml|Farina:15 g|Burro:30 g|Pane:2 fette|Emmental:60 g`, [
    "Stufa le cipolle affettate nel burro finché sono dorate.@20",
    "Aggiungi la farina, poi il brodo e cuoci.@15",
    "Servi con pane tostato e formaggio gratinato sopra.",
  ]),
  R("Zuppa di legumi", "40 min", `Ceci in scatola:240 g|Lenticchie in scatola:240 g|Fagioli in scatola:240 g|Carote:1|Cipolla:0,5|Passata di pomodoro:100 g|${QB}`, [
    "Soffriggi cipolla e carota tritate.@5",
    "Aggiungi i legumi scolati, la passata e mezzo litro d'acqua.",
    "Cuoci a fuoco basso.@25",
  ]),
  R("Ribollita", "60 min", `Cavolo nero:300 g|Fagioli cannellini:240 g|Patate:1|Carote:1|Cipolla:1|Pane:4 fette|Passata di pomodoro:50 g|${QB}`, [
    "Soffriggi cipolla e carota, aggiungi patata, cavolo nero e passata.",
    "Copri d'acqua, cuoci e unisci i fagioli.@40",
    "Aggiungi il pane raffermo a pezzi e fai ribollire.@10",
  ]),
  R("Pappa al pomodoro", "35 min", `Pane:200 g|Passata di pomodoro:500 g|Aglio:2|Basilico:q.b.|Brodo:300 ml|${QB}`, [
    "Rosola l'aglio in olio e aggiungi la passata.@8",
    "Unisci il pane raffermo a pezzi e il brodo.",
    "Cuoci mescolando finché il pane si disfa; servi con olio e basilico.@15",
  ]),
  R("Stracciatella in brodo", "10 min", `Brodo:1 l|Uova:2|Parmigiano:40 g|Noce moscata:q.b.`, [
    "Porta a bollore il brodo.",
    "Sbatti le uova con parmigiano e noce moscata.",
    "Versale nel brodo mescolando con una frusta e cuoci un minuto.@1",
  ]),
  R("Pastina in brodo", "10 min", `Pastina:120 g|Brodo:1 l|Parmigiano:30 g`, [
    "Porta a bollore il brodo.",
    "Cuoci la pastina.@6",
    "Servi col parmigiano.",
  ]),
  R("Brodo di pollo", "90 min", `Cosce di pollo:2|Carote:2|Sedano:1|Cipolla:1|Sale:q.b.`, [
    "Metti tutto in pentola con due litri d'acqua fredda.",
    "Porta a bollore, schiuma e cuoci a fuoco bassissimo.@80",
    "Filtra e sala.",
  ]),
  R("Insalata greca", "10 min", `Pomodori:3|Cetrioli:1|Feta:150 g|Olive nere:50 g|Cipolla rossa:0,5|Origano:q.b.|${QB}`, [
    "Taglia pomodori e cetriolo a pezzi e la cipolla a fettine.",
    "Aggiungi feta a cubetti e olive.",
    "Condisci con olio, sale e origano.",
  ]),
  R("Insalata di pollo", "20 min", `Petto di pollo:250 g|Insalata:100 g|Pomodorini:150 g|Mais:80 g|Limone:0,5|${QB}`, [
    "Cuoci il pollo alla piastra e taglialo a striscioline.@8",
    "Uniscilo a insalata, pomodorini e mais.",
    "Condisci con olio, limone e sale.",
  ]),
  R("Caesar salad", "20 min", `Petto di pollo:250 g|Lattuga:1|Pane:2 fette|Parmigiano:30 g|Maionese:40 g|Limone:0,5|Olio EVO:q.b.`, [
    "Cuoci il pollo alla piastra e affettalo.@8",
    "Tosta il pane a cubetti in padella con un filo d'olio.@3",
    "Condisci la lattuga con maionese allungata col limone, aggiungi pollo, crostini e scaglie di parmigiano.",
  ]),
  R("Insalata nizzarda", "20 min", `Tonno in scatola:160 g|Uova:2|Fagiolini:150 g|Patate:1|Pomodori:2|Olive nere:40 g|${QB}`, [
    "Lessa patata, fagiolini e uova sode.@12",
    "Taglia tutto a pezzi e unisci pomodori, tonno e olive.",
    "Condisci con olio e sale.",
  ]),
  R("Insalata di tonno e fagioli", "5 min", `Tonno in scatola:160 g|Fagioli cannellini:240 g|Cipolla rossa:0,5|Prezzemolo:q.b.|${QB}`, [
    "Scola fagioli e tonno.",
    "Mescola con cipolla affettata, prezzemolo, olio e sale.",
  ]),
  R("Insalata di patate", "25 min", `Patate:4|Cipolla rossa:0,5|Prezzemolo:q.b.|Aceto:q.b.|${QB}`, [
    "Lessa le patate, pelale e tagliale a pezzi.@20",
    "Condisci ancora tiepide con olio, aceto, sale, cipolla e prezzemolo.",
  ]),
  R("Insalata di patate e tonno", "25 min", `Patate:3|Tonno in scatola:160 g|Olive:40 g|Capperi:10 g|${QB}`, [
    "Lessa le patate e tagliale a cubetti.@20",
    "Unisci tonno, olive e capperi e condisci con olio e sale.",
  ]),
  R("Insalata di finocchi e arance", "10 min", `Finocchi:2|Arance:2|Olive nere:30 g|${QB}`, [
    "Affetta sottile il finocchio e pela a vivo le arance.",
    "Unisci le olive e condisci con olio e sale.",
  ]),
  R("Insalata di pomodori e cipolla", "5 min", `Pomodori:4|Cipolla rossa:0,5|Origano:q.b.|Basilico:q.b.|${QB}`, [
    "Taglia i pomodori a spicchi e la cipolla a fettine.",
    "Condisci con olio, sale, origano e basilico.",
  ]),
  R("Panzanella", "15 min", `Pane:200 g|Pomodori:3|Cetrioli:1|Cipolla rossa:0,5|Basilico:q.b.|Aceto:q.b.|${QB}`, [
    "Bagna il pane raffermo, strizzalo e sbriciolalo.",
    "Aggiungi pomodori, cetriolo e cipolla a pezzi.",
    "Condisci con olio, aceto, sale e basilico e lascia riposare in frigo.",
  ]),
  R("Insalata di ceci e feta", "10 min", `Ceci in scatola:240 g|Feta:120 g|Pomodorini:150 g|Cetrioli:1|Limone:0,5|${QB}`, [
    "Scola i ceci.",
    "Unisci feta a cubetti, pomodorini e cetriolo a pezzi.",
    "Condisci con olio, limone e sale.",
  ]),
  R("Insalata di lenticchie", "10 min", `Lenticchie in scatola:240 g|Pomodorini:150 g|Cipolla rossa:0,5|Prezzemolo:q.b.|Limone:0,5|${QB}`, [
    "Scola e sciacqua le lenticchie.",
    "Unisci pomodorini, cipolla e prezzemolo.",
    "Condisci con olio, limone e sale.",
  ]),
  R("Insalata di quinoa e avocado", "25 min", `Quinoa:120 g|Avocado:1|Pomodorini:150 g|Mais:80 g|Lime:1|${QB}`, [
    "Lessa la quinoa e lasciala raffreddare.@15",
    "Unisci avocado a cubetti, pomodorini e mais.",
    "Condisci con olio, lime e sale.",
  ]),
  R("Insalata di pasta al pesto", "20 min", `Fusilli:180 g|Pesto:60 g|Pomodorini:150 g|Mozzarella:1|Sale:q.b.`, [
    "Lessa i fusilli, scolali e raffreddali.@10",
    "Condiscili col pesto.",
    "Aggiungi pomodorini e mozzarella a cubetti.",
  ]),
  R("Insalata di cous cous", "15 min", `Cous cous:160 g|Pomodorini:150 g|Cetrioli:1|Menta:q.b.|Limone:1|${QB}`, [
    "Versa sul cous cous pari peso d'acqua bollente salata, copri e fai gonfiare.@5",
    "Sgrana e fai raffreddare.",
    "Aggiungi pomodorini e cetriolo a dadini, menta, olio e limone.",
  ]),
  R("Insalata di spinacini, pere e noci", "5 min", `Spinaci:100 g|Pere:1|Noci:30 g|Parmigiano:30 g|Aceto balsamico:q.b.|${QB}`, [
    "Affetta la pera.",
    "Uniscila a spinacini, noci e scaglie di parmigiano.",
    "Condisci con olio, sale e aceto balsamico.",
  ]),
];
