# Atto d'accusa: Guerra (movimento, combattimento, rifornimenti, mare)

Accusatore: ex ispettore dello stato maggiore. Imputati: `src/engine/combat.ts`, `orders.ts`, `supply.ts`, `sea.ts`, le parti militari di `economy.ts` e `map.ts`; test `tests/motore.test.ts` e `tests/sea.test.ts`.

Ho usato tre sonde, tutte nella cartella della corte (`sonde/`):
- **S1**: battaglie sintetiche con `resolveBattles` giorno per giorno e rifornimento fisso a 1;
- **S2**: rifornimenti remoti, tempi di marcia, sbarchi, leve;
- **S3**: prestazioni e ferrovie russe.

Le misure qui sotto vengono da queste sonde.

---

## Capi d'accusa, per gravità

### 1. Il mare non ha padroni: si sbarca ovunque e gli stretti sono strade
- **Tipo**: mancanza e difetto di modello. **Gravità: critica.**
- **Prova**: `orders.ts:seaPlan` (righe 212-241) e `canEmbark`. Per imbarcarsi bastano `naval ≥ 10` e un porto (con `naval ≥ 30`, qualunque costa); si sbarca su qualsiasi costa dove `canEnter`, anche nemica. Le flotte avversarie non contano: una rotta si chiude solo se un nemico tiene un canale (`sea.ts:canalKey`). Gli stretti sono archi terrestri da +2 giorni (`STRAIT_DAYS`) e non chiedono nessun controllo del mare.
- **Misure (S2)**:
  - Italia in guerra con il Regno Unito: Napoli→Londra in **12,7 giorni** (sbarco diretto a Londra), Napoli→La Valletta in 5.
  - Russia in guerra con l'Impero ottomano: la rotta Odessa→Napoli resta aperta (3.038 km attraverso Bosforo e Dardanelli). Odessa→**Costantinopoli in 4,5 giorni**, Odessa→Smirne in 6,5.
  - Spagna→New York: si sbarca negli Stati Uniti.
  - Nella mappa c'è lo stretto «Passo di Calais (FRA) – Dover (GBR)»: in guerra la Francia *marcia* in Inghilterra.
  - Lo sbarco contro una costa difesa non subisce alcuna penalità: `power` applica solo quella del fiume.
- **Fatto storico**: per tutto il periodo la sicurezza britannica, gli Stretti (chiusi alle navi da guerra dalla Convenzione di Londra del 1841) e la guerra russo-giapponese (Tsushima, 1905) ruotano intorno al dominio del mare.
- **Effetto**: il giocatore e l'AI invadono qualunque potenza insulare o costiera. Il Regno Unito non è difeso da nulla.
- **Rimedio**: un controllo del mare per zona derivato da `naval` (anche senza unità navali). Lo sbarco o il passaggio di uno stretto si vieta se il nemico ha il dominio della zona; lo sbarco su costa difesa paga una penalità (×0,5 il primo giorno). Gli stretti (Bosforo, Dardanelli, Danesi, Calais–Dover) vanno trattati come canali, con un controllore.

### 2. La mobilitazione non mobilita
- **Tipo**: difetto di modello. **Gravità: critica.**
- **Prova**:
  - `setup.ts:39`: la riserva iniziale è `pop × 0,004` (Germania 180.920 uomini, S1).
  - `economy.ts:budget`: `manpowerGain = popEff × 7e-5 × {1; 2,2; 4}` a settimana.
  - `POLICY_EFFECTS.mobilization`: la mobilitazione generale moltiplica il mantenimento per 2,2, e la guerra per altri 1,6. Non richiama nessun riservista nelle unità esistenti.
  - `recruit`: la leva nasce al 25% e si completa all'1,5% al giorno (`supply.ts:79`).
- **Misure (S2)**:
  - Un corpo nuovo passa da 5.000 a 20.000 uomini in **46 giorni**.
  - La Germania in guerra arruola subito 20 corpi, poi si ferma: il tesoro scende da 226 M a 6 M e la riserva va a 0. Dopo 120 giorni quei corpi sono a 9.000 su 20.000 (misura senza la fase economica; con mobilitazione generale la riserva cresce di circa 12.000 uomini a settimana).
  - Il tetto pratico tedesco è circa 370.000 uomini del 1881 più 180.000 di riserva.
