# Atto d'accusa: Costruzione e ricerca

L'accusa è dell'ingegnere del Genio civile e delle ferrovie, poi storico della tecnica. Gli imputati sono `src/engine/construction.ts`, `src/engine/research.ts`, `src/scenario/buildings1881.ts` e `src/scenario/research1881.ts`.

Ho usato tre sonde, tutte nella cartella della corte:
- `sonda1.mts`: stato dopo il primo turno, ritorno delle opere, conoscenze, exploit e tempi.
- `sonda2.mts`: quattro anni di sole nazioni non giocanti, 209 turni, seme `regnum`; l'uscita è in `sonda2.out`.
- `sonda3.mts`: opere e colonie; l'uscita è in `sonda3.out`.

Il repository è al commit `d65dbc7`. Non ho modificato nulla.

---

## Capi d'accusa, dal più grave

### 1. Industria bellica e miniere bloccate per sempre al livello 1
- **Tipo**: errore. **Gravità**: alta.
- **Prova**: `research.ts:maxLevel` (231-235) parte da 1 e alza il massimo solo con gli `unlocks` dell'albero. Nessuna ricerca di `research1881.ts` sblocca `bellica` o `miniera`. Misura (sonda 2): `maxLevel(GER,'bellica') = 1`, `maxLevel(GER,'miniera') = 1`, `unlockTech('bellica',2) = NESSUNO`. Eppure `BUILDINGS` dichiara `max: 3` per entrambe, e il 1881 semina Krupp a 3, Woolwich a 2, la Ruhr a 2 e Kimberley a 3.
- **Effetto**: il giocatore non potrà mai fare un secondo livello di arsenale o di miniera. Il rifiuto dice `serve la ricerca "?"`, perché `unlockTech` restituisce `undefined`. L'AI chiede `bellica` quando la logistica è scarsa (`aiConstruction`:371), ma sempre nella provincia più popolosa: se lì c'è già un livello, il tentativo fallisce ogni settimana. Lo stesso vale per la miniera, che è sempre la prima provincia con carbone o ferro (:374).
- **Rimedio**: aggiungere gli sblocchi, per esempio `cannoni_acciaio` per bellica 2, `tiro_rapido` per bellica 3, `dinamite` per miniera 2 e `trivellazione` o perforatrici ad aria compressa per miniera 3. Va aggiunto un test che percorra ogni `BuildingId` fino a `max`.

### 2. Opere nelle colonie valutate a popolazione piena: l'AI britannica costruisce in India e la logistica imperiale satura
- **Tipo**: errore, ed è anche un'interazione con il motore coloniale. **Gravità**: alta.
- **Prova**: `budget` (economy.ts:52) pesa le entrate fiscali con `colonialWeight`. Tre funzioni di `construction.ts` invece usano `pop` grezza:
  - `buildingIncome` (183-192);
  - `computeLogistics` (246, `popM` delle province possedute);
  - `aiConstruction` (365, `own` ordinato per `pop`).
- **Misure (sonda 3)**:
  - Le otto province più popolose del Regno Unito sono tutte indiane (Purnea, Moradabad, Dacca, Meerut…).
  - Un tessile di livello 1 a Purnea, con peso coloniale 0,08, rende 0,50 M a settimana. A Londra ne rende 0,29.
  - La capacità logistica britannica è 1.580, di cui circa 1.051 vengono dai milioni di abitanti, soprattutto indiani. Il rapporto è 13,7 e il fattore resta fisso al massimo (1,15).
  - Nei Paesi Bassi cinque delle prime sei province sono giavanesi. Fattore: 1,15.
