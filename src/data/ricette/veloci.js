// Ricettario di base — PIATTI VELOCI, PANINI, COLAZIONE, DOLCI.
import { R, QB } from "../ricetta.js";

export default [
  R("Toast prosciutto e formaggio", "6 min", `Pancarré:4 fette|Prosciutto cotto:60 g|Emmental:60 g`, [
    "Farcisci due fette di pane con prosciutto e formaggio e chiudi con le altre.",
    "Tosta in padella o nel tostapane finché il formaggio fonde.@4",
  ]),
  R("Panino con frittata", "12 min", `Panini:2|Uova:3|Parmigiano:20 g|${QB}`, [
    "Sbatti le uova con parmigiano e sale e cuoci una frittata sottile.@6",
    "Dividila in due e farcisci i panini.",
  ]),
  R("Piadina crudo, rucola e stracchino", "8 min", `Piadina:2|Prosciutto crudo:80 g|Stracchino:100 g|Rucola:30 g`, [
    "Scalda le piadine in padella.@2",
    "Spalma lo stracchino, aggiungi prosciutto e rucola e piega.",
  ]),
  R("Piadina tonno e pomodoro", "8 min", `Piadina:2|Tonno in scatola:120 g|Pomodori:1|Insalata:40 g|Maionese:30 g`, [
    "Scalda le piadine in padella.@2",
    "Farcisci con maionese, tonno, pomodoro a fette e insalata.",
  ]),
  R("Tortillas con pollo e verdure", "20 min", `Tortillas:4|Petto di pollo:250 g|Peperoni:1|Cipolla:0,5|Paprika:1 cucchiaino|${QB}`, [
    "Salta pollo a striscioline, peperone e cipolla con olio, sale e paprika.@8",
    "Scalda le tortillas in padella.@1",
    "Farciscile e arrotola.",
  ]),
  R("Pizza in padella", "25 min", `Farina:200 g|Lievito per dolci:6 g|Passata di pomodoro:150 g|Mozzarella:1|Origano:q.b.|${QB}`, [
    "Impasta farina, lievito, sale, un cucchiaio d'olio e circa 110 ml d'acqua; stendi in due dischi.",
    "Cuoci un disco in padella calda, giralo e condisci con passata, mozzarella e origano.@3",
    "Copri e cuoci finché la mozzarella è fusa.@4",
  ]),
  R("Pizzette di pancarré", "15 min", `Pancarré:4 fette|Passata di pomodoro:100 g|Mozzarella:1|Origano:q.b.|${QB}`, [
    "Condisci la passata con olio, sale e origano e spalmala sul pane.",
    "Aggiungi la mozzarella a dadini.",
    "Cuoci in forno a 200°.@8",
  ]),
  R("Crostoni con funghi", "15 min", `Pane:4 fette|Funghi:250 g|Aglio:1|Prezzemolo:q.b.|${QB}`, [
    "Salta i funghi a fette con olio e aglio.@8",
    "Tosta il pane.",
    "Distribuisci i funghi sul pane col prezzemolo.",
  ]),
  R("Bruschette con ricotta e pomodorini", "10 min", `Pane:4 fette|Ricotta:150 g|Pomodorini:150 g|Basilico:q.b.|${QB}`, [
    "Tosta il pane.",
    "Spalma la ricotta e aggiungi i pomodorini conditi con olio, sale e basilico.",
  ]),
  R("Avocado toast con uovo", "10 min", `Pane:2 fette|Avocado:1|Uova:2|Limone:0,5|${QB}`, [
    "Tosta il pane e spalmaci l'avocado schiacciato con limone e sale.",
    "Cuoci le uova al tegamino e appoggiale sopra.@4",
  ]),
  R("Mozzarella e pomodorini al forno", "15 min", `Mozzarella:2|Pomodorini:200 g|Origano:q.b.|Pane:2 fette|${QB}`, [
    "Metti in una pirofila pomodorini a metà e mozzarella a fette, con olio, sale e origano.",
    "Cuoci a 200° finché la mozzarella fonde.@10",
    "Servi col pane.",
  ]),
  R("Porridge di avena", "8 min", `Fiocchi di avena:80 g|Latte:300 ml|Miele:20 g|Banane:1`, [
    "Cuoci i fiocchi nel latte mescolando, finché si addensa.@5",
    "Servi con miele e banana a rondelle.",
  ]),
  R("French toast", "12 min", `Pancarré:4 fette|Uova:2|Latte:100 ml|Burro:20 g|Zucchero:15 g|Cannella:q.b.`, [
    "Sbatti uova, latte, zucchero e cannella e bagna le fette di pane.",
    "Cuocile nel burro, due minuti per lato.@4",
  ]),
  R("Crêpes", "25 min", `Farina:125 g|Latte:250 ml|Uova:2|Burro:20 g|Sale:q.b.`, [
    "Mescola farina, uova e latte fino a una pastella liscia e lascia riposare.@10",
    "Versa un mestolino in padella unta di burro e cuoci un minuto per lato.@2",
    "Farcisci a piacere, dolce o salato.",
  ]),
  R("Macedonia", "10 min", `Mele:1|Banane:1|Arance:1|Kiwi:1|Limone:0,5|Zucchero:15 g`, [
    "Taglia tutta la frutta a pezzetti.",
    "Condisci con succo di limone e zucchero e lascia riposare in frigo.",
  ]),
  R("Mele cotte alla cannella", "20 min", `Mele:3|Zucchero di canna:20 g|Cannella:q.b.|Limone:0,5`, [
    "Taglia le mele a spicchi.",
    "Cuocile in pentolino con zucchero, cannella, limone e poca acqua.@15",
  ]),
  R("Banana bread", "65 min", `Banane:3|Farina:200 g|Zucchero:100 g|Uova:2|Burro:80 g|Lievito per dolci:8 g`, [
    "Schiaccia le banane e mescolale a uova, zucchero e burro fuso.",
    "Aggiungi farina e lievito e versa in uno stampo da plumcake.",
    "Cuoci a 180°.@50",
  ]),
  R("Torta allo yogurt", "50 min", `Yogurt:125 g|Farina:250 g|Zucchero:150 g|Uova:3|Olio di semi:100 ml|Lievito per dolci:16 g`, [
    "Monta uova e zucchero, poi aggiungi yogurt e olio.",
    "Incorpora farina e lievito e versa in una tortiera.",
    "Cuoci a 180°.@35",
  ]),
  R("Torta di mele", "60 min", `Mele:3|Farina:250 g|Zucchero:150 g|Uova:3|Burro:100 g|Latte:100 ml|Lievito per dolci:16 g`, [
    "Monta uova e zucchero, aggiungi burro fuso e latte.",
    "Incorpora farina e lievito e due mele a cubetti; decora con la terza a fette.",
    "Cuoci a 180°.@45",
  ]),
  R("Ciambellone", "55 min", `Farina:300 g|Zucchero:180 g|Uova:3|Latte:150 ml|Olio di semi:100 ml|Lievito per dolci:16 g|Limone:1`, [
    "Monta uova e zucchero, poi aggiungi olio, latte e scorza di limone.",
    "Incorpora farina e lievito e versa nello stampo a ciambella.",
    "Cuoci a 180°.@40",
  ]),
  R("Muffin al cioccolato", "35 min", `Farina:200 g|Zucchero:120 g|Cacao amaro:30 g|Uova:2|Latte:150 ml|Olio di semi:80 ml|Lievito per dolci:10 g|Cioccolato fondente:80 g`, [
    "Mescola farina, zucchero, cacao e lievito; a parte uova, latte e olio.",
    "Unisci i due composti senza lavorare troppo e aggiungi il cioccolato a pezzetti.",
    "Riempi i pirottini e cuoci a 180°.@20",
  ]),
  R("Biscotti al burro", "35 min", `Farina:250 g|Burro:125 g|Zucchero:100 g|Uova:1|Sale:q.b.`, [
    "Impasta velocemente tutti gli ingredienti e fai riposare in frigo.@15",
    "Stendi la pasta e ritaglia i biscotti.",
    "Cuoci a 180° finché i bordi sono dorati.@12",
  ]),
  R("Tiramisù", "25 min", `Savoiardi:200 g|Mascarpone:250 g|Uova:3|Zucchero:80 g|Caffè:200 ml|Cacao amaro:q.b.`, [
    "Monta i tuorli con lo zucchero, unisci il mascarpone e poi gli albumi a neve.",
    "Alterna strati di savoiardi bagnati nel caffè e crema.",
    "Spolvera di cacao e fai riposare in frigo almeno tre ore.",
  ]),
  R("Panna cotta", "15 min", `Panna fresca:400 ml|Zucchero:60 g|Gelatina:6 g|Vaniglia:q.b.`, [
    "Ammolla la gelatina in acqua fredda.",
    "Scalda panna, zucchero e vaniglia senza far bollire e scioglici la gelatina strizzata.@5",
    "Versa negli stampini e fai rassodare in frigo almeno quattro ore.",
  ]),
  R("Budino al cioccolato", "15 min", `Latte:500 ml|Cacao amaro:40 g|Zucchero:80 g|Farina:40 g|Burro:20 g`, [
    "Mescola a freddo cacao, zucchero e farina e stempera col latte.",
    "Cuoci mescolando finché si addensa, poi aggiungi il burro.@8",
    "Versa negli stampini e fai raffreddare in frigo.",
  ]),
  R("Salame di cioccolato", "20 min", `Biscotti secchi:200 g|Cioccolato fondente:150 g|Burro:80 g|Zucchero:50 g|Cacao amaro:20 g`, [
    "Sciogli cioccolato e burro e mescola con zucchero e cacao.",
    "Unisci i biscotti spezzettati e forma un salame nella carta forno.",
    "Fai rassodare in frigo almeno tre ore.",
  ]),
  R("Yogurt con muesli e frutta", "5 min", `Yogurt greco:300 g|Muesli:60 g|Fragole:150 g|Miele:15 g`, [
    "Dividi lo yogurt in due ciotole.",
    "Aggiungi muesli, fragole a pezzi e miele.",
  ]),
];
