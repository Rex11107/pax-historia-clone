# Atto d'accusa — Corte "Intelligenza delle nazioni non giocanti"

Imputato: `src/engine/ai.ts` (aiPlan, planNation, overseas, aiColonize, aiEndOfTurn), le decisioni delle nazioni non giocanti in `economy.ts` (aiFinances, aiMobilize), `construction.ts` (aiConstruction), `research.ts` (aiResearch), `trade.ts` (aiTrade), `vassals.ts` (weeklySubjects), e il loro confine con `peace.ts`, `diplomacy.ts`, `llm/gm.ts`, `llm/agents.ts`. Branch `feat/fase2-storia`, repository non toccato.

Sonde (cartella della corte, tutte sotto 90 s):
- `sonda-guerra.mts 26 GER FRA`: guerra Germania-Francia fra nazioni non giocanti, 26 turni.
- `sonda-giocatore.mts`: (a) Russia-Ottomani, 22 turni, con il tempo vero della fase "piani"; (b) il giocatore Italia dichiara guerra all'Austria-Ungheria e non fa nulla per 26 turni.
- `sonda-casse.mts 156`: tre anni di pace, dove vanno i soldi di nove potenze.

---

## Capo 1. Le unità mandate "al fronte" restano ferme per sempre
- **Tipo**: errore. **Gravità**: critica.
- **Prova**: `ai.ts:planNation:93` dà `[{move, 'al fronte'}, {entrench}]` e il secondo ordine non ha `until`. In `orders.ts:processUnit:211-214` un trinceramento senza `until` "tiene la posizione a tempo indeterminato", e `ai.ts:54` pianifica solo le unità con `orders.length === 0`. Un'unità arrivata al fronte non torna più pianificabile: la libera solo una ritirata (`combat.ts:retreat:148`) o una pace. Il rinforzo da fermo invece usa `until: day_gte 7` (`ai.ts:79`, `:129`), quindi l'incoerenza sta proprio nel ramo "al fronte".
- **Misura** (`sonda-guerra`): la Germania ha 9 unità su 22 ferme per sempre da T4 a T26, cioè il 40% dell'esercito. A T24 ha 530.000 uomini contro 308.000 francesi, ma i francesi le occupano 12 province e la Germania non le riprende. Nella guerra russo-ottomana non si vedono unità ferme perché lì ci sono sempre obiettivi vuoti da attaccare: il difetto morde quando il nemico regge.
- **Effetto sul giocatore**: dopo le prime settimane metà dell'esercito nemico diventa una guarnigione statica su un fronte che nel frattempo si è spostato. Basta superare quella linea, o aggirarla, e dietro non c'è riserva mobile. Da qui viene buona parte della "lentezza" già nota.
- **Rimedio**: dare anche qui `until: {type:'day_gte', value:7}`, oppure trattare come oziosa a ogni piano un'unità che ha solo un trinceramento. Aggiungere un test: dopo 8 turni di guerra nessuna unità non giocante ha un trinceramento senza scadenza.

## Capo 2. Il pianificatore è miope: un passo alla volta, nessuna concentrazione, nessuna ritirata
- **Tipo**: difetto di modello. **Gravità**: alta.
- **Prova**:
  - Gli obiettivi sono solo le province nemiche che confinano con una provincia amica (`ai.ts:43-45`). Non c'è un obiettivo operativo come la capitale, un nodo ferroviario o la distruzione di un'armata: si avanza un anello alla volta.
  - Si ripianifica due volte a settimana (`turn.ts:74`, `:91`). Un'unità che prende la provincia resta ferma fino al piano successivo, e in più c'è il filtro dei 40 giorni (`ai.ts:65`).
  - La superiorità si giudica unità per unità (`ai.ts:67-71`) come `forza/difesa ≥ 1,3` sui soli uomini presenti. Non contano il terreno, il trinceramento e la fortezza, che in `combat.ts:power:30-32` possono raddoppiare la difesa, né il morale e il rifornimento. `assigned` somma uomini che arrivano in giorni diversi e quindi combattono alla spicciolata.
  - Non esiste ritirata pianificata. Sotto il 45% di forza o lo 0,35 di rifornimento un'unità "si riorganizza" restando dov'è (`ai.ts:59`), ma i rinforzi arrivano solo con rifornimento ≥ 0,6 (`supply.ts:77`): in territorio nemico non si riprende mai.
  - Nessuna difesa in profondità: il fronte è "dove manca di più", calcolato sulle sole province adiacenti (`ai.ts:81-91`).