- **Fatto storico**: nel 1870 la Confederazione del Nord e gli Stati del Sud mobilitano circa 1.180.000 uomini in 18 giorni (M. Howard, *The Franco-Prussian War*, 1961, cap. 2). Nel 1914 l'esercito tedesco passa da circa 800.000 a 3,8 milioni di uomini in due settimane.
- **Effetto**: le grandi guerre europee non possono assomigliare né al 1870 né al 1914. La mobilitazione è solo una tassa.
- **Rimedio**: una riserva istruita accumulata dalla leva annuale (circa 0,8-1% della popolazione per 7-12 classi). La mobilitazione la versa nelle unità in 2-3 settimane, con ritmo legato alla rete ferroviaria, e i "corpi di riserva" nascono da riservisti, non da denaro.

### 3. Province vuote e fortezze cadono al primo passaggio; non esiste l'assedio
- **Tipo**: mancanza. **Gravità: alta.**
- **Prova**:
  - `orders.ts:advance` (righe 250-256) chiama `capture` in ogni provincia senza nemici *attraversata*, non solo all'arrivo. `processUnit:200` occupa ogni provincia nemica senza difensori.
  - `capture` ignora `level(…,'fortezza')`: una fortezza vuota cade all'istante.
  - Una fortezza difesa vale al massimo ×1,9 (`combat.ts:32`; livello massimo 3, `construction.ts:41`), moltiplicato per il numero di uomini.
- **Misura (S1)**: 20.000 austriaci in montagna, trincerati al massimo, con fortezza di livello 3, contro 100.000 italiani. La fortezza cade in **5 giorni** e l'attaccante perde 3.130 uomini.
- **Fatto storico**: Plevna (1877) tenne circa 145 giorni contro forze russo-rumene più che doppie, che persero decine di migliaia di uomini. Port Arthur (1904) resistette 155 giorni. Metz (1870) immobilizzò un'armata tedesca per due mesi.
- **Effetto**: una divisione di cavalleria (38 km al giorno) attraversa e occupa un Paese sguarnito. Le fortezze, pagate 9-27 M ciascuna più il mantenimento, servono solo come moltiplicatore per gli uomini dentro.
- **Rimedio**: una fortezza ha una guarnigione implicita e si prende solo con un assedio di N giorni (meno con artiglieria e `fortBreak`). Una provincia si occupa solo dopo una sosta, non al passaggio.

### 4. Rifornimento a salti: la distanza e il clima non esistono
- **Tipo**: difetto di modello. **Gravità: alta.**
- **Prova**:
  - `supply.ts:supplyMap`. Nel territorio amico il livello è `(1 − min(0,25; salti × 0,01/L)) × min(1; L+0,1)`, quindi mai sotto circa 0,64, ovunque. L'attrito parte sotto 0,25 (`supply.ts:64`).
  - Con `naval ≥ 30` ogni costa propria è una sorgente (riga 22), senza verificare che una rotta marittima la colleghi alla madrepatria o che non sia bloccata.
  - Le province occupate entrano subito nel "territorio amico" (`friendly` usa il controllore), quindi la retrovia segue il fronte senza costo.
  - Una pista carovaniera di centinaia di km conta un salto. Il terreno non entra nel calcolo.
- **Misure (S2)**:
  - Russia in guerra: Vladivostok, Kamciatka, Ochotsk e Anadyr hanno rifornimento **1,00**.
  - Impero ottomano: Murzuk 0,96, Ghat 0,97, Cufra 0,71. Egitto: Khartum 0,89 (oltre il deserto nubiano).
  - Nessuna unità in attrito in un turno di guerra (S3: 0 unità sotto 0,25).
- **Fatto storico**: Kitchener dovette costruire la Sudan Military Railroad (1896-98) per arrivare a Khartum. Nella campagna del Madagascar (1895) i francesi ebbero circa 6.000 morti per malattia contro una ventina in combattimento. Nel 1914 le armate tedesche alla Marna erano a oltre 130 km dalle stazioni di testa.
- **Effetto**: Siberia, Sahara e Africa interna sono trasparenti alla logistica. L'avanzata in profondità è gratuita.
- **Rimedio**: un costo per km e per terreno (deserto, palude, foresta tropicale ×2-3) al posto dei salti. Le sorgenti costiere valgono solo se c'è una rotta dalla capitale non bloccata (capo 1). Le province occupate da meno di N settimane non trasmettono rifornimento pieno. Un fattore di malattia per clima tropicale.

