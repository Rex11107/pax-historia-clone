# Verdetto della corte: eventi storici e guerre coloniali

13 novembre 2026. Nessuna modifica al repository. Gli atti completi sono in `claude/corte/`: dossier, due arringhe, accusa, quattro pareri.

## 1. Il mandato

Il giocatore chiede due cose.
- La storia alternativa deve preservare una parte della storia reale. Un evento che cambia o manca **perché qualcuno ha agito** va bene. Un evento che non avviene, o avviene quasi dieci anni dopo **senza causa**, è un difetto del motore.
- Le guerre coloniali devono essere un tipo a sé, più permissive per chi colonizza, senza le doppie e triple guerre che nella storia furono una sola campagna di pochi mesi.

## 2. La corte

| ruolo | tesi o punto di vista |
|---|---|
| Avvocato A | **Ancore storiche**: schede con data, finestra, precondizioni e pressione crescente; alla scadenza l'evento avviene, salvo che una causa lo abbia rotto |
| Avvocato B | **Agenda emergente**: nessun copione; ogni potenza segue un'agenda storica con urgenza crescente e una scala offerta → pressione → ultimatum → guerra |
| Accusa | Difetti di entrambe, verificati sul codice, e una sintesi |
| Giurato 1 | Storico del 1870-1914 |
| Giurato 2 | Progettista di giochi di grande strategia |
| Giurato 3 | Ingegnere del motore, con misure eseguite sul codice |
| Giurato 4 | Giocatore esperto, per conto di chi ha posto il mandato |

## 3. La scoperta principale: la diagnosi era sbagliata

Gli avvocati e il dossier credevano che i ritardi venissero da dadi troppo bassi e da rifiuti diplomatici. L'accusa ha trovato le cause vere e l'ingegnere le ha confermate eseguendo il codice.

1. **Una guerra coloniale ferma tutta la politica coloniale** (`colonial.ts`, riga 533). La Francia, in guerra col Uassulu, resta ferma 84 settimane su 104 del 1881-82. Tunisi aspetta perché la Francia è impegnata in Africa occidentale, non perché il bey rifiuti.
2. **Dopo un dado di guerra fallito, l'interesse si spegne per un anno** (riga 565). Succede in 3 semi su 4.
3. **Il protettorato per trattato non passa mai.** `evaluate` dà 23 su 30, e per l'AI non esiste nemmeno un rifiuto: l'azione viene scartata prima (riga 551). La "paura dei vicini" che dovrebbe spingere il bey viene dall'esercito del suo stesso signore ottomano (`fearOf`). In 4 semi su 4 Tunisi passa solo con la guerra, come vassallo, oppure non passa.
4. **L'Egitto può saltare per sempre.** Se il Regno Unito è in guerra il giorno della tappa, Tel el-Kebir non avviene più (`weeklyEgypt`).
5. **La Guerra del Pacifico si chiude il primo giorno**: l'età si conta dal 1879 (`startDay -637`).
6. **Errori nei dati**: il Bogos era egiziano fino al 1884 e passò all'Etiopia col trattato Hewett; nei testi ci sono il mito di Berlino che "riconosce" lo Stato libero, date sbagliate su Cheren e Bissandugu, e Kong da trattare come Stato a sé.

Conseguenza: buona parte del problema R3 si risolve con poche correzioni mirate, prima di qualsiasi sistema nuovo.

## 4. Voti (1-10)

| giurato | proposta | R1 storia | R2 cause | R3 ritardi | R4 guerra coloniale | R5 ripetizioni |
|---|---|---|---|---|---|---|
| storico | A | 8 | 6 | 6 | 7 | 7 |
| storico | B | 5 | 7 | 5 | 7 | 4 |
| storico | **sintesi** | 7 | 8 | 7 | 8 | 8 |
| progettista | A | 8 | 7 | 5 | 7 | 7 |
| progettista | B | 4 | 7 | 5 | 6 | 4 |
| progettista | **sintesi** | 7 | 8 | 7 | 8 | 8 |
| ingegnere | A | 6 | 6 | 4 | 5 | 7 |
| ingegnere | B | 3 | 6 | 5 | 4 | 3 |
| ingegnere | **sintesi** | 7 | 7 | 7 | 7 | 8 |
| giocatore | A | 8 | 6 | 4 | 7 | 7 |
| giocatore | B | 4 | 7 | 6 | 8 | 4 |
| giocatore | **sintesi** | 8 | 8 | 8 | 7 | 8 |

