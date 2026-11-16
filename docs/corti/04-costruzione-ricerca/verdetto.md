# Corte 04 — Costruzione e ricerca: verdetto

> **Sessione**: l'atto d'accusa è di una sessione precedente (commit `d65dbc7`); questa giuria ha verificato in una sessione separata, sul commit `92b10c0` (i file imputati sono **invariati** fra i due commit). Nessuna modifica al repository fuori dalla cartella della corte.
>
> **Metodo della giuria**: riletti `construction.ts`, `research.ts`, `buildings1881.ts`, `research1881.ts`, `economy.ts` (r. 47-87), `vassals.ts` (r. 134), `politics.ts` (r. 118), i test (3 casi totali) e le sonde dell'accusa con i loro `.out`. Scritta e lanciata una sonda indipendente (`sonde/giuria-verifica.mts`, ~3 s, seme `regnum`) che riesegue i capi più gravosi. I fatti storici dei giurati vengono dalla memoria, non da una ricerca.

I tre giurati: (1) storico della seconda rivoluzione industriale, (2) progettista di alberi tecnologici, (3) collaudatore degli effetti dichiarati.

---

## A. La difesa del motore: capo per capo

| capo | esito | verifica della giuria |
|---|---|---|
| 1. Bellica e miniere bloccate al livello 1 | **confermato** | `maxLevel` parte da 1 e cresce solo con `unlocks`; nessuna tech sblocca `bellica` o `miniera`. Sonda giuria: `GER bellica max 1`, `miniera max 1`, `unlockTech('bellica',2)=undefined`. `BUILDINGS` dichiara `max:3` e il 1881 semina Krupp 3, Ruhr 2, Kimberley 3. Il rifiuto dice «serve la ricerca "?"». |
| 2. Opere coloniali a popolazione piena | **confermato** | `buildingIncome` (r. 183-192), `computeLogistics` (r. 246) e `aiConstruction` (r. 365) usano `pop` grezza; `budget` (`economy.ts:54`) pesa con `colonialWeight`. Sonda: top 8 GBR tutte indiane (cw=0,08), logistica 1580 con fattore 1,15. |
| 3. Ricerca ancorata all'industria del 1881 | **confermato** | `industry()` (`research.ts:38`) legge `w.profiles[t]?.industry`, statico; `industryOf` (costruzioni) no. Ne dipendono `researchSlots` (:61), `speedOf` (:108), `minIndustry` (:93), `collabScore` (:178). |
| 4. AI costruisce in 7-10 province, mai porti | **confermato** | `aiConstruction` (356-386): fortezza solo sul confine più popoloso, industrie fra le prime 4, ferrovie fra le prime 8, una sola miniera; **il porto non è mai fra i tentativi**. Sonda 2: Russia 8/457, Germania 8/118, porti zero. La parte «non assorbe denaro» è conseguenza delle casse gonfiate (corte 03). |
| 5. Velocità ricerca ignora denaro e dimensione | **confermato** | `weeklyCost` (:68-72) promette nel commento «i paesi piccoli […] vanno più piano», ma `speedOf` (:106-115) usa solo industria/scienziati/input/stabilità: nessuna entrata, nessuna spesa. Belgio (industria 75) ha 3 slot come la Germania. |
| 6. Conoscenze 1881 da un solo numero | **confermato** | `research()` (:41-55): `x.start !== undefined && ind >= x.start`, nessuna eccezione per paese. Sonda: USA(75) senza `pezzi_intercambiabili`/telefono, GER(82) senza `thomas`, JAP/CHI(2) senza retrocarica e telegrafo. |
| 7. Cinque giacimenti su otto inerti | **confermato** | `siteLots` (:257) filtra `!w.map.resources[p].includes(r)`. Sonda: inerti Minette lussemburghese, Kiruna, Grängesberg, Grozny, Maikop; funzionano Briey, Kirkuk, Masjed Soleyman. La minette di Lorena (Hayange) non è nell'elenco. |
| 8. Miniere d'oro/diamanti inerti, Borinage in Francia | **confermato** | `MINERAL` (:50) non ha `oro`/`diamanti`, quindi `extraLots` e `buildRefusal` (:295) le ignorano. Sonda: 8 miniere su 42 inerti (Griqualand Ovest=Kimberley, Kirensk="Lena", Black Hills, Ballarat, Geelong, Otago, Sabará, Nord francese=Borinage). Borinage a [3.6, 50.4] cade nel Nord francese (solo bestiame). |
| 9. Scarsa copertura dopo il 1890 | **confermato** | Solo 3 tecniche al/oltre il 1900 (`prospezione` 1900, `organizzazione_scientifica` 1905, `haber_bosch` 1910). Nessuna linea navale (corazzate/dreadnought/siluri/sommergibili), nessun motore Diesel, nessuna aviazione, nessun raggio X. |
| 10. Effetti dichiarati non applicati o col segno sbagliato | **confermato** | `coalRelief` (`economy.ts:66-67`) serve montagne ≥3 **e** industria ≥50 **e** carbone mancante: l'Italia (23 montagne, industria 38, carbone non mancante) prende zero salvo il +3 industria. `mitragliatrice` ha `exhaustion:1.03`: chi la inventa accelera la propria stanchezza. `upkeep` non è settato da nessuna tech. |
| 11. 186 livelli del 1881 sopra il massimo | **confermato** | Sonda giuria: **186** livelli oltre `maxLevel` (San Pietroburgo porto 3>2 e fortezza 3>2, Tula bellica 2>1, ferrovie 3>2 prussiane in massa). |
| 12. L'AI non collabora mai | **confermato** | `proposeCollab` chiamata solo da `ui/research-view.ts:180`; `aiResearch` usa solo `startResearch`; il prompt LLM vieta i patti nel dialogo. |
| 13. Exploit investire/annullare, annullare altrui | **confermato** | `startProject` (:312-313) somma il costo pieno a `sub.invested`; `cancelProject` (:319-327) rimborsa metà senza sottrarlo e senza verificare `by`. `vassals.ts:134` riduce la libertà di `−min(20, invested*0.5)`: la fedeltà si compra a metà prezzo. |
| 14. Medicina tropicale non tocca il coloniale | **confermato** | `chinino`/`medicina_tropicale` danno solo `attrition`; nessun riferimento a `techEffects`/`chinino`/`attrition` in `colonial.ts`. |
| 15. Prestazioni: due cicli su tutte le province | **confermato** | `maintenanceOf` (:390-395) e `manpowerBonus` (:209-214) scorrono `b.length` (4.532) per ciascuna nazione; `hasRes` (`research.ts:75-79`) riscorre la mappa per risorsa e progetto. |
| 16. Test sottili e dati minori | **confermato** | 3 test in tutto (`costruzione` 1, `ricerca` 2); non provano AI, annullamenti, `maxLevel`, giacimenti. Malta senza porto/fortezza, «Urali» ed «Ekaterinburg» stessa coordinata, «Bonifica integrale» (termine/legge di Serpieri, 1928), SPEC dice ±1,5 il codice 0,5. |

