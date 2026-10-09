// Ricettario di BASE incluso nell'app: piatti di casa semplici, scritti a mano,
// nello stesso formato delle ricette generate ({ title, servings, time,
// ingredients:[{name, qty}], steps:[{text, timer}] }). Servono a "Puoi farle
// adesso" (RecipesTab): proposte calcolate sul dispositivo confrontando gli
// ingredienti con la dispensa — niente AI, niente rete, niente richieste.
// Dosi per 2 porzioni; olio/sale/pepe e spezie sono "q.b." (non contano tra
// gli ingredienti mancanti). Per aggiungerne una: una riga R(...) in più.
//
// Forma compatta: R(titolo, tempo, "Nome:dose|Nome:dose", ["passaggio@minuti"]).
function R(title, time, ingredients, steps) {
  return {
    title, time, servings: 2,
    ingredients: ingredients.split("|").map((s) => {
      const i = s.lastIndexOf(":");
      return { name: s.slice(0, i), qty: s.slice(i + 1) };
    }),
    steps: steps.map((s) => {
      const [text, timer] = s.split("@");
      return { text, timer: timer ? Number(timer) : null };
    }),
  };
}

const QB = "Olio EVO:q.b.|Sale:q.b.";

export default [
  R("Spaghetti al pomodoro", "20 min", `Spaghetti:180 g|Passata di pomodoro:300 g|Aglio:1|Basilico:q.b.|${QB}`, [
    "Scalda un filo d'olio con l'aglio schiacciato, versa la passata, sala e fai restringere a fuoco basso.@10",
    "Cuoci gli spaghetti in acqua bollente salata e scolali al dente.@9",
    "Salta la pasta nel sugo per un minuto, togli l'aglio e profuma col basilico.",
  ]),
  R("Pasta aglio, olio e peperoncino", "15 min", `Spaghetti:180 g|Aglio:2|Peperoncino:q.b.|Prezzemolo:q.b.|${QB}`, [
    "Cuoci gli spaghetti in acqua salata.@9",
    "Intanto scalda abbondante olio con l'aglio a fettine e il peperoncino, a fuoco dolce, senza farlo scurire.",
    "Scola la pasta tenendo un po' d'acqua di cottura, saltala nell'olio e finisci col prezzemolo tritato.",
  ]),
  R("Pasta al tonno", "15 min", `Penne:180 g|Tonno in scatola:160 g|Passata di pomodoro:200 g|Aglio:1|${QB}`, [
    "Rosola l'aglio in un filo d'olio, aggiungi la passata e cuoci qualche minuto.@6",
    "Cuoci le penne in acqua salata.@10",
    "Unisci al sugo il tonno sgocciolato, poi la pasta scolata, e mescola bene.",
  ]),
  R("Pasta con le zucchine", "20 min", `Pasta:180 g|Zucchine:2|Parmigiano:30 g|Aglio:1|${QB}|Pepe:q.b.`, [
    "Taglia le zucchine a rondelle sottili e saltale in padella con olio e aglio finché sono dorate.@8",
    "Cuoci la pasta in acqua salata.@10",
    "Scolala nelle zucchine con un mestolino d'acqua di cottura, manteca col parmigiano e una macinata di pepe.",
  ]),
  R("Pasta e ceci", "25 min", `Pasta:140 g|Ceci:240 g|Passata di pomodoro:100 g|Aglio:1|Rosmarino:q.b.|${QB}`, [
    "Rosola l'aglio col rosmarino in un filo d'olio, aggiungi i ceci scolati e la passata.@5",
    "Copri con mezzo litro d'acqua calda, sala e porta a bollore.",
    "Versa la pasta e cuocila direttamente nella pentola, mescolando: deve restare cremosa.@10",
  ]),
  R("Pasta al pesto", "15 min", `Pasta:180 g|Pesto:80 g|Parmigiano:20 g|Sale:q.b.`, [
    "Cuoci la pasta in acqua salata.@10",
    "Scolala tenendo due cucchiai d'acqua di cottura.",
    "Fuori dal fuoco condiscila col pesto allungato con l'acqua tenuta da parte e completa col parmigiano.",
  ]),
  R("Carbonara", "20 min", `Spaghetti:180 g|Guanciale:100 g|Uova:2|Pecorino:40 g|Pepe:q.b.|Sale:q.b.`, [
    "Rosola il guanciale a listarelle in padella senza olio, finché è croccante.@6",
    "Sbatti le uova col pecorino e tanto pepe. Cuoci gli spaghetti.@9",
    "Scola la pasta nel guanciale a fuoco spento, versa le uova e mescola veloce con poca acqua di cottura: deve fare la crema, non la frittata.",
  ]),
  R("Risotto alla parmigiana", "30 min", `Riso:160 g|Brodo:700 ml|Parmigiano:50 g|Burro:30 g|Cipolla:0,5|Sale:q.b.`, [
    "Fai appassire la cipolla tritata in metà del burro, poi tosta il riso un minuto.",
    "Aggiungi il brodo caldo un mestolo alla volta, mescolando, fino a cottura.@16",
    "Spegni, manteca col resto del burro e il parmigiano e lascia riposare un paio di minuti.@2",
  ]),
  R("Risotto alle zucchine", "30 min", `Riso:160 g|Zucchine:2|Brodo:700 ml|Parmigiano:40 g|Cipolla:0,5|${QB}`, [
    "Rosola la cipolla tritata in un filo d'olio, aggiungi le zucchine a dadini e cuoci qualche minuto.@5",
    "Unisci il riso, tostalo, poi porta a cottura col brodo caldo aggiunto poco alla volta.@16",
    "Manteca col parmigiano fuori dal fuoco.",
  ]),
  R("Riso e piselli", "25 min", `Riso:160 g|Piselli:200 g|Brodo:600 ml|Cipolla:0,5|Parmigiano:30 g|${QB}`, [
    "Fai appassire la cipolla in un filo d'olio, aggiungi i piselli e un mestolo di brodo.@5",
    "Versa il riso e cuocilo aggiungendo il brodo man mano: deve restare morbido, quasi una minestra densa.@15",
    "Completa col parmigiano.",
  ]),
  R("Frittata di zucchine", "20 min", `Uova:4|Zucchine:2|Parmigiano:30 g|${QB}|Pepe:q.b.`, [
    "Taglia le zucchine a rondelle e cuocile in padella con un filo d'olio.@8",
    "Sbatti le uova con parmigiano, sale e pepe e versale sulle zucchine.",
    "Cuoci a fuoco basso col coperchio, poi gira la frittata e finisci l'altro lato.@6",
  ]),
  R("Frittata di patate", "30 min", `Uova:4|Patate:2|Cipolla:0,5|${QB}`, [
    "Taglia le patate a fettine sottili e cuocile in padella con olio e cipolla finché sono tenere.@15",
    "Versa sopra le uova sbattute col sale.",
    "Cuoci coperto a fuoco basso, gira e completa la cottura.@6",
  ]),
  R("Uova al pomodoro", "15 min", `Uova:4|Passata di pomodoro:300 g|Aglio:1|Pane:2 fette|${QB}`, [
    "Scalda la passata con olio, aglio e sale e falla restringere.@6",
    "Rompi le uova nel sugo, copri e cuoci finché l'albume è rappreso.@5",
    "Servi col pane tostato per fare la scarpetta.",
  ]),
  R("Petto di pollo al limone", "20 min", `Petto di pollo:300 g|Limone:1|Farina:20 g|${QB}|Pepe:q.b.`, [
    "Infarina leggermente le fettine di pollo.",
    "Rosolale in padella con un filo d'olio, due minuti per lato, poi sala.@4",
    "Versa il succo del limone e fai addensare il fondo girando la carne.@3",
  ]),
  R("Pollo e patate al forno", "50 min", `Cosce di pollo:4|Patate:3|Rosmarino:q.b.|Aglio:2|${QB}|Pepe:q.b.`, [
    "Taglia le patate a spicchi e mettile in teglia col pollo, aglio, rosmarino, olio, sale e pepe.",
    "Inforna a 200° girando a metà cottura, finché pollo e patate sono dorati.@45",
  ]),
  R("Straccetti di pollo con zucchine", "20 min", `Petto di pollo:300 g|Zucchine:2|Aglio:1|${QB}|Pepe:q.b.`, [
    "Taglia il pollo a striscioline e le zucchine a mezzelune.",
    "Salta le zucchine in padella con olio e aglio.@5",
    "Aggiungi il pollo, sala, pepa e cuoci a fuoco vivo finché è dorato.@6",
  ]),
  R("Polpette al sugo", "35 min", `Macinato:300 g|Uova:1|Pangrattato:40 g|Parmigiano:30 g|Passata di pomodoro:400 g|${QB}`, [
    "Impasta macinato, uovo, pangrattato, parmigiano e sale; forma delle polpette grandi come una noce.",
    "Rosolale in padella con un filo d'olio da tutti i lati.@5",
    "Aggiungi la passata, copri e cuoci a fuoco basso.@20",
  ]),
  R("Hamburger in padella con insalata", "15 min", `Hamburger:2|Insalata:100 g|Pomodori:2|${QB}`, [
    "Cuoci gli hamburger in padella ben calda, tre-quattro minuti per lato.@8",
    "Condisci insalata e pomodori a spicchi con olio e sale e servili accanto.",
  ]),
  R("Salmone in padella", "15 min", `Salmone:300 g|Limone:1|${QB}|Pepe:q.b.`, [
    "Asciuga i tranci di salmone e salali.",
    "Cuocili in padella calda con un filo d'olio dalla parte della pelle, poi girali.@8",
    "Servi con succo di limone e pepe.",
  ]),
  R("Merluzzo al pomodoro", "20 min", `Merluzzo:300 g|Passata di pomodoro:250 g|Olive:40 g|Aglio:1|${QB}`, [
    "Scalda la passata con olio, aglio e olive.@5",
    "Adagia i filetti di merluzzo nel sugo, sala, copri e cuoci a fuoco dolce.@10",
  ]),
  R("Insalata di riso", "25 min", `Riso:160 g|Tonno in scatola:120 g|Piselli:100 g|Olive:40 g|Pomodorini:150 g|${QB}`, [
    "Lessa il riso in acqua salata, scolalo e raffreddalo sotto l'acqua.@14",
    "Lessa i piselli per qualche minuto.@4",
    "Mescola tutto con tonno, olive e pomodorini tagliati, condisci con olio e sale e lascia riposare in frigo.",
  ]),
  R("Insalata di ceci e tonno", "10 min", `Ceci:240 g|Tonno in scatola:120 g|Pomodorini:150 g|Cipolla rossa:0,5|${QB}`, [
    "Scola e sciacqua i ceci.",
    "Uniscili al tonno, ai pomodorini a metà e alla cipolla affettata sottile.",
    "Condisci con olio e sale e mescola.",
  ]),
  R("Caprese", "5 min", `Mozzarella:2|Pomodori:3|Basilico:q.b.|${QB}`, [
    "Taglia a fette pomodori e mozzarella e alternali nel piatto.",
    "Condisci con olio, sale e foglie di basilico.",
  ]),
  R("Cous cous con verdure", "20 min", `Cous cous:160 g|Zucchine:1|Peperoni:1|Carote:1|${QB}`, [
    "Taglia le verdure a dadini e saltale in padella con un filo d'olio: devono restare croccanti.@8",
    "Versa sul cous cous pari peso di acqua bollente salata, copri e lascia gonfiare.@5",
    "Sgrana con una forchetta e mescola con le verdure.",
  ]),
  R("Minestra di lenticchie", "35 min", `Lenticchie:200 g|Carote:1|Sedano:1|Cipolla:0,5|Passata di pomodoro:100 g|${QB}`, [
    "Trita carota, sedano e cipolla e falli appassire in un filo d'olio.@5",
    "Aggiungi le lenticchie sciacquate, la passata e acqua fino a coprire di due dita.",
    "Cuoci a fuoco basso finché sono tenere, poi sala.@25",
  ]),
  R("Vellutata di zucca", "30 min", `Zucca:500 g|Patate:1|Cipolla:0,5|Brodo:500 ml|${QB}|Pepe:q.b.`, [
    "Rosola la cipolla in un filo d'olio, aggiungi zucca e patata a pezzi.",
    "Copri col brodo e cuoci finché tutto è morbido.@20",
    "Frulla fino a ottenere una crema, regola di sale e servi con olio a crudo e pepe.",
  ]),
  R("Zucchine trifolate", "15 min", `Zucchine:3|Aglio:1|Prezzemolo:q.b.|${QB}`, [
    "Taglia le zucchine a rondelle.",
    "Cuocile in padella con olio e aglio a fuoco vivo, mescolando.@10",
    "Sala a fine cottura e aggiungi il prezzemolo tritato.",
  ]),
  R("Patate al forno", "45 min", `Patate:4|Rosmarino:q.b.|Aglio:2|${QB}`, [
    "Taglia le patate a spicchi, asciugale e condiscile in teglia con olio, sale, aglio e rosmarino.",
    "Cuoci a 200° girandole un paio di volte, finché sono dorate.@40",
  ]),
  R("Bruschette al pomodoro", "10 min", `Pane:4 fette|Pomodori:3|Aglio:1|Basilico:q.b.|${QB}`, [
    "Tosta il pane e strofinalo con l'aglio.",
    "Taglia i pomodori a dadini e condiscili con olio, sale e basilico.",
    "Distribuiscili sul pane e servi subito.",
  ]),
  R("Piadina prosciutto e mozzarella", "10 min", `Piadina:2|Prosciutto cotto:100 g|Mozzarella:1|Rucola:q.b.`, [
    "Scalda la piadina in padella un minuto per lato.@2",
    "Farciscila con prosciutto, mozzarella a fette e rucola, piegala e rimettila sul fuoco finché il formaggio fila.@2",
  ]),
  R("Yogurt con frutta e miele", "5 min", `Yogurt:250 g|Banane:1|Miele:20 g|Noci:20 g`, [
    "Taglia la banana a rondelle.",
    "Dividi lo yogurt in due ciotole, aggiungi la frutta, le noci spezzettate e un filo di miele.",
  ]),
  R("Pancake", "20 min", `Farina:150 g|Latte:200 ml|Uova:1|Zucchero:20 g|Lievito per dolci:8 g|Burro:10 g`, [
    "Mescola farina, zucchero e lievito; unisci l'uovo sbattuto col latte fino a una pastella liscia.",
    "Scalda una padella con poco burro e versa un mestolino di pastella per volta.",
    "Gira quando in superficie compaiono le bollicine e cuoci l'altro lato.@2",
  ]),
];
