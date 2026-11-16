# Giurato 4: il giocatore

Ho centinaia di ore su Victoria 2 e 3, EU4 e HOI4. Leggo il mandato come lo leggerebbe chi l'ha scritto. **"Più permissive dalla parte coloniale"** vuol dire che per il colonizzatore deve essere *più facile*, non soltanto *diverso*. **"Che non succedano o dopo quasi 10 anni"** vuol dire che il Bardo deve arrivare nel 1881 quando nessuno si mette in mezzo. Non basta un'etichetta che spieghi perché è arrivato nel 1886. Da qui giudico le tre proposte.

## 1. Spirito o reinterpretazione?

**A (ancore).** Rispetta R1 alla lettera: il Bardo ha una data, una finestra e una causa di rottura. Su R3, però, reinterpreta: corregge 25-35 fatti e lascia il generatore dei ritardi intatto per tutto il resto. Ha poi `needs: notAtWar('FRA')`: con una campagna contro Samori in corso il Bardo va in pausa e decade "perché la Francia è in guerra". È proprio il 1886 della simulazione, con in più un cartellino. Per me non è una causa *di partita*, è il motore che si giustifica. Su R4 la rispetta: pace per obiettivo, niente "senza condizioni", stanchezza ridotta. Su R5 la memoria per coppia (`FRA|WAS`) è quella giusta.

**B (agenda).** È l'unica che attacca la causa vera del ritardo: con gli slot, una guerra coloniale non blocca più tutta l'agenda della potenza. Sullo spirito di R4 è la più fedele: toglie il vincolo del 25% sugli eserciti, non chiama i garanti, mette un tetto e chiude con l'intero obiettivo. Su R1 però tradisce. L'accusa ha mostrato che l'Italia AI arriva a 36 su 30 e firma Tunisi *senza che nessuno abbia agito*. Per me è inaccettabile: il fatto più importante del 1881 decide l'ordine delle nazioni in un array. Su R5 la chiave per interesse si rompe sui dati, perché il Uassulu compare sotto `fra-guinea` e sotto `fra-sudan`.

**Sintesi dell'accusa.** È la più vicina a ciò che ho chiesto. Prima corregge il motore (righe 533 e 565, dado del 20%), poi usa poche ancore come *scadenze di verifica* invece che come effetti forzati, la guerra coloniale di A, la crisi di B legata ai trattati veri, e le `stance`. Il rischio è che "ancora come verifica" diventi un'ancora che non fa niente. Lo tratto nelle condizioni.

## 2. Gli scenari, giocati in testa

