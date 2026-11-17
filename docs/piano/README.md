# Piano di lavoro e indicazioni per chi riprende

Questa cartella serve a far continuare il lavoro a **qualsiasi modello**, non solo a Claude: per esempio un
orchestratore DeepSeek in Open WebUI che divide un blocco in compiti piccoli e li passa a sotto-agenti più leggeri.
Si aggiorna alla fine di ogni blocco, nella stessa pull request del blocco.

| file | a cosa serve |
|---|---|
| `README.md` (questo) | come si lavora: regole, ciclo, verifiche, consegna |
| [`STATO.md`](STATO.md) | dove siamo: blocchi fatti, PR aperte, misure di riferimento, prossimo blocco |
| [`blocchi/`](blocchi) | una scheda per blocco, con i compiti già divisi e marcati per difficoltà |
| [`prompt.md`](prompt.md) | i prompt di sistema da incollare in Open WebUI (orchestratore ed esecutore) |

Leggere i file direttamente da GitHub (il repository è pubblico):
`https://raw.githubusercontent.com/Rex11107/pax-historia-clone/main/docs/piano/STATO.md` e così via.

## 1. Ordine di lettura

1. [`STATO.md`](STATO.md): quale blocco è il prossimo.
2. La scheda del blocco in [`blocchi/`](blocchi).
3. [`AGENTS.md`](../../AGENTS.md): le regole non negoziabili (vince su tutto il resto).
4. I verdetti citati dalla scheda: `docs/corti/NN-…/verdetto.md`, sezione «D. Il verdetto della corte».
5. Solo i file di codice indicati dal compito. Non serve leggere tutto `src/`.

## 2. Difficoltà dei compiti

Ogni compito delle schede ha un segno:

| segno | chi lo fa | com'è |
|---|---|---|
| 🟢 | sotto-agente leggero (es. DeepSeek flash) | un file, poche righe, regola chiara, test facile da scrivere |
| 🟡 | orchestratore (es. DeepSeek pro) | più file, una scelta di progetto piccola, test da pensare |
| 🔴 | modello forte con revisione attenta (o Claude) | tocca il turno, la guerra, la pace, l'IA o la simulazione lunga; facile rompere il determinismo o le invarianti |

L'orchestratore non affida un 🔴 a un sotto-agente leggero. Un 🟢 può essere fatto in parallelo con altri 🟢 solo se
toccano file diversi.

## 3. Regole fisse