- **Misura (sonda 2)**: in quattro anni il cantiere britannico più frequente è Meerut (10 cantieri), seguito da Dacca 7, Purnea 7 e Moradabad 6. Nelle isole britanniche non ne parte quasi nessuno. La Francia costruisce a Vinh Long (4), la Spagna a San Juan di Porto Rico (6).
- **Effetto**: le industrie coloniali rendono più di quelle della madrepatria e gonfiano `industryOf` del Regno Unito. Un esercito britannico non soffre mai di logistica, quale che sia la sua dimensione. Storicamente le industrie inglesi restavano in Inghilterra; in India si investiva in ferrovie e irrigazione.
- **Rimedio**: moltiplicare `popM` per `colonialWeight` in `buildingIncome` e `computeLogistics`. Nell'AI, ordinare per `pop × colonialWeight` e tenere le industrie fuori dalle colonie, oppure ridurne la resa.

### 3. Ricerca ancorata per sempre all'industria del 1881
- **Tipo**: errore. **Gravità**: alta.
- **Prova**: `research.ts:38` `industry = w.profiles[t]?.industry`, cioè il profilo statico, non `industryOf`. Da questo valore dipendono:
  - `researchSlots` (61);
  - `speedOf` (108, 0,6 + industria/125);
  - `minIndustry` in `researchRefusal` (93);
  - il "ne impareranno molto" di `collabScore` (178).
- **Misura (sonda 2)**: il Giappone passa da industria effettiva 2 a 10 in quattro anni, la Russia da 35 a 43, gli Stati Uniti da 75 a 88. Per la ricerca restano a 2, 35 e 75.
- **Effetto**: il Giappone dell'era Meiji resta con una ricerca alla volta e velocità 0,62 fino al 1914. Non potrà mai ricercare acciaierie integrate (45), elettrochimica (40), ferrovie strategiche (35) o sintesi dell'ammoniaca (60). Industrializzarsi non accelera la scienza, e il ciclo più importante dell'epoca, industria → ricerca → industria, è spezzato.
- **Rimedio**: usare `industryOf(w, t)` (è già in cache per giorno) in `industry()`. `research()` resta col profilo solo per le conoscenze iniziali.

### 4. Le nazioni non giocanti costruiscono in 7-10 province, mai porti, e la costruzione non assorbe denaro
- **Tipo**: difetto di modello, legato al noto problema delle casse. **Gravità**: alta.
- **Prova**: `aiConstruction` (356-386) sceglie sempre fra le stesse province:
  - ferrovie solo tra le 8 province più popolose (`Math.min(8, own.length)`);
  - industrie solo tra le prime 4;
  - campi dalla 3ª all'8ª;
  - una sola miniera (`own.find`);
  - una sola fortezza, la più popolosa sul confine.
  - Il porto non è mai fra i tentativi.
- **Misura (sonda 2, 1881-1885)**:
  - Province toccate: Russia 8 su 457, Germania 8 su 118, Austria-Ungheria 7 su 149, Regno Unito 9 su 554.
  - Porti avviati dalle potenze: zero.
  - Spesa in cantieri contro andamento del tesoro: USA 327 M mentre il tesoro passa da 259 a 10.331 M; Regno Unito 482 M (325 → 3.402); Germania 236 M (226 → 1.745).
- **Effetto**: la rete ferroviaria delle potenze non arriva mai alle frontiere. Le ferrovie strategiche verso la Vistola o la Galizia non esistono, e la velocità in `legDays` (orders.ts:88-89) richiede la ferrovia in **entrambe** le province. Le marine non trovano porti nuovi. Il denaro resta in cassa.
- **Rimedio**: scegliere le opere per valore marginale su tutte le province: ferrovie lungo le catene di province verso i confini rivali e i porti, porti dove serve rifornimento navale, industrie dove ci sono materie prime. Il tetto dei cantieri va legato alla riserva in eccesso.

