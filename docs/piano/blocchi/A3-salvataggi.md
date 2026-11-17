# A3 — Salvataggi, aggiornamenti, sicurezza

- **Corti**: 10 (interfaccia e persistenza), 09 (LLM), 08 (mappa). Leggere la sezione «D» dei tre verdetti.
- **Ramo**: `fix/a3-salvataggi`, da `main` aggiornato (dopo l'unione della #31).
- **Test**: un file nuovo `tests/salvataggi.test.ts` per i punti 1-3; i punti LLM in `tests/llm.test.ts`.
- **Perché è il primo**: oggi un aggiornamento che cambia la mappa rende illeggibili tutte le partite salvate.

Questo blocco tocca poco il motore: quasi tutto è in `src/game.ts`, `src/storage/storage.ts`, `src/update.ts`,
`src/llm/` e `scripts/map/`. Determinismo e invarianti non dovrebbero cambiare; vanno comunque rieseguiti.

## Compiti

### 1. Versione dei salvataggi e migrazione — 🟡
- [ ] **Dove**: `src/engine/types.ts` (`GameState`), `src/engine/setup.ts` (`newGame`), `src/game.ts`
  (`Game.fromState`, oggi riga 43).
- **Oggi**: `fromState` rifiuta ogni salvataggio con un numero di province diverso dalla mappa, e lo stato non ha
  un numero di versione.
- **Da fare**:
  1. Aggiungere `version?: number` a `GameState` e una costante `SAVE_VERSION = 1` (in un file nuovo
     `src/engine/migrate.ts`). `newGame` la scrive.
  2. In `migrate.ts`, `export function migrate(state: GameState, map: MapData): { state: GameState; warnings: string[] }`:
     - stato senza `version` → versione 0: riempire i campi aggiunti dopo (oggi `fromState` fa già
       `state.dispatches ??= []`: spostare lì questo e gli altri `??=` sparsi che servono);
     - ogni passo `v → v+1` è una funzione a sé, in un elenco ordinato;
     - se il numero di province è diverso, **rifiutare** come oggi (con lo stesso messaggio): la mappa per tag di
       provincia è un lavoro più grande, rimandato e da segnare in «Rimandato».
  3. `fromState` chiama `migrate` invece di controllare da sé.
- **Test**: uno stato di `newGame` a cui si toglie `version` e un campo recente si riapre con `fromState`, e dopo
  un turno `checkInvariants` dà 0 violazioni; uno stato con una provincia in meno è rifiutato con il messaggio.
- **Accettazione**: un salvataggio senza versione si riapre; i salvataggi nuovi hanno `version: 1`.

### 2. Scrittura sicura e copia di riserva — 🟡
- [ ] **Dove**: `src/storage/storage.ts` (`saveGame`, `loadGame`, `listSaves`); `src/main.ts` riga 30 circa
  (ripresa dello slot `auto`).
- **Oggi**: i salvataggi sono in IndexedDB; `saveGame` sovrascrive lo slot con un solo `put`. Se lo stato è
  corrotto (JSON troncato, eccezione a metà) si perde l'ultima partita buona.
- **Da fare**:
  1. Prima di sovrascrivere lo slot `auto`, copiare il record attuale in `auto.prev` (stessa transazione:
     `get` e due `put` dentro un'unica `transaction('saves', 'readwrite')`).
  2. `loadGame(slot)`: se `JSON.parse` fallisce e lo slot è `auto`, provare `auto.prev` e segnalarlo.
  3. `listSaves` non mostra `auto.prev` come partita a sé.
  4. **Elenco**: in `src/ui/app.ts` (riga 891 circa) e `src/main.ts` controllare che compaiano anche i salvataggi
     manuali, non solo `auto` (la corte 10 dice che oggi non si vedono: verificarlo prima di toccare).
- **Test**: difficile in Node (IndexedDB non c'è). Separare la logica in una funzione pura
  (`chooseRecord(main, prev)`) e testare quella; il resto si prova a mano nel browser (`npm run dev`).
- **Accettazione**: un record `auto` con JSON rotto fa ripartire da `auto.prev`.

### 3. Aggiornamenti — 🟢 + 🟢
- [ ] **3a. Confronto delle versioni** — `src/update.ts`, funzione `build` (riga 16) e `isNewer`.
  Oggi confronta solo l'ultimo numero: «0.2.0» contro «0.1.84» dà 0 < 84 e l'aggiornamento non viene proposto.
  Scrivere `compareVersions(a, b)` che divide per `.`, converte in numeri e confronta parte per parte; esportarla.
  **Test**: `compareVersions('0.2.0', '0.1.84') > 0`, `('0.1.85', '0.1.84') > 0`, `('v0.1.84', '0.1.84') === 0`,
  `('0.1.9', '0.1.10') < 0`.
- [ ] **3b. Salvare prima di ricaricare** — `installUpdate` (stesso file) nel browser fa `location.reload()` e
  perde il turno in corso. Dare a `installUpdate` un parametro facoltativo `beforeReload?: () => Promise<void>` e
  passarlo da `src/ui/app.ts` (che salva lo slot `auto` con il metodo di `Game` a riga 110 circa) e da
  `src/main.ts` riga 50 (lì non c'è partita: niente da salvare). Prova a mano.

### 4. LLM — 🟢 + 🟢
- [ ] **4a. HTTPS obbligatorio** — `src/llm/client.ts`, funzione `endpoint` (riga 34). Rifiutare un `baseUrl` che
  non inizia con `https://` con un errore in italiano («L'indirizzo del modello deve iniziare con https://»).
  Eccezione ammessa: `http://localhost` e `http://127.0.0.1` (modelli locali), dichiarata nel commento.
  **Test** in `tests/llm.test.ts`: `http://api.esempio.it` rifiutato, `https://api.deepseek.com` accettato,
  `http://localhost:11434` accettato.
- [ ] **4b. Plausibilità anche sulle controproposte** — `src/llm/agents.ts` riga 115: per `counter` e `propose`
  oggi si chiama solo `checkProposal`; aggiungere `?? plausibility(w, tag, proposal)` come alla riga 111.
  **Test**: una controproposta in cui la nazione cede le proprie province senza guerra viene scartata.

### 5. Mappa — 🟢 e 🔴 facoltativo
- [ ] **5a. Le quattro oasi eccezione** — `npm run map:check` stampa come informativa Figuig, Liwa,
  Najran (ovest), Giabrin. In `scripts/map/check-oasi.mjs` la parte «R-c» (riga 122 circa) non legge le eccezioni:
  farle passare un elenco `allow.oasi` (come fa `checkRiferimenti` con `allow.piste` in `check-map.mjs`, riga 102)
  e saltare le oasi elencate; aggiungere in `scripts/map/check-allow.json` la chiave `"oasi"` con i quattro nomi.
  **Accettazione**: `map:check` non stampa più l'informativa, e resta `exclave 0, enclave 0, forma 0`.
- [ ] **5b. Nomi con «(ovest)/(est)»** — 🔴, **facoltativo, si può rimandare**. Sono 643 nomi, generati da
  `scripts/map/`; il file della mappa non si tocca a mano (`AGENTS.md`, regola 5). Solo chi può eseguire il
  generatore e il controllo del blocco (`check-blocco.mjs`). Se si fa: un dizionario di nomi d'epoca nel generatore,
  con la fonte, per le sole province dove il nome esiste davvero.

### 6. Prestazioni (passo 7 della fase 2) — 🔴
- [ ] Misurare con `npx tsx scripts/sim/turno.mts` (52 turni) e annotare qui le fasi più lente.
  Dopo A2: economia circa 80 ms, rifornimenti circa 55 ms a turno.
- Cercare cicli su tutte le province dentro cicli su tutte le nazioni (`for (let i = 0; i < w.map.size; i++)`
  dentro un `for (const tag of …)`) e sostituirli con `controlled(w, tag)` (`src/engine/construction.ts`).
- **Vincolo**: l'ordine delle somme non deve cambiare (`controlled` restituisce le province in ordine di indice),
  altrimenti il determinismo regge ma il rapporto 1881-1899 cambia per arrotondamenti: in quel caso dichiararlo.
- **Accettazione**: turno medio del rapporto sotto 150 ms, determinismo e invarianti invariati.

## Rimandato (deciso, non dimenticato)

- Salvataggio per tag di provincia, che sopravvive a un cambio di mappa (corte 10, punto 1, seconda parte).
- Chiave LLM cifrata sul dispositivo (corte 09, punto 2): è nella fase D.
- Rinomina `laea` → `miller` (corte 08, punto 1): un nome di funzione, utile ma non urgente.

## Consegna

PR `fix/a3-salvataggi` → `main` come da `README.md`, sezione 6. Aggiornare `STATO.md` (prossimo blocco: B1).
