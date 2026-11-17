# Corte 07 — Trattati di pace e punteggio di guerra: verdetto

> **Dichiarazione**: atto d'accusa e verdetto sono stati scritti **nella stessa sessione** dallo stesso modello (Claude Opus 5.5), l'accusa prima e come compito a sé. La giuria non è quindi indipendente dall'accusa: per compensare, ogni capo è stato riverificato sul codice o con una sonda nuova (`sonde/giuria1-verifiche.mts`, 5 s, seme `giuria07`), e dove la verifica ha dato un risultato diverso il capo è ridimensionato.

Branch `feat/fase2-storia`, commit `2f9bcf7`. Riletti dalla giuria: `src/engine/peace.ts`, `src/ui/peace-view.ts`, `src/engine/ai.ts` r. 212-234, `tests/pace.test.ts` (3 test verdi, 2 s), `diplomacy.ts` r. 28-102 e 198-260, `llm/agents.ts` r. 42-131, `llm/gm.ts` r. 134-139, `economy.ts` r. 85 e 114-115. I fatti storici dei giurati vengono dalla memoria, non da una ricerca.

---

## A. La difesa del motore: capo per capo

| capo | esito | verifica della giuria |
|---|---|---|
| 1. Seconda pace senza punteggio | **confermato** | `diplomacy.ts:checkProposal` r. 198-201 → `checkCession` r. 224-246: nessuna chiamata a `warScore`; r. 241 basta stanchezza ≥ 50; `agents.ts:plausibility` r. 42-55 non ha il caso `peace`; il contesto dato al modello non contiene il punteggio (`grep warScore src/llm` vuoto). Riproduce la sonda 1F. Gravità ridotta da critica ad **alta**: la via esiste solo con l'LLM attivo e richiede che il modello accetti. È una via più vecchia (`motore.test.ts:75-78`) mai riallineata a `peace.ts`. |
| 2. Guerre del giocatore mai chiuse | **confermato** | `ai.ts:216`; `concludePeace` è chiamata solo da `ai.ts:232` e da `peace-view.ts`. Un'occupazione non cambia il padrone (`owner`), quindi il giocatore battuto non scompare mai. |
| 3. Punteggio diluito dall'impero | **confermato in parte** | Il fatto regge: contro il solo Regno Unito, isole occupate con Londra, 29-0 (con i suoi 25 Stati indiani protetti, 26-0). La parte sulla "base fissa 1" pesa meno (13-16% del valore negli imperi, 1% in Germania): è un fattore secondario, non la causa. Il costo coloniale (30 province del Bengala, 33 milioni di abitanti per 25,6 punti) è confermato dal codice (`checkCession` r. 172-178, raggiungibilità via mare r. 155). |
| 4. Scaramuccia da 25 punti | **confermato** | Sonda della giuria: 1000 perdite austriache contro 0 → 25-0; 300.000 contro 0 → 25-0, identico. Sul termine di stanchezza l'accusa esagera: 40 è il massimo teorico; la stanchezza sale di 0,3 a settimana più le perdite pesate sulla popolazione (`economy.ts:114`), quindi in pratica conta di meno, ma raddoppia l'informazione delle perdite. |
| 5. Vassallaggio a prezzo fisso | **confermato in parte** | Spagna→Portogallo, Serbia→Bulgaria, Grecia→Impero ottomano: confermati (sonda 2 e codice r. 205-212, 296). La Cina vassalla del Giappone **no**: «troppo lontano» (il Giappone non ha la marina coloniale). Ma la Cina può diventare protettorato della Russia o del Regno Unito per 60 punti, e il Giappone della Russia (sonda della giuria). |
| 6. Liberazione al destinatario sbagliato | **confermato in parte** | L'errore c'è (`peace.ts:354` chiama `liberationTarget` senza province). Ma i 53 casi dell'accusa sono gonfiati: in 39 la conferenza non mostra alcun destinatario, quindi non si possono chiedere. I casi reali sono **14, e in tutti e 14 il destinatario applicato non confina con le province**: arabi ottomani, persiani, della costa della Tregua e del Neged → Marocco; malesi → Perak; nguni britannici → un altro Stato al posto dello Zululand. |
| 7. Stato liberato amico della nazione sbagliata | **confermato** | `peace.ts:356`; sonda 1E (Albania liberata dalla Grecia, stima 60 verso la Russia). Testo r. 360 sempre «ottiene». `birth` r. 328-340 non crea unità. |
| 8. Paci del motore troppo rapide e dure | **confermato in parte** | Le soglie (`ai.ts:220-225`) e la mancanza di uno scopo (`types.ts:180-187`: `War` non ha obiettivo) sono vere. La "durezza" però è una conseguenza dei capi 4 e 5, non un difetto a sé: corretti quelli, si rimisura. |
| 9. Quota per grandezza dell'esercito | **confermato** | r. 67-68 contano tutte le unità della nazione. Nella sonda la Russia è stata aggiunta a mano ai belligeranti, ma la formula è quella. |
| 10. Regole nell'interfaccia | **confermato, gravità bassa** | `peaceAnswer` r. 443 restituisce `ok` prima di controllare il vincitore; oggi lo impedisce `peace-view.ts:118`. In modalità `all`, `sign` r. 219-223 non controlla i rifiuti e `applyDemand` caso `annex` r. 368-374 non ha alcun controllo: un errore latente, raggiungibile solo in quella modalità. |
| 11. Dopo la pace nulla | **confermato** | `concludePeace` r. 420-432; `declareWar` non conosce tregue; `applyDemand` caso `vassal` r. 363-366 senza il −20 che `vassals.ts:257` applica e che `SPEC.md` r. 86 promette. |
| 12. Strumenti mancanti | **confermato** | 9 tipi in `Demand`. È una lista di desideri: la giuria la ordina sotto. |
| 13. Costi piatti | **confermato** | r. 219-222, r. 395 (`Math.min(3, …)`: i macchinari oltre il terzo livello si perdono), r. 167 (`||`). |
| 14. Indennità irrilevanti | **confermato in parte** | Il meccanismo (r. 218, 377-380) è come descritto; l'episodio Canada-Regno Unito della sonda 2 l'accusa stessa non l'ha verificato e la giuria non lo considera prova. |

