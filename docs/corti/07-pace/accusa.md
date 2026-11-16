# Corte 07 — Trattati di pace e punteggio di guerra: atto d'accusa

Accusatore: giurista dei trattati di pace dell'Ottocento. Branch `feat/fase2-storia`, commit `2f9bcf7`, 16 novembre 2026.
Imputati letti per intero: `src/engine/peace.ts` (477 righe), `src/ui/peace-view.ts` (231), `src/engine/ai.ts` (la pace delle nazioni non giocanti, righe 212-234), `tests/pace.test.ts`, `docs/SPEC.md` (voci "Pace" e "Conferenza di pace", righe 94-95), `docs/rapporti/1881-1899.md`. Seguite le chiamate in `diplomacy.ts` (`makePeace`, `checkProposal`, `applyProposal`), `llm/agents.ts`, `llm/gm.ts`, `claims.ts`, `vassals.ts`, `economy.ts`, `ledger.ts`.

Sonde (in `docs/corti/07-pace/sonde/`, tutte sotto i 90 s):
- `sonda1-casi.mts` (6 s): casi costruiti sullo stato iniziale, seme `corte07`.
- `sonda2-guerre.mts` (75 s): sei guerre fra Stati dichiarate a mano il 1° gennaio 1881 e lasciate al motore per 106 settimane.
- `sonda3-sfruttamento.mts` (2 s): quanto si compra con i punti; chi può diventare vassallo.

I fatti storici citati vengono dalla mia memoria, non da una ricerca: vanno presi come tali.

---

## Capi d'accusa

### 1. Esiste una seconda pace che non conosce il punteggio di guerra
- **Tipo**: errore (viola il principio 1 di `AGENTS.md`: "il codice dispone"). **Gravità: critica.**
- **Prova**: la proposta `peace` del dialogo e degli agenti LLM passa da `diplomacy.ts:checkProposal` (r. 198) → `checkCession` (r. 224-246) → `applyProposal` → `makePeace` (r. 70). Nessuna di queste funzioni chiama `warScore`, `demandCost` o `peace.checkCession`. Basta che il cedente abbia stanchezza ≥ 50 o stabilità < 20 (r. 241) per cedere fino a 30 province **non occupate**, senza controllo di raggiungibilità, exclavi o corridoi; l'indennità passa tutta subito, fino a cassa + 300 milioni (r. 92-96); `plausibility` (`agents.ts:42`) non ha un caso `peace`. La sonda 1F: Russia contro Impero ottomano, nessuna provincia occupata, stanchezza ottomana 55; la Russia chiede 30 province dello Yemen e dell'Hegiaz più 5000 milioni: `checkProposal` → **nessun veto**; la conferenza (`peace.checkCession`) per le stesse province risponde «Ibb non è raggiungibile». Inoltre `makePeace` non chiama `recordLoss`, quindi le cessioni di questa via non lasciano rivendicazioni, e il Game Master (`gm.ts:134-139`) può chiudere con una pace bianca qualunque guerra fra nazioni non giocanti dopo 28 giorni, anche se un lato ha 90 punti.
- **Effetto**: il giocatore che ottiene un "accetto" dal modello prende ciò che la conferenza gli vieterebbe; il modello, non il motore, decide la pace.
- **Rimedio**: la proposta `peace` deve tradursi in `Demand[]` e passare da `peaceAnswer`; `makePeace` resta solo per le paci separate, con lo stesso controllo.

