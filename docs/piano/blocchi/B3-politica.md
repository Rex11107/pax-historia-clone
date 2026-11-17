# B3 — Politica che conta

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
- [ ] Ogni capo in `leaders` ha anni di vita e di carriera (leggerli dalle schede di `ministers1881.ts` dove ci sono,
  altrimenti aggiungerli con la fonte). `setGov` e la scelta del capo filtrano con le regole di `eligible`; a lista
  vuota il ripiego è «un notabile del partito», mai un segnaposto come nome.
- **Test**: in 19 anni nessuna nomina di un capo oltre gli anni della sua scheda.

### 2. La stabilità conta — 🔴
- [ ] Entrate e leva moltiplicate per `0,85 + 0,2 × stabilità/100`. Sotto 30: disordini, entrate −5% e rischio di
  crisi raddoppiato.
- **Attenzione**: tocca il bilancio di tutti. Le casse si scrivono solo in `ledger.ts`: qui si cambia il *calcolo*
  in `budget`, non la scrittura. Rigenerare il rapporto e confrontare le casse delle potenze.
- **Test**: le entrate dell'Italia con stabilità 80 e con stabilità 15 sono diverse.

### 3. Monarchie costituzionali e autocrazie sbloccate — 🟡
- [ ] Dopo un decreto, alla crisi successiva la Corona sceglie `concede`. Nelle autocrazie il peso della stabilità
  nella fiducia sale ad almeno 0,5 (oggi 0,2 a riga 150 circa) e la crisi diventa possibile.
- **Test**: quattro crisi di fila non danno quattro decreti; in 19 anni almeno una crisi in Russia.

### 4. Il consenso non diventa seggi — 🟢
- [ ] In `holdElection`: non copiare i seggi nel consenso (`pop`), al più avvicinarlo di una frazione.
- **Test**: dopo il voto in Spagna i fusionisti tengono un consenso vicino a 50; in 19 anni almeno un'alternanza in
  Spagna e in Italia.

### 5. Regime presidenziale — 🔴
- [ ] Un regime `presidential` (Stati Uniti, America latina): mandato fisso, nessuna crisi di fiducia, data storica
  per gli Stati Uniti (elezioni del 1884, 1888, 1892, 1896). Le date elettorali di ripiego sfalsate con
  `rand(seme, tag)`.
- **Test**: nessuna data con più di tre nazioni al voto; gli Stati Uniti senza crisi di fiducia.

### 6. Conteggio delle crisi — 🟢
- [ ] Due tipi di evento: `crisis_open` all'apertura, `crisis_end` all'esito. Il rapporto (`scripts/sim/storia.mts`)
  conta le aperture.

### 7. Ramo morto di `crisisOptions` — 🟢
- [ ] Una Corona parlamentare può nominare un governo (`concede`).
- **Test**: le opzioni dell'Italia sono diverse da quelle della Francia.

### 8. Colonie pesate sulla stabilità — 🟢
- [ ] `foreignShare` usa `colonialWeight` come il bilancio (lo stesso 8% fuori dall'Europa).
- **Test**: il Belgio con il Congo perde meno di 2 punti di stabilità.

## Accettazione del blocco

- Test verdi, 0 violazioni, determinismo invariato.
- Nel rapporto: numero di crisi aperte e di cambi di governo per paese, confrontati con prima.
- `STATO.md` aggiornato (prossimo blocco: B4).