---

## B. Ciò che l'accusa non ha visto

### Giurato 1 — storico dei congressi e delle paci (Francoforte, Berlino, Shimonoseki, Portsmouth)
1. **Le paci non hanno spettatori.** `declareWar` sposta la stima di tutte le nazioni verso l'aggressore (`diplomacy.ts:59`, −4 o −15); `concludePeace` non tocca la stima di nessun terzo, qualunque cosa si prenda. A Shimonoseki (1895) la Russia, la Germania e la Francia costrinsero il Giappone a rendere il Liaodong; a Berlino (1878) le potenze riscrissero Santo Stefano. Qui la Russia fa nascere un Kurdistan di 16 province (sonda 2) nell'indifferenza generale. (Memoria.)
2. **La pace del Pacifico è sbagliata anche nel contenuto, non solo nella data** (la data è nota alla corte 00). Sonda 2, 8 gennaio 1881: il Perù cede Pisagua, Arica e Tacna e paga 32 milioni; la Bolivia cede Cobija. Per quanto ricordo, ad Ancón (ottobre 1883) il Perù cedette Tarapacá, mentre Tacna e Arica restarono al Cile per dieci anni in attesa di un plebiscito mai tenuto (Tacna tornò al Perù nel 1929); la Bolivia firmò una tregua nel 1884 e il trattato di cessione solo nel 1904. Il motore non ha né l'amministrazione temporanea né la tregua.
3. **Le rate sono sempre di un anno.** `peace.ts:380`: 52 settimane per qualunque somma. La Francia pagò i 5 miliardi di Francoforte in circa due anni e mezzo, con truppe tedesche nei dipartimenti dell'est a garanzia; la Cina pagò l'indennità di Shimonoseki in tre anni (memoria). Una rata fissa di un anno rende le indennità grandi insostenibili per i piccoli e trascurabili per i grandi.

### Giurato 2 — progettista di sistemi di pace per giochi di strategia
1. **Si può "liberare" il popolo stesso del perdente.** `suggestDemands` filtra i popoli propri del perdente (`peace.ts:302`, `STATE_PEOPLES[from].own`), ma l'interfaccia no (`peace-view.ts:180-181`) e nemmeno `demandCost` (r. 199-204). Sonda della giuria: «tedeschi di GER → AUH: 103 province, 85,2 punti se occupate»: la Germania intera, capitale esclusa, all'Austria-Ungheria come "liberazione"; e «tedeschi di AUH → GER», 25 province. È un errore, ed è il più grave che la giuria aggiunge.
2. **La liberazione costa da un terzo a un quarto della cessione.** Moltiplicatore 0,5 (r. 201) contro 1,8 di una cessione senza rivendicazioni: la Finlandia (17 province) costa 2,7 punti, gli ucraini della Russia (43 province) 13,7, le terre arabe ottomane (85 province) 34,7. Per smembrare un nemico conviene sempre liberare, non prendere: la mossa dominante del sistema.
3. **I test coprono un terzo del motore.** `tests/pace.test.ts` ha 3 casi: nessuno su `makePeace`, sul destinatario applicato della liberazione, su `birth`, sulle rate, su smilitarizzazione, smontaggio, rottura delle alleanze, sulla modalità `all`, sulle guerre del giocatore. Gli errori dei capi 6, 7 e 10 e quello sopra sarebbero stati presi da un test di poche righe.