### 2. Le guerre in cui c'è il giocatore non le chiude mai nessuno
- **Tipo**: mancanza. **Gravità: alta.**
- **Prova**: `ai.ts:216`: `if ([...war.attackers, ...war.defenders].includes(s.player)) continue;`. Le uniche altre chiamate a `concludePeace` sono nell'interfaccia (`peace-view.ts:113, 114, 121, 224`). Il vincitore non giocante non impone mai condizioni, non c'è resa né pace forzata; se il giocatore è entrato in guerra come alleato minore (chiamato da un'alleanza), anche la guerra fra le potenze non giocanti resta ferma finché lui non apre la conferenza.
- **Effetto**: il giocatore battuto può ignorare la sconfitta per sempre; una coalizione di nazioni non giocanti resta in guerra per colpa di un comprimario.
- **Rimedio**: quando scattano le stesse soglie delle paci fra non giocanti, il vincitore propone le sue condizioni; dopo un ultimatum di qualche settimana, il giocatore che rifiuta subisce stanchezza, instabilità, e infine la pace imposta. Il giocatore alleato minore esce con una pace separata.

### 3. Il punteggio misura il numero delle province e l'estensione dell'impero, non la sconfitta
- **Tipo**: difetto di modello (sfruttabile). **Gravità: alta.**
- **Prova**: `provinceValue` (r. 18-26) dà a ogni provincia un valore base 1, più la popolazione / 250.000, e il punteggio (r. 58) è la quota del valore **di tutto il territorio del nemico, colonie comprese**. La sonda 1A: la Francia che occupa tutte le 79 province europee del Regno Unito, Londra compresa, ottiene **26 punti** (quota del 17,8%); la Germania che occupa tutta la Francia europea ne ottiene 79. La sonda 1B: le province sotto i 50.000 abitanti valgono il 13,2% del valore britannico per l'1% della popolazione, il 16,1% di quello ottomano per il 4%. Lo stesso valore fa il costo delle cessioni (r. 178): la sonda 3A: con i 25,9 punti dell'occupazione delle isole britanniche la Francia può chiedere 30 province costiere del Bengala **che non ha mai occupato**, 33,2 milioni di abitanti, costo 25,6, nessun rifiuto; il motore per conto suo propone solo un'indennità di 87 milioni e una liberazione.
- **Effetto**: un impero coloniale è quasi imbattibile al tavolo, ma le sue colonie popolose costano pochissimo a chi lo batte appena: popolazione presa per punto speso sproporzionata.
- **Rimedio**: punteggio sulla madrepatria (o sul "nucleo") con le colonie pesate a parte; costo delle cessioni sulla popolazione e sulle entrate, non sul numero di province.

### 4. Una scaramuccia vale 25 punti; la stanchezza ne regala 40 senza combattere
- **Tipo**: squilibrio (sfruttabile). **Gravità: alta.**
- **Prova**: r. 55: `25 * (lossesEnemy − lossesOwn) / (lossesEnemy + lossesOwn + 1)` è un rapporto, non scalato sulla grandezza degli eserciti: 1000 perdite contro 0 valgono quasi 25 punti, come 300.000 contro 0. La stanchezza aggiunge `0,4 × differenza` (fino a 40). Sonda 1F: dichiarazione di guerra e stanchezza ottomana 55, nessuna provincia occupata e nessuna perdita → punteggio 22-0. In `ai.ts:224` una guerra con 50 punti di scarto si chiude dopo 60 giorni.
- **Effetto**: si vince "sulla carta" con una battaglia vinta all'inizio e senza toccare il territorio; le paci del motore arrivano quasi a caso.
- **Rimedio**: pesare le perdite sulla forza mobilitata dei due lati; il termine di stanchezza va limitato o tolto (la stanchezza viene già dalle perdite).

### 5. Vassallaggio a prezzo fisso per chiunque non sia una "grande potenza"
- **Tipo**: difetto di modello. **Gravità: alta.**
- **Prova**: `demandCost` caso `vassal` (r. 205-212): 30/45/60 punti qualunque sia la grandezza del perdente; l'unico divieto è `profiles.major`. In `suggestDemands` (r. 296) il motore lo chiede appena il perdente confina con un rivale o con uno stretto. Sonda 2, paci dettate dal motore: **Serbia vassalla della Bulgaria** (5 marzo 1881, dopo nove settimane), **Grecia protettorato ottomano** con 9 milioni di indennità (12 marzo 1881), **Spagna vassalla del Portogallo** (15 ottobre 1881: 23,8 milioni di abitanti contro 8,9). Sonda 3B: l'Impero Qing (375,9 milioni di abitanti, 290 province), il Giappone e i Paesi Bassi non sono "grandi potenze" e si riducono a vassalli per 45 punti, a protettorato per 60.
- **Storia (memoria)**: dopo la guerra serbo-bulgara del 1885 la pace di Bucarest (marzo 1886) ristabilì lo status quo; dopo il 1897 la Grecia perse solo ritocchi di confine in Tessaglia e pagò un'indennità sotto controllo finanziario internazionale; nessuna delle due divenne soggetta.
- **Rimedio**: costo proporzionale al rapporto di forza (popolazione, esercito) e vassallaggio vietato oltre una soglia, o quando il perdente è più grande del vincitore.

### 6. La liberazione consegna le terre a una nazione diversa da quella mostrata
- **Tipo**: errore. **Gravità: alta.**
- **Prova**: il costo e l'interfaccia chiamano `liberationTarget(w, eth, from, provinces)` (r. 200, `peace-view.ts:78`), che richiede che il destinatario confini con quelle province; l'applicazione chiama `liberationTarget(w, d.eth, d.from)` **senza province** (r. 354), così il filtro `touches` è sempre vero e vince il primo Stato della tabella che "possiede" quel popolo. La sonda 1D trova **53 casi** sullo stato iniziale; per esempio arabi ottomani: conferenza → Tunisi, applicazione → **Marocco**; arabi persiani: Kuwait → Marocco; malesi olandesi: Johor → un altro Stato.
- **Effetto**: Mesopotamia o Hegiaz possono finire al sultano del Marocco, senza confine e senza che il giocatore l'abbia visto.
- **Rimedio**: salvare il destinatario nella richiesta (`d.target`) al momento del costo e usarlo nell'applicazione.

### 7. Lo Stato liberato nasce amico della nazione sbagliata, disarmato, e l'evento mente
- **Tipo**: errore. **Gravità: media.**
- **Prova**: `birth` (r. 328-340) riceve come liberatore `s.player === d.from ? to : (prima nazione viva di state.nations)` (r. 356): non il vincitore `d.to`. Sonda 1E: l'Albania liberata dalla Grecia ha stima 60 verso **la Russia** (prima chiave di `state.nations`) e nessuna stima verso la Grecia. Il nuovo Stato nasce con 0 unità e 4 milioni in cassa. Il testo (r. 360) controlla `s.nations[to].opinion`, che è sempre un oggetto: dice sempre «ottiene», mai «nasce con» (sonda 1E: «Principato d'Albania ottiene le terre dei albanesi…»; si noti anche «dei albanesi»). Nella sonda 2 il motore ha fatto nascere un **Kurdistan di 16 province** (Russia-Impero ottomano, luglio 1881) e una Croazia di 11 (Italia-Austria): nessuno dei due Stati ha un esercito.
- **Rimedio**: liberatore = `d.to`; una guarnigione iniziale proporzionata agli abitanti; testo corretto.

