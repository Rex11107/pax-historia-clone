# Giurato 2: il progettista di giochi

Giudico dall'esperienza di gioco: cosa sente chi gioca e se una persona sola riesce a mantenere il sistema. Le correzioni dell'accusa sul codice le do per acquisite (§0: il vero blocco sono le righe 533 e 565 e il dado del 20%, non il "rifiuto con sei mesi di attesa").

## 1. Agency: quattro poltrone

**Francia.**
- *A*: il Bardo arriva come **decisione** con costo e obiettivo già scritti. È il modello delle decisioni di EU4 e dei focus di HOI4, che funziona perché il giocatore sceglie *quando*. Il difetto lo dichiara A stesso (§8.5): se il giocatore si distrae, la scadenza passa e il Bardo è perso. Va risolto con una notifica forte e un promemoria a metà finestra. Una regola invisibile non va bene.
- *B*: la "pressione politica" (stabilità −1 al mese, Ferry che protesta) è un'idea migliore, perché la storia spinge il giocatore attraverso la politica interna e non attraverso un pulsante. Il caso peggiore però è grave: la Francia che non fa nulla perde Tunisi contro l'Italia senza che *nessuno* abbia scelto (accusa III.5). Per il giocatore è l'esperienza peggiore che un gioco storico possa dare: "è successo e non so perché".

**Tunisi.**
- *A*: l'ultimatum con mesi di preavviso e i `breaks` raggiungibili (garanzia italiana od ottomana) sono **vero gioco**: un problema visibile, più strade per uscirne, una scadenza. Però "resisti 60 giorni e il Bardo decade" diventa una formalità se l'AI in guerra resta debole. La vittoria del piccolo deve costare cara e restare rara.
- *B*: la scala di escalation (offerta, pressione, ultimatum) è la cosa più leggibile delle due arringhe. Ogni gradino è un avviso, come i *diplomatic play* di Victoria 3. Accettare, resistere o appellarsi: tre verbi chiari.

**Italia.**
- *A*: vede l'ancora francese con la riga "cosa la ferma". È ottimo: il giocatore italiano ha un obiettivo concreto ("rompi il Bardo") con strumenti normali.
- *B*: dà la corsa (+15/+30), che sul piano emotivo è più viva, ma è la stessa meccanica che rompe R1 quando l'Italia è dell'AI.

**Etiopia.**
- *A*: l'ancora `chelenqo` dà a Menelik un momento suo. Uccialli forzato alla scadenza invece è un binario puro (accusa I.2): il giocatore etiope si vede togliere province da un evento. È il tipo di "evento arbitrario" che i giocatori di EU4 odiano di più.
- *B*: il giocatore etiope si ritrova una guerra italiana ogni tre anni, e ogni vittoria gli dà solo una tregua. È un ciclo punitivo e ripetitivo, cioè proprio l'R5 che la corte deve eliminare, spostato sul giocatore.

**Leggibilità.** A vince nettamente: lo stato dell'ancora, la causa scritta e "storicamente: 12 maggio 1881" sono un oggetto che il giocatore legge. In B l'urgenza è un numero che cresce da solo e la causa di un ritardo ("slot guerre occupato") parla del motore, non della partita.

## 2. Rigiocabilità e mondo dopo la divergenza

Qui le due proposte si rovesciano.
- **A** dà partite storiche simili fra loro (campana stretta, `force`). Dopo una divergenza **il mondo si impoverisce** (A §8.3): proprio dove il giocatore ha agito, i contenuti si spengono. È il difetto noto dei focus storici di HOI4. Appena si esce dal binario il gioco diventa più vuoto, e il giocatore impara che deviare non conviene.
- **B** resta vivo dopo la divergenza, perché l'agenda continua a girare su qualunque stato. Ha però poca varietà fra semi senza intervento del giocatore (B §8.3).
- **La sintesi** prende il meglio di tutte e due: le ancore solo come scadenze di verifica e l'urgenza emergente ovunque. Quando un'ancora decade, l'interesse torna all'agenda e il mondo resta animato.

Manca a tutti un meccanismo per **la varietà voluta**. Il seme deve poter spostare anche *quali* ambizioni di stadio 3 si accendono, oltre alle date. È il "non storico" di HOI4 come terza via, e la corte lo deve chiedere.

## 3. Lezioni dai giochi esistenti

