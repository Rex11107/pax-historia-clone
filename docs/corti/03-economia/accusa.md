# Atto d'accusa — Corte "Economia, finanze, commercio e risorse"

*L'ispettore del Tesoro, 16 novembre 2026.*

Imputati: `src/engine/economy.ts`, `ledger.ts`, `trade.ts`, `resources.ts`, `resources-world.ts`, i profili di `src/scenario/`, i test `commercio`, `ledger`, `turn`, il rapporto `docs/rapporti/1881-1899.md`.

Prove raccolte con tre sonde nella cartella della corte:
- `sonda1.mts`: bilanci di partenza scomposti e tre anni di simulazione, 51 s.
- `sonda2.mts`: rendimento delle opere, debito senza fondo, composizione delle rendite britanniche, commercio.
- `sonda3.mts`: confronto fra occupare e annettere fuori d'Europa.

Unità: milioni a settimana (M/sett.) salvo dove indicato.

## Premessa: perché le casse esplodono, in numeri

Bilancio britannico al primo turno (sonda 1):

- Entrate: 147,6, così composte:
  - 53,6 dalle risorse delle province;
  - 13,3 dalle opere;
  - circa 81 dalla popolazione.
- Spese:
  - esercito 3,8;
  - amministrazione 59,0;
  - spese civili 5,6;
  - manutenzione 6,2;
  - interessi 16,4;
  - opere pubbliche 3,0.
- **Saldo: +53,5 a settimana, il 36% delle entrate.**

Gli altri, sempre al primo turno:

| nazione | saldo / entrate | risparmio |
|---|---|---|
| Stati Uniti | 46,3 / 85,2 | 54% |
| Giappone | 14,8 / 30,2 | 49% |
| Germania | 21,1 / 70,3 | 30% |

Quattro cause si sommano:

1. **Le spese non seguono le entrate.** L'unica voce proporzionale alle entrate è l'amministrazione: il 28%, più lo 0,04% per provincia fino al 12% (`economy.ts:budget:74`). Esercito (0,035 M ogni mille uomini, `:72`), spese civili (0,1 M per milione di abitanti, `:76`) e manutenzione sono piccole e fisse. Una nazione con un esercito piccolo e poco debito risparmia per costruzione circa metà di ciò che incassa.
2. **Le rendite dell'impero entrano intere a Londra** (capo 2).
3. **Nessuno spende l'avanzo.** In tre anni simulati il Regno Unito ha messo nei cantieri 343 milioni, contro circa 9.000 di saldo: l'avanzo è andato al rimborso del debito (5.876) e alle casse. Gli Stati Uniti hanno speso 271 milioni nei cantieri, e le loro casse sono passate da 259 a 7.538. Le nazioni non giocanti costruiscono al massimo 4 cantieri da 4 a 36 M l'uno (`construction.ts:aiConstruction:362`). Rimborsano un quarto dell'eccedenza oltre 20 settimane di entrate (`economy.ts:aiFinances:181`), e quando il debito è finito non resta niente da fare con il denaro.
4. **Il saldo cresce da sé.** Il debito rimborsato toglie gli interessi; opere, industria e ricerca alzano le entrate. Il saldo britannico passa da 53,5 a 66,9 in tre anni (sonda 1) e a 95,8 nel 1899 (rapporto). Fra il 1896 e il 1899 le casse britanniche crescono di circa 5.000 milioni l'anno: è il saldo di 95,8 per 52 settimane.

Il confronto con la storia è netto. Nell'esercizio 1880-81 il Regno Unito incassò 84,04 milioni di sterline e ne spese 83,11, con un debito di 768,7 milioni al 31 marzo 1881 (Gladstone, *Financial Statement*, Hansard, 4 aprile 1881). L'avanzo vero fu di 0,93 milioni di sterline, cioè 0,45 M di franchi a settimana: il motore ne dà 120 volte tanto. Gli Stati Uniti ebbero un avanzo, ma lo usarono per il debito: 165 milioni di dollari di pagamenti del debito nel 1881 (*Statistical Abstract of the United States*, 1880-84, FRASER), su un debito di 2.069 milioni di dollari al 1° luglio 1881 (RangeVoting, serie del Tesoro).