### Giurato 3 — cartografo delle cessioni
1. **La liberazione non passa dai controlli sul confine.** `demandCost` caso `liberate` (r. 199-204) non chiama `checkCession`: niente exclavi, niente pezzi, niente corridoi. Sonda della giuria: la Polonia liberata dalla Germania stacca **10 province** da Berlino (Danzica, Königsberg…); i serbi liberati dall'Austria-Ungheria staccano Ragusa e Cattaro; i greci ottomani nascono in **9 pezzi**, i croati austriaci in 5, gli ucraini russi in 3 (con Odessa e Kišinëv tagliate fuori dalla Russia).
2. **Oltremare non c'è limite di forma.** Il controllo dei corridoi vale solo se i due Stati confinano già (`bBefore > 0`, r. 185-186), e la via del mare vale per chi ha un porto qualunque nel mondo e marina ≥ 20 (r. 116). Fra potenze senza confine comune si possono chiedere province costiere sparse a scacchiera (le 30 del Bengala della sonda 3A passano senza avvisi).
3. **"Occupata da noi" vale anche per un'altra guerra.** `occupiedBy` (r. 105-111) accetta un controllore che stia dalla stessa parte del vincitore in *qualunque* guerra, non in questa: una provincia tenuta da un cobelligerante di un'altra guerra fa pagare la metà. Effetto raro, gravità bassa.

---

## C. Voti dei giurati (1-10)

| | correttezza | fedeltà storica | qualità di gioco | manutenibilità | media |
|---|---|---|---|---|---|
| Storico | 5 — gli errori sono pochi ma toccano la mappa politica | 4 — vassallaggi e liberazioni del 1881 fuori epoca, terzi indifferenti | 5 — conferenza chiara, paci istantanee | 6 — codice compatto e commentato | **5,0** |
| Progettista | 4 — due vie di pace, liberazione rotta, giocatore immune | 5 — Trento-Istria-Fiume senza Bolzano è un buon segno | 4 — punteggio sfruttabile, mossa dominante (liberare) | 5 — un file solo, ma 3 test | **4,5** |
| Cartografo | 5 — cessioni solide, liberazioni senza controlli | 5 — confini delle cessioni sensati | 5 — i blocchi sulla mappa funzionano | 6 — `checkCession` riusabile così com'è | **5,25** |
| **media per criterio** | **4,7** | **4,7** | **4,7** | **5,7** | **4,9** |


---

## D. Il verdetto della corte

### Da fare subito (errori e cose che rovinano il gioco)
1. **Liberazione: destinatario fissato e popoli propri esclusi** (capo 6 + giurato 2.1). Errore, alta. Salvare il destinatario nella richiesta al calcolo del costo e usarlo in `applyDemand`; rifiutare in `demandCost` i popoli in `STATE_PEOPLES[from].own`. *Piccolo.* Misura: la sonda della giuria dà 0 casi di destinatario diverso e nessuna liberazione «tedeschi di GER»; test nuovo in `tests/pace.test.ts`.
2. **Stato liberato: liberatore giusto, guarnigione, testo** (capo 7). Errore, media. `birth(…, d.to)`; un'unità proporzionata agli abitanti; testo «nasce con» quando nasce. *Piccolo.* Misura: test (Albania liberata dalla Grecia ha stima 60 verso la Grecia e almeno un'unità).
3. **Una sola pace** (capo 1). Errore, alta. La proposta `peace` del dialogo diventa `Demand[]` (cessione, indennità) e passa da `peaceAnswer`; la pace bianca del Game Master solo se `warScore` non ha un vincitore oltre 15 punti. *Medio.* Misura: la sonda 1F restituisce un veto; `tests/llm.test.ts` aggiornato.
4. **Le guerre del giocatore finiscono** (capo 2). Mancanza, alta. Con le stesse soglie di `ai.ts:220-225` il vincitore non giocante presenta le sue condizioni; dopo quattro settimane di rifiuti, stanchezza e instabilità crescenti, poi pace imposta; il giocatore alleato minore esce con una pace separata e la guerra fra le altre nazioni prosegue. *Medio.* Misura: test con il giocatore occupato al 100% che dopo N settimane è in pace.
5. **Perdite pesate sulla forza** (capo 4). Squilibrio che rovina il gioco, alta. Il termine delle battaglie diviso per gli uomini mobilitati dei due lati, non per le sole perdite. *Piccolo.* Misura: 1000 perdite contro 0 fra Italia e Austria danno meno di 3 punti; 300.000 contro 0 restano vicino a 25.
6. **Vassallaggio solo fra disuguali** (capo 5). Difetto di modello, alta. Rifiutare se il perdente ha più abitanti o più esercito del vincitore, costo crescente col rapporto di popolazione. *Piccolo.* Misura: Spagna→Portogallo, Serbia→Bulgaria rifiutati; rifatta la sonda 2, nessun vassallaggio fra Stati simili.
7. **Liberazione dentro le regole sui confini** (giurato 3.1). Difetto, media. Applicare alla liberazione il controllo delle exclavi del perdente e ammettere solo il pezzo connesso più grande (o i pezzi che toccano il destinatario). *Piccolo.* Misura: la Polonia dalla Germania non stacca più la Prussia orientale; i greci ottomani non nascono in 9 pezzi.
8. **`peaceAnswer` controlla sempre vincitore e rifiuti** (capo 10). Errore latente, bassa ma economico. La modalità toglie solo il tetto dei punti; `sign` in modalità `all` passa da `peaceAnswer`. *Piccolo.* Misura: il test del capo 10 (Serbia perdente in modalità `own`) restituisce `ok: false`.

