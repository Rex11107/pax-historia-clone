# Verdetto — Corte "Economia, finanze, commercio e risorse"

16 novembre 2026. Giuria: uno storico dell'economia della prima globalizzazione, un progettista di economie di gioco, un revisore dei conti. Il verdetto è scritto dalla sessione principale, che ha riletto l'atto d'accusa e verificato sul codice i capi decisivi; i capi non riverificati sono indicati.

## A. La difesa del motore: verifica dei capi

| capo | esito | prova |
|---|---|---|
| 1. Nessuna spesa assorbe l'avanzo | **confermato** | `economy.ts:budget`: l'unica spesa proporzionale alle entrate è l'amministrazione (28-40%); esercito, spese civili e manutenzione sono fisse e piccole. Rapporto 1881-1899: Regno Unito 57.849 M |
| 2. Risorse coloniali a peso pieno | **confermato** | `economy.ts:54` pesa la popolazione con `colonialWeight`; `resources.ts:nationResources` non pesa nulla |
| 3. Entrate per abitante quasi uniformi | **confermato in parte** | `finance` non entra nelle entrate, vero. Ma esiste già il moltiplicatore `fiscal` del profilo (`types.ts:99`, `economy.ts:52`), usato oggi solo da una base a 0,15: lo strumento per il gettito per paese c'è, mancano i dati |
| 4. SPEC dichiara 5-15% di risparmio, misura 30-54% | confermato sulla misura dell'accusa (non rifatta) | sonda 1 |
| 5. Debito senza fondo | **confermato** | `ledger.ts:cover` senza tetto; interesse 4,5% per tutti (`economy.ts:79`) |
| 6. Il giocatore non può rimborsare né indebitarsi | **confermato** | `repay` chiamato solo da `aiFinances` (`economy.ts:182`); l'ha introdotto il registro unico e nessuno l'ha esposto nell'interfaccia |
| 7. Opere al 130-186% l'anno | confermato sulla misura dell'accusa | sonda 2 |
| 8. Popolazione immobile | **confermato** | nessun modulo scrive `pop` |
| 9. Sussidi a ripetizione | non riverificato | riguarda anche la corte LLM |
| 10. Debito di Stati Uniti, Giappone, Cina a zero | **confermato** | `americas1881.ts:10` (base `debt: 0`), profilo USA e JAP senza `debt` |
| 11. Occupare rende più che annettere | **confermato** | `economy.ts:54-57`: il peso coloniale vale solo per `owner === tag`; l'occupata pesa 1 × 0,25 contro 0,08 |
| 12. La flotta non costa | **confermato** | nessuna voce navale in `budget` |
| 13. Listino fisso senza mercato | confermato, ma è un limite dichiarato | SPEC: "Risorse materiali non ancora modellate" |
| 14-16 | non riverificati | minori |

Nessun capo respinto. La difesa ottiene solo un'attenuante sul capo 3 (`fiscal` esiste) e sul 13 (limite dichiarato).

## B. Ciò che l'accusa non ha visto

**Lo storico dell'economia**
- I bilanci veri dell'epoca erano dominati da due voci che qui sono marginali: difesa (30-40% della spesa nelle potenze continentali) e servizio del debito (30-40% in Francia e Italia). Portare il risparmio al 5-15% alzando l'"amministrazione" darebbe il numero giusto con la composizione sbagliata: la via corretta è far costare esercito e flotta quanto costavano.
- Manca il vincolo esterno: il credito costava poco a chi stava nel sistema aureo ed era solvibile (consols al 3%) e moltissimo agli altri (ottomani, Grecia, America latina). Un tasso per paese, legato a `finance` e al rapporto debito/entrate, è più fedele di un tetto secco.

**Il progettista di economie di gioco**
- Un pozzo che prosciuga l'avanzo senza offrire una scelta è una tassa, non un gioco. I pozzi devono essere decisioni: flotta, riserva istruita, opere con rendimenti decrescenti, sussidi agli alleati, conversione del debito. Obiettivo: in pace una potenza ben gestita risparmia il 5-15%, e ogni punto in più costa qualcosa altrove.
- I rendimenti delle opere vanno abbassati insieme alle casse, non prima: se si tolgono le rendite lasciando le casse esplose, il giocatore perde l'unico uso del denaro.