- **Misura**: la Francia passa da 21 a 13 unità fra T12 e T14 (da 453.000 a 294.000 uomini) attaccando a ripetizione con il rapporto di 1,3. La Russia in 21 settimane occupa 11 province ottomane su 212. Nella storia, nel 1877-78 i russi arrivano a Santo Stefano in dieci mesi, e la guerra greco-turca del 1897 dura trenta giorni.
- **Effetto sul giocatore**: l'AI è facile da battere. Basta tenere in ogni provincia di confine poco più di 1/1,3 della più grande unità nemica vicina, in collina o trincerati, e l'AI non attacca mai oppure si dissangua. Poi si sfonda con una sola grande massa dove le guarnigioni sono ferme (capo 1).
- **Rimedio**: piano per gruppi. Si sceglie un obiettivo operativo per fronte, con capitale e province rivendicate come in `suggestDemands`. Si concentra finché `power()` stimato (stessa formula del combattimento) supera di 1,5 la difesa, si ritira chi è sotto il 45% verso una provincia con rifornimento e si ripianifica chi ha finito l'ordine il giorno stesso.

## Capo 3. Il motore non dichiara mai guerre fra Stati
- **Tipo**: mancanza. **Gravità**: alta.
- **Prova**: `ai.ts:13` dice esplicitamente "le decisioni politiche (dichiarare guerra, alleanze) restano al Game Master". Le sole chiamate a `declareWar` fuori dall'interfaccia sono:
  - il GM via LLM (`gm.ts:applyWorldActions:122-133`, al più una a turno e solo se il modello la propone);
  - le guerre coloniali (`colonial.ts:562`) e il Mahdi (`:682`);
  - le guerre d'indipendenza (`vassals.ts:238`).

  Senza chiave LLM (simulazione, partita offline, APK senza rete) non c'è quindi nessuna guerra fra Stati. Il rapporto 1881-1899 ne conta 7 dichiarate, tutte coloniali. Il materiale per decidere esiste ma è usato solo a pace fatta: rivendicazioni (`claims.ts`, `CLAIMS_1881`), rivali e opinioni d'epoca (`europe1881.ts:155-169`: FRA→GER −70, RUS→TUR −60, GRE→TUR −60). Il filtro del GM (`gm.ts:128`) accetterebbe già al primo turno una Francia contro la Germania, ma solo se il modello la propone. È una scelta casuale, non deterministica e non misurabile.
- **Fatti storici mancanti**: serbo-bulgara (novembre 1885, due settimane), sino-francese (1884-85), sino-giapponese (1894-95), greco-turca (aprile-maggio 1897), ispano-americana (1898), boera (ottobre 1899).
- **Effetto sul giocatore**: il mondo resta immobile. L'unica minaccia è il giocatore stesso, che può crescere senza che nessuno approfitti di una sua guerra.
- **Rimedio**: un valutatore deterministico di casus belli, settimanale e per coppia, che pesi:
  - la rivendicazione (nucleo, storica, pretesa) e la rivalità;
  - la forza relativa con alleati e garanti, presi da `declareWar:44-56`;
  - l'occasione: bersaglio già in guerra, stabilità bassa, alleato impegnato;
  - la stanchezza e il debito;
  - un raffreddamento per coppia.

  Si possono aggiungere poche finestre storiche che *spingono a valutare* (Balcani 1885, Grecia 1897), sul modello del verdetto coloniale. Il GM resta come narratore e acceleratore, non come unica fonte.

## Capo 4. Le guerre col giocatore non finiscono mai, e la pace bianca è un regalo
- **Tipo**: errore (il primo punto), difetto di modello (il resto). **Gravità**: alta.
- **Prova**:
  - `ai.ts:aiEndOfTurn:216` salta ogni guerra in cui c'è il giocatore, anche come gregario: l'AI non chiede né impone mai la pace.
  - `peace.ts:peaceAnswer:447` concede la pace bianca se il nemico non vince di almeno 15 punti.
  - Nel canale diplomatico (`agents.ts`) una proposta `peace` passa per `diplomacy.ts:checkProposal:198-200`, che guarda l'occupazione o la stanchezza (`:240-243`) e non il punteggio di guerra. `plausibility` (`agents.ts:42-55`) non ha un caso `peace`, e l'indennità non ha tetto se non "cassa + 300" (`diplomacy.ts:95`). Coesistono due regole di pace incoerenti.
