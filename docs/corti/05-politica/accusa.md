# Atto d'accusa: politica interna (regimi, governi, elezioni, ministri, nazionalità)

*Il cronista parlamentare, dalla tribuna stampa, 16 novembre 2026.*

## Misure su cui poggia l'accusa

Le sonde stanno nella cartella della corte, insieme ai loro output (`sonda1.out`, `sonda2.out`, `sonda3.out`).

- **Sonda 1**: partita completa, sole nazioni non giocanti, seme `regnum`, 286 turni (dal 1° gennaio 1881 al 26 giugno 1886, 78 s). Conta crisi, governi ed elezioni per nazione e registra i capi, la stabilità e le etnie.
- **Sonda 2**: verifiche puntuali sul motore, senza simulazione.
- **Sonda 3**: 19 anni (991 settimane) della sola fase politica e dei ministri, con economia, guerre e stabilità ferme al 1881. Produce 427 eventi `crisis` e 232 cambi di governo, contro i 418 e i 218 del rapporto `docs/rapporti/1881-1899.md`. I numeri del rapporto, quindi, li produce quasi tutti il motore politico da solo.

---

## Capi d'accusa in ordine di gravità

### 1. La stabilità, cioè il prodotto della politica, non tocca né le casse né la leva né l'ordine pubblico
- **Tipo**: difetto di modello. **Gravità: critica.**
- **Prova**:
  - Tutta la politica sfocia in `stabilityTarget` (`economy.ts:90-94`). La stabilità poi entra solo in `budget()`? No: `budget()` (`economy.ts:47-88`) non la legge mai.
  - Sonda 2 b: l'Italia ha le stesse entrate (31,83), la stessa leva (1992) e lo stesso saldo (1,58) con stabilità 80 e con stabilità 15. Lo stesso vale per la Francia e la Russia.
  - La stabilità ha effetto solo attraverso soglie lontane: ricerca −20% sotto 30 (`research.ts:113`), pace accettata sotto 20 (`diplomacy.ts:241`), ambizione coloniale sopra 45 (`colonial.ts:463`), desiderio d'indipendenza dei soggetti (`vassals.ts:126`).
  - L'evento "Disordini e scioperi" sotto 25 (`economy.ts:119`) è solo testo e compare solo al giocatore. Non esistono rivolte, scioperi che pesino sulle entrate, colpi di Stato o caduta del regime.
  - Gli effetti diretti dei programmi valgono ±2-3% di entrate (`PROGRAM_EFFECTS`, `politics.ts:65`). La fiducia sposta la stabilità obiettivo fra −6 e +4: sonda 2 h, Italia 60 con fiducia 0 e 70 con fiducia 100.
- **Effetto sul giocatore**: una crisi, una censura o un governo per decreto non costano nulla di misurabile. Il pannello "Politica" diventa un romanzo d'appendice.
- **Rimedio**: legare la stabilità a gettito ed efficienza della leva (per esempio ×0,85-1,05), e sotto 30 a disordini con province ribelli.

### 2. I morti governano: capi senza anagrafe ed effetti postumi
- **Tipo**: errore. **Gravità: alta.**
- **Prova**:
  - `setGov` (`politics.ts:197-200`) sceglie il capo da `leaders` del seme senza controllare né anni né vita.
  - `headMinister` (`ministers.ts:55-58`) cerca per nome e ignora `years`, mentre `eligible` li controlla per i ministri.
  - Sonda 1: "Nuovo governo Léon Gambetta" il 6 gennaio 1883, l'11 agosto 1883 e il 26 dicembre 1885. Gambetta è morto il 31 dicembre 1882.
  - Sonda 2 a: Gambetta capo nel 1885 applica ancora fiducia −3 e opinione tedesca −0,3 a settimana. Bismarck nel 1899 porta ancora +5 di fiducia e i suoi effetti sulle relazioni, anche se fu congedato nel 1890 e morì nel 1898.
  - Sonda 3, capi al 30 dicembre 1899: Cairoli (morto nel 1889), Ferry (morto nel 1893), Loris-Melikov (morto nel 1888), Braamcamp (morto nel 1885), Cánovas (assassinato nel 1897), Taaffe (caduto nel 1893), Hayes "con Garfield eletto" negli Stati Uniti.