---

## B. Ciò che l'accusa non ha visto

### Giurato 1 — storico della seconda rivoluzione industriale
1. **La minette della Lorena tedesca manca dai `sites` di Thomas** (e non solo per Hayange): i 4 siti ferro sono Briey, Lussemburgo, Kiruna, Grängesberg. Il processo Thomas fu inventato **per** la minette lorenese (fosforosa); omettendola, la ragione storica della tech svanisce (prova: `research1881.ts:54`).
2. **`raffinazione` (cherosene) senza `start`** costringe anche la Russia di Baku a riscoprire nel 1883 ciò che raffina da 20 anni (Branobel dal 1879). Coerente con `trivellazione` (1859, start 30), ma il distillato la contraddice (prova: `research1881.ts:61`).
3. **La rete ferroviaria 1881 arriva a livello 3 senza doppio binario** (1885): la formula `round(rail/100*3*f)` dissocia il livello seminato dall'albero. È la stessa incoerenza del capo 11, ma sulla ferrovia è sistematica in Prussia (Potsdam, Berlino, Rostock…) (prova: `construction.ts` `buildings()`, sonda capo 11).

### Giurato 2 — progettista di alberi tecnologici
1. **Gli effetti delle tecniche note al 1881 sono invisibili**: `techEffects` fa `slice(start)` e commenta «il resto è già nei profili», ma `describeTech` continua a dichiarare effetti che il riepilogo non mostra né quantifica. L'albero è poco leggibile nel primo turno (prova: `research.ts:224-226`).
2. **La velocità base è troppo piatta**: `0.6 + industry/125` va da 0,6 (industria 0) a 1,4 (industria 100); fra 0 e 50 il divario è solo 1,6× e non c'è rendimento decrescente. L'accelerazione del capo 3, una volta riparata, resterà debole (prova: `research.ts:108`).
3. **Gli slot saltano solo sul profilo**: `researchSlots` (1→2 a 35, 2→3 a 75) usa `industry()` statica; un paese che si industrializza da 34 a 40 costruendo non guadagna lo slot. Conseguenza del capo 3 sul numero di ricerche, non solo sulla velocità (prova: `research.ts:61`).