### 5. La velocità della ricerca ignora il denaro e la dimensione del paese, e il costo è irrisorio
- **Tipo**: errore (il commento dice altro) e squilibrio. **Gravità**: media.
- **Prova**: `weeklyCost` (68-72) dichiara: «i paesi piccoli pagano meno, ma vanno anche più piano». `speedOf` (106-115) invece non usa né le entrate né la spesa.
- **Misure (sonda 1)**:
  - La velocità della Germania resta 1,83 anche con cassa a 0 e un milione di milioni di debito.
  - Belgio, con entrate di 9,5 M a settimana, ha tre ricerche alla volta e velocità 1,2. La Germania, con 70 M, ha anch'essa tre ricerche e velocità 1,26.
  - Le acciaierie integrate costano 1,2 M a settimana: lo 0,8% delle entrate britanniche e l'1,7% di quelle tedesche.
- **Effetto**: la ricerca è una coda a tempo, quasi gratuita per le potenze. Non c'è scelta fra cannoni e laboratori, e un piccolo paese industriale tiene il passo di una grande potenza.
- **Rimedio**: legare la velocità alla spesa effettiva, per esempio con un cursore di bilancio per la ricerca e rendimenti decrescenti. Una frazione della velocità va legata alla massa economica (entrate o popolazione urbana).

### 6. Conoscenze del 1881 ricavate da un solo numero: errori storici evidenti
- **Tipo**: difetto di modello ed errore nei dati. **Gravità**: media.
- **Prova**: `research()` (41-55) assegna una tecnica se `industria ≥ start`, senza eccezioni per paese. Risultati (sonda 1):
  - **USA (75)**: ignorano i pezzi intercambiabili (`start: 88`), anche se l'"American system of manufacturing" nasce negli arsenali di Springfield e Harpers Ferry prima del 1850. Ignorano il freno Westinghouse (brevetto americano del 1869) e il telefono (Bell, 1876; decine di migliaia di apparecchi negli USA nel 1880).
  - **Raffinazione del cherosene**: è datata 1883 e senza `start`, quindi nel 1881 non la conosce nessuno. Eppure si raffinava dagli anni 1850-60 (Łukasiewicz 1856, Standard Oil 1870, Branobel a Baku 1879).
  - **Germania (82)**: ignora il processo Thomas, che le acciaierie di Hörde e la Rheinische Stahlwerke usano dal 1879.
  - **Giappone e Cina (2)**: non conoscono né la retrocarica né il telegrafo. Il Giappone adotta il fucile Murata nel 1880; nel 1881 il telegrafo Tientsin-Shanghai è in costruzione e l'arsenale di Jiangnan fabbrica Remington.
- **Effetto**: la sonda 2 lo mostra. Nel primo anno le potenze "riscoprono" ciò che già avevano: USA il freno Westinghouse (1881,4) e il telefono, Germania i pezzi intercambiabili (1881,6) e il processo Thomas (1882,0), Giappone la retrocarica. Gli slot si sprecano a recuperare il presente.
- **Rimedio**: aggiungere a `Tech` un elenco `known1881?: Tag[]` di eccezioni per paese, e correggere `year` e `start` di `pezzi_intercambiabili` (circa 1855) e di `raffinazione` (circa 1865).

### 7. Cinque giacimenti "resi sfruttabili" su otto non producono nulla
- **Tipo**: errore. **Gravità**: media.
- **Prova**: `siteLots` (257) scarta la risorsa se la provincia la ha già. Misura (sonda 1):
  - Minette lussemburghese, Kiruna e Grängesberg cadono in province che hanno già `ferro`.
  - Grozny e Maikop cadono in province che hanno già `petrolio`.
  - Funzionano solo Briey, Kirkuk e Masjed Soleyman.
  - La minette della Lorena tedesca (Hayange), il beneficio storico principale del processo Thomas, non è nell'elenco.
- **Effetto**: `describeTech` promette effetti che non arrivano. Per la Svezia il processo Thomas non vale nulla.
- **Rimedio**: un giacimento scoperto deve aggiungere un lotto in più anche dove la risorsa c'è già, cioè un giacimento ricco. Vanno aggiunti la Lorena annessa e il Lussemburgo come lotti extra.

