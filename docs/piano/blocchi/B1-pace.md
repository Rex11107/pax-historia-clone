# B1 — Una sola pace

- **Corti**: 07 (pace, la principale), 02 (IA), 00 (coloniale). Leggere `docs/corti/07-pace/verdetto.md` per intero:
  ogni punto ha la sua «misura».
- **Ramo**: `fix/b1-pace`, da `main` aggiornato.
- **Test**: `tests/pace.test.ts` (esiste); il punto 3 anche in `tests/llm.test.ts`.
- **Rischio**: alto. Tocca la fine delle guerre: dopo ogni compito rieseguire `invarianti --fasi --caos` e, a fine
  blocco, il rapporto 1881-1899 (numero di guerre e paci, province passate di mano).

## Mappa del codice

| cosa | dove |
|---|---|
| richieste di pace (`Demand`: cessione, liberazione, vassallaggio, indennità…) | `src/engine/peace.ts`, tipo a riga 79 circa |
| punteggio di guerra | `warScore` (`peace.ts`, riga 42 circa) |
| costo e rifiuto di una richiesta | `demandCost` (riga 194 circa) |
| applicazione | `applyDemand` (riga 342 circa), `birth` (riga 328 circa) per lo Stato liberato |
| risposta a una proposta | `peaceAnswer` (riga 438 circa), `concludePeace` (riga 420 circa) |
| paci decise dal motore fra nazioni non giocanti | `src/engine/ai.ts`, ciclo `for (const war of [...s.wars])` a riga 219 circa: la riga 220 **salta ogni guerra con il giocatore** |
| pace del dialogo con le nazioni | `src/engine/diplomacy.ts`, `case 'peace'` in `checkProposal` e `applyProposal` |
| pace del Game Master | `src/llm/gm.ts` riga 139 circa (`makePeace`) |

## Compiti

### 1. Liberazione: destinatario fisso e mai i popoli propri — 🟢
- [ ] In `Demand` (`peace.ts`, riga 79) `to?: Tag` diventa obbligatorio per `liberate`. `demandCost` rifiuta se
  l'etnia è fra i popoli propri del perdente (`STATE_PEOPLES[from].own`, in `src/scenario/ethnic1881.ts`). `applyDemand`
  usa `d.to` così com'è, senza ricalcolarlo.
- **Test**: liberare i tedeschi dalla Germania è rifiutato; il destinatario applicato è quello chiesto.

### 2. Lo Stato liberato nasce amico e difeso — 🟢
- [ ] In `birth` (e nella chiamata da `applyDemand`): il liberatore passato è `d.to`; stima iniziale 60 verso il liberatore; almeno un'unità in
  guarnigione proporzionata agli abitanti; testo dell'evento «nasce con …».
- **Test**: Albania liberata dalla Grecia: stima 60 verso la Grecia e almeno un'unità.

### 3. Liberazione dentro le regole sui confini — 🟡
- [ ] Applicare alla liberazione lo stesso controllo delle exclavi delle cessioni (`checkCession`) e ammettere solo
  il pezzo connesso più grande, o i pezzi che toccano il destinatario.
- **Test**: la Polonia liberata dalla Germania non stacca la Prussia orientale.

### 4. `peaceAnswer` controlla sempre vincitore e rifiuti — 🟢
- [ ] La modalità (`engine`/`own`/`all`) toglie solo il tetto dei punti, non il controllo di chi vince. In modalità
  `all`, anche `sign` passa da `peaceAnswer`.
- **Test** (corte 07, capo 10): la Serbia che perde, in modalità `own`, riceve `ok: false`.

### 5. Una sola pace per tutti i canali — 🔴
- [ ] La proposta `peace` del dialogo (`diplomacy.ts`) diventa un elenco di `Demand` (cessione, indennità) e passa da
  `peaceAnswer`. La pace bianca del Game Master (`gm.ts`) è ammessa solo se `warScore` non ha un vincitore oltre
  15 punti, oppure se il vincitore è esausto.
- **Test**: in `tests/llm.test.ts`, una pace bianca chiesta dal Game Master a guerra vinta da una parte è respinta.

### 6. Le guerre del giocatore finiscono — 🔴
- [ ] In `ai.ts` togliere il salto della riga 220 per le guerre col giocatore e trattarle con le stesse soglie
  (`decided`, `long`, stanchezza):
  - il vincitore non giocante **propone** le sue condizioni (`suggestDemands`) con un evento che il giocatore vede;
  - dopo quattro settimane di rifiuti: stanchezza e instabilità del giocatore crescono ogni settimana;
  - dopo altre quattro: pace **imposta** con le stesse condizioni;
  - se il giocatore è un alleato minore, esce con una pace separata e la guerra fra gli altri continua.
  - Se il giocatore vince, nulla cambia: è lui a proporre dall'interfaccia della pace.
- **Test**: giocatore con il 100% del territorio occupato: dopo N settimane è in pace e ha ceduto qualcosa.
- **Attenzione**: rispettare `s.options.peaceMode` (`engine`/`own`/`all`): in `all` le paci le detta il giocatore.

### 7. Punteggio: perdite pesate sulla forza — 🟡
- [ ] In `warScore` il termine delle battaglie si divide per gli uomini mobilitati dei due lati, non per le sole
  perdite.
- **Test** (corte 07, capo 4): 1.000 perdite contro 0 fra Italia e Austria-Ungheria valgono meno di 3 punti;
  300.000 contro 0 restano vicino a 25.

### 8. Occupazioni della guerra in corso — 🟢
- [ ] Il punteggio conta solo le province occupate in questa guerra (controllate dal nemico e prese dopo
  `war.startDay`), non quelle tenute da prima.

### 9. Vassallaggio solo fra disuguali — 🟢
- [ ] `demandCost` rifiuta il vassallaggio se il perdente ha più abitanti o più esercito del vincitore; il costo
  cresce con il rapporto di popolazione.
- **Test**: Spagna → Portogallo e Serbia → Bulgaria rifiutati.

## Accettazione del blocco

- Nel rapporto 1881-1899 nessuna guerra resta aperta per sempre; la Guerra del Pacifico non deve chiudersi prima di
  quanto fa ora (23 luglio 1881) — se cambia, spiegarlo.
- 0 violazioni delle invarianti, determinismo invariato.
- `STATO.md` aggiornato (prossimo blocco: B2).