**Il revisore**
- `cover` applica il 10% di sovrapprezzo a ogni settimana di disavanzo: chi è in disavanzo cronico paga di fatto un interesse molto più alto del 4,5% dichiarato, mentre chi ha casse piene non riceve alcun interesse. La regola è difendibile, ma va scritta nel bilancio (oggi la voce "Nuovo debito" mostra l'importo, non il sovrapprezzo).
- L'indennità di guerra si paga subito fino a "casse + 300" (`diplomacy.ts`): con casse a decine di migliaia, le rate non esistono più. Va legata alle entrate del vinto.

## C. Voti (1-10)

| giurato | correttezza | fedeltà storica | qualità di gioco | manutenibilità |
|---|---|---|---|---|
| storico dell'economia | 7 | 3 | 4 | 7 |
| progettista | 7 | 4 | 3 | 8 |
| revisore | 8 | 4 | 4 | 8 |

Il registro e i bilanci simultanei sono solidi (per questo la correttezza è alta); è il modello delle spese a essere sbagliato.

## D. Verdetto

### Da fare subito
| # | correzione | tipo | costo | misura |
|---|---|---|---|---|
| 1 | Pesare le risorse delle province coloniali con `colonialWeight` (capo 2) | errore | piccolo | risorse britanniche fuori d'Europa ridotte di almeno l'80% |
| 2 | Applicare il peso coloniale anche alle province occupate (capo 11) | errore | piccolo | per il Giappone in Cina, annettere rende almeno quanto occupare |
| 3 | Rimborso e prestito volontari per il giocatore in Governo → Bilancio (capo 6) | mancanza | piccolo | il giocatore può azzerare il debito come le altre nazioni |
| 4 | Debiti storici di Stati Uniti, Giappone, Cina, con fonte (capo 10) | errore nei dati | piccolo | debito USA ≈ 10.700 M |
| 5 | Un test che fissi il risparmio iniziale delle otto potenze in una forchetta (capo 4): prima fallisce, poi guida la taratura | mancanza | piccolo | forchetta 5-15% a fine taratura |

### Da fare nella fase di bilanciamento (un solo lavoro coordinato)
| # | correzione | tipo | costo |
|---|---|---|---|
| 6 | Spese che seguono la realtà: esercito al costo storico, voce "flotta" proporzionale a `naval` (capo 12), spese civili che crescono con industria e popolazione; gettito per paese via `fiscal` tarato sui bilanci del 1881; unità dichiarata (milioni di franchi oro) | difetto di modello | medio |
| 7 | Politica di bilancio delle nazioni non giocanti a fasce (riserva → esercito e flotta → opere → imposte basse → sussidi), insieme alla corte dell'intelligenza | mancanza | medio |
| 8 | Opere con rendimento del 5-15% l'anno e decrescente per provincia (capo 7), nella stessa PR del punto 6 | squilibrio | piccolo |
| 9 | Tasso d'interesse per paese (da `finance` e debito/entrate), tetto al credito, default con controllo internazionale (capo 5): è anche un motore di storia (Egitto, Tunisi, Porta) | mancanza | medio |
| 10 | Crescita annua della popolazione per paese, deterministica (capo 8) | mancanza | medio (tocca mappa e cache) |
| 11 | Sussidi e indennità legati alle entrate, non alle casse (capo 9 e nota del revisore) | exploit | piccolo |

Misura comune: nel rapporto 1881-1899 la ricchezza netta del mondo cresce al più come le entrate; nessuna potenza supera due anni di entrate in cassa; il debito britannico resta sopra 15.000 nel 1899 (storia: circa 16.000 in franchi).

### Da rimandare
- Mercato con prezzi da domanda e offerta, dazi, crisi dei prezzi (capi 13 e 16): è un motore nuovo; prima va sistemato il bilancio.
- Tributo sul saldo (capo 14) e stato di "bancarotta" per gli agenti (capo 15): piccoli, da fare quando si tocca il file.

### Da non toccare
`ledger.ts` e il test sulle scritture; i bilanci calcolati tutti prima di applicarne uno; le voci del bilancio separate e leggibili; i giacimenti storici; i debiti iniziali europei.

### Interazioni
- Con la corte coloniale: finché le casse esplodono, il costo di trattati e acquisti non frena nulla; le correzioni 1, 2 e 6 vanno fatte prima di tarare la guerra coloniale.
- Con la corte dell'intelligenza: il punto 7 è lo stesso lavoro del suo capo 5.
- Con la corte della guerra: la riserva istruita e la flotta sono i due pozzi più storici.