- **Effetto**: a partire dal 1885 il mondo è governato da fantasmi, con bonus veri.
- **Rimedio**: dare a ogni capo `years`, filtrare `leaders` con le stesse regole di `eligible`, e prevedere un capo di ripiego ("un notabile del partito") quando la lista è vuota.

### 3. Monarchie costituzionali e autocrazie bloccate: la crisi non cambia mai nulla
- **Tipo**: errore più difetto di modello. **Gravità: alta.**
- **Prova**:
  - `defaultOption` (`politics.ts:245`): in un regime costituzionale con la Corona sceglie `decree` se la fiducia è sotto 25 o se si è appena votato. `concede` richiede `votedRecently && !crown`, ma tutte le sei monarchie costituzionali del seme hanno `crown: true`. Per le nazioni non giocanti `concede` è codice morto.
  - `holdElection` (`politics.ts:221-227`) cambia governo solo nei regimi parlamentari.
  - Sonda 3: Danimarca 34 crisi avviate, Serbia 29, Germania 23, Svezia 20, Austria-Ungheria 5. In tutto 111 crisi e **zero** cambi di governo in 19 anni.
  - In Serbia le elezioni del 1883 le vincono i radicali (41%), e Piroćanac resta con fiducia 18 (sonda 1). Nella storia cadde nell'ottobre 1883.
  - In Svezia Posse resta fino al 1899. Nella storia si dimise nel 1883, e seguirono Thyselius, Themptander, Bildt, Åkerhielm e Boström.
  - Autocrazie: in `confidence()` la stabilità pesa solo ×0,2 (`politics.ts:150`). Sonda 2 e: in Russia, anche a stabilità 0, la fiducia resta 37, sopra la soglia di rischio di 35. In 19 anni la Russia, l'Impero ottomano, l'Egitto, Tunisi e tutte le autocrazie di ripiego non hanno avuto **nessuna** crisi.
  - Loris-Melikov, Miljutin e Abaza governano la Russia fino al 1899. Nella storia tutti e tre lasciano nel maggio 1881, con il Manifesto sull'autocrazia incrollabile.
- **Effetto**: metà del mondo ha un governo eterno. Per il giocatore "decreto" è sempre la risposta giusta.
- **Rimedio**:
  - Dopo due decreti consecutivi la Corona deve cedere (`concede`) oppure si apre una crisi di regime.
  - Nelle autocrazie, la crisi va legata alla successione e alla stabilità con un peso ≥0,5.

### 4. Il voto si avvita su se stesso: premio maggioritario permanente, "elezioni fatte" al partito sbagliato, niente turno
- **Tipo**: difetto di modello. **Gravità: alta.**
- **Prova**:
  - `holdElection` (`politics.ts:215`) dopo il voto scrive `p.pop = p.seats`. Il premio maggioritario (×1,15 al primo, ×0,95 agli altri, riga 213) e i 25 punti di `managed` (riga 211) diventano così consenso. `drift` (riga 161) usa poi i seggi come obiettivo. A ogni legislatura il vincitore si rafforza.
  - Spagna: 75% → 85% nel 1881, fiducia 88. Italia: 60% → 66%, fiducia 73. Nessuna crisi in 19 anni né in Spagna, né in Portogallo, né in Italia, né in Romania, né in Bulgaria (sonda 3).
  - Sonda 2 d: con un consenso del 40% per i conservatori spagnoli contro il 50% per i fusionisti, il voto dà conservatori 51,7%.
  - Il turno pacífico e il rotativismo funzionavano al contrario: la Corona cambiava prima il governo, poi il nuovo governo "faceva" le elezioni. Sagasta è al governo dall'8 febbraio 1881 e vince in agosto. In Portogallo Braamcamp cade nel marzo 1881 e nell'agosto vincono i Rigeneratori. Nella sonda vincono Cánovas (85%) e Braamcamp (72%): due risultati capovolti già nel primo anno.
  - Italia: Cairoli governa fino al 1899. Nella storia cade il 29 maggio 1881 per Tunisi (Depretis, poi Crispi nel 1887).