- **Misura** (`sonda-giocatore` b, giocatore passivo):

  | turno | province italiane occupate | pace bianca |
  |---|---|---|
  | T4 | 5 | accettata |
  | T8 | 13 | accettata |
  | T12 | 20 | accettata (punteggio 7-18) |
  | T16 | 26 | rifiutata |
  | T26 | 37 | rifiutata, guerra ancora aperta |

  A T26 l'Austria-Ungheria ha cassa 0 e debito 15.176: non chiude la guerra né ne incassa i frutti.
- **Effetto sul giocatore**: due exploit.
  - Il giocatore dichiara guerra, prende ciò che può e, appena le cose vanno male, firma una pace bianca anche con venti province perse.
  - Il giocatore perdente non firma, e l'AI non può imporgli nulla: la guerra resta aperta per sempre.

  Con un LLM accomodante si può strappare un'indennità a chi sta vincendo.
- **Rimedio**:
  - Far valutare anche al motore le guerre col giocatore: l'AI vincente propone condizioni (`engineTerms`), e dopo un rifiuto la stanchezza del giocatore sale.
  - Concedere la pace bianca solo se il nemico perde o è esausto, non se "non vince di 15".
  - Far passare la pace dell'agente LLM per `peaceAnswer`.

## Capo 5. Le casse esplodono perché l'AI non ha una politica di spesa
- **Tipo**: mancanza e squilibrio. **Gravità**: alta.
- **Prova**: in pace le sole uscite decise dall'AI sono:
  - i cantieri (`construction.ts:aiConstruction:356-386`): al più 4, da 5 a 36 M, lunghi da 6 a 21 settimane, con cassa ≥ 50;
  - le ricerche (`research.ts:aiResearch`), da 1 a 3 alla volta e poco care;
  - il rimborso del 25% dell'eccedenza sulla riserva di 20 settimane di entrate, solo se c'è debito (`economy.ts:aiFinances:181-183`).

  Non c'è altro. Nessun arruolamento in pace (`ai.ts:198`, si arruola solo in guerra), nessuna imposta abbassata (`'low'` non compare mai) e nessun cambio di `infrastructure`. Le imposte alte tornano normali solo se la stabilità scende sotto 60 (`economy.ts:185`): uno Stato stabile le tiene alte per sempre.
- **Misura** (`sonda-casse`, 156 turni):

  | nazione | saldo settimanale | cantieri | ricerca | cassa finale | riserva voluta |
  |---|---|---|---|---|---|
  | Regno Unito | +59,4 | 2,20 | 2,35 | — | — |
  | Stati Uniti | +48,4 | 1,74 | 2,12 | 7.538 | 1.994 |
  | Giappone | +16,2 | 1,19 | 0,39 | 2.459 | 718 |

  Le potenze spendono in opere dal 2 al 4% dell'avanzo. Gli eserciti restano sotto quelli di pace del profilo (Regno Unito 116.000 su 130.000, Germania 372.000 su 430.000, Russia 630.000 su 750.000). La Francia è all'opposto: imposte alte, saldo +0,1, debito 20.000 fermo e cassa 45, sotto la soglia dei cantieri. Non riduce l'esercito né cambia politica.
- **Effetto sul giocatore**: con le potenze ricche e inerti, il denaro non diventa forza. Il giocatore che investe le supera, e le casse piene rendono assurdi sussidi e indennità.
- **Rimedio**: un bilancio di intenzioni a fasce.
  - Sotto la riserva: si risparmia.
  - Fra 1 e 2 volte la riserva: si porta l'esercito a `armyPeace`, scalato con la tensione verso i rivali, e si passa a `infrastructure: heavy`. Gli slot dei cantieri vanno legati all'avanzo, non a un massimo di 4.
  - Oltre: imposte basse (stabilità), sussidi agli alleati, acquisti coloniali.
  - In deficit cronico: si riduce l'esercito.

## Capo 6. Tutto l'esercito su un fronte, la patria vuota
- **Tipo**: difetto di modello. **Gravità**: media.
- **Prova**: `planNation` riceve tutti i nemici insieme (`ai.ts:20-22`) e manda ogni unità al bersaglio migliore. Non esistono una guarnigione minima per la capitale, una quota per fronte o una valutazione di chi potrebbe entrare in guerra.
- **Misura** (`sonda-giocatore` b): già a T8 le 25 unità austro-ungariche e tedesche su 25 sono in Italia, e la Germania lascia scoperto il confine francese.
- **Effetto sul giocatore**: basta un secondo fronte, uno sbarco o un alleato per trovare le capitali vuote.
- **Rimedio**: una guarnigione minima (capitale, province di confine con rivali in pace) esclusa dal piano. Le forze vanno ripartite per guerra e per fronte in proporzione alla minaccia.

