# Atto d'accusa

Ho verificato le arringhe sul codice del branch `feat/fase2-storia` e, con due sonde in sola lettura (`tsx` su `newGame`, seme `regnum`), sui dati dello scenario. Il repository non è stato toccato.

## 0. Un errore di diagnosi che hanno tutti e due

Le due arringhe (e anche il dossier, §2.3) dicono che il bey "rifiuta, sei mesi di attesa, −5 di stima". Per l'AI questo è **falso**. In `aiColonial` (colonial.ts:551) le azioni diplomatiche sono filtrate con `x.ev.ok`, quindi un `evaluate` sotto soglia non arriva mai a `execute`: niente rifiuto, niente cooldown di 26 settimane, niente −5. Le cause vere del Bardo arrivato nel 1886 sono altre, e si leggono nel codice e nel rapporto:

1. **colonial.ts:533**, `if (warsOf(s, tag).length) continue`. Il rapporto (righe 42-44) mostra la Francia in guerra col Uassulu dal 23 aprile 1881 al 21 ottobre 1882: per tutta la finestra di Tunisi la Francia non fa *nulla* di coloniale.
2. **colonial.ts:560-565**. Se esce Tunisi e il dado di guerra del 20% fallisce, si arriva alla riga 565 e l'interesse pesa un decimo **per un anno**, anche se la guerra era possibilissima. Per l'80% delle estrazioni il dado punisce l'interesse.
3. **colonial.ts:547**. `inWindow` vale `y >= window[0]-1`, senza limite superiore: il "2% fuori finestra" del dossier non esiste dopo la finestra. Fuori finestra si perde solo il fattore di peso (0,8 invece di 2).

Ho rifatto il conto di B: **23 su 30 è giusto**. La sonda dà presenza +15, stima −10, sovranità nominale ottomana −10, sovranità −20, paura +30, orgoglio −12, doni +20, momento +10. Ma la spiegazione di B è sbagliata: `fearOf(w, t, besides)` **esclude** la Francia (`besides = tag`). I +30 vengono dall'esercito ottomano (144.000 uomini) in Tripolitania, cioè dalla paura del *proprio signore*, non "dall'esercito d'Algeria". La stessa sonda dà all'Italia **26 su 30** (presenza navale 5, stima +3). Questo pesa contro B, come si vede sotto.

Nessuno dei due nomina le tre cause qui sopra. Le loro cure si posano su una diagnosi presa dal dossier, non dal codice.

---

## I. Proposta A, "ancore storiche"

### 1. Errori di fatto sul codice
- I numeri di riga sono quasi tutti esatti: types.ts:180 `War`, :73 `NationProfile`, diplomacy.ts:60 e :65, ai.ts:225, setup.ts:61, colonial.ts:171/234/277/222/536/559. Il §0 però ripete il falso "cooldown di sei mesi se il bey rifiuta".
- Dire "niente `aiMobilize` per l'attaccante" non cambia nulla. `aiMobilize` (economy.ts:166) è relativo: Francia contro Tunisi dà già `peace`, e comunque `aiEndOfTurn` lo richiama ogni settimana (ai.ts:199).
- Per "stanchezza a un terzo se tutte le sue guerre sono campagne" servirebbero perdite attribuite alla singola guerra. Oggi `warExhaustion` cresce per nazione con `turnLosses` più +0,3 a settimana (economy.ts:114). A non elenca questa modifica.
- Gli effetti `recognize` ("terre di nessuno riconosciute") e la "regola dell'occupazione effettiva" in `colonialClaims` non esistono. Inoltre la cache di `colonialClaims` è una variabile **di modulo** (`claimKey`, colonial.ts:169), non legata al mondo: A la indica come modello ("cache per giorno come `colonialClaims`") e così propaga un rischio di determinismo fra partite nello stesso processo.
- **Nomi che non esistono sulla mappa.** La sonda non trova `Cotonou`, `Porto-Novo` (dahomey-1) e `Kankan` (samori fase 3). Il tag di Samori è `WAS`, non `UAS`. `Bogos` appartiene a `EGY`, non a `ETH`: l'effetto `cede: {from:'ETH', names:[…'Bogos']}` di Uccialli è sbagliato già sui dati.
- La Guerra del Pacifico: A esenta `w_pacifico` solo dalla regola dei 540 giorni. A ogni settimana restano attive "stanchezza ≥55", "età >180 e stanchezza >35" e `decided`. Il punteggio iniziale è 21 a 0 con stanchezza 0 (verificato), ma basta un anno di guerra perché la regola dei 35 la chiuda prima di Ancón.
- L'ancora `chelenqo` richiede `{ anchor: 'liquidazione-egiziana', is: 'done' }`, ma quell'ancora nasce solo al passo (4), "migrazione di `weeklyEgypt`", dopo i passi (1)-(3). Per tre commit su cinque Harar non può scattare. Intanto `tel-el-kebir` come ancora convive con `weeklyEgypt` stadio 2 (colonial.ts:666-674): **due meccanismi sullo stesso fatto**, che è proprio ciò che A dice di voler impedire.