**Lavoro e consegna**
- Si scrive in italiano: interfaccia, commenti, testi, messaggi di commit, descrizioni delle PR.
- Mai su `main`. Un ramo per blocco (il nome è nella scheda), una PR per blocco verso `main`.
- La PR la unisce il giocatore. **Con più PR aperte a catena**: unire la più bassa, poi cambiare la base della
  successiva su `main` *prima* di unirla. (Il 17 novembre 2026 la #29 è finita nel ramo della #28 già unito e A1-A2
  sono rimasti fuori da `main`: lo ha recuperato la #31.)
- Autore dei commit: `Rex11107` (`git -c user.name="Rex11107" -c user.email="<email del giocatore>" commit`).
- Mai segreti nel repository: niente chiavi API, keystore, password. La chiave del modello resta sul dispositivo.

**Motore** (`src/engine/`)
- Deterministico: niente `Math.random()`, niente `Date.now()`, niente rete o file. Il caso viene solo da
  `rand(seme, …)`. Stesso stato e stesso seme danno lo stesso risultato.
- «Il modello propone, il codice dispone»: il codice LLM produce intenti, il motore li valida e li applica.
- Le casse (`treasury`) e il debito (`debt`) si scrivono **solo** in `src/engine/ledger.ts`: un test lo controlla.
- Le regole di gioco stanno nel motore, non nell'interfaccia.
- Ordinamenti con spareggio esplicito (`|| a.id - b.id`), mai affidati al caso.

**Dati e mappa**
- Nomi d'epoca (1881): «Impero ottomano», non «Turchia». Ogni dato nuovo cita la fonte in un commento.
- `public/data/europe1881.json` è generato: **non si modifica a mano**.
- Chi tocca `scripts/map/`, `public/data/` o `src/scenario/*1881.ts` esegue `npm run map:check`: deve dire
  `exclave 0, enclave 0, forma 0`.
- `data-raw/` e `node_modules/` non si committano.

**Stile**
- Commenti che spiegano il *perché*. Una scelta storica cita la corte (`// corte 07, capo 6: …`) o la fonte.
- Niente refactoring non richiesti, niente riformattazioni: il diff contiene solo ciò che serve.
- Nessun file nuovo se basta modificarne uno; i test di un blocco possono avere un file nuovo
  (`tests/guerra.test.ts` per A1, `tests/economia.test.ts` per A2).

## 4. Il ciclo di un compito

1. **Verificare che il problema esista ancora**: aprire il file e la funzione indicati. Le righe citate possono
   essere scivolate: cercare il nome della funzione. Se il problema non c'è più, segnarlo e passare oltre.
2. **Scrivere prima il test** nel file `tests/` indicato. Deve **fallire col codice di prima**.
   I test caricano la mappa con `tests/helpers.ts` e partono da `newGame(MAP, 'GIOCATORE')`.
3. **Correggere** il codice, con il commento che spiega il perché.
4. **Verificare** (sezione 5). Un test rosso non si «aggiusta» cambiando il test: si capisce perché.
5. **Commit** con un messaggio che dice cosa e perché.

## 5. Verifiche

| comando | quando | atteso |
|---|---|---|
| `npx tsc --noEmit -p .` | sempre | nessun errore |
| `npx vitest run tests/FILE.test.ts` | durante il lavoro | verde (1-20 s) |
| `npx vitest run` | prima della PR | tutti verdi (circa 3 minuti; vedi `STATO.md` per il numero) |
| `npm run map:check` | se si tocca mappa o scenario | `exclave 0, enclave 0, forma 0` |
| `npx tsx scripts/sim/determinismo.mts` | se si tocca il motore | «260 turni identici» |
| `npx tsx scripts/sim/invarianti.mts` e `… --fasi --caos` | se si tocca il motore | «0 violazioni» |
| `npx tsx scripts/sim/storia.mts 19 regnum docs/rapporti/1881-1899.md` | a fine blocco, da solo | rapporto rigenerato, 0 invarianti violate |
| `npx tsx scripts/sim/turno.mts` | se si teme di rallentare | ms per fase, da confrontare con `STATO.md` |

**Chi non può eseguire comandi** (per esempio un modello in chat senza terminale): apre comunque la PR. Il workflow
`Verifica` (`.github/workflows/verifica.yml`) esegue tipi, `map:check`, test, determinismo e invarianti su ogni
pull request; il risultato si legge nella scheda «Checks» della PR. Una PR con il controllo rosso non si unisce.
Il rapporto `storia.mts` non gira nella CI: lo rigenera chi ha un terminale, prima dell'unione.

## 6. Consegna di un blocco

- PR verso `main` con: cosa cambia (una tabella per punto della scheda), cosa resta aperto, le verifiche fatte
  e i loro risultati, il confronto del rapporto 1881-1899 se è stato rigenerato.
- Aggiornare in questa cartella, nella stessa PR:
  - `STATO.md`: blocco fatto, numero di test, misure, prossimo blocco;
  - la scheda del blocco: segnare `[x]` i compiti fatti e annotare ciò che è stato rimandato e perché;
  - la scheda del blocco successivo, se il lavoro ha cambiato qualcosa che la riguarda.
- Dopo l'unione in `main` GitHub Actions pubblica la release. L'APK:
  - ultima versione: https://github.com/Rex11107/pax-historia-clone/releases/latest/download/regnum-historia.apk
  - una versione precisa: `https://github.com/Rex11107/pax-historia-clone/releases/download/vX.Y.Z/regnum-historia.apk`

## 7. Errori già fatti (da non ripetere)

- Ritoccare a mano la mappa generata: rompe le adiacenze.
- Ordinare con `sort` senza spareggio: il risultato dipende dall'ordine d'ingresso e il determinismo salta.
- Contare un'età di guerra da `startDay` negativo: la Guerra del Pacifico (aperta nel 1879) si chiudeva l'8 gennaio 1881.
- Lanciare `storia.mts` in parallelo con altre simulazioni: i tempi per fase raddoppiano e sembrano un rallentamento.
- Una funzione chiamata per ogni nazione e ogni tecnica che scorre tutte le 4.500 province: usare `controlled(w, tag)`.
- Unire le PR a catena nell'ordine sbagliato (sezione 3).
