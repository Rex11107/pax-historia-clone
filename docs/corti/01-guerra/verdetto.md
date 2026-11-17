# Verdetto — Corte "Guerra: movimento, combattimento, rifornimenti, mare"

16 novembre 2026. Giuria: un generale di stato maggiore della scuola di Moltke, uno storico militare delle guerre 1866-1905, un progettista di wargame da tavolo. Il verdetto è scritto dalla sessione principale, che ha riletto l'atto d'accusa e verificato sul codice i capi decisivi; le misure sono quelle delle sonde dell'accusa, non rifatte.

## A. La difesa del motore: verifica dei capi

| capo | esito | prova |
|---|---|---|
| 1. Il mare non ha padroni | **confermato** | `orders.ts`: per imbarcarsi bastano `naval ≥ 10` e un porto; le flotte nemiche non contano; gli stretti sono archi di terra |
| 2. La mobilitazione non mobilita | confermato sul codice | la mobilitazione moltiplica costo e afflusso alla riserva, non richiama nessuno nelle unità |
| 3. Province e fortezze cadono al passaggio | confermato sul codice (`advance` e `capture`) | la fortezza è solo un moltiplicatore per chi c'è dentro |
| 4. Rifornimento a salti | confermato sulla misura dell'accusa (Vladivostok 1,00) | `supply.ts:supplyMap` |
| 5. Leve al 25%, sotto la soglia di ritirata del 30% | **confermato** | `economy.ts:145-151` (25% di `maxStrength`) e `combat.ts:15,82` (`RETREAT_STRENGTH = 0.3`) |
| 6. Nessun divario di fuoco | confermato sul codice | in `power` la qualità vale al massimo ×1,67 |
| 7. Giappone senza marina; marina statica | **confermato** | profilo JAP senza `naval`, base asiatica `naval: 0`; `MIN_NAVAL = 10` |
| 8. Ferrovie russe assenti | non riverificato | dati di `buildings1881.ts` |
| 9. Battaglie che non si abbandonano | confermato sul codice | `processUnit` esce se `inBattle` |
| 10. Ritirata attraverso stretti e piste | **confermato** | `combat.ts:retreat` sceglie fra tutti gli archi di `map.adj`, senza escludere stretti e piste |
| 11. Cache dei rifornimenti | **confermato** | chiave `turn:wars.length:cacheVersion` in `supply.ts:42`; memo della logistica con `s.day` (`construction.ts:109`). In parte l'ha peggiorato il passo 2 della fase 2, che azzera le cache a ogni cambio di padrone |
| 12-15 | non riverificati | squilibri e test |

Attenuanti della difesa: le battaglie finiscono sempre; la resa per accerchiamento e Adua escono giuste; le rotte navali sono di quattro giorni fa e sono la base su cui costruire il dominio del mare; molte "mancanze" (flotte, assedi, riserve) sono sistemi mai promessi.

## B. Ciò che l'accusa non ha visto

**Il generale**
- Non esiste il comando: ogni corpo riceve ordini da solo. Senza armate (gruppi di corpi con un obiettivo comune) né il giocatore né l'AI possono concentrare le forze, e la legge del numero premia chi clicca di più. È lo stesso difetto del capo 2 della corte dell'intelligenza, visto dal lato del motore.
- La ferrovia non ha capacità: una linea porta dieci corpi come uno. La mobilitazione del 1870 e del 1914 fu un orario ferroviario; senza un limite di transito per linea la concentrazione è istantanea in proporzione alla rete.

**Lo storico militare**
- La malattia è il primo nemico delle guerre fuori d'Europa (Madagascar 1895: circa 6.000 morti per malattia, una ventina in combattimento). Il motore ha solo l'attrito da rifornimento, che in Africa quasi non scatta. Coincide con la condizione 6 dello storico della corte coloniale.
- Non esiste la stagione: inverno russo, piogge tropicali, monsoni non contano.

**Il progettista di wargame**
- Non servono flotte come unità. Basta un **dominio del mare per zona** derivato da `naval` e dalle basi: chi lo ha sbarca e rifornisce, chi non lo ha no; contestato = sbarco rischioso. È una tabella, non un sistema nuovo, e riusa le zone di mare.
- L'assedio più semplice che funziona: una fortezza non si prende in battaglia ma con un contatore di giorni (meno con artiglieria e tecnologie), durante il quale l'assediante subisce attrito. Niente altro.
- Il fuoco tecnologico va messo sulle perdite inflitte, non sulla qualità: è l'unica cosa che fa vincere 5.000 britannici contro 15.000 zulu e resta leggibile.