### Giurato 3 — collaudatore
1. **`upkeep` è un canale spento ma non morto**: nessuna tech lo setta (capo 10), però `techEffects` lo accumula e `politics.ts:118` lo moltiplica in `govEffects.upkeep`. Non è un buco nel motore: è un manopola che nessuno può girare (prova: `politics.ts:118`).
2. **Il malus `exhaustion` della mitragliatrice colpisce entrambi** in una collaborazione: `techEffects` è cumulativo per nazione, e chi completa `mitragliatrice` in collab riceve il 103% di stanchezza. Peggiora il capo 10 (prova: `research.ts:221` + settimana collaborativa).
3. **`provinceCapacity` usa `pop/1e6` grezza** (cap a 40): le metropoli coloniali (Purnea, Dacca) danno capienza massima come Londra. È il capo 2 su un **quarto** punto (income, logistica, scelte AI e ora capienza) (prova: `construction.ts:257`).

---

## C. I voti (1-10)

| | correttezza | fedeltà storica | qualità di gioco | manutenibilità |
|---|---|---|---|---|
| Storico | 5 | 6 | 4 | 7 |
| Progettista | 4 | 5 | 4 | 6 |
| Collaudatore | 4 | 6 | 5 | 5 |
| **media** | **4,3** | **5,7** | **4,3** | **6,0** |

Motivazioni in una riga: (storico) «dati ricchi e scienziati giusti, ma il modello a un solo numero sbaglia l'assegnazione e la chimica del 1881»; (progettista) «l'albero è ben tipato ma il giro industria→ricerca è interrotto e la profondità di scelta è minima»; (collaudatore) «effetti dichiarati che non arrivano, segni sbagliati, e i tre test non avrebbero colto nulla».

---

## D. Il verdetto della corte

### Da fare subito (errori e rotture di gioco)
1. **Sblocchi per bellica e miniera** (capo 1, *errore*, alto, piccolo): aggiungere `unlocks` (es. `cannoni_acciaio`→bellica 2, `tiro_rapido`→bellica 3, `dinamite`→miniera 2, `trivellazione`→miniera 3) e un test che percorra **ogni** `BuildingId` fino a `max`. Misura: `maxLevel ≥ BUILDINGS[k].max` raggiungibile per tutti i tipi.
2. **Popolazione coloniale pesata** (capo 2, *errore*, alto, piccolo): moltiplicare `popM` per `colonialWeight` in `buildingIncome`, `computeLogistics` e nell'ordinamento di `aiConstruction`. Misura: tessile 1 a Purnea rende meno che a Londra; logistica GBR scende sotto il fattore massimo.
3. **`industryOf` nella ricerca** (capo 3, *errore*, alto, piccolo): usare `industryOf(w,t)` in `industry()` (`research.ts:38`), lasciando il profilo solo per le conoscenze iniziali. Misura: il Giappone che passa a industria 10 guadagna lo slot e la velocità.
4. **Giacimenti non scartati** (capo 7, *errore*, medio, piccolo): un giacimento deve aggiungere un lotto anche dove la risorsa c'è già; aggiungere la minette lorenese. Misura: 8/8 siti producono un lotto extra.
5. **Oro e diamanti estraibili + Borinage** (capo 8, *errore*, medio, piccolo): aggiungere `oro`/`diamanti` a `MINERAL` (o a un insieme distinto) e correggere le coordinate del Borinage. Misura: 0 miniere inerti; Kimberley estrattiva.
6. **Mitragliatrice senza `exhaustion`** (capo 10, *errore*, medio, piccolo): togliere il 1,03 (o applicarlo al nemico). Misura: chi la ricerca non peggiora la propria stanchezza.
7. **`cancelProject` con `by`** (capo 13, *errore*, basso, piccolo): parametro `by`, verifica del titolare, sottrazione di `cost` da `invested`. Misura: non si annulla un cantiere altrui; l'investimento cala con l'annullamento.