### 2. Errori storici
- **Ancón.** Il trattato cede Tarapacá e affida al Cile Tacna e Arica per dieci anni. La Bolivia resta fuori (tregua di Valparaíso, 1884). L'effetto `endWar` sull'intera `w_pacifico` passa da `concludePeace`, che chiude **tutte** le occupazioni: Antofagasta, Cobija, Calama, Atacama, Taltal (`AMERICAS_OCCUPATIONS`) tornano alla Bolivia, e Tacna e Arica al Perù. L'ancora che dovrebbe preservare la storia la rovescia.
- **Uccialli.** Lo firmò Menelik *dopo* la morte di Giovanni IV a Metemma (marzo 1889). Nel gioco `ETH` è l'impero di Giovanni IV, con Menelik solo nel campo `leader`. Le `needs` di A non citano né Metemma né il Mahdi. Seraè e Acchelè Guzai vengono dalla convenzione addizionale e dall'occupazione del 1889-90, non dall'articolo III. Con `force` alla scadenza, un impero di 60.000 uomini cede province senza alcuna causa: è un binario puro.
- **Berlino.** La conferenza non "riconobbe" lo Stato libero: i riconoscimenti furono bilaterali (Stati Uniti nell'aprile 1884, Germania nel novembre 1884), e l'Associazione aderì all'Atto finale. L'occupazione effettiva (artt. 34-35) riguardava le **coste**: A la estende a ogni rivendicazione su terre di nessuno.
- **Dahomey.** Porto-Novo era un regno distinto, sotto protettorato francese. Cotonou era già stata ceduta per trattato (1868/1878): il trattato di Ouidah del 3 ottobre 1890 la riconosce dietro una rendita, non la "cede".
- **Samori.** Mancano la campagna del 1885, il **trattato di Bissandugu del 1887** (un protettorato ambiguo, decisivo per il modello "fasi con trattato"), Humbert nel 1892 e Monteil nel 1894-95. La data della fase 4 (29/9/1898) è quella della cattura, non quella dell'apertura della campagna.

### 3. Requisiti
- **R3, solo a parole.** L'invariante "nessuna ancora decade senza causa" diventa vera scrivendo un'etichetta. Il Bardo ha `needs: notAtWar('FRA')` "con nessuno". Le ancore di A riempiono il calendario francese di campagne (Samori ×4, Dahomey ×2, Tunisi), e i fronti emergenti restano. Basta una campagna aperta per mettere in pausa ogni altra ancora francese fino a farla decadere "precondizione: la Francia è in guerra". È *esattamente* il meccanismo che ha prodotto il 1886 (punto 0.1), solo con un'etichetta: un difetto del motore travestito da causa di partita. Lo stesso vale per il "il momento è passato" della modalità plausibile.
- **R3 fuori dalle ancore: nulla.** Per tutti gli interessi non ancorati restano i dadi delle righe 544-565 (Camerun di Nachtigal, Niger, Sud-Ovest, Rodesia, Zanzibar…). A corregge 25-35 fatti e lascia intatto il generatore dei ritardi.
- **R5, parziale.** Il fronte `'FRA|UAS'` è indicizzato sulla coppia: giusto. Ma per i fronti senza ancora (Yaka, Kuba, Lunda) "prossima fase fra 3 anni, con un obiettivo diverso" non dice *quale* obiettivo, perché `CampaignSpec` esiste solo nelle ancore. Dopo un "ritiro" la stessa campagna si ripete ogni 3 anni: è la R5 che ritorna.

### 4. Rischi di progetto
- **Un'ancora "possiede" l'interesse.** `samori` ha `interest: 'fra-sudan'`, che copre SEN, MLI, GIN, BFA e MRT. Per sedici anni (1882-1898) l'intero Sudan francese esce da `aiColonial`: niente Ségou (1890), niente Futa Gialon, niente Mossi. Lo stesso succede con `dahomey-*` su `fra-guinea` (che comprende anche la Costa d'Avorio).
- **Due interruttori sovrapposti**: `history: rigida|plausibile|libera` accanto a `colonialMode: storico|libero`. La combinazione "libero + rigida" non ha senso.
- **Test.** Un turno costa circa 0,22 s, quindi un anno di 52 turni costa circa 11 s. Il test 2 (12 semi fino al 1882, 104 turni ciascuno) costa circa 275 s, più dell'intera `npm test` (200 s, AGENTS.md). I test 5-6 sono 19 anni, circa 218 s per seme.
- **Alleanze del giocatore.** `declareWar(..., {colonial:true})` non chiama gli alleati. I `breaks` coprono solo le ancore. Una campagna emergente contro un alleato del giocatore lo esclude in silenzio.