- **Mission tree e focus tree di EU4 e HOI4**: la critica ricorrente dei giocatori (sui forum Paradox ci sono discussioni intitolate "Please don't have mission trees/focus trees… they reduce player agency and are detached from internal game systems", "Missions are so toxic to good gameplay", "The railroading in the missions is really stupid") è che il contenuto scritto *scavalca* i sistemi: province date per evento, ricompense staccate dalla simulazione. Lezione: un'ancora non deve mai spostare province da sola. Deve **aprire una campagna o un'offerta** che i sistemi poi risolvono. A lo fa per la maggior parte delle ancore, ma non per Uccialli e Ancón (`cede`, `endWar`), che vanno tolti.
- **Missioni che l'AI non sa fare**: un'altra critica diffusa su EU4. Qui è un rischio concreto: Samori senza sbocco al mare, con `planNation` che non trova bersagli (accusa II.5). Un'ancora che apre una campagna che l'AI militare non sa combattere produce di nuovo guerre a vuoto.
- **Journal entries di Victoria 3**: la lezione buona è la visibilità in anticipo con condizioni di successo e di fallimento. Paradox ha poi dovuto rimettere mano ai contenuti narrativi (dev diary 88, "narrative content improvements"), perché le voci generiche erano percepite come piatte. Servono poche voci, scritte bene.
- **Colonizzazione di Victoria 3**: lodata la "tensione" che sale fino alla rivolta nativa; criticato il fatto che il lato nativo sia quasi ingiocabile. Lo stesso rischio c'è qui (§4).
- **Crisi di Victoria 2**: lo schema "comprare il sostegno" funziona, ma le crisi scattavano in modo opaco. La crisi di B va mostrata con le parti e la scadenza.

## 4. La guerra coloniale

**Lato colonizzatore.** Un obiettivo limitato, un tetto di durata, un trattato con un nome d'epoca: è divertente se la difficoltà sta nella **logistica e nella malattia**, non nella conta degli eserciti. Senza il vincolo del 25% (B) la conquista diventa una formalità e la Francia giocante spartisce l'Africa nel 1888. Con il punteggio che matura di A (+2 a settimana) e soglie 35-50 il rischio è lo stesso. Chiedo che la permissività sia una **leva di difficoltà** esplicita.

**Lato colonizzato.** È il punto debole di tutti. Oggi il piccolo ha un solo verbo: resistere. Gli servono tre cose:
- un **obiettivo di sopravvivenza leggibile**, un contatore "resisti fino al giorno X";
- una **resistenza che logora** il colonizzatore (malattia, imboscate, perdite ai portatori), così che tenere duro sia una strategia;
- l'**appello** a una potenza (B, crisi di 4 settimane).

Vincere però non deve essere banale. Una vittoria che dà "3 anni di tregua e poi da capo" (B) è frustrante. Una vittoria che fa decadere l'ancora dopo 60 giorni (A) è troppo facile. Propongo questa via di mezzo: la vittoria del colonizzato chiude la **fase**, e il fronte riparte solo con un **obiettivo diverso e più costoso**, oppure dopo un evento che cambia le carte.

**Ripetizione a fasi.** È comprensibile solo se si vede. Ci vuole una scheda di fronte: "Fronte del Niger, Francia contro Samori: fase 2 di 5 (Kéniéba-Kouré firmato), tregua fino al marzo 1891, prossimo obiettivo: Kankan". Così cinque guerre in sedici anni si leggono come un'unica lunga guerra, cioè la verità storica che Wesseling descrive. Il fronte va indicizzato **sulla coppia** (A), non sull'interesse (B, accusa II.3).

## 5. Costo di contenuto (una persona sola)

| | Schede a mano | Sostenibile? |
|---|---|---|
| A | 25-35 ancore, ~450 righe, ricerca storica fitta | Sì se ci si ferma a ~12 all'inizio |
| B | ~58 voci con `due`, `tempo`, `pretext`, `phases`, più ~30 `stance` | A fatica: ogni voce è una taratura |
| Sintesi | ~6-10 ancore di verifica, fasi solo per i fronti lunghi (Samori, Dahomey, Eritrea), `stance` per ~15 attori | Sì |

Avvertimento serio: l'accusa ha trovato nomi inesistenti sulla mappa (Cotonou, Porto-Novo, Kankan), un tag sbagliato (UAS al posto di WAS) e Bogos attribuito all'Etiopia. Una persona sola **non può** tenere a mente 4.532 province. Ci vuole un **controllo dei dati al caricamento**, eseguito come test veloce: ogni nome di provincia esiste, ogni tag esiste, ogni `requires` punta a un id vero. Senza questo il costo vero non sta nello scrivere le schede, ma nel debug delle schede.

## 6. Cosa manca alle proposte

