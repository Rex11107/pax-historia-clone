# Stato del lavoro

Aggiornato al 26 novembre 2026, dopo la fase C, area costruzione e ricerca (`bil/costruzione`). Si aggiorna alla fine di ogni blocco (vedi `README.md`, sezione 6).

## In breve

- **Gioco**: Regnum Historia, grande strategia dal 1° gennaio 1881. TypeScript, Vite, Capacitor; APK nelle Releases.
- **Ultima release**: quella nata dall'unione della #41 (area politica). L'area costruzione e ricerca arriva con la #42.
- **Prossimo**: **fase C — bilanciamento**, area **coloniale (00)** o **economia (03)** dopo l'unione della #42 → [`blocchi/C-bilanciamento.md`](blocchi/C-bilanciamento.md). Le alleanze incompatibili (Triplice) restano alla fase D, per scelta del giocatore.

## PR aperte

| PR | ramo → base | contenuto | da fare |
|---|---|---|---|
| #42 | `bil/costruzione` → `main` | fase C, area costruzione e ricerca | unire |

Le PR #28-#41 sono unite (A1 e A2 sono in `main` dalla #31, A3 dalla #33, B1-B4 dalla #34 alla #37, fase C dalla #38 alla #41).

## Blocchi

Il piano completo e le sue ragioni sono in [`docs/corti/PIANO.md`](../corti/PIANO.md).