### 5. Casi limite
- *Se il giocatore è Tunisi*, rifiuta l'ultimatum e resiste 60 giorni (`maxDays`), il Bardo decade. Con l'AI in guerra ancora debole (il dossier riporta una Francia che perde tre province algerine contro Tunisi) è una formalità. R1 si aggira in otto settimane.
- *Se l'AI tedesca apre `ger-mittelafrika`* (stadio 3) contro il Congo belga, `warOk` passa: `BEL` non è `major`, ha `friends` vuoti, 46.000 uomini contro molti più di 184.000, e confina con la Germania. Diventa una "campagna" in cui i garanti del 1839 (GBR e FRA, europe1881.ts:144-146) **non vengono chiamati**, mentre `aiPlan` invade il Belgio in Europa.
- *Se il giocatore è l'Egitto*, `tel-el-kebir` dà un ultimatum. Ma `weeklyEgypt` alla riga 684 smette di avanzare per l'Egitto giocante: le ancore che dipendono dalla liquidazione (Harar) non scattano mai.

### 6. Cosa non copre
Le guerre fra Stati (dichiarato), le alleanze impossibili (il §4 tratta solo i protettorati) e il "Belgio di Leopoldo" (solo segnalato). Manca anche una risposta al punto 0.1: una guerra coloniale blocca ancora tutta l'AI coloniale.

---

## II. Proposta B, "agenda emergente"

### 1. Errori di fatto sul codice
- Ripete il falso "il bey rifiuta… sei mesi… −5" (vedi §0) e sbaglia la spiegazione dei +30 di paura.
- **"Truppe al confine" con l'ordine `'pressione'` di `sendExpedition`.** Questo ordine non esiste. `sendExpedition` (colonial.ts:582) punta solo alle terre di nessuno e scrive `label: 'spedizione'`, e la riga 535 congela **tutta** l'AI coloniale della nazione finché una spedizione è in corso. Riusata così, la "pressione" ferma le altre voci invece di spingerne una.
- **"Una guerra europea ferma la diplomazia, come già fa `evaluate`."** È falso: `evaluate` (colonial.ts:269) si ferma con **qualunque** guerra, coloniale compresa. Gli slot "diplo durante una guerra coloniale" non funzionano finché non si cambia anche quella riga, che B non elenca.
- **Tunisi, seconda fase (Sfax e Kairouan), "se c'è una rivolta (`weeklyAdmin`, resistenza ≥ 70)".** Non può accadere. `weeklyAdmin` (righe 493-494) agisce solo sulle province con `owner === tag`, e un protettorato lascia le province a `TUN`, quindi `own` è vuoto e il ciclo passa oltre. Anche per le colonie dirette, con le politiche di default dell'AI (tolleranza, concessioni, notabili) l'obiettivo di resistenza vale al massimo 40.
- **`requires` su "Harar fuori dall'Egitto".** `requires` accetta solo id di interessi completati: quella condizione non è esprimibile.
- **Aggiungere voci `nation:'ETH'`, `'WAS'`, `'MAH'`** le rende `hasProgram`. `aiColonize` (ai.ts:149) le **esclude** allora dall'espansione locale: l'Etiopia perde l'espansione di Menelik verso gli Oromo, l'unica che oggi ha.
- **"Spariscono quattro chiamate a `rand`"**: ne elenca tre più una che resta.
- **"Giri da 50 semi, circa 4 minuti".** In realtà circa 218 s per seme fino al 1899, cioè circa tre ore. Il test in CI con 10 semi costa circa 36 minuti, contro i 200 s di tutta la suite.