1. **"Perché è successo"** su ogni fatto coloniale: una riga di causa nel diario e nel tooltip ("Bardo: 3 giugno 1881; rallentato da: truppe italiane a Tunisi"). L'invariante R3 di A va estesa a *tutti* gli interessi, non solo alle ancore.
2. **Un calendario dei prossimi sei mesi** ("all'orizzonte") per il giocatore, con fasce di probabilità e senza numeri.
3. **Una cronaca di fine partita "storia contro partita"**, che elenca ogni divergenza con la sua causa. È il miglior incentivo a rigiocare e rende R2 una cosa che si festeggia, non un errore.
4. **Un solo interruttore di partita**, non due. `colonialMode` e `history` vanno fusi in un'unica opzione a tre livelli: *Storico* (verifica alla scadenza), *Plausibile* (le scadenze alzano solo l'urgenza), *Libero*. Accanto, una leva di **difficoltà coloniale** (permissività della guerra coloniale).
5. **AI che rompe le ancore altrui.** Se solo il giocatore può rompere un'ancora, nelle partite in cui guarda altrove la storia è fissa (A §8.4). Le rivalità dell'AI (Italia contro Francia) devono poter produrre `breaks` per conto proprio, con una probabilità bassa e tracciata.
6. **Contenuti parametrici per il mondo divergente**, cioè modelli generici ("crisi per X fra A e B", "fronte di resistenza contro Y") che si istanziano su qualunque coppia. Sono la cura alla povertà post-divergenza di A e costano una volta sola.
7. **Le notifiche al bersaglio-giocatore** sempre come scelta con conseguenze scritte, mai come fatto compiuto.
8. Il GM LLM può **raccontare** l'ancora e la sua causa nei dispacci. Rende viva la leggibilità senza toccare lo stato.

## 7. Voti (1-10, punto di vista dell'esperienza di gioco)

| | A ancore | B agenda | Sintesi dell'accusa |
|---|---|---|---|
| **R1** storia preservata | **8**: il Bardo arriva davvero e il giocatore lo vede arrivare | **4**: Tunisi italiana senza che nessuno l'abbia scelto | **7**: la verifica alla scadenza tiene, ma senza `force` qualche seme sfugge |
| **R2** divergenza per azione | **7**: `breaks` raggiungibili e chiari, ma dopo la rottura il mondo si impoverisce | **7**: tutto è causale e il mondo resta vivo, ma le cause sono opache | **8**: le cause di partita sono separate da quelle del motore e il mondo resta animato |
| **R3** niente ritardi senza causa | **5**: `notAtWar` ripropone il 1886 con un'etichetta, e fuori dalle ancore nulla cambia | **5**: l'urgenza parte al turno 1 e le cause scritte sono "del motore" | **7**: corregge il generatore dei ritardi, ma va mostrato al giocatore |
| **R4** guerra coloniale a sé | **7**: obiettivo, tetto e nome d'epoca; il lato nativo è povero | **6**: crisi e appello sono buoni, ma è troppo permissiva e manca il 25% | **8**: unisce i due, purché la permissività sia una leva e mai contro Stati europei |
| **R5** niente guerre doppie | **7**: fronte per coppia, ma i fronti senza ancora restano vaghi | **4**: la chiave per interesse si rompe e c'è il ciclo etiope | **8**: fronte per coppia con fasi visibili |

## 8. Verdetto

Voto per la **sintesi dell'accusa**, a queste condizioni:

1. **Nessuna ancora sposta province da sola.** Apre un'offerta, un ultimatum o una campagna, e la risolvono i sistemi. Via `cede` di Uccialli e `endWar` di Ancón come effetti diretti.
2. **Ogni fatto coloniale ha una causa leggibile**, e il test fallisce se la causa è interna al motore ("slot", "presenza −99", "in guerra" senza nome della guerra).
3. **Pannello "Agenda e fronti"** prima del bilanciamento, non dopo: ancore all'orizzonte con "cosa la ferma", fronti con fase, tregua e prossimo obiettivo, cronaca delle divergenze.
4. **Il colonizzato ha un gioco suo**: contatore di sopravvivenza, logoramento del colonizzatore, appello. Una vittoria del piccolo chiude la fase. È rara ma vera, e la si tara con simulazioni.
5. **Un solo interruttore di storia a tre livelli** più una leva di difficoltà coloniale. Le scelte di partita stanno nelle impostazioni, non nel codice.
6. **Le decisioni del giocatore non scadono in silenzio**: avviso all'apertura, a metà finestra e un mese prima della scadenza.
7. **Controllo dei dati al caricamento**, come test rapido, per nomi, tag e riferimenti. È la condizione perché il progetto resti sostenibile per una persona sola.
8. **Si parte con poco**: Bardo, Tel el-Kebir, Ancón e il fronte di Samori. Si gioca, si guarda il rapporto e solo dopo si scrivono altre schede.
9. **L'AI rivale può rompere le ancore**, poco e in modo tracciato, così che la storia non sia fissa quando il giocatore guarda altrove.

Senza le condizioni 1, 3 e 4 la sintesi diventerebbe un binario ben documentato. Con queste condizioni è un sistema in cui la storia arriva in tempo, si vede arrivare e si può fermare.
