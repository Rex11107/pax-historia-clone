# Giurato 1 — lo storico (1870-1914)

Ho letto dossier, arringhe e accusa, e ho controllato `src/scenario/colonial1881.ts` e `src/engine/colonial.ts`. Verifiche storiche da letteratura consolidata (Wesseling, Pakenham, Person su Samori, Rubenson sull'Etiopia, Förster-Mommsen-Robinson su Berlino).

## 1. Come funzionò davvero l'imperialismo 1881-1900

Nessuno dei due modelli è sbagliato da solo. La spartizione fu **struttura più contingenza**, in quest'ordine.

- **Pressioni strutturali.** La rivalità anglo-francese dopo l'Egitto (1882), la politica di Bismarck nel 1884-85, la paura di essere esclusi ("prelazione") e la superiorità tecnica e logistica europea (chinino, fucili a retrocarica, cannoniere, poi le Maxim). Queste forze rendono quasi certi alcuni esiti *di massima*: la costa africana spartita entro il 1890, l'interno entro il 1900. Le date e i confini precisi non sono certi.
- **Decisioni contingenti di pochi uomini.** Ferry su Tunisi, Gladstone riluttante sull'Egitto, Bismarck che nel 1884 cambia idea, Crispi, Leopoldo. Erano spesso reazioni a crisi locali: i Krumiri, Urabi, i debiti, i mercanti.
- **Il "man on the spot".** Militari e compagnie agivano prima di Parigi o Londra: Archinard nel Sudan, Goldie con la Royal Niger Company (carta del 1886), Rhodes con la BSAC (1889), Peters con la DOAG (1885), Leopoldo con l'*Association internationale*. Molte guerre nacquero da iniziative periferiche che la metropoli poi ratificò. Il gioco non ha le compagnie, e "Belgio" al posto dello Stato di Leopoldo è un falso strutturale: la guerra del Congo la fece la Force Publique di un sovrano privato, non il Belgio. Lo segnalo come debito di modello.
- **Trattati con capi locali.** Erano migliaia, spesso fraintesi o estorti (i trattati di Brazza col Makoko, quelli di Nachtigal, la concessione Rudd). Servivano soprattutto **contro le altre potenze europee**, non contro gli africani. Il protettorato per trattato è quindi la via *normale* della prima fase: la guerra arriva dopo, quando il trattato viene interpretato come sovranità.
- **Le resistenze.** Erano attori con agende proprie, non bersagli passivi. Menelik si espande per conto suo (Harar 1887, il sud e l'ovest negli anni '90) e compra armi dall'Italia e dalla Francia. Samori tratta, si ritira verso est e ricostruisce lo Stato. Behanzin combatte due guerre. Rabih è un conquistatore in proprio. Il Mahdi distrugge lo Stato egiziano. Un modello che dà agenda solo agli europei è storicamente monco: qui B ha ragione.

**Conclusione.** Serve l'agenda emergente di B come *motore* e le scadenze di A come *contrappeso* per i pochi fatti strutturalmente sovradeterminati. È la sintesi dell'accusa, con le correzioni che pongo sotto.

## 2. Quali eventi meritano un'ancora

**A. Quasi certi entro la finestra** (con le condizioni del 1881, ci vuole un intervento per impedirli):
1. Protettorato francese su Tunisi, 1881-82. Fu un'occupazione preventiva contro l'Italia, con via libera di Bismarck e Salisbury dal Congresso di Berlino del 1878.
2. Fine della prima guerra boera (Majuba, convenzione di Pretoria, agosto 1881). È già in corso allo start (`setup.ts`, situazione `boer`), e Londra non voleva una guerra lunga.
3. Occupazione britannica dell'Egitto, 1882 ±1 anno. Il Controllo duale, la Nota congiunta e il ritiro francese ne facevano l'esito naturale. La data di Tel el-Kebir no.
4. Vittoria del Mahdi sullo Stato egiziano e liquidazione del Sudan (1883-85). Hicks e Gordon sono contingenti nei dettagli, l'evacuazione egiziana no.
5. Fine della Guerra del Pacifico a favore del Cile, 1883-84: Ancón più la tregua con la Bolivia, che sono **due** atti separati.
6. Un regolamento internazionale sul Congo e sulla costa, 1884-86. Che si tenga a Berlino è probabile, non certo.
7. Riconquista anglo-egiziana del Sudan entro il 1900, se l'Egitto è britannico.
8. Fine dello Stato di Samori entro il 1898-1900, se la Francia tiene il Sudan occidentale.

**B. Probabili** (servono per la storia "riconoscibile", ma devono poter mancare):
- colonie tedesche del 1884-85 (Togo, Camerun, Sud-Ovest, Africa orientale). Dipendono dalla svolta di Bismarck, quindi sono strutturali quanto al "se", contingenti quanto al "quando";
- Harar a Menelik (1887);
- Italia a Massaua (1885), che richiede l'assenso di Londra;
- Dahomey francese (1892-94);
- Madagascar francese (protettorato 1885, annessione 1896);
- Rhodesia della BSAC (1890-93);
- ultimatum britannico al Portogallo (1890);
- Zanzibar britannico in cambio di Helgoland (1890);
- caduta di Rabih (1900).

**C. Contingenti** (nessuna ancora: deve deciderlo la partita):
Uccialli e i suoi confini (dipende dalla morte di Giovanni IV a Metemma), Dogali, Adua e il suo esito, Fascioda (la crisi è probabile, il cedimento francese no, se cambiano i rapporti di forza), la guerra sino-francese, il trattato di Bissandugu, Mappa rosa contro Rhodes, Lado, i protettorati italiani in Somalia, ogni singola data di battaglia.

Regola che propongo: **le ancore garantiscono un esito di massima e una finestra, mai una battaglia o un testo storico preciso.**

## 3. Le guerre coloniali, modellate fedelmente

- **Stagioni.** Nel Sudan occidentale si combatteva nella stagione secca, novembre-maggio (le colonne di Borgnis-Desbordes, Archinard e Humbert). Le pause estive spiegano da sole perché la "guerra a Samori" si presenta come una serie di campagne. Propongo un modificatore stagionale per regione (pioggia: movimento lento, malattia raddoppiata) invece di regole sulle ripetizioni.
- **La malattia uccide più del nemico.** In Madagascar nel 1895 i francesi ebbero circa 6.000 morti, quasi tutti di malattia, contro poche decine in combattimento. In Dahomey 205 per malattia contro 85 in battaglia (dossier). La stanchezza del colonizzatore deve venire dalle perdite per attrito, non dalle battaglie. Il giocatore deve vedere la colonna che si consuma.
- **Logistica.** I portatori, le cannoniere sul Niger e sul Nilo, la ferrovia di Kitchener: senza una via d'acqua o una base vicina, le colonne si fermano. Va legato a porti e fiumi, cioè ai passi da una base, come in `warOk`.
- **Guerre non dichiarate.** Per la potenza coloniale erano "spedizioni" o "operazioni di polizia" e non entravano nel sistema degli Stati: nessuna chiamata alle armi, effetto sulla stima minimo. Per l'africano erano la guerra totale. L'asimmetria va modellata così: stanchezza bassa per il colonizzatore, mobilitazione piena e coesione in gioco per il difensore.
- **Esiti.** Lo schema tipico ha tre esiti: (a) vittoria rapida e trattato di cessione o protettorato; (b) ritiro dopo un disastro (Dogali 1887, Isandlwana nel 1879, Hicks 1883), raro ma reale; (c) occupazione della costa o della capitale seguita da guerriglia che dura anni (Behanzin 1892-94, Samori). Il terzo è il più comune e va previsto: la guerra si chiude, ma resta una **resistenza** nella colonia o nel protettorato. Il motore la ha già (`weeklyAdmin`), però non si applica ai protettorati: è un buco, come nota l'accusa.
- **Quando lo stesso avversario si combatte più volte (legittimo).** Samori (1882-98, tregue e trattati), Dahomey (1890, poi 1892-94), Madagascar (1883-85, poi 1895), Ascianti (1873-74, 1895-96, 1900), Ndebele (1893, poi 1896-97), Italia ed Etiopia (1887-88, poi 1895-96). In tutti i casi valgono quattro condizioni: la guerra precedente si chiuse con un trattato **limitato**; passarono **anni**, non mesi; l'obiettivo cambiò (costa → capitale → annessione); oppure ci fu una rivolta o un riarmo dell'avversario.
- **Quando non è legittimo.** Non è legittimo ripetere lo stesso obiettivo a pochi mesi da una vittoria, né la "pace senza condizioni" dopo una conquista. Lo Yaka, la Kuba e la Lunda tre volte sono rumore del motore. La memoria va indicizzata sulla **coppia** di avversari (fronte di A), con fasi che però non devono essere solo scritte a mano.

## 4. Errori storici verificati

**Avvocato A**
- Ancón: corretta l'accusa. Il trattato cede Tarapacá e affida Tacna e Arica per dieci anni in attesa di un plebiscito. La Bolivia firma a parte (Valparaíso, aprile 1884). Un'unica pace generica rovescia la storia.
- Uccialli: corretta l'accusa. Lo firma Menelik dopo Metemma (marzo 1889). Seraè e Acchelè Guzai vengono dall'occupazione e dalla convenzione addizionale di ottobre. Aggiungo una cosa: il **Bogos** nel 1889 non era più egiziano. Con il trattato Hewett (giugno 1884) passò a Giovanni IV, e Cheren fu occupata dagli italiani nel giugno 1889, non nel 1888 come dice anche la `desc` di `ita-eritrea`. I dati vanno corretti in tutte e due le direzioni.
- Berlino che "riconosce" lo Stato libero, e l'occupazione effettiva estesa all'interno: errati, come dice l'accusa. Lo stesso mito sta già nella `desc` di `bel-congo` ("riconosciuta a Berlino").
- Dahomey: Cotonou era già ceduta (1868/1878). Ouidah (ottobre 1890) la riconosce dietro una rendita. Porto-Novo era un regno protetto, non dahomeano. Corretta l'accusa.
- Samori: manca il trattato di Bissandugu (marzo 1887). La fase 4 è datata alla cattura.

**Avvocato B**
- Berlino che "assegna le sfere": falso. Le sfere vennero dagli accordi bilaterali del 1886-1898. Corretta l'accusa.
- Kong non era di Samori. Fu protetto dalla Francia con Binger (1889) e distrutto da Samori nel 1897. Kankan e Bissandugu caddero insieme nell'aprile 1891 (Archinard). Corretta l'accusa.
- Uccialli come assenso: storicamente è *quasi* giusto, perché Menelik voleva armi e riconoscimento. Ma l'attore è lo Scioa, che nel gioco non esiste. L'accusa ha ragione sul risultato meccanico (un'Adua anticipata).
- "Pressione con truppe al confine" per Tunisi: storicamente regge, perché le truppe d'Algeria entrarono con il pretesto dei Krumiri. È tecnicamente inesistente nel codice.

**Accusa**
- È corretta su quasi tutto. Due precisazioni. Urabi non fu "causato" dagli europei: nacque da cause interne (la frattura fra ufficiali egiziani e circassi, la questione fiscale), *aggravate* dalla Nota congiunta. Il confine esogeno/endogeno di B è discutibile, non sbagliato. Inoltre l'accusa tace che **Lozi**, **Aro** e **Ibadan** (dossier) sono giudicati bene da entrambe le arringhe: Lewanika cercò Londra (1890), Ibadan firmò nel 1893, gli Aro caddero con la guerra del 1901-02.

## 5. Il rischio di una storia meccanica o teleologica

- **Teleologia di A.** `force` alla scadenza presuppone che la storia "dovesse" andare così. Per i fatti del gruppo A è difendibile, per Uccialli no. Peggio ancora, le ancore restano scritte per il mondo storico: dopo una divergenza il mondo alternativo si impoverisce. È proprio la storia alternativa che R2 vuole ricca.
- **Meccanicità di B.** Un'urgenza che cresce senza limite su ogni voce produce un'Africa conquistata *per contatore*: ogni agenda arriva prima o poi all'ultimatum. Il caso italiano lo mostra: Adua sette anni prima, Tunisi italiana senza che nessuno abbia agito. È il determinismo strutturale ingenuo che la storiografia ha abbandonato con la critica a Robinson e Gallagher.
- **Il rischio comune: la storia come lista di caselle.** Samori diventa "cinque fasi" e Dahomey "due fasi". Le fasi scritte vanno usate come **obiettivi possibili**, non come copione: dopo una sconfitta francese la fase successiva non deve essere ancora "Kankan".
- **Testo.** Il testo storico ("Wolseley a Tel el-Kebir") deve comparire solo se il fatto avviene davvero in quella forma. La regola dei ±30 giorni di A è giusta.

## 6. Voti

| Req. | A (ancore) | B (agenda) | Sintesi dell'accusa |
|---|---|---|---|
| R1 | **8**: i fatti strutturali tengono davvero | **5**: Tunisi italiana e Adua anticipata senza causa | **7**: tiene, ma le scadenze "solo verifica" possono mancare il fatto |
| R2 | **6**: le rotture sono prescritte, il mondo alternativo resta povero | **7**: causale e generativo, anche per gli attori africani | **8**: emergente con poche scadenze, cause di partita |
| R3 | **6**: corregge 30 fatti, lascia i dadi altrove e la pausa "in guerra" | **5**: urgenza mal tarata, cause del motore spacciate per cause di partita | **7**: corregge il generatore vero (533, 565, dado 20%) |
| R4 | **7**: la campagna con goal e fronte è fedele, manca la stagione | **7**: la crisi fra potenze è storica (Vic2/Fascioda), ma toglie i vincoli | **8**: unisce le due, ma mai contro Stati europei |
| R5 | **7**: il fronte per coppia è giusto, mancano le fasi emergenti | **4**: la chiave per interesse fa rinascere le ripetizioni | **8**: fronte per coppia più fasi |

## 7. Verdetto e condizioni

**Approvo la sintesi dell'accusa**, a queste condizioni:

1. **Ancore solo per il gruppo A del §2** (8-10 fatti), con esito di massima e finestra larga. Alla scadenza devono **produrre l'azione**, non solo "alzare l'urgenza": se non ci sono cause di partita, la campagna parte. Una causa vale solo se è di partita (guerra europea dell'attore, garanzia di una grande potenza, bersaglio già preso, sconfitta militare). "Slot occupato" e "in guerra coloniale" non sono cause.
2. **Mai `force` su eventi contingenti** (Uccialli, Adua, Fascioda, battaglie).
3. **Agenda anche per gli attori africani** (Etiopia, Samori, Mahdi, Rabih), senza togliere l'espansione locale che hanno oggi (`aiColonize`).
4. **Urgenza con tetto e decadimento**: una voce senza via percorribile si raffredda per anni, non cresce per sempre. Per gli stadi 2 e 3 non c'è ultimatum automatico.
5. **Guerra coloniale con fronte per coppia**. La ripetizione è ammessa solo dopo un trattato limitato, una tregua di anni e con un obiettivo diverso, oppure dopo una rivolta. È vietata dopo una vittoria completa e vietata la pace senza condizioni per il vincitore.
6. **Stagione, malattia e logistica** nel costo della campagna. Le perdite per malattia devono superare quelle in battaglia, e i combattimenti nell'interno si fanno nella stagione secca.
7. **Resistenza anche nei protettorati** (Sfax e Kairouan 1881, Behanzin 1892-94), così che "guerra finita" e "paese pacificato" restino due cose diverse.
8. **`stance` dei capi locali** (Rabih contro la Francia mai, Lozi verso Londra, Aro ostili): approvato per tutte e due le proposte.
9. **Mai campagne coloniali contro Stati europei**, Belgio compreso. Lo Stato di Leopoldo va dichiarato come problema da risolvere: almeno un attore distinto dal Belgio.
10. **Correggere i dati prima del codice**: Bogos dopo Hewett (1884), Cheren 1889, `bel-congo` senza il mito di Berlino, Ancón separato dalla tregua boliviana, Kong come Stato a sé, Bissandugu 1887.
11. **Testo storico solo se il fatto è avvenuto in quella forma** e entro circa 30 giorni dalla data vera.

Senza le condizioni 1, 5 e 10 il mio voto è contrario: senza la 1 la storia reale non è preservata, senza la 5 le ripetizioni restano, senza la 10 il sistema preserverebbe una storia sbagliata.