### Da fare nella fase di bilanciamento
8. **AI che costruisce per valore marginale** (capo 4, *difetto di modello*, alto, medio): scelta su tutte le province, porti inclusi, ferrovie lungo le catene verso i confini e i porti, tetto dei cantieri legato alla riserva. Misura: la potenza tocca più di una decina di province e apre porti.
9. **Velocità legata alla spesa** (capo 5, *squilibrio*, medio, medio): cursore di bilancio per la ricerca, rendimenti decrescenti, una frazione legata alla massa economica. Misura: un paese piccolo non tiene il passo di una grande potenza.
10. **`known1881` per paese** (capo 6, *difetto di modello*, medio, medio): elenco di eccezioni per paese e correzione di `year`/`start` di `pezzi_intercambiabili` (~1855) e `raffinazione` (~1865). Misura: USA/GER/chi non "riscopre" ciò che aveva.
11. **Tecniche 1895-1912** (capo 9, *mancanza*, medio, medio-grande): 12-15 tecniche con una linea navale collegata a `naval`. Misura: i leader arrivano al 1914 con strumenti di corsa agli armamenti.
12. **Allineare start e livelli seminati** (capo 11, *difetto di modello*, basso, piccolo): `start` coerenti o livelli del 1881 "vecchio stile". Misura: pochi o zero livelli oltre `maxLevel`.
13. **AI che propone collaborazioni** (capo 12, *mancanza*, basso, piccolo): patti di medicina/agricoltura fra alleati. Misura: i patti esistono fuori dal solo giocatore.
14. **Medicina tropicale nel coloniale** (capo 14, *mancanza di interazione*, medio, medio): fattore di riuscita/costo delle campagne in zone tropicali da `chinino`/`medicina_tropicale`, definito con la corte 00. Misura: una potenza senza chinino è rallentata in Africa.
15. **`controlled()` in manutenzione/leva** (capo 15, *difetto*, basso, piccolo): usare `controlled()` e un indice per nazione in `hasRes`. Misura: la fase economia scende sotto i ~45 ms/turno.
16. **Test al motore dei dati** (capo 16, *mancanza*, basso, piccolo): un test per capi 4, 13, 1, 7; correggere Malta, «Urali»/«Ekaterinburg», «Bonifica integrale», il ±0,5 di SPEC. Misura: i test coprono AI/annullamento/livelli/giacimenti.

### Da rimandare o non fare
- **Cursore completo "cannoni vs laboratori"** (capo 5): dipende dalla corte 03 sulle casse; farlo ora significa rifarlo dopo il bilanciamento del tesoro.
- **Separare "livelli del 1881 vecchio stile" dai livelli costruiti** (capo 11): non vale il costo; basta l'allineamento dei dati (voce 12).
- **Diplomazia scientifica dei non giocanti oltre gli alleati** (capo 12, esteso): senza guerre fra nazioni non giocanti (corte 02) l'effetto non si vedrebbe.

### Da non toccare (funziona)
Determinismo e passaggio delle spese da `post()` del registro; cantiere perduto se la provincia cambia padrone e fermo sotto occupazione; cache per partita `WeakMap` con `touchBuildings` e `industryBase`; la penalità di anticipo (+30%/anno: solo 18/549 prima della data, al più 1-2 anni); gli scienziati storici (anni e nazioni corretti); `fortBreak`/`fortArmor` (la crisi dell'obice-torpedine resa bene); `collabScore` con ragioni leggibili; l'efficienza delle materie prime (`inputEfficiency`).

### Interazioni con le altre corti
- **Coloniale (00)**: capi 2, 13, 14 dipendono dal peso coloniale, dai vassalli e dalle campagne tropicali.
- **Economia (03)**: capi 4 e 5 condivisi con il problema delle casse gonfiate.
- **Pace (07)**: le riparazioni smontano bellica/siderurgia; col capo 1 la bellica smontata non si ricostruisce oltre il livello 1.
- **IA (02) / LLM (09)**: il capo 12 (collaborazione) e le scelte di ricerca dell'AI sono freni del motore sul dialogo.