| Scenario | A | B | Sintesi |
|---|---|---|---|
| **Italia, voglio Tunisi prima della Francia** | Vedo l'ancora del Bardo e la riga "cosa la ferma". Una garanzia al bey la rompe, le truppe la rallentano, e si apre la crisi tunisina. **Mi piace**: so cosa fare e il gioco mi risponde. | La corsa mi dà urgenza e posso offrire il protettorato (26 di base). Funziona, ma lo stesso meccanismo fa vincere l'Italia AI quando *non* la gioco. **Metà**. | Come A, ma l'esito passa per la crisi coi trattati veri. **Mi piace**, se la crisi mi lascia comprare il sostegno di Londra o Berlino (stile Vic2). |
| **Tunisi, resisto** | Arriva l'ultimatum. Se resisto 60 giorni, il Bardo decade. Con l'AI militare attuale (la Francia che perde province algerine contro Tunisi) **è una formalità e mi annoierei**. | Posso accettare, resistere o appellarmi all'Italia o alla Porta. Ha più sapore, ma dopo 3 anni di tregua torna la stessa guerra. | Va bene solo se la Francia sa davvero occupare l'obiettivo. Resistere deve costarmi caro ed essere raro, e una vittoria deve chiudere il fronte per molto, non per 3 anni. |
| **Francia, ignoro Tunisi** | La decisione scade, "la Francia ha rinunciato", e si apre l'alternativa italiana. Corretto per R2: la mia inazione è un'azione. | Pressione politica: Ferry protesta, stabilità −1 al mese. **Mi piace molto**, è Vic3. | Prenderei la pressione di B con un tetto, così che sia un costo e non una punizione infinita. |
| **Gran Bretagna, lascio stare l'Egitto** | Tel el-Kebir diventa una mia decisione e io la lascio scadere. Ma la catena egiziana è cablata in `weeklyEgypt`: cosa succede dopo (Mahdi, Harar, Massaua con l'assenso britannico) non è chiaro. Rischio di un mondo congelato. | Urabi resta un evento di contesto, la mia voce resta inerte e la Francia può entrare. Plausibile. | Gli eventi di contesto (Mahdi, Urabi) devono scattare comunque e le conseguenze devono scorrere. Se l'Egitto resta autonomo, Harar e Massaua devono avere una via alternativa, non sparire. |
| **Etiopia** | Uccialli con `force` alla scadenza: un impero di 60.000 uomini cede province senza una causa. **Mi farebbe chiudere il gioco.** Chelenqo come mia decisione invece è bello. | Finalmente ho un'agenda (Harar). Però la scala italiana mi porta una guerra coloniale all'anno e poi una ogni 3 anni: Adua nel 1889 e un appuntamento fisso. **Mi farebbe arrabbiare.** | Deve darmi l'agenda di B. La guerra Italia-Etiopia non deve essere una "campagna" a tregua ricorrente ma un conflitto vero, con perdite e conseguenze politiche (Dogali, Adua). |

## 3. Cosa mi farebbe arrabbiare

1. **Eventi che piovono senza spiegazione**: province che passano di mano nel diario senza che io abbia visto arrivare niente. Uccialli forzato di A è l'esempio.
2. **L'AI che mi ruba ciò che volevo per una gara di soglie** invisibile: l'Italia di B che prende Tunisi.
3. **Guerre che non finiscono o si ripetono**: tre guerre al Uassulu identiche, o una tregua di 3 anni che si rinnova all'infinito contro l'Etiopia.
4. **Binari mascherati**: "decaduta: la Francia è in guerra" quando la guerra era un'altra spedizione di tre mesi in Guinea.
5. **Il diario saturo**: i rifiuti ogni 4 settimane di B, con −5 di stima e un evento ciascuno, e proteste a ogni campagna. Voglio un riassunto, non 600 righe.
6. **Due interruttori che si contraddicono** (`history` accanto a `colonialMode`).
7. **Il Belgio di Stato che fa guerre nel 1882**, e le campagne contro un mio alleato in cui non vengo chiamato e nessuno me lo dice.

## 4. Cosa manca

- **Un solo interruttore di partita**, che estenda quello che c'è già in Impostazioni ("Storico guidato / Libero"): *Storica* (gli eventi chiave avvengono salvo cause di partita), *Plausibile* (date morbide, alternative aperte), *Libera*. Si sceglie all'inizio e si mostra nella scheda Colonie.
- **Trasparenza**: un'agenda in stile Journal Entries, con le mie voci e quelle dei rivali che mi toccano ("la Francia prepara qualcosa su Tunisi", in fasce). Ogni evento storico mancato o spostato deve dire *perché*, in lingua di gioco.
- **Vedere cosa farebbe l'AI**: una riga "intenzioni" sulle potenze vicine, e un modo per chiedere una mediazione o comprare il silenzio (compenso), non solo protestare.
- **Un rapporto di fine decennio** "storia reale contro la tua partita": è la cosa che più ricompensa un appassionato di storia.
- **Testi storici solo se la data è vera** (±30 giorni, come propone A). Wolseley a Tel el-Kebir il 22 luglio fa ridere.

## 5. Priorità: cosa si deve sentire subito