### 5. Le leve appena arruolate si arrendono al primo colpo
- **Tipo**: errore. **Gravità: alta.**
- **Prova**: `economy.ts:recruit` crea l'unità al 25% di `maxStrength`. `combat.ts:82` fa ritirare chi è sotto `RETREAT_STRENGTH = 0,3` di `maxStrength`. Una leva entra in battaglia già sotto la soglia di ritirata, e se non trova province amiche vicine si arrende (`retreat`, riga 138).
- **Misura (S1)**: una leva da 5.000 uomini attaccata da un corpo si arrende **il primo giorno** dopo 224 perdite. Messa in difesa insieme a un corpo completo, si ritira e si arrende lo stesso.
- **Effetto**: arruolare vicino al fronte significa regalare uomini e denaro. L'AI arruola nelle prime 5 province (`ai.ts:209`), spesso proprio lì.
- **Rimedio**: misurare la soglia sulla forza all'ingresso in battaglia (o su `strength/strengthAtStart`), oppure far nascere le leve "in formazione", non schierabili finché non arrivano al 50%.

### 6. Manca il divario di fuoco coloniale
- **Tipo**: difetto di modello. **Gravità: alta.**
- **Prova**: in `combat.ts:power` l'unica differenza qualitativa è `(0,75 + 0,5 × qualità/100) × govEffects.quality`, quindi al massimo ×1,67 fra due eserciti. Mitragliatrici, fucili a retrocarica e a ripetizione, tiro rapido: non esiste nessun fattore di fuoco tecnologico.
- **Misura (S1)**: 20.000 zulu contro 20.000 britannici: **vincono gli zulu** (perdite britanniche 2.700, zulu 1.632). Qualità 45 contro 62.
- **Fatto storico**: a Ulundi (1879) circa 5.300 britannici sconfissero 12-15.000 zulu con una decina di morti. A Omdurman (1898) i morti anglo-egiziani furono circa 48, quelli mahdisti circa 12.000. Adua (1896) è l'eccezione, spiegata da numero e fucili moderni; la sonda la riproduce (17.700 italiani si arrendono in 2 giorni a 100.000 etiopi), ed è un buon esito.
- **Effetto**: ogni guerra coloniale si gioca alla pari uomo per uomo, quindi servono eserciti europei enormi in Africa. Questo spiega in parte le campagne coloniali lunghe.
- **Rimedio**: un fattore di fuoco per livello tecnologico militare (retrocarica, ripetizione, Maxim, tiro rapido), che pesa sulle perdite inflitte e non sulla qualità, con un massimo di circa ×4-5 fra armamento europeo e lance.