### 2. Errori storici
- **Berlino "assegna le province contese e fissa le sfere".** È il mito più comune sulla conferenza. Le sfere vennero da accordi bilaterali: anglo-tedeschi del 1886 e 1890, anglo-portoghese del 1891, franco-britannici del 1890 e 1898.
- **Samori.** Kong non era di Samori: nel gioco è un altro Stato (`KNG`, rivale di `WAS`), alleato della Francia dal trattato di Binger del 1889, e Samori lo distrusse nel 1897. La "cessione di Kong" del 1894 è un falso. Kankan e Bissandugu caddero insieme nell'aprile 1891 (Archinard), non in due fasi 1891 e 1892. Manca il trattato di Bissandugu del 1887.
- **Uccialli come assenso, numeri alla mano.** In `evaluate/assenso` con decisore uguale al cedente: −35 ("non vuole cedere") +10 (compenso) +10 (momento) +20 (le "armi italiane" di B) = 5, più la stima ETH→ITA × 0,5. Per arrivare a 30 serve una stima di +50 verso l'Italia, e dopo Massaua e Dogali sarà negativa. La scala porta quindi all'ultimatum e poi a una **guerra coloniale italiana contro l'Etiopia nel 1889**, resa possibile dal fatto che B toglie il vincolo del 25% sugli eserciti: Adua sette anni prima. In più `eth-corona` è l'agenda di Menelik re dello Scioa, che nel modello non esiste come attore.
- **Urabi come "fatto interno che nessun attore europeo causa".** Dimentica il Controllo duale e la Nota congiunta del gennaio 1882. Il confine fra "esogeno" e "decisione" è già scelto male nel caso modello.

### 3. Requisiti
- **R1, Tunisi può diventare italiana.** `COLONIAL_POWERS` nasce dall'ordine di `INTERESTS_1881`, quindi **l'Italia gioca prima della Francia** ogni settimana. Con B l'Italia riceve +15 di corsa e +30 dopo il "passo" francese. Parte da 26 su 30 (verificato) e l'ultimatum le dà +10, cioè 36: l'Italia firma. Il fatto più importante del 1881 dipende da una gara di soglie tarate a mano, e la stessa architettura che vuole "certezza" crea la storia alternativa senza che nessuno abbia agito.
- **R3 a parole.** "Ogni mancato stampa una causa": "slot guerre occupato", "presenza −99" e "gradino 2" sono cause del *motore*, non della partita. Il test passa con un ritardo di dieci anni purché la causa sia scritta.
- **R3, l'urgenza parte subito.** Voce di peso 1 con base circa 50, più corsa (+15) e pretesto (+15), fa 80 già al turno 1. Il `due` di aprile non conta nulla: Tunisi a gennaio 1881. B scrive "a fine marzo", contro la sua stessa formula.
- **R5, rotta sui dati.** La chiave è `(attaccante, bersaglio, interesse, fase)`. Il rapporto (riga 50) mostra la Francia in guerra col Uassulu *sotto `fra-guinea`* e poi *sotto `fra-sudan`*: lo stesso nemico entra in più interessi, quindi chiavi diverse, quindi guerre ripetute. La memoria va indicizzata sulla coppia, come fa A.

