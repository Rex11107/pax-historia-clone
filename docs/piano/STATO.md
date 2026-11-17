# Stato del lavoro

Aggiornato al 17 novembre 2026, dopo il blocco B3. Si aggiorna alla fine di ogni blocco (vedi `README.md`, sezione 6).

## In breve

- **Gioco**: Regnum Historia, grande strategia dal 1° gennaio 1881. TypeScript, Vite, Capacitor; APK nelle Releases.
- **Ultima release**: quella nata dall'unione della #35 (B2). B3 arriva con la sua PR.
- **Prossimo blocco**: **B4 — coloniale** → [`blocchi/B4-coloniale.md`](blocchi/B4-coloniale.md).

## PR aperte

| PR | ramo → base | contenuto | da fare |
|---|---|---|---|
| #36 | `fix/b3-politica` → `main` | blocco B3 | unire |

Le PR #28-#35 sono unite (A1 e A2 sono in `main` dalla #31, A3 dalla #33, B1 dalla #34, B2 dalla #35).

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
| **B4 — coloniale, passi 1-3** | 00 | `fix/b4-coloniale` | **prossimo** — [scheda](blocchi/B4-coloniale.md) |
| C — bilanciamento | 00-05 | un ramo per area | da fare — [scheda](blocchi/C-bilanciamento.md) |
| D — sistemi nuovi | varie | un ramo per sistema | da fare — [scheda](blocchi/D-sistemi-nuovi.md) |

## Misure di riferimento (dopo B3)

Servono a capire se un blocco ha rotto o rallentato qualcosa.

| misura | valore |
|---|---|
| test | 142 in 19 file, tutti verdi |
| determinismo | 260 turni identici |
| invarianti (`--fasi --caos` compreso) | 0 violazioni |
| turno medio nel rapporto 1881-1899 | 152 ms nel rapporto dopo B3 (rifornimenti 63, economia 36), sulla macchina più lenta dove `main` misurava 160 dopo B2. I tempi assoluti dipendono dalla macchina: per un confronto si misura `main` sulla stessa macchina (`docs/piano/README.md`, sezione 7) |
| guerre nel rapporto 1881-1899 | 7 dichiarate, 7 paci; la guerra Francia-Kong (ottobre 1899) è aperta a fine rapporto |
| versione dei salvataggi | `SAVE_VERSION = 3` in `src/engine/migrate.ts`: chi cambia la forma dello stato aggiunge un passo e alza il numero |
| politica, 19 anni (`scripts/sim/governi.mts`) | Francia 17 governi, Paesi Bassi 18, Belgio 11, Regno Unito 5, Italia 1, Spagna 1, Russia 0 crisi: vedi la scheda B3 |
| risparmio in pace nel 1881 (saldo/entrate) | Regno Unito 30%, Stati Uniti 43%, Germania 30%, Russia 11%, Austria-Ungheria 8%, Italia 5% |
| obiettivo del risparmio (fase C) | fra 5 e 15% |
| Guerra del Pacifico | finisce il 23 luglio 1881 (storicamente 1883, Ancón: tocca a B4/C) |

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