### 7. Il Giappone non può andare per mare; la marina è statica
- **Tipo**: errore di dati e mancanza. **Gravità: alta.**
- **Prova**: il profilo del Giappone ha `naval: 0` (S1), e nessun modulo del motore scrive `profiles[*].naval` (ricerca su `src/engine`). Con `MIN_NAVAL = 10` (`orders.ts:193`) il Giappone non si imbarca mai.
- **Misura (S2)**: Tokyo→Pechino in guerra con la Cina risulta **impossibile**.
- **Fatto storico**: nel 1878 il Giappone aveva già le corazzate *Fusō* e *Kongō*. Le guerre del 1894 e del 1904 furono vinte sbarcando in Corea e in Manciuria.
- **Effetto**: due delle guerre principali del periodo sono impossibili. Nessuna potenza può costruirsi una marina (né Stati Uniti né Germania dopo il 1898).
- **Rimedio**: dare al Giappone un valore iniziale corretto (~15) e far crescere `naval` con spesa e tecnologie (un'opera "cantiere navale" o una voce di bilancio).

### 8. Ferrovie storiche assenti in Russia
- **Tipo**: errore di dati. **Gravità: media.**
- **Prova**: S3. Sul percorso Mosca→Varsavia il livello ferroviario è 0 da Tver' a Łomża (Vilna e Białystok compresi), e la rete russa vale 30.
- **Misure**: Mosca→Varsavia **58,7 giorni** (1.269 km a piedi). Berlino→Metz 8,2 giorni.
- **Fatto storico**: la ferrovia Pietroburgo–Varsavia per Vilna e Białystok fu completata nel 1862, la Mosca–Smolensk–Brest nel 1871.
- **Inoltre**: in `legDays` il moltiplicatore della ferrovia si applica *dopo* quello del terreno, quindi un treno in montagna va a metà velocità. Lo SPEC dice "1 + 5·rete/100", il codice fa altro (`orders.ts:259`).
- **Effetto**: la Russia non può concentrare le truppe in Polonia; l'equilibrio austro-russo risulta falsato.
- **Rimedio**: controllare `buildings1881.ts` sulle linee russe principali (Pietroburgo–Varsavia, Mosca–Brest, Mosca–Kursk–Kiev). Il treno deve ignorare `TERRAIN_SPEED`.

### 9. Le battaglie non si possono abbandonare
- **Tipo**: mancanza. **Gravità: media.**
- **Prova**: `orders.ts:processUnit:197` esce subito se `u.inBattle`. Gli ordini dati a un'unità in battaglia restano sospesi finché morale o forza non scendono sotto la soglia.
- **Effetto**: il giocatore vede un corpo condannato e non può ritirarlo. Una battaglia finisce sempre con un logoramento di 8-11 giorni (S1) o con una resa. Non sono infinite: il morale cala di almeno 0,015 al giorno.
- **Rimedio**: un ordine di ritirata dalla battaglia, con perdite aggiuntive (per esempio un giorno di fuoco subìto senza restituirlo) e il disimpegno all'alba successiva.

### 10. La ritirata attraversa stretti e deserti in tempo zero
- **Tipo**: errore. **Gravità: media.**
- **Prova**: `combat.ts:retreat` (righe 135-146) sceglie fra *tutti* gli archi di `w.map.adj`, stretti e piste carovaniere compresi, e sposta l'unità all'istante.
- **Effetto**: un corpo sconfitto a Messina "ripiega" in Calabria senza navi. Uno sconfitto in un'oasi salta 500 km di deserto. Si evitano rese che dovrebbero esserci.
- **Rimedio**: escludere `e.strait` ed `e.route` dalle opzioni di ritirata, o trasformarle in un movimento normale.

### 11. La fase rifornimenti è lenta per come è costruita la cache
- **Tipo**: difetto di implementazione. **Gravità: media.**
- **Prova**:
  - In `supply.ts:updateSupply` la chiave della cache di pace è `turn:wars.length:cacheVersion` (riga 42). Ogni turno, e ogni volta che una provincia cambia mano in qualunque parte del mondo (`ownershipWatch` → `touchBuildings`), si rifanno le mappe di **tutte** le nazioni.
  - Ogni `supplyMap` scorre tutte le 4.532 province 4-5 volte e fa due BFS, anche per uno Stato con un'unità.
  - Le nazioni in guerra si ricalcolano ogni giorno.
  - `logistics()` ha la memo con chiave `s.day` (`construction.ts:109`), quindi si ricalcola ogni giorno per tutti.
- **Misure (S3, 3 guerre, 161 nazioni con unità)**:
  - 161 `supplyMap` costano 196 ms.
  - `updateSupply` costa 153 ms il giorno in cui la cache cambia chiave, 37 ms negli altri (di cui `logistics` a freddo circa 27 ms).
  - Nel turno sono comparse 4 versioni di cache distinte.
  - Fase rifornimenti: 998 ms in un turno (macchina condivisa).
- **Rimedio**:
  - togliere `turn` dalla chiave della cache;
  - usare una chiave per nazione (confini propri e alleati, guerre della nazione), non la versione globale;
  - non calcolare mappe per nazioni in pace con tutte le unità in patria (il rifornimento lì è costante);
  - memo di `logistics` per settimana.

### 12. L'artiglieria senza fanteria proporzionale; la cavalleria serve solo a razziare
- **Tipo**: squilibrio. **Gravità: media.**
- **Prova**: `combat.ts:29` penalizza l'artiglieria solo se *nessuna* fanteria è presente (`sideHasInfantry`). L'artiglieria ha attacco 1,4 per mille uomini con lo stesso mantenimento della fanteria (`UPKEEP_PER_THOUSAND` non distingue le armi).
- **Misure (S1)**:
  - 1 corpo più 10 brigate d'artiglieria (100.000 uomini) infliggono 10.445 perdite. 100.000 fanti ne infliggono 7.870.
  - La cavalleria perde 1.046 contro 523 a parità di uomini e costa di più per uomo. La sua unica funzione resta la velocità per occupare province vuote (capo 3).
- **Rimedio**: penalità proporzionale al rapporto artiglieria/fanteria (sopra circa 1:3); mantenimento per arma; per la cavalleria ricognizione e inseguimento (perdite extra al nemico in ritirata).

### 13. Nessun limite agli eserciti oltre cassa e riserva
- **Tipo**: squilibrio. **Gravità: media.**
- **Prova**:
  - Il fattore logistico ha un minimo di 0,75 (`construction.ts:computeLogistics`).
  - L'affollamento per provincia è contato per nazione (`supply.ts:48`), quindi gli alleati sommano la capienza; il malus non scende sotto ×0,5 di rifornimento, cioè ×0,7 di potenza.
  - `recruit` è limitato solo da denaro e riserva. Con le casse esplose (Regno Unito 57.800 M nel 1899) il limite è la sola riserva.
- **Effetto**: grandi ammassi; la legge del quadrato premia la concentrazione (S1: 100.000 contro 20.000 in pianura, l'attaccante perde l'1%).
- **Rimedio**: un fronte (larghezza di combattimento) per provincia, legato a terreno e dimensione, con le truppe in eccesso in seconda linea; capienza contata per schieramento, non per nazione.

### 14. Errori minori: unità in marcia immuni, dottrine vuote, presenza fuori fase
- **Tipo**: errore e mancanza. **Gravità: bassa.**
- **Prova**:
  - `combat.ts:43` esclude dalla battaglia chi ha `move.progress > 0`, anche un'unità imbarcata nel porto per tutto il viaggio;
  - le dottrine `mobile` (Germania) e `colonial` (Regno Unito) non hanno effetto (`combat.ts:26-27`);
  - `world.ts:presence` è memorizzata per giorno mentre le unità si muovono, quindi `hostilePresent` legge posizioni vecchie;
  - l'attrito va alla prima guerra trovata (`supply.ts:69`).
- **Rimedio**: impegnare le unità nella prima metà della tappa; dare un effetto alle due dottrine; invalidare la presenza a ogni spostamento.

### 15. I test non proteggono il motore di guerra
- **Tipo**: mancanza. **Gravità: bassa.**
- **Prova**: `tests/motore.test.ts` ha un solo test di battaglia (`battle_started` e determinismo): nessun esito, ritirata, resa, fortezza, attrito, leva. `tests/sea.test.ts` verifica solo le rotte, nessuno sbarco. Per questo i capi 5 e 10 sono passati.
- **Rimedio**: test di esito su battaglie sintetiche (come S1), con intervalli attesi.

---

## Ciò che il motore fa bene (da non rompere)

- **Determinismo pulito**: rumore da `rand(seme, giorno, provincia)`, unità in ordine di id, Dijkstra navale con ordine fisso e cache per porto e canali.
- **Rotte navali vere**: Capo Horn fino a Panama, Suez chiuso ai nemici dell'Egitto, Caspio separato. È la base giusta per il controllo del mare.
- **`validateOrder` obbligatorio**: un buon confine con AI e LLM; la coda di ordini con condizioni è ricca.
- **Battaglie che finiscono sempre** (morale −0,015 al giorno come minimo) e **resa per accerchiamento**, un esito emergente e storico (Sedan).
- **Movimento credibile**: fanteria a 22 km al giorno, fiume ×0,75, avanzata progressiva.
- **Tecnologie di fortezza**: `fortBreak` e `fortArmor` modellano la crisi dell'obice-torpedine.
- **Esiti già credibili**: Adua plausibile; a parità di forze vince la difesa.
- **Eserciti iniziali sensati**: Germania 372.000, Francia 420.000, Russia 630.000, Stati Uniti 27.000.

## Interazioni con gli altri motori

- **Coloniale**: `orders.ts:capture` annette per sempre le 520 province senza padrone a chi vi *passa*. `colonial.ts:600` scarta per questo i percorsi che le attraversano, ma il giocatore non ha freni: una cavalleria annette mezza Africa senza costi. L'unico freno è il rifornimento basso (Bamako e Timbuctù 0,18 per la Francia). Senza divario di fuoco (capo 6) le campagne coloniali sono alla pari; gli sbarchi ovunque (capo 1) le rendono banali, tranne per il Giappone (capo 7).
- **Economia**: la mobilitazione moltiplica il mantenimento senza aggiungere uomini (capo 2). Le province occupate rendono il 25% (`economy.ts:289`), quindi l'occupazione gratuita (capo 3) è anche un guadagno. Con le casse esplose, l'unico limite all'arruolamento è la riserva.
- **Pace**: il veto sulle cessioni richiede l'occupazione, e le province prese al passaggio gonfiano le pretese. Le leve arrese (capo 5) alimentano la stanchezza di guerra.
- **AI**: arruola solo fanteria (`ai.ts:209`) e non può ritirarsi dalle battaglie. La fase "piani" (708 ms) si somma ai rifornimenti nel turno di guerra lento.
- **Costruzione**: `touchBuildings` a ogni cambio di proprietario invalida le cache dei rifornimenti di tutto il mondo (capo 11).