## Capi d'accusa, per gravità

### 1. Nessuna spesa assorbe l'avanzo: casse che crescono senza fine
- **Tipo**: squilibrio e difetto di modello. **Gravità: critica.**
- **Prova**: la premessa, poi il rapporto 1881-1899:
  - casse a fine periodo: Regno Unito 57.849, Stati Uniti 54.171, Germania 25.724;
  - ricchezza netta del mondo da −28.405 a +306.899.
  - La riserva desiderata (`reserveOf`, `economy.ts:160`) è di 20 settimane di entrate, ma serve soltanto a decidere il rimborso del debito.
  - `aiFinances` (`:184-185`) non abbassa mai le imposte per abbondanza: torna da "alte" a "normali" solo se la stabilità è sotto 60, e non scende mai a "basse".
- **Effetto sul giocatore**:
  - le cifre perdono senso, e dopo dieci anni ogni potenza non giocante può pagare qualunque cosa;
  - indennità di guerra, acquisti coloniali (l'Eritrea per 8 milioni) e sussidi diventano spiccioli;
  - il giocatore che spende e combatte si confronta con avversari che hanno trent'anni di entrate in cassa.
- **Rimedio**:
  - spese che crescono con le entrate (amministrazione e spese civili sul reddito, la legge di Wagner);
  - una politica di bilancio delle nazioni non giocanti che porti il saldo verso zero (meno imposte, più esercito e flotta, più opere) una volta raggiunta la riserva.

### 2. Le rendite dell'impero entrano intere nella cassa metropolitana
- **Tipo**: errore (incoerenza interna). **Gravità: alta.**
- **Prova**:
  - La popolazione delle province extraeuropee di altro popolo pesa 0,08 (`ethnic.ts:colonialWeight:57`; nel bilancio a `economy.ts:54`).
  - Le risorse di quelle stesse province contano invece per intero: `nationResources` (`resources.ts:225-238`) non applica alcun peso.
  - Sonda 2: delle risorse britanniche (50,85 M/sett.) solo 5,91 vengono dall'Europa. Gli altri **44,9 M/sett.** arrivano da India, Canada, Australia e Africa, e da soli sono quasi un terzo delle entrate britanniche.
  - Nella storia le entrate dell'India restavano all'India e mantenevano l'esercito indiano.
- **Effetto**: il Regno Unito parte con il saldo più alto del mondo; ogni conquista coloniale rende a pieno in risorse e quasi nulla in imposte.
- **Rimedio**: pesare la rendita delle risorse con `colonialWeight`, o una quota fissa per le colonie. Il grosso del valore coloniale deve passare da `colonyIncome`.

### 3. Entrate pro capite quasi uniformi; "finance" non entra nel bilancio; unità non dichiarata
- **Tipo**: difetto di modello. **Gravità: alta.**
- **Prova**:
  - Le entrate valgono `popolazione × (0,6 + 0,8·industria/100) × imposte × ...` (`economy.ts:69`). Fra il paese più povero e il più industriale lo scarto per abitante è al massimo 2,3 volte.
  - Il campo `finance` del profilo (Regno Unito 95, Impero ottomano 8) entra solo nelle casse iniziali (`setup.ts:37`) e nella perdita di stabilità in disavanzo (`economy.ts:108`), mai nelle entrate né nel tasso d'interesse.
  - I "milioni" non sono dichiarati da nessuna parte (`types.ts:92` dice "milioni").
  - I debiti iniziali tornano in franchi oro:
    - Regno Unito: 768,7 M£ × 25,22 = 19.390 M di franchi, contro 19.000 nel profilo (`europe1881.ts:67`);
    - Francia 20.000 e Italia 10.500, plausibili in franchi e lire.
  - Le entrate, misurate in quella stessa unità, non tornano:
    - Regno Unito: 84 M£ sono 2.120 M di franchi, cioè 41 a settimana; il motore ne dà 147,6, **3,6 volte tanto**;
    - Stati Uniti: spese ordinarie nette di 177 M$ nel 1881 (Statistical Abstract), cioè circa 920 M di franchi; il motore spende 38,8 M/sett. senza interessi, cioè 2.020 M l'anno.
  - Il rapporto fra debito e entrate, la grandezza che conta, è quindi falsato per tutte le nazioni coloniali e popolose.
- **Effetto**: il debito pesa poco a chi ha molti sudditi; Russia (108 M/sett.) e Cina (60,7) incassano come potenze industriali.
- **Rimedio**:
  - dichiarare l'unità (milioni di franchi oro) nel codice e in SPEC;
  - un gettito pro capite per paese nel profilo, tarato sui bilanci del 1881, al posto della formula unica.

### 4. SPEC dichiara un risparmio del 5-15%; il codice ne dà il 30-54%
- **Tipo**: errore (il codice non fa ciò che dichiara). **Gravità: alta.**
- **Prova**:
  - SPEC.md:87, "Revisione dell'economia": "in pace le grandi potenze risparmiano il 5-15%".
  - Misura al primo turno (sonda 1): Regno Unito 36%, Stati Uniti 54%, Giappone 49%, Germania 30%, Russia 13%.
- **Effetto**: la taratura dichiarata non c'è, e chi legge SPEC si fida di un numero falso.
- **Rimedio**: un test che fissi il risparmio iniziale delle potenze in una forchetta, e poi la taratura (capi 1-3).

### 5. Debito senza fondo: nessun limite, nessun default, un tasso uguale per tutti
- **Tipo**: mancanza e difetto di modello. **Gravità: alta.**
- **Prova**:
  - `ledger.ts:cover:52-60` trasforma qualunque ammanco in debito al 110%, senza tetto.
  - Gli interessi sono al 4,5% per tutti (`economy.ts:79`), corretti solo dai ministri. Tutti pagano lo stesso: i consols britannici (3%, poi convertiti da Goschen nel 1888), l'Italia, l'Impero ottomano, che nel profilo è "in bancarotta" (fece default nel 1875-76, e nel 1881 nacque l'Amministrazione del debito pubblico).
  - L'unica conseguenza del disavanzo è un calo di stabilità di 1,2 − finance/100 punti a settimana (`economy.ts:108`), che l'obiettivo di stabilità recupera.
  - Sonda 2: l'Italia giocatore con mobilitazione generale, imposte basse e grandi opere per due anni ha un saldo di −10 a settimana. Il debito sale da 10.500 a 11.589, la stabilità **sale** da 63 a 67,5, e nessun creditore si fa vivo.
- **Effetto**: si può vivere in disavanzo per sempre; la bancarotta, motore della storia di Egitto, Tunisi, Impero ottomano e Grecia (1893), non esiste.
- **Rimedio**:
  - un tasso che cresca con il rapporto fra debito e entrate e con `finance`;
  - oltre una soglia, niente nuovi prestiti e un default, con un controllo internazionale come a Tunisi e al Cairo.

### 6. Il giocatore non può rimborsare il debito né chiedere un prestito
- **Tipo**: mancanza. **Gravità: alta.**
- **Prova**:
  - `repay` è chiamato solo da `aiFinances` (`economy.ts:182`).
  - In `src/ui` non c'è nessun comando di rimborso o di prestito: l'unica riga è "Debito pubblico" in sola lettura (`app.ts:686`).
- **Effetto**: l'Italia del giocatore paga 9,45 M/sett. di interessi, il 30% delle entrate, per tutta la partita, mentre le nazioni non giocanti saldano il loro debito (Regno Unito a zero entro il 1891). È un'asimmetria contro chi gioca.
- **Rimedio**: in Governo → Bilancio, un rimborso volontario (`repay`) e un'emissione volontaria di debito (`post` con prestito), già pronti nel registro.

### 7. Opere che rendono dal 130 al 186% l'anno
- **Tipo**: squilibrio, ed è un exploit. **Gravità: alta.**
- **Prova**: sonda 2, Italia, livello 1, rendimento misurato a cantiere finito:

| opera | luogo | costo | rendita | rendimento annuo |
|---|---|---|---|---|
| campi | Firenze | 4 M | +0,10 M/sett. | 130% |
| tessile | Napoli | 7 M | +0,25 M/sett. | 186% |
| siderurgia | Napoli | 12 M | +0,30 M/sett. | 130% |
| chimica | Napoli | 9 M | +0,24 M/sett. | 139% |

  - La manutenzione va da 0,005 a 0,015 a settimana (`construction.ts:UPKEEP`); la formula è in `buildingIncome` (`construction.ts:179-194`).
  - Con il debito al 4,5% (capo 5), conviene indebitarsi senza limite per costruire.
- **Effetto**: la strategia dominante è costruire in serie nelle province più popolose. L'unico freno sono gli slot di cantiere, da 1 a 6.
- **Rimedio**: costi più alti, oppure rendite ridotte a un rendimento del 5-10% l'anno (l'ordine di grandezza dei rendimenti ferroviari e industriali dell'epoca).

### 8. Popolazione immobile: le entrate crescono soltanto per industria e opere
- **Tipo**: mancanza. **Gravità: alta.**
- **Prova**:
  - `p.pop` viene dalla mappa e non cambia mai: nessun modulo la scrive.
  - Nel rapporto la popolazione delle potenze è invariata dal 1881 al 1899, salvo le conquiste. I censimenti dicono altro: Stati Uniti da 50,2 a 76,2 milioni (1880-1900), Impero tedesco da 45,2 a 56,4 milioni (1880-1900).
  - Le entrate crescono solo per industria (+0,5 per livello costruito), effetti della ricerca, programma di governo e opere: Stati Uniti da 85 a 120 M/sett. in 19 anni.
  - Manca anche l'emigrazione: italiana, irlandese, tedesca.
- **Effetto**: niente sorpasso demografico tedesco sulla Francia, niente ascesa americana e niente leva che cresce; il mondo del 1899 ha i numeri del 1881.
- **Rimedio**: una crescita annua per paese, dal profilo (Francia 0,1%, Germania 1,1%, Stati Uniti 2,1%), applicata alle province una volta l'anno, deterministica.

### 9. Sussidi a ripetizione dalle nazioni ricche
- **Tipo**: exploit. **Gravità: media.**
- **Prova**:
  - Un sussidio passa se il donatore stima il giocatore almeno 35 e l'importo non supera il 30% delle sue casse (`llm/agents.ts:51`), fino a 400 M per accordo (`diplomacy.ts:207`).
  - Non c'è un intervallo minimo fra un sussidio e l'altro.
  - Dopo il versamento cambia solo la stima di chi riceve verso chi dà (`diplomacy.ts:275`): il donatore resta disposto quanto prima.
  - Con casse da decine di migliaia di milioni (capo 1), un giocatore amico degli Stati Uniti può chiedere 400 M a messaggio.
- **Effetto**: denaro gratis, limitato solo dalla pazienza e dal costo delle chiamate al modello.
- **Rimedio**: un sussidio abbassa la disponibilità del donatore (stima o memoria per coppia); un tetto annuo legato alle entrate del donatore, non alle casse.

### 10. Debito degli Stati Uniti (e di altri) a zero
- **Tipo**: errore nei dati. **Gravità: media.**
- **Prova**:
  - Il profilo USA (`americas1881.ts:50-53`) non dichiara `debt` e prende lo 0 della base (`:10`).
  - Il debito vero era di 2.069 M$ al 1° luglio 1881, circa 10.700 M di franchi.
  - Anche Giappone e Cina hanno debito 0 (base asiatica, `asia1881.ts:10`). Il debito giapponese dell'epoca Meiji, non verificato qui, non era nullo.
- **Effetto**: gli Stati Uniti partono senza interessi da pagare, con il 54% di risparmio, e sono la seconda cassa del mondo nel 1899.
- **Rimedio**: debito storico nel profilo, con la fonte nel commento (regola 9 di AGENTS).

### 11. Fuori d'Europa occupare rende più che annettere
- **Tipo**: errore. **Gravità: media.**
- **Prova**:
  - In `economy.ts:54` il peso coloniale (0,08) si applica solo se `owner === tag`.
  - Una provincia soltanto occupata pesa 1 e rende il 25% della popolazione piena (`:57`).
  - Sonda 3, il Giappone e le tre province Qing più popolose:

| stato delle province | entrate giapponesi |
|---|---|
| prima della guerra | 30,21 |
| occupate | +5,89 |
| annesse | +2,26 |

- **Effetto**: conviene tenere la guerra aperta e le province occupate, invece di firmare la pace.
- **Rimedio**: applicare anche alle province occupate il peso coloniale del popolo, calcolato rispetto all'occupante.

### 12. La flotta non costa nulla
- **Tipo**: mancanza. **Gravità: media.**
- **Prova**:
  - Nel bilancio non c'è una voce per la marina (`economy.ts:69-87`); `naval` del profilo (Regno Unito 100) non costa niente.
  - L'esercito britannico costa 3,84 M/sett.
  - Nella storia la Royal Navy pesava circa quanto l'Army (ordine di grandezza dalle *Navy Estimates*, non verificato qui).
- **Effetto**: la talassocrazia è gratuita, e il Regno Unito spende il 2,6% delle entrate per la difesa.
- **Rimedio**: una voce "flotta" proporzionale a `naval` e alla stazza, con una politica navale.

### 13. Commercio e risorse: un listino fisso, senza mercato
- **Tipo**: difetto di modello. **Gravità: media.**
- **Prova**:
  - Il valore delle risorse è costante (`resources.ts:20-58`); il prezzo è fissato alla firma e non si aggiorna mai (`trade.ts:139`).
  - Non c'è domanda né offerta mondiale, e nessuna risorsa si consuma.
  - Il moltiplicatore di scarsità (1,8) vale per ogni lotto, quanti che siano (`trade.ts:79`): cinque lotti di carbone a chi non ne ha valgono 5 × 1,8.
  - Chi esporta la seconda risorsa di una provincia, che rende a metà (`resources.ts:233`), perde il valore pieno (`trade.ts:78`).
  - Le nazioni non giocanti commerciano soltanto carbone e ferro mancanti, un lotto per volta (`trade.ts:aiTrade:203-216`).
  - Contano davvero solo:
    - la mancanza di carbone (−5% delle entrate sopra industria 50) e di ferro (artiglieria +30%);
    - i requisiti della ricerca e i lotti nella logistica;
    - una rendita piatta di 0,02-0,35 M a provincia.
  - SPEC stessa lo ammette: "Risorse materiali non ancora modellate" (SPEC.md:190).
- **Effetto**: il commercio è quasi assente (saldo commerciale del Regno Unito: 0 in tre anni), senza dazi, crisi dei prezzi agricoli o corsa al carbone; la "grande depressione" 1873-96 è invisibile.
- **Rimedio**:
  - un prezzo per risorsa da domanda (industria e popolazione) e offerta mondiali, aggiornato ogni anno;
  - scarsità decrescente sui lotti successivi;
  - contratti indicizzati.

### 14. Il tributo si paga sul lordo, anche in disavanzo
- **Tipo**: squilibrio. **Gravità: bassa.**
- **Prova**: `vassals.ts:tributeOf:146` calcola il tributo come quota di `lastBudget.income`, cioè delle entrate lorde, qualunque sia il saldo del soggetto.
- **Effetto**: un soggetto in disavanzo si indebita per pagare il signore.
- **Rimedio**: il tributo sul saldo positivo, o sospeso quando il soggetto è in disavanzo.

### 15. Gli agenti diplomatici leggono "bancarotta" da un dato statico
- **Tipo**: errore. **Gravità: bassa.**
- **Prova**:
  - `llm/agents.ts:18` dichiara "Sei in BANCAROTTA" se `p.finance < 20` (profilo fisso) o se le casse sono sotto 15.
  - L'Impero ottomano con 3.356 M in cassa e debito zero (rapporto, 1899) resta in bancarotta per il modello.
- **Rimedio**: derivare lo stato finanziario dai numeri correnti: debito su entrate, saldo, casse.

### 16. Politiche fiscali piatte
- **Tipo**: difetto di modello. **Gravità: bassa.**
- **Prova**: imposte alte = +20% di entrate e −8 di stabilità (`economy.ts:16-20`), senza effetti su crescita o commercio. Non esistono dazi (Bismarck 1879, Méline 1892).
- **Rimedio**: una politica doganale e imposte che pesano sulla crescita.

## Ciò che il motore fa bene (da non rompere)

- **Registro unico** (`ledger.ts`):
  - casse e debito si scrivono in un punto solo;
  - un test cerca sui sorgenti ogni scrittura abusiva (`tests/ledger.test.ts`);
  - un altro controlla che casse finali = casse iniziali + saldo + movimenti, per ogni nazione e ogni turno.
- **Bilanci simultanei** (`weeklyEconomy`): si calcolano tutti prima di applicarne uno, così tributi, commercio e indennità sono a somma zero, e un test lo verifica (`turn.test.ts`).
- **Bilancio leggibile**: ogni voce è separata (colonie, tributi, indennità, opere, ricerca) e il giocatore vede dove vanno i soldi. Le colonie sono una voce del bilancio e non un versamento a parte.
- **Commercio nel motore**: è validato, con motivi di rifiuto espliciti. Il modello non lo scrive.
- **Giacimenti storici curati** (Ruhr, Lorena, Baku, Tarapacá, Kimberley, Larut), deterministici e commentati.
- **Debiti iniziali europei plausibili** in franchi oro (Regno Unito, Francia, Italia).
- **Mobilitazione proporzionata** (`aiMobilize`): ha tolto la tripla spesa francese contro Tunisi.

## Interazioni con gli altri motori

- **Coloniale** (`colonial.ts`):
  - `colonyIncome` (`:474-485`) dà 0,22 M per milione di abitanti con le concessioni, a cui si sommano le imposte pesate a 0,08 e le risorse non pesate (capo 2): le colonie rendono tre volte.
  - Con casse esplose, acquisti e doni coloniali (`post` 'colonie', `:362-373`) costano nulla: il freno economico alla corsa all'Africa sparisce, e il verdetto coloniale dovrà contare solo su cause politiche.
- **Pace** (`peace.ts`, `diplomacy.ts:93-96`):
  - l'indennità vale 40 settimane di entrate gonfiate e si paga subito fino a casse + 300; un vinto ricco paga tutto il primo giorno, senza il peso storico delle rate;
  - le province occupate rendono più di quelle annesse (capo 11).
- **Guerre fra Stati assenti** (problema noto dell'IA): manca l'unico grande pozzo di spesa, e il capo 1 peggiora.
- **Costruzione e ricerca**: troppo piccole per assorbire l'avanzo (ricerca 1,5-3 M/sett.), troppo redditizie per chi le usa (capo 7).
- **Soggetti, politica, modello**: capi 14, 5, 9 e 15.