### 8. Miniere d'oro e di diamanti inerti, e una miniera belga finita in Francia
- **Tipo**: errore. **Gravità**: media.
- **Prova**: `MINERAL` (construction.ts:50) non contiene `oro` né `diamanti`, quindi `extraLots` ignora quelle miniere e `buildRefusal` (:295) vieta di costruirle. Misura (sonda 2): 8 delle 42 miniere del 1881 non danno nulla. Fra queste:
  - Kimberley, livello 3, nel Griqualand Ovest;
  - Ballarat, Geelong, Otago, Black Hills, Sabará e la Lena.
- Il Borinage è a `[3.6, 50.4]`, che cade nel «Nord francese», con il solo `bestiame`. Il Borinage è attorno a Mons (circa 3,9 E, 50,45 N), in Belgio.
- **Effetto**: niente corse all'oro, Kimberley morta, e il Belgio perde la sua miniera storica.
- **Rimedio**: aggiungere `oro` e `diamanti` a `MINERAL`, o a un insieme distinto per l'estrazione, e correggere le coordinate del Borinage.

### 9. Scarsa copertura della storia dopo il 1890
- **Tipo**: mancanza. **Gravità**: media.
- **Prova**: delle 62 tecniche, solo tre sono posteriori al 1900 (prospezione, organizzazione scientifica, Haber-Bosch). Mancano del tutto:
  - una linea navale: corazzate, dreadnought, siluri e sottomarini;
  - il motore Diesel, anche se lo scienziato Diesel c'è;
  - aviazione e autocarri;
  - i raggi X.
- Ritmo misurato: 3-4 ricerche all'anno per potenza (sonda 2). Il Regno Unito arriva a 42 conoscenze su 62 nel 1885.
- **Effetto**: dopo il 1895 la ricerca dei leader si riduce a tecniche lontane, penalizzate del 30% per anno di anticipo. Le corse agli armamenti del 1900-1914 non hanno strumenti.
- **Rimedio**: aggiungere almeno 12-15 tecniche fra il 1895 e il 1912, con una linea navale collegata a `naval`.

### 10. Effetti dichiarati quasi mai applicati, o con il segno sbagliato
- **Tipo**: errore e difetto di modello. **Gravità**: media.
- **Prova**:
  - `coalRelief` (economy.ts:66-67) vale solo con industria ≥ 50, carbone mancante e almeno tre province di montagna. L'Italia, per cui il «carbone bianco» è stato pensato (Paderno, Vizzola), ha industria 38 e secondo la mappa non le manca il carbone (sonda 2). Centrali idroelettriche e impianti alpini le danno zero, salvo il `+3` industria degli impianti. Il Regno Unito ha `coalRelief 0.5` (sonda 2) e non gli serve.
  - `mitragliatrice` ha `exhaustion: 1.03`: chi la inventa vede crescere più in fretta la **propria** stanchezza di guerra.
  - `upkeep` non è usato da nessuna tecnica.
- **Effetto**: tre ricerche di energia sono vuote per quasi tutti, e la Maxim è un malus.
- **Rimedio**: far valere l'idroelettrico come riduzione del fabbisogno di carbone delle industrie (`inputEfficiency`) o come industria per le province di montagna, e togliere `exhaustion` dalla mitragliatrice o applicarlo al nemico.

### 11. 186 livelli del 1881 sopra il massimo consentito dalla ricerca, con un significato dei livelli incoerente
- **Tipo**: difetto di modello. **Gravità**: bassa.
- **Prova (sonda 1)**:
  - Ferrovia 3 a Berlino e in Pomerania, ma la Germania non conosce il doppio binario.
  - Fortezza 3 a Metz e Parigi, ma il livello 3 è «calcestruzzo e cupole corazzate» (1887).
  - Porto 3 a San Pietroburgo con un massimo di 2.
  - L'arsenale di Jiangnan è a livello 2, ma la Cina conosce zero tecniche.
- **Effetto**: un livello significa cose diverse se è del 1881 o se è costruito. Il giocatore vede opere che non potrebbe fare.
- **Rimedio**: allineare `start` e i livelli seminati, oppure dichiarare che i livelli del 1881 sono «vecchio stile» e separare la protezione dal calcestruzzo, che è già `fortArmor` della nazione.

