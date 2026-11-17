# Brief comune a tutte le corti

## Il progetto
Regnum Historia: gioco di grande strategia storica dal 1° gennaio 1881, TypeScript + Vite + Capacitor (APK Android, si gioca soprattutto sul telefono), pubblicato su GitHub Pages. Repository: `Rex11107/pax-historia-clone`, branch `feat/fase2-storia` (tutti i percorsi sono relativi alla radice del repository). Un turno = una settimana. Mappa di 4.532 province in tutto il mondo, 167 nazioni. Il giocatore guida una nazione; tutte le altre sono "nazioni non giocanti" mosse dal motore (`src/engine/ai.ts` e i moduli settimanali). Un livello LLM (`src/llm/`) fa da Game Master e da agenti-nazione per la diplomazia, ma non scrive lo stato: produce intenti che il motore valida.

## Regole del progetto (leggere `AGENTS.md` per intero)
Motore deterministico (niente `Math.random`/`Date.now`, solo `rand(seme, …)`), il modello propone e il codice dispone, regole di gioco nel motore e non nell'interfaccia, nomi d'epoca 1881, fonti citate, niente refactor non richiesti, test per ogni cambiamento.

## Documentazione
- `docs/SPEC.md`: descrizione estesa (in particolare le sezioni recenti "Ordine del turno", "Determinismo", "Bilancio unico", "Invarianti", "Simulazione lunga").
- `docs/rapporti/1881-1899.md`: rapporto di una simulazione di 19 anni con le sole nazioni non giocanti (finanze, guerre, paci, province, soggetti, colonie, tempi per fase).
- Problemi già noti e aperti (non serve riscoprirli, ma si possono approfondire): le casse delle potenze esplodono (Regno Unito 57.800 milioni nel 1899); le nazioni non giocanti non dichiarano mai guerre fra Stati; l'AI in guerra è lenta.
- Il sistema coloniale (`src/engine/colonial.ts`) è già stato giudicato da un'altra corte (verdetto riassunto sotto): non va rigiudicato, ma ogni corte deve segnalare le interazioni del proprio motore con esso.

### Verdetto già emesso sul sistema coloniale (riassunto)
Cause vere dei ritardi storici: una guerra coloniale blocca tutta la politica coloniale (`colonial.ts:533`); dopo un dado di guerra fallito l'interesse si spegne per un anno (:565); il protettorato per trattato non passa mai (23/30, `fearOf` conta il proprio signore); l'Egitto può saltare per sempre; la Guerra del Pacifico si chiude il primo giorno (età contata dal 1879). Decisione: motore emergente con poche scadenze storiche che obbligano ad *agire* (mai a spostare province), ritardi ammessi solo con cause di partita, guerra coloniale come campagna a obiettivo con memoria per coppia di nazioni, `stance` dei regni africani, mai campagne contro Stati europei, garanti mai sospesi.

## Strumenti di misura disponibili (dalla cartella del repository)
- `npx tsx scripts/sim/turno.mts [turni]`: per fase, cosa scrive, quanto denaro muove, quanti ms.
- `npx tsx scripts/sim/storia.mts [anni] [seme] [file]`: rapporto lungo (un anno ≈ 10 s).
- `npx tsx scripts/sim/invarianti.mts [turni] [seme] --fasi --caos`.
- `npx vitest run tests/<file>.test.ts` (test per sottosistema).
- Puoi scrivere sonde tue SOLO dentro la cartella della tua corte (`docs/corti/<corte>/sonde/`) e lanciarle con `npx tsx <percorso>` dalla cartella del repository. La macchina ha 2 core ed è condivisa con altre corti: ogni sonda deve durare al massimo 90 secondi, e al massimo tre sonde per persona.

## Divieti
NON modificare nessun file del repository fuori da `docs/corti/<la tua corte>/`. Lì scrivi l'atto d'accusa, il verdetto e le eventuali sonde.

## Forma
Italiano. Ogni accusa o giudizio cita file e funzione (e riga quando serve) e una prova: il codice, una misura, un fatto storico verificabile. Distingui sempre errori (il codice non fa ciò che dichiara), difetti di modello (fa ciò che dichiara, ma il modello è sbagliato o povero), squilibri (numeri da tarare) e mancanze (cose che non ci sono).