### 8. Le paci del motore: troppo presto, senza scopo di guerra, e dure
- **Tipo**: difetto di modello. **Gravità: media.**
- **Prova**: `ai.ts:220-225`: la pace arriva per stanchezza dei soli capofila (≥ 55), oppure dopo 180 giorni con stanchezza > 35, oppure con 50 punti dopo 60 giorni, e comunque dopo 540. Sonda 2: Serbia-Bulgaria chiusa in 9 settimane, Grecia-Impero ottomano in 10 (punteggio salito fino a 95, pace firmata quando era 36 la settimana prima), Italia-Austria-Germania in 27 settimane con Trento, Gorizia, Istria, Fiume, la Croazia liberata, due livelli d'industria e 537 milioni di indennità. Una guerra non ha uno scopo dichiarato (`War` non ha un obiettivo): si prende ciò che il punteggio permette. Le "paci senza condizioni" non sono il problema: nella sonda 2 nessuna delle sette paci è senza condizioni.
- **Rimedio**: uno scopo di guerra alla dichiarazione, che limita e rende più economiche le richieste; la pace prima della soglia di tempo solo se lo scopo è raggiunto.

### 9. La quota dei vincitori premia chi ha un esercito grande, non chi combatte
- **Tipo**: squilibrio (sfruttabile). **Gravità: media.**
- **Prova**: r. 67-68: `0,3 × uomini` conta tutte le unità della nazione, ovunque si trovino. Sonda 1C: Francia e Russia contro Germania; la Francia occupa 21 province e infligge perdite, la Russia non muove un uomo: quote **55,3% e 44,5%**, punti 10 contro 8.
- **Rimedio**: contare solo le unità in territorio nemico o al fronte, e le perdite inflitte più di quelle subite.