### 12. L'AI non collabora mai
- **Tipo**: mancanza. **Gravità**: bassa.
- **Prova**: `proposeCollab` è chiamata solo da `ui/research-view.ts:180`. `aiResearch` usa soltanto `startResearch`, e il prompt LLM (`prompts.ts:45`) vieta di firmare patti nel dialogo.
- **Effetto**: la «ricerca in comune» è uno strumento del solo giocatore. Il modello delle valutazioni (alleanza +25, militare −25, rivalità −40) è plausibile, ma il mondo non lo usa. Il giocatore invece occupa uno slot del partner e prende per sé la velocità ×1,3 del più industriale.
- **Rimedio**: far proporre all'AI patti di medicina e agricoltura fra alleati, e al giocatore quando la stima è alta.

### 13. Exploit: investire e annullare in un vassallo; annullare il cantiere di un altro
- **Tipo**: errore. **Gravità**: bassa.
- **Prova**: `startProject` (312-313) aumenta `sub.invested` del costo pieno, mentre `cancelProject` (319-327) rimborsa metà e non toglie l'investimento. Misura (sonda 1): quattro aperture e annullamenti di campi in Trucial: spesa netta 8 M, `invested` da 0 a 16. Con `vassals.ts:134` (−0,5 per milione, massimo 20), il desiderio di indipendenza si compra a metà prezzo.
- Inoltre `cancelProject(w, id)` non controlla chi annulla. La sonda ha annullato un cantiere ottomano, rimborsando metà all'Impero ottomano. La UI oggi mostra solo i propri cantieri, ma la regola sta nell'interfaccia, contro la regola 3 di AGENTS.md.
- **Rimedio**: in `cancelProject` aggiungere il parametro `by` e la verifica, e sottrarre `cost` da `invested`. In alternativa, contare l'investimento solo a lavori finiti.

### 14. La medicina tropicale non tocca il coloniale
- **Tipo**: mancanza di interazione. **Gravità**: media.
- **Prova**: `chinino` e `medicina_tropicale` danno solo `attrition` (supply.ts:65). Il coloniale non legge `techEffects`: non c'è nessun riferimento in `colonial.ts`.
- **Effetto**: storicamente la profilassi col chinino è la condizione della spartizione dell'Africa (D. Headrick, *The Tools of Empire*, 1981, cap. 3). Qui una potenza senza chinino conquista l'interno africano come una che lo ha.
- **Rimedio**: un fattore di riuscita e di costo delle campagne coloniali in zone tropicali, da chinino e medicina tropicale. Va definito con la corte coloniale.

### 15. Prestazioni: due cicli su tutte le province per ogni nazione, ogni settimana
- **Tipo**: difetto. **Gravità**: bassa.
- **Prova**: `maintenanceOf` (390-395) e `manpowerBonus` (209-214) scorrono `b.length` (4.532 province) per ognuna delle 166 nazioni, invece di usare `controlled()`. Misura (sonda 1): 22 ms e 27 ms per un giro completo. La fase economia costa circa 91 ms a turno (sonda 2: 18.953 ms su 209 turni). Anche `hasRes` della ricerca (75-79) scorre tutta la mappa a ogni risorsa e progetto.
- Costruzione e ricerca in sé pesano poco: 6,6 e 3 ms a turno.
- Le cache sono corrette per partita (`WeakMap` sullo stato). La chiave `day:nextId:version:trades` però non vede gli uomini persi o rinforzati nello stesso giorno, quindi `logistics().men` è vecchio fino al giorno dopo.
- **Rimedio**: usare `controlled()` e la cache per nazione in `maintenanceOf` e `manpowerBonus` (il risparmio stimato è di circa metà della fase economia), e un indice delle province per nazione in `hasRes`.