- **Effetto**: in tre grandi paesi mediterranei la politica è una fotografia del 1881.
- **Rimedio**:
  - Dopo il voto riportare `pop` al consenso reale, non ai seggi.
  - Per i regimi con `managed` alto, dare alla Corona l'opzione di alternanza (una crisi a cadenza di legislatura con `concede`) prima del voto.

### 5. Il ripiego generico: repubbliche presidenziali trattate come Camere dei Comuni, elezioni tutte lo stesso giorno, il "capo dell'opposizione" alla presidenza
- **Tipo**: errore più difetto. **Gravità: alta.**
- **Prova**:
  - `genericPolitics` (`politics1881.ts:230-241`) tratta ogni `repubblica` come parlamentare, con elezioni fissate al **1° giugno 1883** e legislatura di 4 anni.
  - Sonda 1: 17 nazioni votano tutte il 1° giugno 1887.
  - Gli Stati Uniti hanno un "Partito di governo" e una "Opposizione liberale", una crisi di fiducia possibile (sonda 2 f: 6% a settimana con fiducia 45) e per capo, fino al 1899, la stringa "Presidente Rutherford B. Hayes (James A. Garfield, eletto, si insedia il 4 marzo)". Le elezioni presidenziali erano il 4 novembre 1884. Garfield fu ferito il 2 luglio 1881 e morì il 19 settembre.
  - Sonda 3: la Bolivia ha 23 governi in 19 anni, la Colombia 17, il Messico 16, Haiti 16. Il capo diventa letteralmente "il capo dell'opposizione" (`politics1881.ts:234`) in 11 repubbliche.
  - Ibadan (YOR, "repubblica militare"), il Transvaal e Liberia hanno elezioni e "crisi di fiducia". Le repubbliche americane producono la maggior parte dei cambi di governo del rapporto.
  - La Svizzera, con un Consiglio federale collegiale che non cade, può avere crisi di fiducia (sonda 2 f).
- **Effetto**: per il giocatore il registro degli eventi si riempie di crisi latinoamericane fittizie, e la maggiore economia del mondo ha un capo di Stato congelato al gennaio 1881.
- **Rimedio**:
  - Aggiungere un regime `presidential`: mandato fisso, nessuna crisi di fiducia, data storica del voto, partiti con un nome.
  - Sfalsare le date di ripiego con `rand(seme, tag)`.
  - Non usare mai un segnaposto come nome di un capo.

### 6. Mancano gli eventi che fecero la politica dell'epoca, e manca del tutto il capo dello Stato
- **Tipo**: mancanza. **Gravità: alta.**
- **Prova**:
  - Nessun evento scritto in `src/engine` o `src/scenario` per l'assassinio di Alessandro II (13 marzo 1881) o la successione di Alessandro III. Il profilo resta "Zar Alessandro II" (`europe1881.ts:75`). Il colpo di Stato di Battenberg in Bulgaria (maggio 1881) non c'è.
  - Mancano l'assassinio di Garfield, il primo Home Rule Bill e la scissione liberale (1886), la crisi boulangista (1887-89), i tre imperatori del 1888 e il congedo di Bismarck (1890).
  - Boulanger esiste solo come ministro della Guerra nominabile dal 1886, legato al partito "radicali" (`ministers1881.ts:62`). La sua carriera politica no.
  - Il socialismo: la SPD cresce solo se la stabilità scende sotto 50 (`politics.ts:168`). In Germania la stabilità resta 81-84, e la SPD ha l'1,7% dei seggi nel 1884 (sonda 1). Nella storia aveva 24 seggi e il 9,7% dei voti nel 1884, il 19,7% dei voti nel 1890.
  - Non c'è alcuna crescita legata all'industria o alle città, né leggi antisocialiste, né Seconda Internazionale.
  - Lo Stato non ha un sovrano con morte e successione. `crown` è un booleano.