### 10. Le regole delle modalità "il giocatore decide" stanno nell'interfaccia
- **Tipo**: errore (principio 3 di `AGENTS.md`). **Gravità: media.**
- **Prova**: `peaceAnswer` (r. 443) restituisce `ok` per qualunque proposta in modalità diversa da `engine`, **prima** di guardare chi vince: sonda 1I, Serbia interamente occupata (0-95), in modalità `own` ottiene la pace bianca e può persino imporre un'indennità all'Austria vincitrice. Lo impedisce solo `peace-view.ts:118` (`canDirect`). In modalità `all`, `sign` (r. 219-223) non chiama `peaceAnswer` e `applyDemand` usa `checkCession(..., false)` ignorando i rifiuti: passano la cessione della capitale e l'annessione di una grande potenza.
- **Rimedio**: `peaceAnswer` verifica sempre il lato vincitore e i rifiuti; la modalità cambia solo il tetto dei punti.

### 11. Dopo la pace non succede quasi nulla
- **Tipo**: mancanza. **Gravità: media.**
- **Prova**: `concludePeace` (r. 420-432) non cambia la stima fra le parti (la cambia solo la liberazione, r. 359), non crea una tregua (`declareWar`, `diplomacy.ts:28-34`, non controlla paci recenti), non sposta stabilità né governi. L'unico seguito è `recordLoss` (rivendicazioni del perdente), assente nella via `makePeace` (capo 1). Il protettorato imposto in pace non fa "risentire" il vecchio signore, contro quanto dice `SPEC.md` r. 86: `applyDemand` caso `vassal` (r. 363-366) chiama solo `setSubject`, mentre `vassals.ts:257` e `colonial.ts:365` applicano −20.
- **Storia (memoria)**: la perdita dell'Alsazia-Lorena (1871) pesò sulla politica francese per decenni; la tregua è un istituto ordinario dei trattati.
- **Rimedio**: tregua di alcuni anni (violarla costa come rompere un patto), stima del perdente verso il vincitore in proporzione al costo pagato, stabilità e governo del perdente colpiti.

### 12. Mancano gli strumenti tipici della pace dell'Ottocento
- **Tipo**: mancanza. **Gravità: media.**
- **Prova**: i 9 tipi di `Demand` (r. 77-86). Mancano: basi e porti in affitto o aperti al commercio, concessioni (Shimonoseki 1895, Weihaiwei); riconoscimento dell'indipendenza di un terzo (Corea a Shimonoseki, Serbia, Montenegro e Romania a Berlino 1878); acquisto in pace (Parigi 1898: gli Stati Uniti pagano 20 milioni di dollari per le Filippine); occupazione a garanzia del pagamento (truppe tedesche in Francia fino al 1873); smilitarizzazione navale (Mar Nero, Parigi 1856); paci separate dentro la conferenza (`concludePeace` chiude sempre tutta la guerra); congresso delle potenze che rivede una pace bilaterale (Santo Stefano → Berlino 1878). Fonte: memoria.
- **Rimedio**: in ordine di valore per il gioco: pace separata, tregua, riconoscimento, porto/base; il congresso più avanti.