### 16. Test troppo sottili e dati minori
- **Tipo**: mancanza. **Gravità**: bassa.
- **Test**: `tests/costruzione.test.ts` e `tests/ricerca.test.ts` contengono tre casi in tutto. Non provano:
  - le scelte dell'AI;
  - l'annullamento e il vassallo;
  - i livelli massimi raggiungibili (avrebbero trovato il capo 1);
  - i giacimenti inerti (capo 7).
- **Dati**:
  - Malta, base della Mediterranean Fleet, non ha né porto né fortezza.
  - «Urali» ed «Ekaterinburg» sono la stessa coordinata.
  - «Bonifica integrale» (1900) è un anacronismo: il termine e la legge sono di Serpieri, 1928.
  - Lo SPEC dice «± 1,5 × punti», ma il codice usa 0,5.

---

## Ciò che il motore fa bene (da non rompere)

- **Determinismo e cassa**: ogni spesa passa da `post()` del registro. Il cantiere si perde se la provincia cambia padrone (`weeklyConstruction`:336-341), e i lavori si fermano sotto occupazione.
- **Il primo livello libero, gli altri dalla ricerca**: è un legame chiaro fra i due motori, e le materie prime (`inputEfficiency`) danno peso al commercio.
- **Penalità di anticipo** (+30% a ogni anno): nella sonda solo 18 conclusioni su 549 precedono la data storica, e di uno o due anni al più. La ricerca rimane nel suo tempo.
- **Scienziati storici**: anni di attività corretti (Tesla in Austria-Ungheria fino al 1883, Maxim a Londra dal 1884, morti di Krupp nel 1887, di Pasteur nel 1895, di Hertz nel 1894), uno per progetto.
- **Fortezze contro alti esplosivi e calcestruzzo** (`fortBreak`/`fortArmor`): è la vera «crisi dell'obice-torpedine» del 1885-1887, ben resa.
- **Cache per partita** con `WeakMap`, chiavi esplicite e `touchBuildings` al cambio di padrone.
- **L'elenco delle opere del 1881** è ricco e in gran parte giusto: Metz, Przemyśl, Novogeorgievsk, Krupp, Tula, Jiangnan, Kaiping (aperta nel 1881), Tomioka.
- **La valutazione della collaborazione** è leggibile, con le ragioni esplicite.

## Interazioni con altri motori

- **Coloniale** (capi 2 e 14):
  - La popolazione coloniale piena gonfia rendite delle opere, logistica e scelte dell'AI.
  - Investire in un protettorato abbassa il desiderio di indipendenza, sfruttabile col capo 13.
  - La medicina tropicale è assente dalle campagne.
  - Una guerra coloniale non tocca i cantieri. In cambio, la cessione di una colonia fa perdere il cantiere senza rimborso: è coerente.
- **Economia e casse**: le opere rendono troppo in fretta. Un tessile di livello 1 si ripaga in 14 settimane a Purnea e in 29-31 a Napoli o a Essen (sonda 1), contro un debito al 4,5% annuo. Nello stesso tempo l'AI spende poco: la costruzione alimenta le casse esplose invece di assorbirle.
- **Movimento e rifornimenti**: la velocità ferroviaria richiede la ferrovia in tutte e due le province. Con l'AI concentrata su 8 città (capo 4), le guerre restano lente: è una delle cause del noto «AI lenta in guerra». La logistica satura dei grandi imperi (capo 2) toglie ogni vincolo di rifornimento al Regno Unito e ai Paesi Bassi.
- **Commercio**: `extraLots` e i giacimenti entrano in `nationResources`, quindi gli errori dei capi 7 e 8 tolgono valore commerciale.
- **Politica**: `techEffects` si somma a `govEffects` (politics.ts:117-118). Stabilità e qualità della ricerca agiscono attraverso il governo: va bene, ma un effetto `upkeep` futuro passerebbe di lì senza test.
- **Pace**: le riparazioni industriali smontano bellica e siderurgia. Col capo 1 l'industria bellica smontata non si può più ricostruire oltre il livello 1.