1. **Correggere il generatore dei ritardi**: una guerra coloniale non deve fermare tutta l'AI coloniale (riga 533), e il dado del 20% non deve punire l'interesse per un anno (riga 565). È poco codice e porta il Bardo nel 1881.
2. **Guerra coloniale come tipo a sé**: pace per obiettivo, tetto di durata, stanchezza ridotta, memoria per *coppia* di nazioni. Spariscono le guerre doppie e triple.
3. **`stance` degli attori locali**: niente Rabih protetto dalla Francia e niente Lozi portoghesi. Sono pochi dati con grande effetto sulla credibilità.
4. **Guerra del Pacifico** con l'età contata dal 1881 e Ancón senza restituire Antofagasta alla Bolivia.
5. **Poche ancore di verifica** (Bardo, Tel el-Kebir, Ancón) e il pannello Agenda.
6. Per ultima la crisi fra potenze, che è la parte più delicata.

## 6. Voti (1-10)

| | R1 storia preservata | R2 cause d'azione | R3 niente ritardi immotivati | R4 guerra coloniale permissiva | R5 niente guerre ripetute |
|---|---|---|---|---|---|
| **A** | **8**: Bardo, Egitto e Ancón hanno una data e una finestra. | **6**: le rotture sono raggiungibili, ma resistere 60 giorni da Tunisi è troppo facile. | **4**: corregge 30 fatti e lascia il generatore dei ritardi; il `notAtWar` rifà il 1886. | **7**: pace per obiettivo e stanchezza ridotta, ma tiene il vincolo del 25%. | **7**: fronte per coppia giusto; senza ancora il "ritiro" si ripete ogni 3 anni. |
| **B** | **4**: l'Italia AI può prendere Tunisi senza alcuna azione di nessuno. | **7**: cause emergenti, e la pressione politica sul giocatore-Francia è ottima. | **6**: è l'unica che toglie il blocco "in guerra non faccio nulla", ma accetta cause di motore. | **8**: la più permissiva, ma troppo: Germania contro Belgio, Italia contro Etiopia. | **4**: la chiave per interesse si rompe sui dati; Etiopia e Samori in loop. |
| **Sintesi** | **8**: le ancore come verifica tengono la storia senza binari. | **8**: cause registrate solo se *di partita*, e crisi sui trattati veri. | **8**: comincia dalle righe che causano davvero il ritardo. | **7**: permissiva ma mai contro Stati europei; manca ancora la garanzia che l'AI occupi. | **8**: fronte per coppia e niente fase ripetuta dopo una vittoria. |

## 7. Verdetto

**Voto alla sintesi, con condizioni. Non accetto A o B da soli.**

Le condizioni che pongo:

1. **Test misurabile di R3**: senza giocatore, Bardo entro il 1881 in quasi tutti i semi ed Egitto nel 1882. Un ritardo è accettato solo se la causa registrata è un'azione di una nazione (garanzia, truppe, guerra europea, bersaglio già preso), mai uno stato interno del motore (slot, gradino, "in guerra").
2. **Nessuna storia alternativa senza un'azione**: l'Italia AI non prende Tunisi se nessuno ha rotto il Bardo.
3. **La guerra coloniale deve essere facile per chi colonizza e corta**: chiude con l'obiettivo intero e non torna con lo stesso obiettivo dopo una vittoria. Prima di tararla, verificare che l'AI militare sappia davvero occupare un obiettivo nell'entroterra (Samori non ha coste).
4. **Il giocatore non è mai mosso da un'ancora** e le sue resistenze devono costare: tregue lunghe dopo una vittoria del difensore, non 3 anni rinnovabili.
5. **Mai "campagna" contro uno Stato europeo** né contro un alleato del giocatore senza avvisarlo. L'Etiopia ha un trattamento a parte.
6. **Un solo interruttore di modalità**, l'agenda visibile coi rivali in fasce, le cause in linguaggio di gioco, e notifiche raggruppate.
7. **Ordine dei lavori come al §5**, un commit per motivo, così ogni passo si sente in partita prima di aggiungere il successivo.
