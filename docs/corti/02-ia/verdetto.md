# Verdetto — Corte "Intelligenza delle nazioni non giocanti"

16 novembre 2026. Giuria: un giocatore competitivo che vive di exploit, uno storico delle relazioni internazionali 1871-1914, un ingegnere delle prestazioni su telefono. Il verdetto è scritto dalla sessione principale, che ha riletto l'atto d'accusa e verificato sul codice i capi decisivi; le misure sono quelle delle sonde dell'accusa, non rifatte.

## A. La difesa del motore: verifica dei capi

| capo | esito | prova |
|---|---|---|
| 1. Unità "al fronte" ferme per sempre | **confermato** | `ai.ts:93`: `{ type: 'entrench', status: 'pending' }` senza `until`; gli altri trinceramenti del file hanno `until: day_gte 7`. È una svista, non una scelta |
| 2. Pianificatore miope | confermato sul codice (obiettivi solo adiacenti, soglia 1,3 sui soli uomini) | `ai.ts:43-71` |
| 3. Nessuna guerra fra Stati | **confermato**, già noto | commento in testa ad `ai.ts`: le decisioni politiche restano al Game Master |
| 4. Guerre col giocatore senza fine; pace bianca regalata | **confermato** | `ai.ts:216` salta ogni guerra con il giocatore; `peace.ts:447` concede la pace bianca se il nemico non vince di 15 punti |
| 5. Nessuna politica di spesa | confermato, coincide con la corte dell'economia | `economy.ts:aiFinances` |
| 6. Tutto l'esercito su un fronte | confermato sul codice | `planNation` riceve tutti i nemici insieme |
| 7. Paci rozze; Guerra del Pacifico chiusa al primo turno | **confermato** | regola dei 540 giorni con `startDay: -637`; già nel verdetto coloniale |
| 8. Arruolamento solo con cassa piena | **confermato** | `ai.ts`: `n.treasury > 30` |
| 9. Prestazioni del piano | confermato sulla misura dell'accusa | sonda |
| 10-12 | non riverificati | minori |

Attenuanti della difesa: l'AI usa le stesse regole del giocatore, senza aiuti nascosti; rinforzi per mare, mobilitazione e arruolamenti proporzionati sono di tre giorni fa e hanno già tolto i difetti peggiori; il capo 3 è una scelta di progetto dichiarata, non un errore.

## B. Ciò che l'accusa non ha visto

**Il giocatore di exploit**
- L'AI non reagisce alle minacce in pace: si possono ammassare truppe al confine di una nazione non giocante, o sbarcarle accanto alla sua capitale con un diritto di passaggio, e dichiarare guerra con il nemico ancora in guarnigione di pace. Serve almeno una reazione alla concentrazione ai confini (mobilitazione parziale, protesta).
- Le nazioni non giocanti non rompono mai un'alleanza né ne cercano una per paura: il giocatore può isolare un bersaglio senza che questo cerchi protezione.

**Lo storico delle relazioni internazionali**
- Attenzione a cosa si chiede col capo 3. Fra il 1871 e il 1914 **nessuna grande potenza europea ha combattuto un'altra grande potenza europea**. Le guerre vere furono periferiche o fra potenze diseguali (serbo-bulgara, sino-francese, sino-giapponese, greco-turca, ispano-americana, boera, russo-giapponese). Un valutatore che fa scoppiare una guerra franco-tedesca ogni dieci anni sarebbe peggio del silenzio di oggi. Il modello giusto è la **crisi**: rivendicazione → ultimatum → mediazione delle potenze → una parte cede o si combatte, con le grandi potenze trattenute dal rischio di una guerra generale. È coerente col verdetto coloniale (cause di partita, garanti mai sospesi).
- Le alleanze dell'epoca erano difensive e segrete: l'AI dovrebbe contare gli alleati dell'altro come deterrente prima di dichiarare, non scoprirli dopo.