### 13. Costi piatti e incoerenti fra loro
- **Tipo**: squilibrio. **Gravità: bassa.**
- **Prova**: concessione commerciale 4 punti a lotto (r. 219) qualunque sia il perdente, mentre l'indennità è in settimane di entrate del perdente (r. 218): per un piccolo Stato i lotti valgono molto più del denaro, per il Regno Unito molto meno. Riparazioni industriali 6 punti a livello anche se i livelli non ci sono (r. 220), e i macchinari oltre il livello 3 della capitale del vincitore si perdono (r. 395). Rottura delle alleanze (10) senza durata: il perdente può riallearsi la settimana dopo. Exclavi aggiunte a metà prezzo se sono "al massimo tre" **oppure** sotto il 6% (r. 167): tre province ricche staccate passano a metà prezzo qualunque sia il loro peso. L'annessione costa 100 punti fissi: tutto il bilancio.
- **Rimedio**: tutti i costi in proporzione al perdente; addebitare solo ciò che si applica.

### 14. Indennità: misurate sulle entrate, irrilevanti per chi ha le casse piene
- **Tipo**: squilibrio (interazione con l'economia). **Gravità: bassa.**
- **Prova**: 100 punti = 40 settimane di entrate (r. 218), un quarto subito solo se c'è cassa (r. 377), il resto in 52 rate. Con le casse delle potenze che esplodono (Regno Unito 57.849 milioni nel 1899, rapporto) anche il massimo è poca cosa per una grande potenza ricca. Nella sonda 2 il Regno Unito, battuto dal Canada indipendente, paga 939 milioni (meno di due mesi di saldo del 1899; la dinamica di quella guerra non l'ho verificata).
- **Rimedio**: legare l'indennità anche alla cassa; collegarla alla correzione dell'economia.

---

## Ciò che il motore fa bene (da non rompere)

- Le regole contro il border gore (`checkCession`): raggiungibilità, capitale, exclavi, corridoi, con messaggi leggibili. Nella sonda 2 Italia-Austria ha dato Trento, Gorizia-Istria, Fiume, e non Bolzano: confini storicamente sensati.
- Il costo legato alle rivendicazioni (nucleo/storica/pretesa) e il raddoppio per il non occupato.
- Il budget diviso fra i vincitori e la "Proposta del motore" usata anche dalle nazioni non giocanti: una sola logica per giocatore e motore.
- I blocchi di province scelti toccando la mappa (stessa regione e stessa maggioranza).
- `settleOccupations` e `checkAlive` dopo ogni pace; indennità che passano dal bilancio (`reparationsOf` → `economy.ts:85`) e dal libro unico (`transfer`, voce `indennita`); smilitarizzazione rispettata dalla costruzione (`construction.ts:293`).
- Determinismo: nessuna fonte casuale in `peace.ts`.
- Test esistenti (`tests/pace.test.ts`, 3 casi, 2 s) verdi.

## Interazioni con altri motori

- **Coloniale**: le guerre coloniali finiscono con `engineTerms`; il protettorato richiede 60 punti, sotto si ottiene un vassallaggio (nel rapporto 1881-1899 Tunisi diventa *vassallo* della Francia il 5 marzo 1887, non protettorato come al Bardo nel 1881). La soglia `age > 540` chiude la Guerra del Pacifico il primo giorno (già noto dalla corte 00): sonda 2, 8 gennaio 1881, Pisagua, Arica, Tacna e Cobija al Cile più 32 milioni. La diluizione del punteggio (capo 3) rende quasi impossibile per un regno africano "vincere" e facile per una potenza prendere province coloniali di un'altra.
- **Diplomazia e stati soggetti**: due vie di pace (capo 1); `setSubject` senza risentimento del vecchio signore (capo 11); la rottura delle alleanze non crea un divieto.
- **Economia**: indennità e concessioni commerciali forzate passano dal bilancio; il loro peso dipende dalle casse gonfiate (capo 14).
- **Rivendicazioni**: `recordLoss` alimenta il revanscismo solo come rivendicazione, ma le nazioni non giocanti non dichiarano guerre fra Stati (problema noto), quindi le rivendicazioni non producono nulla.
- **LLM**: il Game Master chiude guerre senza punteggio (capo 1); gli agenti accettano paci che il motore non controlla.
- **IA**: la soglia "decisa" (50 punti dopo 60 giorni) dipende dal termine delle battaglie (capo 4).