- **Effetto**: il 1881 parte senza il suo evento più grande, e il secolo non ha nessuna delle sue svolte interne.
- **Rimedio**: una tabella di "situazioni" politiche a data o a condizione (sul modello di `situations` in `colonial.ts:663`), con il sovrano come personaggio con anni, e una deriva strutturale dei partiti operai legata a `industryOf`.

### 7. Le nazionalità non fanno nulla, e quando fanno qualcosa colpiscono le colonie del Belgio
- **Tipo**: difetto di modello più errore. **Gravità: media.**
- **Prova**:
  - `ethnicStability` (`ethnic.ts:73-79`) misura solo lo scarto della quota "estranea" rispetto al 1881. Il 56% di non tedeschi e non magiari in Austria-Ungheria, gli irlandesi, i polacchi e i cechi pesano zero per sempre.
  - Non esistono separatismo, rivolte nazionali o partiti nazionali che crescono. Le nazioni `releasable` nascono solo da un trattato di pace (`peace.ts:98`).
  - `foreignShare` (`ethnic.ts:61-70`) conta le colonie a peso pieno, mentre per le entrate `colonialWeight` le pesa l'8%. Sonda 1, 1886: Belgio 0,020 → 0,155 per il Congo, stabilità obiettivo **−5,4**; Germania −1,0. Il Regno Unito, che parte con l'88% di popolazione "estranea" (l'India), non sente le sue conquiste (−0,02).
- **Effetto**: l'impero più vasto non paga nulla, il piccolo regno paga molto. Le minoranze sono un colore sulla mappa.
- **Rimedio**:
  - Applicare `colonialWeight` anche a `foreignShare`.
  - Dare alle minoranze consistenti (≥20% in una regione storica) una "tensione" che salga con la censura, le guerre e le stabilità basse, fino a disordini locali.

### 8. Il rapporto conta male le crisi, e le crisi stanno dove non dovrebbero
- **Tipo**: errore (di misura) più squilibrio. **Gravità: media.**
- **Prova**:
  - `resolveCrisis` (`politics.ts:261-263, 278`) emette ancora eventi di tipo `crisis` per lo scioglimento, la resistenza, il decreto e l'epurazione. Ogni crisi risolta così conta due volte.
  - Sonda 3: 316 crisi avviate e 427 eventi. La Danimarca ha 34 crisi avviate e 68 eventi.
  - Le "418 crisi" del rapporto sono quindi in buona parte doppioni e cicli danesi, serbi, tedeschi e svedesi senza esito (capo 3), più repubbliche fittizie (capo 5).
  - Nazione per nazione: la Francia è credibile come frequenza (12 governi in 5,5 anni contro circa 8 nella storia, sonda 1), ma ruota a carosello fra tre soli nomi, Ferry, Gambetta e Freycinet. Mancano Duclerc, Fallières, Brisson e Goblet.
  - Regno Unito: Hartington primo ministro dal 1883 al 1886, cosa mai avvenuta. Spagna, Portogallo, Italia, Russia e Impero ottomano: zero crisi.
- **Effetto**: il rapporto suggerisce una politica vivace dove c'è rumore, e immobilità dove c'era vivacità.
- **Rimedio**: nel rapporto, contare l'apertura della crisi con un tipo distinto (`crisis_open`), e tarare per nazione su una tabella storica dei governi dal 1881 al 1899.

### 9. Elezioni senza tendenze: si votano dadi, non epoche
- **Tipo**: difetto di modello. **Gravità: media.**
- **Prova**:
  - Il consenso va verso i seggi passati più un umore casuale di ±4 a stagione (`politics.ts:167`). Non c'è alcuna componente strutturale.
  - Francia 1881: nella sonda monarchici e bonapartisti 42% e radicali 3% (sonda 1). Nella storia la destra crolla a circa 90 seggi su 545 e l'Estrema sinistra sale a circa 46.
  - Germania 1881: nella sonda i liberali progressisti hanno il 3%. Nella storia il 1881 è l'anno del trionfo dei liberali di sinistra (Fortschritt più Secessione, oltre 100 seggi).
  - I piccoli partiti sono schiacciati dal ±4 assoluto e dal premio maggioritario.
- **Effetto**: risultati elettorali implausibili già al primo voto.
- **Rimedio**: risultati storici "di ancoraggio" per le prime elezioni (1881-82), poi tendenze per programma (urbanizzazione e industria verso radicali e socialisti, crisi agraria verso agrari e protezionisti).

### 10. Ministri: un catalogo che finisce nel 1890 e lascia i dicasteri ai "funzionari"
- **Tipo**: mancanza più errori puntuali. **Gravità: media.**
- **Prova**:
  - Sonda 3, al 1899: in Germania Guerra, Finanze e Interno sono "funzionario". In Russia Esteri, Finanze e Interno; in Spagna Esteri e Finanze; in Austria-Ungheria Esteri e Guerra. Il Portogallo non ha ministri.
  - Nell'Impero ottomano esiste un solo ministro, Osman Pascià (`CABINET_1881.TUR`). La Spagna non ha gli Esteri.
  - Midhat Pascià è nominabile capo nel 1881-83 mentre è in carcere e in esilio a Taif.
  - Boulanger è nominabile solo se i radicali governano, e nella sonda quasi mai.
  - Gli effetti sono leggeri (in genere ±2-5%) e, per il capo 2, sopravvivono alla morte del capo.
  - Il gabinetto di gennaio 1881 è corretto (vedi i meriti), ma Farre resta alla Guerra fino al 1887 nella sonda 1. Nella storia lasciò nel novembre 1881.
- **Rimedio**: estendere il catalogo fino al 1900 con i ministri di carriera (anche senza effetti), e coprire gli Esteri e le Finanze di Costantinopoli e Madrid.

### 11. Parlamenti composti fusi in uno solo
- **Tipo**: errore di dati. **Gravità: bassa.**
- **Prova**:
  - Il "Venstre norvegese" di Sverdrup siede nel Riksdag svedese (`politics1881.ts:162`), ma lo Storting era un parlamento separato, con la sua crisi del 1884.
  - Gli "Indipendentisti magiari" siedono nel Reichsrat di Taaffe (`politics1881.ts:89`). Le elezioni ungheresi (1881, 1884, 1887) mancano, e Tisza fa da "Interno" di tutta la monarchia.
- **Rimedio**: almeno un secondo "governo" interno per Norvegia e Ungheria, oppure togliere quei partiti dalla Camera comune.

### 12. La stanchezza di guerra è una tassa fissa anche sulle guerricciole coloniali
- **Tipo**: squilibrio. **Gravità: media.**
- **Prova**:
  - `weeklyEconomy` (`economy.ts:114`) aggiunge +0,3 a settimana a qualunque guerra, a prescindere dalla sua grandezza, cioè circa 15 punti l'anno. La stabilità obiettivo perde 0,4 punti per ogni punto di stanchezza, e il governo perde consenso (`politics.ts:163`).
  - Sonda 1: la Francia scende a stabilità 53 durante la guerra del Uassulu (1881-82) e a 45 durante quella contro i Mossi (1883), poi risale a 61 con la pace.
- **Effetto**: l'impresa coloniale minore fa cadere governi come una guerra europea (nella sonda, 12 governi francesi).
- **Rimedio**: rendere la quota fissa proporzionale alla guerra (contro uno Stato minore ×0,2), oppure legarla a `turnLosses`.

### 13. Rami morti e test che non sorvegliano
- **Tipo**: errore minore. **Gravità: bassa.**
- **Prova**:
  - `crisisOptions` (`politics.ts:234`): `ps.crown ? [...] : [...]` restituisce lo stesso elenco nei due rami, quindi una Corona parlamentare (Umberto I, Vittoria) non può mai nominare un governo.
  - `tests/politica.test.ts` controlla solo "meno di 40 crisi in 60 turni". Nessun test verifica che i capi siano vivi, che i governi cambino nei regimi costituzionali o che le date dei ripieghi siano sfalsate.

---

## Ciò che il motore fa bene (da non rompere)

- **Rischio graduale e deterministico.** `crisisChance` è continua e senza soglie a scatto, e tutto passa per `rand(seme, …)`. Il test lo sorveglia.
- **Opzioni di crisi diverse per regime**, con costi espliciti in stabilità e scelta lasciata al giocatore per una settimana. Il modello d'interfaccia è buono.
- **Dati del 1° gennaio 1881 in larga parte esatti.**
  - Capi di governo: Cairoli, Ferry, Gladstone, Bismarck, Taaffe, Loris-Melikov, Said, Cánovas, Braamcamp, Frère-Orban, Van Lynden, Estrup, Posse, Droz, Koumoundouros, Brătianu, Piroćanac, Karavelov, Riyad, Mustafa ibn Ismail.
  - Gabinetti: Milon, Magliani, Depretis all'Interno; Barthélemy-Saint-Hilaire, Farre, Magnin, Constans; Granville, Childers, Harcourt; Hatzfeldt, Kameke, Scholz, Boetticher; Haymerle (che muore nel 1881), Bylandt, Szlávy; Gorčakov, Miljutin, Abaza.
  - Date elettorali: Francia 21 agosto 1881, Germania 27 ottobre 1881, Italia 29 ottobre 1882, Regno Unito novembre 1885, Spagna e Portogallo agosto 1881, Grecia dicembre 1881.
  - Seggi plausibili: Comuni del 1880 54/36/10, Reichstag del 1878.
- **Ministri vincolati a partito e anni** (`eligible`), con una nota storica per ciascuno e una politica estera che sposta l'opinione a piccole frazioni, entro ±60.
- **Bismarck intoccabile** come capo fisso. Il ciclo danese di Estrup per decreto è, per caso, storico.
- **Umore delle politiche.** Censura, imposte alte e mobilitazione in pace irritano i partiti giusti (`policyMood`).
- **Il modello linguistico vede la politica ma non la scrive.** `politicsSummary` va nel contesto e il motore decide.
- **Le etnie per provincia** sono una base dati preziosa, già usata per pretese, paci di liberazione e peso coloniale.

## Interazioni con altri motori

- **Coloniale.**
  - La scelta "maggiori richieste / consolidamento" (`colonial.ts:455-458`) parte da un nuovo governo o da elezioni. Dove il governo non cambia mai (Italia, Spagna, Portogallo, capi 3-4), la scelta dipende solo dal calendario elettorale.
  - Le sconfitte coloniali non toccano la fiducia: "Sfuma Tunisi per l'Italia" (1887 nel rapporto) lascia Cairoli dov'è, mentre la storia lo fece cadere proprio su Tunisi.
  - Le conquiste coloniali penalizzano la stabilità attraverso `ethnicStability` a peso pieno (capo 7). Le guerre coloniali logorano come guerre vere (capo 12).
  - I ±2/+3 di stabilità della decisione coloniale sono fra i pochi spostamenti che contano, perché la soglia di 45 decide l'ambizione.
- **Economia.**
  - `govEffects` moltiplica le entrate (`economy.ts:69`) e i costi dell'esercito.
  - `aiFinances` alza le imposte in deficit senza guardare alla politica, e le imposte alte valgono −3 di fiducia e −3 di consenso al governo.
  - Con le casse che esplodono (problema noto), i deficit spariscono e con loro una delle poche cause di logoramento: i governi diventano ancora più eterni.
- **Battaglie.** `govEffects().quality` entra in `combat.ts:24`. Qualche ministro della Guerra vale fino al +5%.
- **Ricerca.** `techEffects` passa per `govEffects`, e la ricerca rallenta sotto 30 di stabilità.
- **Diplomazia e soggetti.** Sotto 20 di stabilità si accetta la pace (`diplomacy.ts:241`). La debolezza del signore conta per l'indipendenza dei soggetti (`vassals.ts:126`). I ministri degli Esteri spostano l'opinione ogni settimana, anche da morti (capo 2).
- **Modello linguistico.** `agents.ts:22` dice all'agente "governo debole" sotto 30 di stabilità: è l'unico punto in cui la debolezza interna cambia il comportamento estero, e passa per un testo.
