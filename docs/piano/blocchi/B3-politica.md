# B3 — Politica che conta

> **Fatto** il 17 novembre 2026 (ramo `fix/b3-politica`). Esito in fondo alla scheda.

- **Corte**: 05 (politica interna). Leggere `docs/corti/05-politica/verdetto.md`, sezione «D».
- **Ramo**: `fix/b3-politica`, da `main` aggiornato.
- **Test**: `tests/politica.test.ts` (esiste; dura circa 18 s perché simula molti turni).
- **Da non toccare** (funziona, dice la corte): `crisisChance` graduale e deterministico; le opzioni di crisi per
  regime con una settimana per scegliere; i dati del 1° gennaio 1881 (capi, gabinetti, date elettorali, seggi);
  `eligible`; `policyMood`; il modello linguistico che vede la politica ma non la scrive.

## Mappa del codice

| cosa | dove |
|---|---|
| stato politico, regimi, soglie di fiducia | `src/engine/politics.ts` (tipo con `regime` e `leaders`, righe 19-29 circa) |
| effetti del governo sulla nazione | `govEffects` (riga 110 circa) |
| fiducia | `confidence` (riga 146 circa) |
| nomina del governo | `setGov` (riga 192 circa) |
| elezioni | `holdElection` (riga 209 circa) |
| crisi | `crisisOptions` (riga 231), `defaultOption`, `resolveCrisis`, `crisisChance`, `weeklyPolitics` |
| ministri e capi | `src/engine/ministers.ts`, dati in `src/scenario/ministers1881.ts` |
| peso degli stranieri sulla stabilità | `foreignShare` in `src/engine/ethnic.ts` (riga 68 circa) |
| entrate e leva | `budget` e `weeklyEconomy` in `src/engine/economy.ts` |

## Compiti

### 1. Capi vivi — 🟡
- [x] Ogni capo in `leaders` ha anni di vita e di carriera (leggerli dalle schede di `ministers1881.ts` dove ci sono,
  altrimenti aggiungerli con la fonte). `setGov` e la scelta del capo filtrano con le regole di `eligible`; a lista
  vuota il ripiego è «un notabile del partito», mai un segnaposto come nome.
- **Test**: in 19 anni nessuna nomina di un capo oltre gli anni della sua scheda.

### 2. La stabilità conta — 🔴
- [x] Entrate e leva moltiplicate per `0,85 + 0,2 × stabilità/100`. Sotto 30: disordini, entrate −5% e rischio di
  crisi raddoppiato.
- **Attenzione**: tocca il bilancio di tutti. Le casse si scrivono solo in `ledger.ts`: qui si cambia il *calcolo*
  in `budget`, non la scrittura. Rigenerare il rapporto e confrontare le casse delle potenze.
- **Test**: le entrate dell'Italia con stabilità 80 e con stabilità 15 sono diverse.

### 3. Monarchie costituzionali e autocrazie sbloccate — 🟡
- [x] Dopo un decreto, alla crisi successiva la Corona sceglie `concede`. Nelle autocrazie il peso della stabilità
  nella fiducia sale ad almeno 0,5 (oggi 0,2 a riga 150 circa) e la crisi diventa possibile.
- **Test**: quattro crisi di fila non danno quattro decreti; in 19 anni almeno una crisi in Russia.

### 4. Il consenso non diventa seggi — 🟢
- [x] In `holdElection`: non copiare i seggi nel consenso (`pop`), al più avvicinarlo di una frazione.
- **Test**: dopo il voto in Spagna i fusionisti tengono un consenso vicino a 50; in 19 anni almeno un'alternanza in
  Spagna e in Italia.

### 5. Regime presidenziale — 🔴
- [x] Un regime `presidential` (Stati Uniti, America latina): mandato fisso, nessuna crisi di fiducia, data storica
  per gli Stati Uniti (elezioni del 1884, 1888, 1892, 1896). Le date elettorali di ripiego sfalsate con
  `rand(seme, tag)`.
- **Test**: nessuna data con più di tre nazioni al voto; gli Stati Uniti senza crisi di fiducia.

### 6. Conteggio delle crisi — 🟢
- [x] Due tipi di evento: `crisis_open` all'apertura, `crisis_end` all'esito. Il rapporto (`scripts/sim/storia.mts`)
  conta le aperture.

### 7. Ramo morto di `crisisOptions` — 🟢
- [x] Una Corona parlamentare può nominare un governo (`concede`).
- **Test**: le opzioni dell'Italia sono diverse da quelle della Francia.