**L'ingegnere delle prestazioni**
- Il costo del piano cresce con il numero di guerre: se il capo 3 viene risolto senza prima sistemare il capo 9, il turno sul telefono peggiora proprio quando il gioco diventa interessante. L'ordine conta: prima le prestazioni del piano e dei rifornimenti, poi le guerre fra Stati.
- Va fissato un bilancio di tempo: fine turno entro 1 secondo sul telefono in una guerra fra grandi potenze, misurato da un test su stato preparato.

## C. Voti (1-10)

| giurato | correttezza | fedeltà storica | qualità di gioco | manutenibilità |
|---|---|---|---|---|
| giocatore di exploit | 5 | 4 | 3 | 7 |
| storico | 6 | 3 | 4 | 7 |
| ingegnere | 6 | — | 4 | 7 |

## D. Verdetto

### Da fare subito
| # | correzione | tipo | costo | misura |
|---|---|---|---|---|
| 1 | Scadenza al trinceramento "al fronte" (capo 1) | errore | piccolo (una riga più un test) | dopo 8 turni di guerra nessuna unità non giocante ha un trinceramento senza scadenza; la Germania non resta con 9 unità ferme su 22 |
| 2 | L'AI fa la pace anche col giocatore: chi vince propone condizioni (`engineTerms`) e il giocatore le vede; la pace bianca si concede solo se il nemico non vince o è esausto (capo 4) | errore e difetto | medio | giocatore passivo con 20 province occupate: pace bianca rifiutata; guerra chiusa con condizioni entro un anno |
| 3 | Età della guerra contata dall'inizio della partita (capo 7; già nel piano coloniale) | errore | piccolo | Guerra del Pacifico aperta il 1° gennaio 1882 |
| 4 | Criterio di spareggio in ogni ordinamento del piano (capo 12) | robustezza | piccolo | determinismo invariato |
| 5 | Test: unità ferme, pace col giocatore, tempo del piano (capo 11) | mancanza | piccolo | — |

### Da fare nella fase di bilanciamento
| # | correzione | tipo | costo |
|---|---|---|---|
| 6 | Politica di spesa a fasce (capo 5), insieme alla corte dell'economia | mancanza | medio |
| 7 | Piano per gruppi con un obiettivo operativo per fronte, stima della forza con la formula del combattimento, ritirata di chi è logoro (capo 2) | difetto di modello | grande |
| 8 | Guarnigione minima di capitale e confini coi rivali; forze ripartite per fronte (capo 6) | difetto di modello | medio |
| 9 | Arruolamento a debito in guerra difensiva, confronto delle forze del teatro (capo 8) | squilibrio | piccolo |
| 10 | Prestazioni del piano: forza per provincia calcolata una volta, un Dijkstra per provincia di partenza (capo 9). **Prima** delle guerre fra Stati | algoritmo | medio |
| 11 | Reazione alla concentrazione ai confini (nota del giocatore di exploit) | mancanza | medio |

### Una fase a sé, dopo
| # | correzione | condizioni della corte |
|---|---|---|
| 12 | Guerre fra Stati decise dal motore (capo 3) | come **crisi** con ultimatum e mediazione, non come dado; le grandi potenze trattenute dagli alleati dell'altro; calibrata sulla storia: guerre periferiche e diseguali frequenti, guerre fra grandi potenze rare; cause registrate e visibili; il Game Master resta narratore |

### Da non toccare
Le stesse regole per AI e giocatore; `aiMobilize`; i rinforzi per mare; i pesi storici degli obiettivi; le paci fra nazioni non giocanti che usano `engineTerms`.

### Interazioni
- Con la corte coloniale: le campagne coloniali passano dallo stesso pianificatore; i capi 1 e 2 le rallentano. Il blocco "in guerra non si fa politica coloniale" va tolto prima di introdurre guerre fra Stati.
- Con la corte della pace: il punteggio che pesa le perdite più dell'occupazione (la Germania "vince" con 12 province occupate) decide metà del comportamento percepito.
- Con la corte LLM: la pace proposta dall'agente deve passare dalla stessa regola del motore.