## Capo 7. Le paci fra nazioni non giocanti sono rozze e una ha cancellato la Guerra del Pacifico
- **Tipo**: errore (Pacifico), difetto di modello (soglie). **Gravità**: media.
- **Prova**: `ai.ts:220-225` chiude ogni guerra con più di 540 giorni di età. La guerra del Pacifico parte con `startDay: -637` (`setup.ts:61`), quindi finisce l'8 gennaio 1881, primo turno (rapporto 1881-1899). Nella storia Ancón è dell'ottobre 1883 e la tregua boliviana del 1884. La stanchezza considerata è solo quella dei capofila (`ai.ts:219`). Il GM può imporre una pace bianca a qualunque guerra fra AI dopo 28 giorni (`gm.ts:138-139`).
- **Misura** (`sonda-guerra`): la guerra franco-tedesca si chiude a T26 (182 giorni) con la Germania vincitrice per 22 a 0 mentre la Francia le occupa 12 province. Il punteggio pesa le perdite in battaglia più dell'occupazione (`peace.ts:warScore:55-58`). Le occupazioni tornano indietro e la Francia paga le condizioni.
- **Effetto sul giocatore**: paci incomprensibili nel dispaccio e guerre storiche che spariscono.
- **Rimedio**:
  - Contare l'età della guerra dall'inizio della partita, o da un campo `engagedSince`.
  - Dare alla soglia del "decided" anche l'occupazione netta.
  - Far rispettare al GM il punteggio.

## Capo 8. In guerra si arruola solo con la cassa piena
- **Tipo**: squilibrio. **Gravità**: media.
- **Prova**: `ai.ts:207` arruola solo con `treasury > 30`, e una nazione in deficit ha cassa 0 (`ledger.ts:cover`). Le guerre del secolo si finanziano a debito, mentre qui l'AI smette di arruolare proprio quando il debito sale. Il confronto `mine < theirs × 1,5` conta tutti gli uomini nemici del mondo, anche lontani.
- **Misura**: l'Austria-Ungheria, a cassa 0 e debito 15.176 (b), si ferma a 2 arruolamenti in 26 turni.
- **Rimedio**: in guerra difensiva permettere il debito fino a un tetto legato alle entrate, e confrontare le forze del teatro, non quelle globali.

## Capo 9. Prestazioni del piano
- **Tipo**: squilibrio (algoritmo). **Gravità**: media.
- **Prova**: per ogni unità oziosa:
  - un Dijkstra su tutta la mappa con tetto di 60 giorni (`ai.ts:60`);
  - per ogni bersaglio, due chiamate a `strengthAt` che scorrono tutte le unità del mondo (`ai.ts:66`, `:71`, ripetuto dentro il filtro);
  - `front.includes` lineare (`:79`).

  Il costo è O(unità oziose × bersagli × unità).
- **Misura**:

  | guerra | tempo dei piani | dettaglio |
  |---|---|---|
  | Russia-Ottomani | 95 ms a turno | 2 chiamate, circa 47 ms l'una |
  | Germania-Francia (clone) | 93 ms a chiamata in media | prima chiamata 706 ms, picchi di 264 ms |
  | rapporto 1881-1899 (solo guerre coloniali) | 8 ms a turno | — |

  Su un telefono si moltiplica per 3-5 volte e cresce con il numero di guerre: è proprio ciò che il capo 3 chiede di aggiungere. Il collo di bottiglia vero del turno in guerra resta però `rifornimenti` (279 ms a turno nella sonda a).
- **Rimedio**: una mappa forza-per-provincia calcolata una volta per piano, un Dijkstra per provincia di partenza condiviso dalle unità che vi stanno, e un `Set` per il fronte.

## Capo 10. Codice morto e commenti falsi in aiColonize
- **Tipo**: errore (documentale). **Gravità**: bassa.
- **Prova**: `ai.ts:150` `const colonial = false`, eppure le righe 160, 163, 169, 180 e 187 portano i rami "potenze coloniali". Il commento di `:162` ("le potenze una spedizione ogni quattro mesi") descrive un comportamento che non esiste più, e `docs/SPEC.md:98` è coerente solo a metà.
- **Rimedio**: togliere i rami morti e allineare commenti e SPEC.