## C. Voti (1-10)

| giurato | correttezza | fedeltà storica | qualità di gioco | manutenibilità |
|---|---|---|---|---|
| generale | 6 | 4 | 5 | 7 |
| storico militare | 6 | 4 | 5 | 7 |
| progettista di wargame | 7 | 5 | 5 | 8 |

## D. Verdetto

### Da fare subito
| # | correzione | tipo | costo | misura |
|---|---|---|---|---|
| 1 | Leve: soglia di ritirata sulla forza all'ingresso in battaglia, oppure leve non schierabili sotto il 50% (capo 5) | errore | piccolo | una leva attaccata non si arrende il primo giorno |
| 2 | Ritirata senza stretti né piste (capo 10) | errore | piccolo | un corpo battuto a Messina non compare in Calabria |
| 3 | Marina del Giappone (circa 15) e controllo delle altre marine a zero (capo 7) | errore nei dati | piccolo | Tokyo→Corea possibile |
| 4 | Lo stretto Calais–Dover e gli altri stretti di mare non sono strade per chi è in guerra con chi tiene l'altra sponda senza superiorità navale (parte del capo 1) | difetto | piccolo | la Francia in guerra non marcia a Dover |
| 5 | Ferrovie russe storiche e treno che non subisce il terreno (capo 8), dopo verifica dei dati | errore nei dati | piccolo | Mosca→Varsavia in giorni, non in due mesi |
| 6 | Test di esito su battaglie sintetiche, ritirate, leve (capo 15) | mancanza | piccolo | — |
| 7 | Cache dei rifornimenti per nazione e senza `turn` nella chiave (capo 11): è il passo 7 della fase 2 | prestazioni | medio | fase rifornimenti sotto 30 ms a turno in pace |

### Da fare nella fase di bilanciamento
| # | correzione | tipo | costo |
|---|---|---|---|
| 8 | Fattore di fuoco per tecnologia sulle perdite inflitte (capo 6): serve alla guerra coloniale "più permissiva" del verdetto coloniale | difetto di modello | medio |
| 9 | Malattia e clima nelle campagne tropicali; rifornimento per km e terreno, province occupate che non sono subito retrovia (capo 4) | difetto di modello | medio |
| 10 | Occupazione solo dopo una sosta; assedio a contatore per le fortezze (capo 3) | mancanza | medio |
| 11 | Ordine di ritirata dalla battaglia (capo 9) | mancanza | piccolo |
| 12 | Artiglieria in proporzione alla fanteria; costo per arma; ruolo della cavalleria (capo 12) | squilibrio | piccolo |
| 13 | Fronte di combattimento per provincia (capo 13) | squilibrio | medio |

### Sistemi nuovi, ciascuno una fase a sé
| # | sistema | condizioni della corte |
|---|---|---|
| 14 | Dominio del mare per zona, da `naval` e basi, senza unità navali; marina che cresce con spesa e cantieri (capi 1 e 7); costo della flotta nel bilancio (con la corte dell'economia) | nessuna flotta come pedina; sbarco vietato o rischioso senza dominio |
| 15 | Riserva istruita e mobilitazione che richiama uomini nelle unità in 2-3 settimane (capo 2) | la riserva è anche un pozzo di spesa in pace |
| 16 | Armate e capacità delle ferrovie (note del generale) | solo se il piano per gruppi dell'AI lo richiede |

### Da non toccare
Il determinismo delle battaglie; le rotte navali e i canali; `validateOrder`; le battaglie che finiscono sempre e la resa per accerchiamento; le velocità di marcia; gli eserciti iniziali.

### Interazioni
- Con la corte coloniale: finché chi passa in una terra di nessuno la annette, una cavalleria prende mezza Africa; il punto 10 e il punto 8 decidono come saranno le campagne coloniali.
- Con la corte dell'economia: flotta e riserva sono i due pozzi di spesa più storici; le province occupate oggi rendono troppo.
- Con la corte dell'intelligenza: l'AI arruola solo fanteria e nelle province di confine, dove le leve si arrendono (capo 5).