### 8. Colonie pesate sulla stabilità — 🟢
- [x] `foreignShare` usa `colonialWeight` come il bilancio (lo stesso 8% fuori dall'Europa).
- **Test**: il Belgio con il Congo perde meno di 2 punti di stabilità.

## Accettazione del blocco

- Test verdi, 0 violazioni, determinismo invariato.
- Nel rapporto: numero di crisi aperte e di cambi di governo per paese, confrontati con prima.
- `STATO.md` aggiornato (prossimo blocco: B4).

## Esito (17 novembre 2026)

| punto | com'è stato fatto |
|---|---|
| 1 | `leaderActive`: anni dalla scheda del ministro, da `LEADER_YEARS` (nuova, in `politics1881.ts`) o, senza dati, fino al 1890; i nomi in minuscolo sono cariche e non muoiono. `pickHead` sceglie solo capi attivi (per la Corona: un capo con scheda; poi il partito; poi «un notabile del partito (…)»). Ogni settimana un capo morto o ritirato lascia il posto, senza crisi. Dati: Bismarck fino al 1890 (era 1898), aggiunti Caprivi (1890-94) e Hohenlohe (1894-1900) |
| 2 | `stabilityFactor`: entrate e leva × (0,85 + 0,2 × stabilità/100); sotto 30 (`UNREST`) entrate −5% e rischio di crisi doppio. Italia a stabilità 80 e 15: 32,1 contro 26,6 M di entrate |
| 3 | `lastOption`: dopo un decreto la Corona cede (o scioglie, se sceglie lei il capo). Peso della stabilità nella fiducia delle autocrazie da 0,2 a 0,5: la Russia a stabilità 0 rischia la crisi |
| 4 | `holdElection`: il consenso si avvicina ai seggi di un quarto invece di copiarli |
| 5 | Regime `presidential`: niente crisi di fiducia, niente elezioni anticipate, scadenza fissa. Stati Uniti con dati propri (1884, partiti, capi con anni: Garfield → Arthur nel 1882). Le repubbliche senza dati diventano presidenziali (non la «repubblica militare» di Ibadan). Prime elezioni delle nazioni senza dati sfalsate con `rand(seme, sigla)`: al più 3 nazioni lo stesso giorno |
| 6 | Eventi `crisis_open` (apertura), `crisis_end` (esiti), `election_called`; `storia.mts` conta le aperture |
| 7 | La Corona parlamentare ha anche `concede` |
| 8 | `foreignShare` pesa le province col peso coloniale. Migrazione dei salvataggi 2 → 3: il riferimento `ethnicBase` si ricalcola |

**Misure** (`scripts/sim/governi.mts`, nuova: governi e crisi per paese in 19 anni):

| paese | governi | crisi aperte | storia (circa) |
|---|---|---|---|
| Francia | 17 | 17 | una ventina di ministeri (prima: 6) |
| Regno Unito | 5 | 4 | 7 cambi a Downing Street |
| Paesi Bassi | 18 | 15 | 6-7 gabinetti: troppi (legislatura di 2 anni) |
| Belgio | 11 | 8 | 5: troppi |
| Germania | 2 | 32 | cancellieri: Bismarck, Caprivi, Hohenlohe |
| Italia | 1 | 0 | una dozzina: troppo pochi |
| Spagna | 1 | 0 | turno ogni 2-5 anni: manca |
| Russia | 1 | 0 | la corte 05 chiede almeno una crisi in 19 anni: manca |
| Stati Uniti | 3 | 0 | quattro presidenze, con Garfield → Arthur |

Le misure mancate (Italia, Spagna, Russia, Paesi Bassi, Belgio) sono di frequenza delle crisi per paese: vanno alla
fase C (`blocchi/C-bilanciamento.md`). Belgio con venti province del Congo: −2,6 di stabilità (prima −8, il tetto;
la corte chiedeva meno di −2).

**Rimandato**: suffragio e riforme elettorali (giurato 1.2), partiti nazionali legati alle loro terre (giurato 2.2),
perdere popoli altrui che rende più stabili (giurato 2.1), paci e sconfitte che non toccano la fiducia (giurato 3.2).

**Errore trovato**: azzerare un campo facoltativo con `= undefined` faceva divergere la partita dal suo salvataggio
(ordine delle chiavi). Corretto in `politics.ts` con `delete`; regola aggiunta al README.