Medie della sintesi: R1 7,3; R2 7,8; R3 7,3; R4 7,5; R5 8,0. Nessun giurato accetta A o B da soli.

- **A** preserva la storia e ricorda le guerre per coppia di nazioni. Lascia però intatto il generatore dei ritardi, impone gli esiti alla scadenza (binario) e impoverisce il mondo dopo una divergenza.
- **B** toglie il blocco "in guerra non si fa nulla" e dà un'agenda anche agli attori africani. Però un'urgenza senza tetto porta ogni agenda alla conquista: Tunisi italiana senza che nessuno l'abbia scelto, l'Etiopia attaccata ogni tre anni. La memoria per interesse non ferma le ripetizioni.

## 5. Il verdetto

La corte adotta **la sintesi: un motore emergente con poche scadenze di verifica e una guerra coloniale a fasi.**

### Principi vincolanti
1. **Un'ancora decide l'azione, mai l'esito.** Alla scadenza, se non c'è una causa di partita, l'attore agisce: offre il trattato, lancia l'ultimatum, apre la campagna. Le province si muovono solo se il trattato è accettato o la campagna è vinta.
   - Con il giocatore come attore, l'ancora diventa una decisione con pressione politica se la ignora.
   - Con il giocatore come bersaglio, riceve l'ultimatum e può resistere.
2. **Un ritardo vale solo se ha una causa di partita**, scritta e visibile. Sono cause: una guerra europea dell'attore, la garanzia di una grande potenza, il bersaglio già preso da altri, una sconfitta militare. Non sono cause "in guerra coloniale altrove" né "slot occupato".
3. **Ancore solo per i fatti quasi certi.** Lo storico ne indica otto: Tunisi 1881-82; fine della prima guerra boera 1881; Egitto 1882 ±1 anno; liquidazione egiziana del Sudan 1883-85; Ancón e la tregua boliviana 1883-84; un regolamento internazionale su Congo e coste 1884-86; riconquista del Sudan entro il 1900; fine di Samori entro il 1898-1900. Tutto il resto resta emergente:
   - probabili: colonie tedesche, Harar, Massaua, Dahomey, Madagascar, Rhodesia, Zanzibar-Helgoland, Rabih;
   - contingenti: Uccialli, Adua, Fascioda, le date delle battaglie.
4. **Urgenza con tetto e decadimento**, solo per gli obiettivi storici (stadi 1 e 2). Una via impraticabile si raffredda; non preme all'infinito.
5. **La guerra coloniale è una campagna**:
   - ha un obiettivo limitato, conta solo l'obiettivo, e la vittoria lo concede tutto, protettorato compreso;
   - una vittoria non finisce mai "senza condizioni";
   - ha un tetto di durata, stanchezza ridotta per il colonizzatore e poca indignazione dei terzi;
   - le perdite per malattia superano quelle in battaglia, e i combattimenti nell'interno si fanno nella stagione secca.
6. **Memoria per coppia di nazioni, con fasi.** Si torna a combattere lo stesso avversario solo dopo un trattato limitato, una tregua di anni e con un obiettivo nuovo, oppure dopo una rivolta. Mai dopo una vittoria completa. È il caso di Samori: più campagne, ognuna di pochi mesi, ognuna con un trattato che cede qualcosa.
7. **Mai campagne contro Stati europei**, Belgio compreso. **Garanti e alleanze non si sospendono.**
8. **Ogni attore locale ha una posizione verso le potenze**: Rabih ostile alla Francia, Lozi verso Londra, Aro ostili. Così i protettorati impossibili non avvengono.
9. **Il colonizzato ha un gioco suo**: resistere fino a una data, logorare il colonizzatore, appellarsi a una potenza. Nei protettorati la resistenza continua (Sfax e Kairouan 1881).
10. **Dati corretti e validati prima del codice.** Un test verifica che ogni nome di provincia e ogni sigla esistano sulla mappa.
11. **Testo storico solo se il fatto avviene in quella forma**, ed entro circa 30 giorni dalla data vera.
12. **Un solo interruttore di partita**: storica, plausibile o libera, che estende la modalità coloniale "storico/libero" che esiste già.

### Piano (una PR per passo; il motivo e la misura di ciascuno)