| blocco | corti | ramo | stato |
|---|---|---|---|
| Fase 1 — mappa mondiale | — | — | fatto |
| Fase 2 — struttura dei motori (passi 1-6) | — | — | fatto |
| A1 — guerra e IA | 01, 02 | `fix/a1-guerra` | fatto (#29, in `main` con #31) |
| A2 — economia, costruzione, ricerca | 03, 04 | `fix/a2-economia` | fatto (#30, in `main` con #31) |
| A3 — salvataggi, aggiornamenti, sicurezza | 08, 09, 10 | `fix/a3-salvataggi` | fatto (#33) — [scheda ed esito](blocchi/A3-salvataggi.md) |
| B1 — una sola pace | 07, 02, 00 | `fix/b1-pace` | fatto (#34) — [scheda ed esito](blocchi/B1-pace.md) |
| B2 — diplomazia coerente | 06 | `fix/b2-diplomazia` | fatto (#35) — [scheda ed esito](blocchi/B2-diplomazia.md) |
| B3 — politica che conta | 05 | `fix/b3-politica` | fatto (#36) — [scheda ed esito](blocchi/B3-politica.md) |
| B4 — coloniale, passi 1-3 | 00 | `fix/b4-coloniale` | fatto (#37) — [scheda ed esito](blocchi/B4-coloniale.md) |
| **C — bilanciamento** | 00-05 | un ramo per area | **in corso**: intelligenza (#38), correzioni piccole (#39), guerra (#40), politica (#41), costruzione e ricerca (#42); poi, coloniale, economia — [scheda](blocchi/C-bilanciamento.md) |
| D — sistemi nuovi | varie | un ramo per sistema | da fare — [scheda](blocchi/D-sistemi-nuovi.md) |

## Misure di riferimento (dopo C, politica)

Governi in 19 anni (`governi.mts`, semi `regnum` e `b`): Italia 8-12, Francia 14-15, Regno Unito 4-10, Spagna 6-8, Paesi Bassi 6-7, Belgio 4-5, Russia 6 (con l'assassinio di Alessandro II).

Servono a capire se un blocco ha rotto o rallentato qualcosa.

| misura | valore |
|---|---|
| test | 174 in 20 file, tutti verdi |
| determinismo | 260 turni identici |
| invarianti (`--fasi --caos` compreso) | 0 violazioni |
| turno medio nel rapporto 1881-1899 | 168 ms contro 159 di `main` sulla stessa macchina (rifornimenti 71, economia 32, piani 17): assedi e guerre coloniali più lunghe. I tempi assoluti dipendono dalla macchina: per un confronto si misura `main` sulla stessa macchina (`docs/piano/README.md`, sezione 7) |
| guerre nel rapporto 1881-1899 | 14 dichiarate, 15 paci (con la Guerra del Pacifico); Francia-Tunisi febbraio-luglio 1881; Samori protettorato nell'aprile 1887; la riconquista del Sudan dal luglio 1898; tre paci «senza condizioni» (Regno Unito con Bornu e Buganda, Francia col Uassulu nel 1882) |
| versione dei salvataggi | `SAVE_VERSION = 4` in `src/engine/migrate.ts`: chi cambia la forma dello stato aggiunge un passo e alza il numero |
| politica, 19 anni (`scripts/sim/governi.mts`) | Francia 17 governi, Paesi Bassi 18, Belgio 11, Regno Unito 5, Italia 1, Spagna 1, Russia 0 crisi: vedi la scheda B3 |
| risparmio in pace nel 1881 (saldo/entrate) | Regno Unito 30%, Stati Uniti 43%, Germania 30%, Russia 11%, Austria-Ungheria 8%, Italia 5% |
| obiettivo del risparmio (fase C) | fra 5 e 15% |
| Guerra del Pacifico | ancora di Ancón, esercito cileno davanti a Lima, occupazione dopo una sosta: finisce fra gennaio e febbraio 1882 su 4 semi (prima settembre 1881). Per il 1883 servono armate e un fronte (fase D, sistema 16 della corte 01) |
| traguardi coloniali (`scripts/sim/traguardi.mts`, 4 semi) | Tunisi 1881 4 su 4, Tel el-Kebir 1882 4 su 4, Khartum gennaio-febbraio 1885; Congo e Sudan mai; 0 protettorati impossibili; al più 3,7 anni senza eventi coloniali. Su 20 semi (`tunisi.mts`): Tunisi entro il 1882 20 su 20 (18 alla Francia) Samori protettorato fra il 1888 e il 1889 (storico: Bissandugu, 1887; prima 1882) |

## Voti delle corti (1-10)

Mappa 7,6 · LLM 6,8 · Interfaccia 6,4 · Guerra 5,7 · Economia 5,6 · Costruzione e ricerca 5,1 ·
Intelligenza 5,0 · Pace 4,9 · Diplomazia 4,8 · Politica 4,5.

Filo comune delle critiche: il mondo è fermo al 1881; le conseguenze non costano; il giocatore è immune o privilegiato.

## Dove stanno le cose

| cosa | dove |
|---|---|
| regole per chi scrive codice | `AGENTS.md` |
| specifica del gioco | `docs/SPEC.md` |
| corti (accusa, verdetto) e piano | `docs/corti/` |
| rapporto di simulazione 1881-1899 | `docs/rapporti/1881-1899.md` |
| turno e ordine delle fasi | `src/engine/turn.ts` (`WEEKLY_PHASES`, `runTurn`) |
| contabilità (unico punto che scrive casse e debito) | `src/engine/ledger.ts` |
| invarianti dello stato | `src/engine/invariants.ts` |
| IA delle nazioni | `src/engine/ai.ts` |
| guerra, ordini, rotte navali | `combat.ts`, `orders.ts`, `sea.ts` |
| pace, diplomazia, soggetti | `peace.ts`, `diplomacy.ts`, `vassals.ts` |
| politica interna | `politics.ts`, `ministers.ts` |
| colonie e peso coloniale | `colonial.ts`, `ethnic.ts` (`colonialWeight`) |
| dati del 1881 | `src/scenario/` |
| modello linguistico | `src/llm/` |
| salvataggi, impostazioni, aggiornamenti | `src/storage/storage.ts`, `src/engine/migrate.ts`, `src/game.ts`, `src/update.ts` |
| interfaccia | `src/ui/` |
| test | `tests/*.test.ts`, mappa e ricerca per nome in `tests/helpers.ts` |