## Capo 11. Test insufficienti
- **Tipo**: mancanza. **Gravità**: bassa.
- **Prova**: l'unico test del comportamento in guerra (`tests/motore.test.ts:101-108`) controlla solo che le posizioni russe cambino. Nessun test copre le unità ferme, la pace con il giocatore, la spesa delle potenze o il tempo di `aiPlan`.
- **Rimedio**: un test per ciascuno dei capi 1, 4, 5 e 9 (soglie misurate come sopra).

## Capo 12. Determinismo fragile ma rispettato
- **Tipo**: difetto (robustezza). **Gravità**: bassa.
- **Prova**: diversi ordinamenti non hanno criterio di spareggio (`ai.ts:72`, `:87`, `:91`, `:176`): il risultato dipende dall'ordine dell'array delle unità e dalla stabilità di `Array.sort` (ES2019). Oggi è deterministico, e non ho trovato `Math.random` né `Date.now`.
- **Rimedio**: aggiungere sempre `|| a.p - b.p` o `|| a.id.localeCompare(b.id)`.

---

## Ciò che il motore fa bene (da non rompere)
- È deterministico: solo `rand(seme, …)`, nessun accesso esterno, ordine delle fasi fissato (`turn.ts:WEEKLY_PHASES`).
- Usa le stesse regole del giocatore. Le nazioni non giocanti passano per `recruit`, `startProject`, `startResearch`, `signTrade`/`quote`, `planPath`/`processUnit` e lo stesso combattimento. Non ho trovato scorciatoie: niente unità gratuite, niente rifornimento speciale, niente bonus nascosti. Le sole asimmetrie sono a sfavore dell'AI, che non usa il debito per arruolare (capo 8) e non chiude le guerre col giocatore (capo 4).
- La mobilitazione e gli arruolamenti sono proporzionati al nemico (`aiMobilize`, `ai.ts:200-210`): hanno risolto la bancarotta francese del vecchio motore.
- I rinforzi per mare (`overseas`) portano le potenze nelle guerre oltremare, con limite e soglia sensati.
- I bersagli sono pesati in modo storico: liberazione ×3, capitale ×2, carbone/ferro/petrolio, popolazione.
- Le paci fra nazioni non giocanti usano le stesse condizioni suggerite al giocatore (`engineTerms`), e una guerra senza scontri ha comunque una fine.
- Il codice è breve e leggibile: le correzioni proposte sono locali.

## Interazioni con gli altri motori
- **Coloniale**:
  - Le guerre coloniali sono combattute da `planNation`/`overseas`, quindi il capo 1 e il capo 2 rallentano le campagne (i 43.500 francesi contro 8.000 tunisini di `SPEC.md:175`).
  - `aiEndOfTurn` chiude ogni guerra a 540 giorni o a 50 punti dopo 60 giorni. Questo taglia le "campagne a obiettivo" decise dalla corte coloniale e ha chiuso la guerra del Pacifico al primo turno (capo 7).
  - `colonial.ts:533` sospende tutta la politica coloniale per *qualunque* guerra: se il capo 3 introduce guerre fra Stati, l'espansione coloniale delle potenze coinvolte si fermerà. Va distinta la guerra coloniale da quella europea prima di introdurle.
  - `aiColonize` esclude chi ha un programma (`hasProgram`): i due motori non si sovrappongono, ed è un bene.
- **Pace** (`peace.ts`): il punteggio dominato dalle perdite (capo 7) e la pace bianca a 15 punti (capo 4) decidono metà del comportamento percepito dell'AI.
- **Diplomazia/LLM** (`diplomacy.ts`, `agents.ts`, `gm.ts`): guerra, pace e trattati fra AI dipendono dal modello, e la pace dell'agente aggira il punteggio (capi 3 e 4).
- **Economia/costruzione/ricerca**: la spesa dell'AI vive in tre file diversi senza un bilancio comune (capo 5). Ogni rimedio deve passare da `ledger.ts`, come oggi.
- **Rifornimenti/combattimento**: il piano ignora la formula di `combat.ts:power` (capo 2) e la condizione di rinforzo di `supply.ts:77`, così le unità logore restano senza via d'uscita.
