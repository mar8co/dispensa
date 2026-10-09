// Ricettario di base — PRIMI: pasta, riso, gnocchi, cereali.
import { R, QB } from "../ricetta.js";

export default [
  R("Penne all'arrabbiata", "20 min", `Penne:180 g|Passata di pomodoro:300 g|Aglio:2|Peperoncino:q.b.|Prezzemolo:q.b.|${QB}`, [
    "Rosola aglio e peperoncino in olio, aggiungi la passata, sala e cuoci.@10",
    "Lessa le penne al dente.@10",
    "Saltale nel sugo e finisci col prezzemolo tritato.",
  ]),
  R("Bucatini all'amatriciana", "25 min", `Bucatini:180 g|Guanciale:100 g|Pomodori pelati:300 g|Pecorino:40 g|Peperoncino:q.b.|Sale:q.b.`, [
    "Rosola il guanciale a listarelle finché è croccante.@6",
    "Aggiungi i pelati schiacciati e il peperoncino e cuoci il sugo.@10",
    "Lessa i bucatini, saltali nel sugo e completa col pecorino.@9",
  ]),
  R("Pasta alla gricia", "20 min", `Rigatoni:180 g|Guanciale:120 g|Pecorino:50 g|Pepe:q.b.|Sale:q.b.`, [
    "Rosola il guanciale a listarelle nel suo grasso.@6",
    "Lessa i rigatoni e scolali al dente tenendo l'acqua.@11",
    "Saltali col guanciale, poi fuori dal fuoco manteca con pecorino, pepe e poca acqua di cottura.",
  ]),
  R("Cacio e pepe", "15 min", `Spaghetti:180 g|Pecorino:80 g|Pepe:q.b.|Sale:q.b.`, [
    "Lessa gli spaghetti in poca acqua poco salata.@9",
    "Stempera il pecorino grattugiato con un mestolino d'acqua di cottura tiepida fino a una crema.",
    "Scola la pasta, uniscila alla crema fuori dal fuoco con tanto pepe e mescola energicamente.",
  ]),
  R("Pasta alla Norma", "35 min", `Rigatoni:180 g|Melanzane:1|Passata di pomodoro:300 g|Ricotta:60 g|Aglio:1|Basilico:q.b.|${QB}`, [
    "Taglia la melanzana a cubetti e friggila in olio finché è dorata, poi scolala.@8",
    "Cuoci la passata con aglio, sale e basilico.@10",
    "Lessa i rigatoni, condiscili col sugo e le melanzane e completa con la ricotta sbriciolata.@11",
  ]),
  R("Spaghetti alla puttanesca", "20 min", `Spaghetti:180 g|Pomodori pelati:300 g|Olive nere:50 g|Capperi:15 g|Acciughe:3|Aglio:1|Olio EVO:q.b.`, [
    "Sciogli le acciughe in olio con l'aglio, poi unisci olive e capperi.",
    "Aggiungi i pelati schiacciati e cuoci.@10",
    "Lessa gli spaghetti e saltali nel sugo.@9",
  ]),
  R("Spaghetti alle vongole", "25 min", `Spaghetti:180 g|Vongole:500 g|Aglio:2|Prezzemolo:q.b.|Vino bianco:50 ml|Olio EVO:q.b.`, [
    "Fai aprire le vongole in padella coperta con olio, aglio e vino.@4",
    "Lessa gli spaghetti molto al dente.@7",
    "Finisci la cottura nella padella delle vongole col loro liquido e aggiungi il prezzemolo.@2",
  ]),
  R("Pasta al salmone", "20 min", `Farfalle:180 g|Salmone:150 g|Panna da cucina:100 ml|Cipolla:0,5|${QB}|Pepe:q.b.`, [
    "Fai appassire la cipolla tritata in olio e unisci il salmone a cubetti.@4",
    "Aggiungi la panna e scalda un minuto.",
    "Lessa le farfalle, saltale nel condimento e pepa.@11",
  ]),
  R("Pasta con i broccoli", "25 min", `Orecchiette:180 g|Broccoli:300 g|Aglio:2|Acciughe:2|Peperoncino:q.b.|${QB}`, [
    "Lessa i broccoli a cimette nell'acqua della pasta e tirali su col mestolo forato.@6",
    "Rosola aglio, acciughe e peperoncino in olio e schiaccia dentro i broccoli.",
    "Lessa le orecchiette nella stessa acqua e saltale nel condimento.@11",
  ]),
  R("Orecchiette alle cime di rapa", "25 min", `Orecchiette:180 g|Cime di rapa:400 g|Aglio:2|Acciughe:3|Peperoncino:q.b.|${QB}`, [
    "Lessa insieme orecchiette e cime di rapa pulite.@11",
    "Intanto sciogli le acciughe in olio con aglio e peperoncino.",
    "Scola tutto e salta nel soffritto.",
  ]),
  R("Pasta e fagioli", "30 min", `Ditalini:140 g|Fagioli borlotti:240 g|Passata di pomodoro:100 g|Cipolla:0,5|Sedano:1|Carote:1|${QB}`, [
    "Soffriggi cipolla, sedano e carota tritati.@5",
    "Aggiungi i fagioli, la passata e mezzo litro d'acqua; frulla un mestolo di fagioli per addensare.",
    "Porta a bollore, cuoci la pasta nella minestra e lascia riposare.@9",
  ]),
  R("Pasta e lenticchie", "30 min", `Ditalini:140 g|Lenticchie in scatola:240 g|Passata di pomodoro:100 g|Aglio:1|Carote:1|${QB}`, [
    "Rosola aglio e carota a dadini in olio.@4",
    "Unisci lenticchie, passata e mezzo litro d'acqua calda e porta a bollore.",
    "Cuoci la pasta direttamente nella pentola.@9",
  ]),
  R("Pasta e patate", "35 min", `Pasta:140 g|Patate:2|Cipolla:0,5|Passata di pomodoro:50 g|Parmigiano:40 g|${QB}`, [
    "Soffriggi la cipolla, aggiungi le patate a dadini e la passata.@5",
    "Copri d'acqua calda e cuoci finché le patate si disfano.@15",
    "Cuoci la pasta nella pentola e manteca col parmigiano: deve restare cremosa.@9",
  ]),
  R("Pasta al forno", "50 min", `Rigatoni:200 g|Ragù pronto:300 g|Mozzarella:1|Besciamella:200 g|Parmigiano:40 g|Sale:q.b.`, [
    "Lessa i rigatoni molto al dente.@7",
    "Condiscili con ragù, besciamella e mozzarella a cubetti e versali in una pirofila.",
    "Cospargi di parmigiano e inforna a 200° fino alla crosticina.@25",
  ]),
  R("Lasagne al ragù", "60 min", `Lasagne:250 g|Ragù pronto:400 g|Besciamella:400 g|Parmigiano:60 g`, [
    "In una pirofila alterna strati di sfoglia, ragù, besciamella e parmigiano.",
    "Chiudi con besciamella e abbondante parmigiano.",
    "Inforna a 180° e lascia riposare dieci minuti prima di tagliare.@35",
  ]),
  R("Tagliatelle al ragù", "15 min", `Tagliatelle:200 g|Ragù pronto:300 g|Parmigiano:30 g|Sale:q.b.`, [
    "Scalda il ragù in una padella larga.",
    "Lessa le tagliatelle.@4",
    "Saltale nel ragù con un goccio d'acqua di cottura e servi col parmigiano.",
  ]),
  R("Tagliatelle ai funghi", "25 min", `Tagliatelle:200 g|Funghi:300 g|Aglio:1|Prezzemolo:q.b.|Burro:20 g|${QB}`, [
    "Salta i funghi a fette con olio e aglio a fuoco vivo.@8",
    "Lessa le tagliatelle.@4",
    "Uniscile ai funghi col burro e il prezzemolo tritato.",
  ]),
  R("Penne alla boscaiola", "25 min", `Penne:180 g|Funghi:200 g|Pancetta:80 g|Panna da cucina:100 ml|Cipolla:0,5|${QB}`, [
    "Rosola cipolla e pancetta, poi aggiungi i funghi a fette.@8",
    "Versa la panna e fai addensare.@2",
    "Lessa le penne e saltale nel condimento.@10",
  ]),
  R("Penne alla vodka", "20 min", `Penne:180 g|Passata di pomodoro:200 g|Panna da cucina:100 ml|Pancetta:60 g|Vodka:30 ml|${QB}`, [
    "Rosola la pancetta, sfuma con la vodka e lasciala evaporare.",
    "Aggiungi passata e panna e cuoci.@6",
    "Lessa le penne e saltale nella salsa.@10",
  ]),
  R("Pasta panna e prosciutto", "15 min", `Farfalle:180 g|Prosciutto cotto:100 g|Panna da cucina:150 ml|Parmigiano:30 g|Sale:q.b.`, [
    "Scalda la panna col prosciutto a striscioline.@3",
    "Lessa le farfalle.@11",
    "Saltale nella panna e completa col parmigiano.",
  ]),
  R("Pasta ai quattro formaggi", "20 min", `Penne:180 g|Gorgonzola:60 g|Fontina:60 g|Parmigiano:30 g|Mozzarella:1|Latte:100 ml`, [
    "Sciogli i formaggi a pezzetti nel latte a fuoco dolce, mescolando.@5",
    "Lessa le penne.@10",
    "Saltale nella crema di formaggi.",
  ]),
  R("Pasta gorgonzola e noci", "15 min", `Penne:180 g|Gorgonzola:100 g|Noci:40 g|Latte:60 ml|Sale:q.b.`, [
    "Sciogli il gorgonzola nel latte a fuoco basso.@3",
    "Lessa le penne.@10",
    "Condiscile con la crema e le noci spezzettate.",
  ]),
  R("Pasta ricotta e spinaci", "20 min", `Penne:180 g|Ricotta:200 g|Spinaci:200 g|Parmigiano:30 g|Noce moscata:q.b.|Sale:q.b.`, [
    "Lessa gli spinaci nell'acqua della pasta, scolali e tritali.@3",
    "Lavora la ricotta con un mestolo d'acqua di cottura, parmigiano e noce moscata.",
    "Lessa le penne e condiscile con ricotta e spinaci.@10",
  ]),
  R("Pasta ricotta e pomodoro", "15 min", `Fusilli:180 g|Ricotta:150 g|Passata di pomodoro:200 g|Basilico:q.b.|${QB}`, [
    "Scalda la passata con olio e sale.@5",
    "Fuori dal fuoco mescola la ricotta al sugo fino a una crema rosa.",
    "Lessa i fusilli e condiscili col basilico.@10",
  ]),
  R("Pasta alla crudaiola", "15 min", `Fusilli:180 g|Pomodorini:250 g|Mozzarella:1|Basilico:q.b.|Aglio:1|${QB}`, [
    "Condisci in una ciotola pomodorini a pezzi, mozzarella a cubetti, basilico, aglio schiacciato, olio e sale.",
    "Lessa i fusilli.@10",
    "Versali nella ciotola e mescola: il caldo fonde appena la mozzarella.",
  ]),
  R("Pasta alla sorrentina", "30 min", `Penne:180 g|Passata di pomodoro:300 g|Mozzarella:1|Parmigiano:30 g|Basilico:q.b.|${QB}`, [
    "Cuoci la passata con olio, sale e basilico.@8",
    "Lessa le penne al dente e condiscile col sugo e metà mozzarella.@9",
    "Versa in pirofila, copri con mozzarella e parmigiano e gratina in forno a 200°.@10",
  ]),
  R("Pasta ai peperoni", "25 min", `Pasta:180 g|Peperoni:2|Cipolla:0,5|Passata di pomodoro:100 g|${QB}`, [
    "Cuoci i peperoni a listarelle con la cipolla in olio finché sono morbidi.@12",
    "Aggiungi la passata e sala.@3",
    "Lessa la pasta e saltala nel condimento.@10",
  ]),
  R("Pasta con le melanzane", "25 min", `Pasta:180 g|Melanzane:1|Pomodorini:200 g|Aglio:1|Basilico:q.b.|${QB}`, [
    "Rosola la melanzana a cubetti in olio con l'aglio.@8",
    "Unisci i pomodorini a metà e cuoci ancora.@5",
    "Lessa la pasta, saltala nel sugo e profuma col basilico.@10",
  ]),
  R("Pasta zucchine e gamberetti", "20 min", `Linguine:180 g|Zucchine:2|Gamberetti:200 g|Aglio:1|${QB}`, [
    "Salta le zucchine a julienne con olio e aglio.@4",
    "Aggiungi i gamberetti e cuoci due minuti.@2",
    "Lessa le linguine e saltale nel condimento.@9",
  ]),
  R("Pasta con le sarde", "25 min", `Spaghetti:180 g|Sardine:200 g|Finocchi:1|Uvetta:20 g|Pinoli:20 g|Cipolla:0,5|${QB}`, [
    "Soffriggi la cipolla con il finocchio tritato, uvetta e pinoli.@6",
    "Aggiungi le sarde pulite e sfaldale nel soffritto.@5",
    "Lessa gli spaghetti e saltali nel condimento.@9",
  ]),
  R("Pasta tonno e limone", "15 min", `Spaghetti:180 g|Tonno in scatola:160 g|Limone:1|Prezzemolo:q.b.|${QB}`, [
    "Lessa gli spaghetti.@9",
    "In una ciotola mescola tonno sgocciolato, scorza e succo di limone, olio e prezzemolo.",
    "Scola la pasta nella ciotola e mescola con un goccio d'acqua di cottura.",
  ]),
  R("Pasta tonno e olive", "15 min", `Fusilli:180 g|Tonno in scatola:160 g|Olive:50 g|Pomodorini:200 g|${QB}`, [
    "Salta i pomodorini a metà in olio per pochi minuti.@4",
    "Unisci tonno e olive.",
    "Lessa i fusilli e condiscili.@10",
  ]),
  R("Pasta fredda", "20 min", `Fusilli:180 g|Pomodorini:200 g|Mozzarella:1|Tonno in scatola:120 g|Olive:40 g|Basilico:q.b.|${QB}`, [
    "Lessa i fusilli, scolali e raffreddali sotto l'acqua.@10",
    "Condiscili con pomodorini, mozzarella a cubetti, tonno, olive, olio e sale.",
    "Lascia riposare in frigo e profuma col basilico.",
  ]),
  R("Pasta pesto, patate e fagiolini", "25 min", `Trofie:180 g|Pesto:80 g|Patate:1|Fagiolini:100 g|Sale:q.b.`, [
    "Lessa in acqua salata la patata a dadini e i fagiolini a pezzetti.@8",
    "Aggiungi le trofie nella stessa pentola e porta a cottura.@8",
    "Scola e condisci col pesto allungato con poca acqua di cottura.",
  ]),
  R("Pasta al pesto di rucola", "15 min", `Pasta:180 g|Rucola:80 g|Mandorle:30 g|Parmigiano:40 g|Aglio:0,5|${QB}`, [
    "Frulla rucola, mandorle, parmigiano, aglio, olio e sale fino a una crema.",
    "Lessa la pasta.@10",
    "Condiscila col pesto allungato con acqua di cottura.",
  ]),
  R("Pasta con piselli e pancetta", "20 min", `Pasta:180 g|Piselli:200 g|Pancetta:80 g|Cipolla:0,5|Parmigiano:30 g|${QB}`, [
    "Rosola cipolla e pancetta, aggiungi i piselli e un mestolo d'acqua.@8",
    "Lessa la pasta.@10",
    "Saltala coi piselli e completa col parmigiano.",
  ]),
  R("Pasta salsiccia e panna", "20 min", `Penne:180 g|Salsiccia:200 g|Panna da cucina:120 ml|Cipolla:0,5|${QB}`, [
    "Sbriciola la salsiccia e rosolala con la cipolla.@7",
    "Aggiungi la panna e scalda.",
    "Lessa le penne e saltale nel condimento.@10",
  ]),
  R("Pasta salsiccia e broccoli", "25 min", `Orecchiette:180 g|Salsiccia:200 g|Broccoli:300 g|Aglio:1|${QB}`, [
    "Lessa i broccoli a cimette nell'acqua della pasta e tienili da parte.@5",
    "Rosola la salsiccia sbriciolata con l'aglio e unisci i broccoli.@6",
    "Lessa le orecchiette e saltale nel condimento.@11",
  ]),
  R("Pasta zucca e salsiccia", "30 min", `Pasta:180 g|Zucca:300 g|Salsiccia:150 g|Cipolla:0,5|Rosmarino:q.b.|${QB}`, [
    "Cuoci la zucca a dadini con la cipolla e un goccio d'acqua finché si disfa.@12",
    "Rosola a parte la salsiccia sbriciolata col rosmarino e uniscila alla zucca.@6",
    "Lessa la pasta e saltala nel condimento.@10",
  ]),
  R("Pasta con crema di zucchine", "20 min", `Pasta:180 g|Zucchine:3|Parmigiano:40 g|Basilico:q.b.|Aglio:1|${QB}`, [
    "Cuoci le zucchine a rondelle con olio e aglio.@8",
    "Frullane due terzi con parmigiano, basilico e acqua di cottura.",
    "Lessa la pasta e condiscila con la crema e le zucchine rimaste.@10",
  ]),
  R("Pasta ai carciofi", "25 min", `Pasta:180 g|Carciofi:3|Aglio:1|Prezzemolo:q.b.|Parmigiano:30 g|${QB}`, [
    "Pulisci i carciofi, tagliali a spicchi sottili e cuocili con olio, aglio e poca acqua.@12",
    "Lessa la pasta.@10",
    "Saltala coi carciofi, prezzemolo e parmigiano.",
  ]),
  R("Pasta con gli asparagi", "20 min", `Pasta:180 g|Asparagi:300 g|Cipolla:0,5|Parmigiano:30 g|Burro:20 g|${QB}`, [
    "Taglia gli asparagi a rondelle tenendo le punte e cuocili con la cipolla.@8",
    "Lessa la pasta.@10",
    "Saltala con gli asparagi, burro e parmigiano.",
  ]),
  R("Spaghetti al limone", "15 min", `Spaghetti:180 g|Limone:1|Burro:30 g|Parmigiano:40 g|Sale:q.b.`, [
    "Lessa gli spaghetti.@9",
    "Sciogli il burro con scorza e succo di limone.",
    "Salta la pasta nel burro e manteca col parmigiano.",
  ]),
  R("Spaghetti con pomodorini e basilico", "15 min", `Spaghetti:180 g|Pomodorini:300 g|Aglio:1|Basilico:q.b.|${QB}`, [
    "Salta i pomodorini a metà con olio e aglio finché appassiscono.@6",
    "Lessa gli spaghetti.@9",
    "Saltali nel sugo col basilico.",
  ]),
  R("Spaghetti con le cozze", "25 min", `Spaghetti:180 g|Cozze:500 g|Pomodorini:150 g|Aglio:2|Prezzemolo:q.b.|Olio EVO:q.b.`, [
    "Fai aprire le cozze in padella coperta con olio e aglio.@4",
    "Aggiungi i pomodorini a metà e cuoci due minuti.@2",
    "Lessa gli spaghetti al dente e finiscili nella padella col prezzemolo.@8",
  ]),
  R("Linguine ai gamberi", "20 min", `Linguine:180 g|Gamberi:250 g|Pomodorini:150 g|Aglio:1|Prezzemolo:q.b.|${QB}`, [
    "Rosola l'aglio, aggiungi i pomodorini e poi i gamberi sgusciati.@5",
    "Lessa le linguine.@9",
    "Saltale nel sugo col prezzemolo.",
  ]),
  R("Spaghetti allo scoglio", "30 min", `Spaghetti:180 g|Cozze:300 g|Vongole:300 g|Gamberi:150 g|Pomodorini:150 g|Aglio:2|Olio EVO:q.b.`, [
    "Fai aprire cozze e vongole con olio e aglio, a padella coperta.@4",
    "Aggiungi pomodorini e gamberi e cuoci ancora.@4",
    "Lessa gli spaghetti al dente e finiscili nel sugo.@8",
  ]),
  R("Gnocchi al pomodoro", "15 min", `Gnocchi:400 g|Passata di pomodoro:300 g|Basilico:q.b.|Parmigiano:30 g|${QB}`, [
    "Cuoci la passata con olio, sale e basilico.@8",
    "Lessa gli gnocchi: sono pronti quando salgono a galla.@2",
    "Condiscili col sugo e il parmigiano.",
  ]),
  R("Gnocchi alla sorrentina", "25 min", `Gnocchi:400 g|Passata di pomodoro:300 g|Mozzarella:1|Parmigiano:30 g|Basilico:q.b.|${QB}`, [
    "Cuoci la passata con olio, sale e basilico.@8",
    "Lessa gli gnocchi e condiscili col sugo e la mozzarella a cubetti.@2",
    "Passa in pirofila col parmigiano e gratina a 200°.@10",
  ]),
  R("Gnocchi burro e salvia", "10 min", `Gnocchi:400 g|Burro:50 g|Salvia:q.b.|Parmigiano:40 g|Sale:q.b.`, [
    "Sciogli il burro con le foglie di salvia finché è nocciola.@3",
    "Lessa gli gnocchi finché salgono a galla.@2",
    "Saltali nel burro e completa col parmigiano.",
  ]),
  R("Gnocchi al gorgonzola", "12 min", `Gnocchi:400 g|Gorgonzola:120 g|Latte:80 ml|Noci:20 g|Sale:q.b.`, [
    "Sciogli il gorgonzola nel latte a fuoco dolce.@3",
    "Lessa gli gnocchi finché salgono a galla.@2",
    "Condiscili con la crema e le noci.",
  ]),
  R("Tortellini in brodo", "10 min", `Tortellini:250 g|Brodo:1 l|Parmigiano:30 g`, [
    "Porta a bollore il brodo.",
    "Cuoci i tortellini nel brodo.@4",
    "Servi con parmigiano grattugiato.",
  ]),
  R("Tortellini panna e prosciutto", "12 min", `Tortellini:250 g|Panna da cucina:150 ml|Prosciutto cotto:80 g|Parmigiano:30 g|Sale:q.b.`, [
    "Scalda la panna col prosciutto a striscioline.@3",
    "Lessa i tortellini.@4",
    "Saltali nella panna col parmigiano.",
  ]),
  R("Ravioli burro e salvia", "10 min", `Ravioli:250 g|Burro:40 g|Salvia:q.b.|Parmigiano:30 g|Sale:q.b.`, [
    "Sciogli il burro con la salvia.@2",
    "Lessa i ravioli.@4",
    "Condiscili col burro e il parmigiano.",
  ]),
  R("Risotto ai funghi", "30 min", `Riso per risotto:160 g|Funghi:250 g|Brodo:700 ml|Cipolla:0,5|Parmigiano:40 g|Burro:20 g|${QB}`, [
    "Soffriggi la cipolla, aggiungi i funghi a fette e cuoci.@5",
    "Tosta il riso e portalo a cottura col brodo caldo, un mestolo alla volta.@16",
    "Manteca con burro e parmigiano.",
  ]),
  R("Risotto allo zafferano", "30 min", `Riso per risotto:160 g|Zafferano:1 bustina|Brodo:700 ml|Cipolla:0,5|Burro:30 g|Parmigiano:40 g|Sale:q.b.`, [
    "Soffriggi la cipolla in metà burro e tosta il riso.",
    "Cuoci col brodo caldo e a metà cottura unisci lo zafferano sciolto in un mestolo di brodo.@16",
    "Manteca col resto del burro e il parmigiano.",
  ]),
  R("Risotto alla zucca", "35 min", `Riso per risotto:160 g|Zucca:300 g|Brodo:700 ml|Cipolla:0,5|Parmigiano:40 g|Burro:20 g|${QB}`, [
    "Soffriggi la cipolla e cuoci la zucca a dadini finché è morbida.@10",
    "Unisci il riso, tostalo e cuoci col brodo.@16",
    "Manteca con burro e parmigiano.",
  ]),
  R("Risotto agli asparagi", "30 min", `Riso per risotto:160 g|Asparagi:300 g|Brodo:700 ml|Cipolla:0,5|Parmigiano:40 g|Burro:20 g|${QB}`, [
    "Soffriggi la cipolla coi gambi degli asparagi a rondelle.@4",
    "Tosta il riso e cuoci col brodo, aggiungendo le punte a metà cottura.@16",
    "Manteca con burro e parmigiano.",
  ]),
  R("Risotto al pomodoro", "30 min", `Riso per risotto:160 g|Passata di pomodoro:250 g|Brodo:500 ml|Cipolla:0,5|Parmigiano:40 g|Basilico:q.b.|${QB}`, [
    "Soffriggi la cipolla, tosta il riso e aggiungi la passata.",
    "Porta a cottura col brodo caldo.@16",
    "Manteca col parmigiano e profuma col basilico.",
  ]),
  R("Risotto con salsiccia", "30 min", `Riso per risotto:160 g|Salsiccia:200 g|Brodo:700 ml|Cipolla:0,5|Vino rosso:50 ml|Parmigiano:40 g|${QB}`, [
    "Rosola la salsiccia sbriciolata con la cipolla.@5",
    "Tosta il riso, sfuma col vino e cuoci col brodo.@16",
    "Manteca col parmigiano.",
  ]),
  R("Risotto ai gamberi e zucchine", "30 min", `Riso per risotto:160 g|Gamberi:200 g|Zucchine:1|Brodo:700 ml|Cipolla:0,5|${QB}`, [
    "Soffriggi la cipolla con la zucchina a dadini.@4",
    "Tosta il riso e cuoci col brodo.@14",
    "Aggiungi i gamberi sgusciati negli ultimi minuti e manteca con un filo d'olio.@3",
  ]),
  R("Risotto al radicchio", "30 min", `Riso per risotto:160 g|Radicchio:1|Brodo:700 ml|Cipolla:0,5|Vino rosso:50 ml|Parmigiano:40 g|Burro:20 g|${QB}`, [
    "Soffriggi la cipolla e fai appassire il radicchio a striscioline.@4",
    "Tosta il riso, sfuma col vino e cuoci col brodo.@16",
    "Manteca con burro e parmigiano.",
  ]),
  R("Risotto ai carciofi", "35 min", `Riso per risotto:160 g|Carciofi:3|Brodo:700 ml|Aglio:1|Parmigiano:40 g|Prezzemolo:q.b.|${QB}`, [
    "Cuoci i carciofi a spicchi sottili con olio e aglio.@8",
    "Unisci il riso, tostalo e cuoci col brodo.@16",
    "Manteca col parmigiano e il prezzemolo.",
  ]),
  R("Riso al pomodoro", "20 min", `Riso:160 g|Passata di pomodoro:300 g|Cipolla:0,5|Parmigiano:30 g|${QB}`, [
    "Cuoci la passata con la cipolla tritata, olio e sale.@8",
    "Lessa il riso in acqua salata e scolalo.@14",
    "Condiscilo col sugo e il parmigiano.",
  ]),
  R("Riso alla cantonese", "25 min", `Riso basmati:160 g|Uova:2|Piselli:100 g|Prosciutto cotto:80 g|Salsa di soia:q.b.|Olio di semi:q.b.`, [
    "Lessa il riso, scolalo e lascialo asciugare.@10",
    "Strapazza le uova in padella e tienile da parte; salta piselli e prosciutto a dadini.@4",
    "Unisci riso e uova, salta a fuoco vivo e condisci con salsa di soia.@3",
  ]),
  R("Riso basmati con verdure", "25 min", `Riso basmati:160 g|Zucchine:1|Carote:1|Peperoni:1|Salsa di soia:q.b.|Olio di semi:q.b.`, [
    "Lessa il riso e scolalo.@10",
    "Salta le verdure a striscioline a fuoco vivo: devono restare croccanti.@6",
    "Unisci il riso e condisci con salsa di soia.",
  ]),
  R("Orzotto alle verdure", "40 min", `Orzo perlato:160 g|Zucchine:1|Carote:1|Brodo:700 ml|Cipolla:0,5|Parmigiano:30 g|${QB}`, [
    "Soffriggi la cipolla con le verdure a dadini.@5",
    "Tosta l'orzo e cuocilo col brodo come un risotto.@30",
    "Manteca col parmigiano.",
  ]),
  R("Insalata di farro", "30 min", `Farro:160 g|Pomodorini:200 g|Mozzarella:1|Olive:40 g|Basilico:q.b.|${QB}`, [
    "Lessa il farro, scolalo e raffreddalo.@25",
    "Condiscilo con pomodorini, mozzarella a cubetti, olive, olio e sale.",
    "Profuma col basilico e lascia insaporire.",
  ]),
  R("Polenta con sugo di salsiccia", "40 min", `Polenta:200 g|Salsiccia:250 g|Passata di pomodoro:300 g|Cipolla:0,5|${QB}`, [
    "Rosola la salsiccia a pezzi con la cipolla, aggiungi la passata e cuoci.@20",
    "Versa la farina di polenta a pioggia in un litro d'acqua bollente salata e mescola fino a cottura.@10",
    "Servi la polenta morbida col sugo sopra.",
  ]),
  R("Polenta ai formaggi", "20 min", `Polenta:200 g|Fontina:100 g|Burro:30 g|Parmigiano:40 g|Sale:q.b.`, [
    "Cuoci la polenta in un litro d'acqua bollente salata, mescolando.@10",
    "A fuoco spento incorpora fontina a cubetti, burro e parmigiano.",
  ]),
  R("Cous cous con ceci e verdure", "20 min", `Cous cous:160 g|Ceci in scatola:240 g|Zucchine:1|Carote:1|Curry:q.b.|${QB}`, [
    "Salta zucchina e carota a dadini con olio e curry, poi unisci i ceci.@8",
    "Versa sul cous cous pari peso d'acqua bollente salata, copri e fai gonfiare.@5",
    "Sgrana e mescola alle verdure.",
  ]),
  R("Quinoa con verdure", "25 min", `Quinoa:160 g|Zucchine:1|Peperoni:1|Pomodorini:150 g|Limone:0,5|${QB}`, [
    "Sciacqua la quinoa e lessala nel doppio del suo volume d'acqua.@15",
    "Salta le verdure a dadini in olio.@6",
    "Mescola tutto e condisci con olio e limone.",
  ]),
];