| # | passo | rischio | misura |
|---|---|---|---|
| 0 | Tabella dei traguardi in `scripts/sim/storia.mts`: data di ogni ancora, per seme, con la causa | nullo | linea di base (oggi Tunisi per trattato: 0 semi su 4) |
| 1 | Generatore dei ritardi: una guerra coloniale non blocca la diplomazia verso altri bersagli; niente spegnimento di un anno se una via esiste; urgenza deterministica con tetto al posto del dado dentro la finestra; `fearOf` senza il proprio signore; tappe egiziane che aspettano invece di saltare | basso, circa 40 righe | Tunisi entro il 1882 in almeno 18 semi su 20 |
| 2 | Guerra del Pacifico: età contata dal 1881 | minimo | aperta il 1° gennaio 1882, chiusa con Ancón |
| 3 | Dati corretti, test dei nomi, posizione degli attori locali | basso | Rabih, Lozi e Aro mai protettorati impossibili |
| 4 | Guerra coloniale come campagna, con fronte per coppia | medio, circa 250 righe | 0 vittorie senza condizioni; 0 fasi ripetute (5 semi × 19 anni, fuori dalla CI) |
| 5 | Scadenze di verifica (3-5 ancore: Bardo, Tel el-Kebir, Ancón, Samori), con cause registrate | medio | distribuzione delle date; nessun ritardo senza causa di partita |
| 6 | Interfaccia: "Agenda e fronti" (intenzioni dei rivali in fasce, cause in linguaggio di gioco), ultimatum al giocatore, interruttore storica/plausibile/libera | medio, solo interfaccia | prova a mano |

I passi 1-3 costano meno di 150 righe e colpiscono le cause misurate. Il 4 risolve R4 e R5. Il 5 e il 6 servono a rendere tutto visibile e a chiudere i buchi che la misura del passo 1 lascerà.

### Fuori da questo verdetto
- Lo Stato di Leopoldo modellato come Belgio è un falso strutturale; servirebbe un attore distinto.
- Le compagnie (Goldie, Rhodes, Peters) non esistono.
- Le guerre fra Stati e le casse che esplodono restano questioni a parte.

## 6. Fonti della ricerca

- [Victoria 3, colonizzazione (PCGamesN)](https://www.pcgamesn.com/victoria-3/colonies), [tensione e rivolte native (AltChar)](https://www.altchar.com/game-news/tension-mechanic-will-cause-colonies-to-rebel-in-victoria-3-amaky5E0uuGr), [istituzione coloniale e malaria (TheGamer)](https://www.thegamer.com/victoria-3-colonization-malaria-colonial-affairs/)
- [Victoria 3, Journal Entries (AltChar)](https://www.altchar.com/game-news/vic-3-journal-entry-mechanic-will-add-replace-the-usual-event-pop-ups-aXjGR7X4I17i)
- [Victoria 2, sistema delle crisi (FandomSpot)](https://www.fandomspot.com/vic2-crisis-system/), [intervista su Heart of Darkness (PC Gamer)](https://www.pcgamer.com/victoria-ii-heart-of-darkness-interview/)
- [Kreminski e Wardrip-Fruin, Sketching a Map of the Storylets Design Space](https://mkremins.github.io/publications/Storylets_SketchingAMap.pdf)
- [French conquest of Tunisia](https://en.wikipedia.org/wiki/French_conquest_of_Tunisia), [Mandingo Wars](https://en.wikipedia.org/wiki/Mandingo_Wars), [Second Franco-Dahomean War](https://en.wikipedia.org/wiki/Second_Franco-Dahomean_War), [Battle of Kousséri](https://en.wikipedia.org/wiki/Battle_of_Kouss%C3%A9ri)
- [Wesseling, Colonial Wars and Armed Peace 1870-1914 (Itinerario)](https://www.cambridge.org/core/journals/itinerario/article/colonial-wars-and-armed-peace-18701914-a-reconnaissance/76D655A5ACC5887E39F1937CB6B1A37A), [Divide and Rule](https://en.wikipedia.org/wiki/Divide_and_Rule:_The_Partition_of_Africa,_1880%E2%80%931914)
- Critiche dei giocatori ai mission tree e ai focus tree e diari Paradox, citati dal progettista: [mission/focus tree e agency](https://admin-forum.paradoxplaza.com/forum/threads/please-dont-have-mission-trees-focus-trees-in-the-game-they-reduce-player-agency-and-are-detached-from-internal-game-systems.1651018/page-2), [railroading delle missioni](https://forum.paradoxplaza.com/forum/threads/the-railroading-in-the-missions-is-really-stupid-and-very-limiting.1393257/), [Victoria 3, dev diary 31](https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-31-journal-entries.1508059/post-28039462)