### 4. Rischi di progetto
- **Urgenza senza limite su tutte le voci.** Ogni voce, prima o poi, arriva all'ultimatum. Senza il 25% e senza "amici grandi potenze", `colonialWarOk` lascia passare `GER→BEL` (Mittelafrika), `FRA→MAD` (Madagascar, `friends: GBR`) e `ITA→ETH`.
- **La crisi di B** si attiva su `friends`, che è un campo statico del profilo. Una garanzia o un'alleanza firmata in partita dal giocatore non la attiva, e i garanti "non vengono chiamati". La scelta deterministica "dalla forza relativa e dalla stima" può dare a GBR "sostenere il bersaglio" sul Madagascar **in tutti i semi**: una guerra anglo-francese fissa.
- **Slot di guerre multipli.** `aiPlan` fonde tutti i nemici (`enemiesOf`) e `overseas` manda al massimo tre unità a settimana: due guerre coloniali lontane si cannibalizzano.
- **Rifiuti ogni 4 settimane.** Con `execute` chiamato davvero, ogni rifiuto costa −5 di stima e un evento: diario saturo (`MAX_EVENTS` 600) e bersagli spinti verso la guerra.
- **Taratura.** 600-900 righe di motore e circa 70 voci con `due`, `tempo`, `pretext` e `phases` scritte a mano: la stessa combinatoria che rimprovera ad A, senza l'invariante leggibile.

### 5. Casi limite
- *Se il giocatore è la Francia e non fa nulla*, l'Italia AI arriva all'ultimatum a 36 e prende Tunisi nel 1881: R1 violato senza alcuna azione del giocatore. Lo stesso accade in ogni seme in cui la Francia AI si ferma ai primi gradini.
- *Se il giocatore è l'Etiopia*, subisce una guerra coloniale italiana all'anno 0 della voce `ita-eritrea`. Ogni sua vittoria dà 3 anni di tregua e poi un'altra guerra: la ripetizione di R5 diventa per lui un appuntamento fisso.
- *Contro Samori*, se le unità francesi non toccano una provincia controllata dal nemico, `planNation` non ha bersagli (ai.ts:44-45) e `overseas` non trova coste (il Uassulu non ha sbocco al mare). Dopo 13 settimane arriva la "sconfitta del colonizzatore", poi tregua di 3 anni, poi di nuovo: la tripla guerra resta.

### 6. Cosa non copre
Il Belgio di Leopoldo (lo ignora del tutto: gli dà persino il ruolo di convocatore della conferenza), le guerre fra Stati e l'età della guerra del Pacifico (la regola dei 540 giorni sull'età contata dal 1879 non è nemmeno nominata).

---

## III. Confronto

**A è strettamente migliore** nella memoria delle ripetizioni (fronte per coppia contro chiave per interesse), nella verificabilità (lo stato dell'ancora e le cause sono un oggetto visibile), nella Guerra del Pacifico (almeno ci prova), nel testo storico legato alla data (±30 giorni) e nel Belgio (almeno segnalato).

**B è strettamente migliore** nel rimuovere il blocco "in guerra non si fa nulla" (gli slot correggono la causa reale 0.1), nel coprire *tutti* gli interessi e non 30, nella regola contro le alleanze impossibili e nel non congelare interi interessi sotto un'ancora.

**Tutte e due sbagliano** la diagnosi (§0), sopprimono la chiamata dei garanti nelle guerre coloniali senza proteggere gli Stati europei non maggiori (`BEL`), danno per scontato che l'AI militare occupi davvero l'obiettivo, e sottostimano il costo dei test di uno o due ordini di grandezza.

**Sintesi superiore**, in breve:
1. Correggere prima il generatore dei ritardi, cioè le righe 533 e 565 e il dado del 20%, con l'urgenza deterministica di B ma **limitata** (tetto, e solo per gli stadi 1 e 2).
2. Usare le ancore di A **solo come scadenze di verifica**, non come effetti forzati: una manciata (Bardo, Tel el-Kebir, Ancón) che alla scadenza non sposta province ma alza l'urgenza al massimo e registra la causa *di partita* (garanzia, truppe, guerra europea), escludendo le cause interne del motore.
3. Guerra coloniale di A (goal, fronte per coppia, tetto di durata) con la crisi di B, ma attivata dai trattati veri e non da `friends`, e **mai** contro Stati europei.
4. `stance` per gli attori locali (le due proposte coincidono).
5. Test brevi a due anni e simulazioni lunghe fuori dalla CI.

L'accusa resta: nessuna delle due proposte, così com'è scritta, soddisfa R3 nella sostanza.
