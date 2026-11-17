# Stato del lavoro

Aggiornato al 17 novembre 2026, dopo il blocco A2. Si aggiorna alla fine di ogni blocco (vedi `README.md`, sezione 6).

## In breve

- **Gioco**: Regnum Historia, grande strategia dal 1° gennaio 1881. TypeScript, Vite, Capacitor; APK nelle Releases.
- **Ultima release**: v0.1.84 (contiene la fase 2 e le corti, **non** A1 e A2: arrivano con la PR #31).
- **Prossimo blocco**: **A3 — salvataggi, aggiornamenti, sicurezza** → [`blocchi/A3-salvataggi.md`](blocchi/A3-salvataggi.md).

## PR aperte

| PR | ramo → base | contenuto | da fare |
|---|---|---|---|
| #31 | `feat/fase2-storia` → `main` | A1 e A2, rimasti fuori da `main` per l'ordine delle unioni | unire |
| (questa) | `docs/piano-agenti` → `main` | questa cartella e il workflow `Verifica` sulle PR | unire |

## Blocchi

Il piano completo e le sue ragioni sono in [`docs/corti/PIANO.md`](../corti/PIANO.md).

| blocco | corti | ramo | stato |
|---|---|---|---|
| Fase 1 — mappa mondiale | — | — | fatto |
| Fase 2 — struttura dei motori (passi 1-6) | — | — | fatto |
| A1 — guerra e IA | 01, 02 | `fix/a1-guerra` | fatto (#29, in `main` con #31) |
| A2 — economia, costruzione, ricerca | 03, 04 | `fix/a2-economia` | fatto (#30, in `main` con #31) |
| **A3 — salvataggi, aggiornamenti, sicurezza** | 08, 09, 10 | `fix/a3-salvataggi` | **prossimo** — [scheda](blocchi/A3-salvataggi.md) |
| B1 — una sola pace | 07, 02, 00 | `fix/b1-pace` | da fare — [scheda](blocchi/B1-pace.md) |
| B2 — diplomazia coerente | 06 | `fix/b2-diplomazia` | da fare — [scheda](blocchi/B2-diplomazia.md) |
| B3 — politica che conta | 05 | `fix/b3-politica` | da fare — [scheda](blocchi/B3-politica.md) |
| B4 — coloniale, passi 1-3 | 00 | `fix/b4-coloniale` | da fare — [scheda](blocchi/B4-coloniale.md) |
| C — bilanciamento | 00-05 | un ramo per area | da fare — [scheda](blocchi/C-bilanciamento.md) |
| D — sistemi nuovi | varie | un ramo per sistema | da fare — [scheda](blocchi/D-sistemi-nuovi.md) |

L'ordine conta: A3 prima di tutto perché un aggiornamento oggi può far perdere la partita; B1 prima di B2 perché la
difesa dei vassalli (B2) allunga le guerre che B1 deve saper chiudere.

## Misure di riferimento (dopo A2)

Servono a capire se un blocco ha rotto o rallentato qualcosa.

| misura | valore |
|---|---|
| test | 103 in 18 file, tutti verdi |
| determinismo | 260 turni identici |
| invarianti (`--fasi --caos` compreso) | 0 violazioni |
| turno medio nel rapporto 1881-1899 | 182 ms (economia 81, rifornimenti 54, costruzione 10, piani 9) |
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
| salvataggi, impostazioni, aggiornamenti | `src/storage/storage.ts`, `src/game.ts`, `src/update.ts` |
| interfaccia | `src/ui/` |
| test | `tests/*.test.ts`, mappa e ricerca per nome in `tests/helpers.ts` |