### Da fare nella fase di bilanciamento
9. **Punteggio sulla madrepatria, cessioni sulla popolazione** (capo 3 + giurato 3.2). Le colonie pesate a parte, il costo di una provincia in proporzione ai suoi abitanti e al suo reddito; corridoi controllati anche oltremare. *Medio.* Misura: la Francia che occupa le isole britanniche supera 50 punti; 30 province del Bengala non occupate non stanno più nel bilancio.
10. **Liberazione al giusto prezzo** (giurato 2.2): moltiplicatore vicino a quello della cessione con rivendicazione di nucleo. *Piccolo.* Misura: la Finlandia costa almeno 10 punti.
11. **Quota dei vincitori sul fronte** (capo 9): contare le unità in territorio nemico e le perdite inflitte. *Piccolo.* Misura: la Russia ferma della sonda 1C scende sotto il 15%.
12. **Tregua e conseguenze** (capo 11 + giurato 1.1): tregua di 5 anni fra le parti, stima del perdente in proporzione al costo pagato, stima dei terzi verso chi prende molto, −20 del vecchio signore. *Piccolo-medio.* Misura: nuova guerra fra le stesse parti rifiutata per 5 anni; test.
13. **Costi coerenti e rate** (capi 13 e 14, giurato 1.3): tutto in proporzione al perdente; addebitare solo i livelli smontabili; rate da 1 a 3 anni secondo la somma; indennità legate anche alla cassa (da fare insieme alla correzione dell'economia). *Piccolo.*
14. **Tempi delle paci del motore** (capo 8): rimisurare dopo le voci 5 e 6; solo allora decidere se serve uno scopo di guerra.
15. **Test**: un caso per ogni tipo di richiesta in `applyDemand` e uno per `makePeace` (giurato 2.3). *Piccolo.*

### Da rimandare o non fare
- **Congresso delle potenze, basi e porti, riconoscimenti, occupazione a garanzia** (capo 12): utili, ma oggi le nazioni non giocanti non dichiarano guerre fra Stati (problema noto); un congresso senza guerre non ha nulla da rivedere. Dopo. La pace separata invece entra con la voce 4.
- **Amministrazione temporanea e plebisciti** (giurato 1.2): rimandare a quando si rifà lo scenario del Pacifico, insieme al verdetto della corte 00.
- **`occupiedBy` su altre guerre** (giurato 3.3): effetto raro; correggerlo solo se capita di toccare la funzione.
- **Non** togliere la base 1 dal valore delle province da sola: senza la voce 9 sposterebbe il problema invece di risolverlo.

### Da non toccare (funziona)
`checkCession` (raggiungibilità, capitale, exclavi, corridoi) per le cessioni via terra; costi ridotti dalle rivendicazioni e raddoppiati per il non occupato; selezione per blocchi toccando la mappa; `suggestDemands` usata sia dal motore sia dal giocatore; `settleOccupations` e `checkAlive` dopo ogni pace; indennità nel bilancio e nel libro unico; smilitarizzazione rispettata dalla costruzione; determinismo.

### Interazioni da segnalare alle altre corti
- **Coloniale (00)**: Tunisi diventa *vassallo* francese nel rapporto (5 marzo 1887) perché il protettorato costa 60 punti; la voce 6 deve lasciare possibile il protettorato coloniale; con la voce 9 le guerre coloniali vanno rimisurate.
- **Diplomazia (06)**, **LLM (09)**: la voce 3 tocca `diplomacy.ts` e `gm.ts`. **Economia (03)**: la voce 13 dipende dalle casse che esplodono. **IA (02)**: le voci 4 e 5 passano da `ai.ts`.
