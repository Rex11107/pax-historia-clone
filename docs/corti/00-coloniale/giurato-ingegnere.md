# Giurato 3, ingegnere del motore: fattibilità e qualità

Ho letto le quattro memorie, `AGENTS.md` e il codice. Ho lanciato tre sonde in sola lettura (`probe/tempi.mts`, `probe/tunisi.mts` e `probe/ev.mts` dell'accusa) e non ho toccato il repository.

## 0. Misure (questa macchina, 2 core)

- **Un turno**: media 196 ms, mediana 180, p95 320. **Un anno (52 turni) dura 10,2 s.** `newGame` 178 ms.
- **Costo per fase**: rifornimenti 70 ms, economia 66, piani 16, commercio 14, espansione 9, **colonie 6 ms (3%)**, ia 5. Le invarianti costano 1,1 ms a turno.
- **Simulazioni lunghe**: 19 anni ≈ 195 s per seme. **50 semi ≈ 2,7 ore in serie**, circa 1,4 ore su due core. L'accusa ha ragione. A sottostima il suo test 2 (circa 4 minuti). Per B, "50 semi in 4 minuti" è sbagliato di circa 40 volte.
- **Tunisi, 4 semi × 2 anni (1881-82)**:
  - `regnum`: Francia in guerra 84 settimane su 104 (Uassulu, poi Mossi), Tunisi mai presa.
  - `s2`: guerra a Tunisi al giorno 42, Tunisi *vassallo* al giorno 308.
  - `s3`: guerra al giorno 511, vassallo al 574.
  - `s4`: niente.
  - La penalità della riga 565 (`FRA|fra-tunisia`) è attiva in 3 semi su 4. **In nessun seme Tunisi diventa protettorato per trattato**. Quando passa, passa con la guerra, e come *vassallo*: `engineTerms` non conosce il protettorato.

## 1. Verifica delle affermazioni sul codice

| affermazione | esito |
|---|---|
| colonial.ts:533 `if (warsOf(s, tag).length) continue` blocca tutta l'AI coloniale | **vero**, e la sonda lo misura (84/104 settimane) |
| :565 penalizza l'interesse per un anno anche quando fallisce solo il dado del 20% | **vero** |
| :551 filtra `x.ev.ok` prima di `execute`: per l'AI non ci sono rifiuti, 26 settimane di attesa, −5 di stima | **vero**. Il "rifiuto" (:355-359) vale solo per il giocatore. Il cooldown `${tag}\|*` di :553 scatta sul *successo* (`execute` restituisce null) |
| :547 `inWindow` senza limite superiore | **vero** |
| 23 su 30 (FRA), 26 su 30 (ITA) | **vero**. I +30 di paura vengono dall'esercito *ottomano* (144.000 contro 8.000): `fearOf` esclude l'attore. È un difetto in più: la paura del proprio signore spinge ad accettare un protettore straniero |
| ordine ITA prima di FRA | **vero**: `COLONIAL_POWERS` = ITA, FRA, GBR, GER, POR, BEL, SPA (ordine d'inserimento dei dati) |
| nomi e tag | **vero**: `Cotonou`, `Porto-Novo`, `Kankan`, `Ouidah` e `Asmara` non esistono. Samori è `WAS`. `Bogos` è di `EGY`. `Kong` è `KNG` |
| Guerra del Pacifico | **vero**: `startDay: -637` (setup.ts:61), quindi età 644 > 540 già al primo turno |
| `colonialClaims` con cache di modulo (:169) | **vero**. La chiave contiene seme, giorno e conteggi: due stati con lo stesso seme e lo stesso giorno ma diversi (test, ricarica, anteprima) possono collidere. Il rischio è latente, e A lo propone come modello |

**Un difetto in più che nessuno nomina.** In `weeklyEgypt` (:666-674) `e.stage = 2` scatta *prima* della condizione "GBR ed EGY non in guerra". Se la condizione è falsa, Tel el-Kebir **salta per sempre** senza causa: è un R3 già nel codice. Più guerre coloniali (gli slot di B, le campagne di A) ne alzano la frequenza.

## 2. Determinismo, salvataggi, invarianti

- **`rand`**: tutte e due le proposte vanno bene se le chiavi sono nuove e stabili (`'ancora', id`, `'agenda', id`). Attenzione: la chiave `'colonia', tag, turn` è già usata due volte (ai.ts:163 e colonial.ts:548). Oggi non collidono perché `aiColonize` esclude `hasProgram`. Se si aggiungono `ETH` e `WAS` agli interessi (B), cambia chi usa quale estrazione e l'Etiopia perde l'espansione locale.
- **Ordine d'iterazione**: oggi è deterministico ma *semantico*: chi viene prima nei dati vince le gare. Con soglie che salgono (B) l'Italia firma per Tunisi prima della Francia. Condizione: o si risolve in due tempi (tutti valutano, poi si assegna per priorità esplicita: urgenza, stadio, id), o l'ordine si dichiara nei dati e si testa.
- **Salvataggi**: `state.version` è sempre 1 e `Game.fromState` non migra nulla (`dispatches ??= []` e basta). Quindi:
  - ogni campo nuovo è **opzionale e creato pigramente fuori dall'inizializzatore** (`c.fronts ??= {}`), perché `colonial()` crea l'oggetto solo se manca del tutto;
  - una guerra senza `kind` è "ordinaria";
  - un'ancora la cui finestra è già passata nel salvataggio va marcata con causa `"salvataggio precedente"`, e l'invariante deve accettarla.
  - Nessuna chiave numerica nei `Record`: `Object.entries` le riordina.
- **Invarianti da aggiungere** in `invariants.ts`, tutte O(guerre + soggetti):
  1. una guerra `coloniale` non ha fra i difensori grandi potenze, Stati europei né nessuno con un'alleanza o una garanzia in vigore verso un terzo;
  2. una guerra coloniale ha un `goal` non vuoto ed età ≤ tetto + 7 giorni;
  3. per ogni coppia esiste al più una guerra coloniale, e la fase del fronte non scende;
  4. nessun soggetto viola `stance: 'mai'` (RAB sotto FRA, LOZ sotto POR);
  5. ogni ancora o scadenza `lapsed` ha una causa non vuota;
  6. `colonial.done[id] >= 0` implica `progress >= 0.4`.

## 3. Prestazioni

La CPU non è il problema: le colonie pesano 6 ms su 196. Il rischio sta in `presence()` e `warOk()`, che a ogni chiamata scorrono 4.532 province e fanno una BFS (`hops`). Oggi si chiamano per **una** voce scelta a settimana. L'urgenza di B valuta **tutte** le circa 70 voci: con `actionsFor` ed `evaluate` per ciascuna, stimo 30-60 ms al computer e 3-5 volte tanto sul telefono (stima non misurata). **Condizione**: una cache di `presence` per (nazione, giorno) e `evaluate` solo sulla voce più urgente per nazione. Le ancore di A costano quasi zero (solo le finestre aperte).

**Test.** Il bilancio di `AGENTS.md` è 200 s per tutta la suite, e `colonie` ne usa già 70.
- Nessuna simulazione di più anni entra in CI.
- In CI vanno test su **stati preparati** (`newGame` + ritocchi + 8-26 turni, 2-5 s ciascuno) e test **puri** (curve, urgenza, chiavi dei fronti) in millisecondi.
- La statistica sta in `scripts/sim/storia.mts`, in parallelo sui core e con **orizzonti corti** per traguardo: Tunisi ed Egitto fino al 1883 (circa 25 s a seme, 20 semi in circa 4 minuti su due core); il 1881-1899 solo con 10 semi la notte.

## 4. Rischi di regressione

1. **`warsOf` ha 16 chiamate** in 7 file (ai, economy, vassals, politics, diplomacy, llm). Distinguere "guerra coloniale" da "guerra" vuol dire decidere caso per caso (mobilitazione, stanchezza, stabilità, contesto LLM). È la vera superficie del cambiamento: un helper `stateWarsOf` e una tabella delle chiamate nella PR.
2. **Togliere la chiamata dei garanti** (A e B): i garanti del Belgio del 1839 e ogni garanzia firmata dal giocatore spariscono in silenzio. **Respinto**: il tipo coloniale si concede solo se il bersaglio non ha trattati difensivi. Altrimenti è una guerra ordinaria, con chiamata.
3. **Pace**: `aiEndOfTurn` salta le guerre del giocatore (ai.ts:216). Una guerra coloniale contro il giocatore resta senza chiusura automatica: serve il ramo `peaceAnswer` con il goal come tetto delle richieste, in modalità `engine`, `own` e `all`.
4. **`evaluate` :269** blocca la diplomazia con *qualsiasi* guerra: va cambiata insieme a :533, o la correzione non serve.
5. **Test esistenti**:
   - `turn.test` confronta la lista esatta delle fasi: una fase `storia` lo rompe, e va aggiornato insieme a `docs/SPEC.md`;
   - `colonie.test` "l'IA segue gli interessi" (6 anni, Massaua italiana, niente terre fuori dagli interessi) è il più fragile per qualunque cambio dell'AI;
   - `determinism` regge se non si introduce stato di modulo.
6. **`aiPlan` e `overseas`**: due guerre coloniali lontane si contendono tre unità a settimana, e Samori (senza costa) può risultare irraggiungibile. Il tetto di durata deve distinguere il caso "mai arrivati" dal caso "sconfitti", altrimenti R5 ritorna come "ritiro ogni tre anni".

## 5. Piano minimo, in PR (un motivo per commit)

| # | PR | rischio | misura |
|---|---|---|---|
| 0 | `scripts/sim/storia.mts`: tabella dei traguardi, semi in parallelo, orizzonti corti. Nessun cambio al motore | nullo | linea di base (oggi: Tunisi per trattato 0/4) |
| 1 | **Generatore dei ritardi**. :565 solo quando nessuna via è *materialmente* percorribile. :533 e :269: una guerra coloniale non blocca la diplomazia verso altri bersagli (una guerra coloniale alla volta). Dentro la finestra degli stadi 1 con peso ≥ 0,8 sparisce il dado dell'8-12% e la scelta pesata diventa deterministica per urgenza **con tetto**. Egitto stadio 2: riprova fino a una scadenza, invece di saltare | basso (circa 40 righe) | Tunisi entro il 1882 in ≥ 18/20 semi; `colonie.test` verde |
| 2 | **Guerra del Pacifico**: l'età per la regola dei 540 giorni si conta da `max(startDay, 0)` | minimo | `w_pacifico` aperta il 1/1/1882 |
| 3 | **`stance`** nei profili più il controllo in `actionsFor`/`evaluate`, e l'invariante 4. Si corregge anche `fearOf`, che oggi conta la paura del proprio signore | basso, solo dati | RAB, LOZ, ARO: test su stato preparato (< 3 s) |
| 4 | **Guerra coloniale minima**. `War.kind?` e `goal?`; nome d'epoca; punteggio sul goal; pace = l'intero goal, livello `protettorato` compreso; tetto di durata; fronte per **coppia** al posto del cooldown di 5 anni. Garanti **non** toccati | medio (circa 250 righe) | 0 paci coloniali "senza condizioni" vinte; 0 fasi ripetute per coppia (5 semi × 19 anni, la notte) |
| 5 | **Scadenze di verifica** (3-5: Bardo, Tel el-Kebir migrata da `weeklyEgypt`, Harar/Menelik, Ancón). Alla scadenza alzano l'urgenza al massimo e registrano la causa *di partita*, mai una causa interna del motore. Non spostano province | medio | invariante 5; distribuzione delle date |
| 6 | Interfaccia: agenda, ultimatum al giocatore bersaglio | medio, solo UI | `tsc` più prova a mano |

Il rapporto costo/beneficio migliore sta in **1 + 2 + 3**: meno di 150 righe, colpiscono le cause misurate e non introducono concetti nuovi. La PR 4 risolve R4-R5 e va fatta dopo, perché cambia la superficie di `warsOf`. Le PR 5-6 vengono solo se la misura della PR 1 lascia buchi.

## 6. Da tagliare

- **A**:
  - il vocabolario chiuso di 10 condizioni e 8 effetti con 25-35 ancore (si tiene un tipo ridotto per ≤ 5 scadenze);
  - `force` che sposta province;
  - l'interruttore `history` a tre valori accanto a `colonialMode`;
  - le ancore `alt`;
  - l'ancora che "possiede" un interesse intero (congela `fra-sudan` per 16 anni);
  - `endWar` su `w_pacifico`, che restituisce le occupazioni.
- **B**:
  - la tabella degli slot;
  - l'urgenza senza tetto su tutte le voci;
  - la scala con un rifiuto ogni 4 settimane (diario saturo, −5 di stima a ripetizione);
  - la conferenza emergente e la crisi a tre risposte;
  - la rimozione del vincolo del 25% e di "amici grandi potenze";
  - `ETH`, `WAS` e `MAH` dentro `COLONIAL_POWERS`;
  - l'ordine `'pressione'`, che non esiste e congelerebbe l'AI (:535).
- **Tutti e due**: la soppressione dei garanti. I dati sbagliati (nomi e tag) vanno validati da un test che risolve ogni nome sulla mappa.

## 7. Voti (fattibilità e qualità)

| | R1 storia preservata | R2 cause di partita | R3 niente ritardi senza causa | R4 tipo coloniale | R5 niente doppie guerre |
|---|---|---|---|---|---|
| **A** | 6: `force` regge, ma dati sbagliati ed `endWar` rovesciano Ancón | 6: `breaks` enumerati a mano, fragili | 4: copre 30 fatti; `notAtWar` ricrea la causa :533 con un'etichetta | 5: buono il goal, inaccettabile perdere i garanti | 7: il fronte per coppia è la chiave giusta |
| **B** | 3: l'ordine ITA→FRA consegna Tunisi all'Italia | 6: cause leggibili in `parts`, ma "slot occupato" è una causa del motore | 5: attacca il generatore giusto, ma senza tetto e a 30-60 ms | 4: toglie i vincoli, garanti persi, slot fragili con `aiPlan` | 3: la chiave per interesse fallisce sul Uassulu |
| **Sintesi dell'accusa** | 7: le scadenze fanno da rete, senza binario | 7: cause di partita, separate da quelle del motore | 7: corregge le righe misurate, verificabile | 7: si tiene il goal, ma "mai contro Stati europei" va esteso a "mai contro chi ha trattati" | 8: fronte per coppia più tetto |

## 8. Verdetto

**Favorevole alla sintesi dell'accusa, ridotta e in ordine**, con queste condizioni:

1. Prima la PR 0 (misura), poi la PR 1. Nessuna architettura nuova finché la PR 1 non è stata misurata su 20 semi.
2. Nessuna guerra coloniale sopprime la chiamata dei garanti o degli alleati. Un bersaglio con trattati difensivi si attacca solo con una guerra ordinaria.
3. Fronti per coppia `attaccante|bersaglio`, mai per interesse.
4. L'ordine fra le potenze si risolve con una priorità esplicita, non con l'ordine dei dati.
5. Campi nuovi opzionali, creati pigramente; nessuna cache di modulo nuova; le invarianti 1-6.
6. Simulazioni lunghe fuori dalla CI; in CI solo test su stati preparati sotto i 5 s; costo della fase colonie < 10 ms a turno al computer.
7. Un test che risolve ogni nome di provincia e ogni tag dei dati nuovi sulla mappa.
8. Le scadenze storiche non spostano mai province da sole, e ogni decadenza registra una causa di partita.
