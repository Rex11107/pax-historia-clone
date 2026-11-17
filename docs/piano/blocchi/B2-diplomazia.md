# B2 — Diplomazia coerente

- **Corte**: 06 (diplomazia, alleanze, soggetti, rivendicazioni). Leggere `docs/corti/06-diplomazia/verdetto.md`,
  sezione «D»: ogni punto ha la sua «misura».
- **Ramo**: `fix/b2-diplomazia`, da `main` aggiornato **dopo B1** (la difesa dei vassalli allunga le guerre).
- **Test**: `tests/diplomazia.test.ts` (esiste); il punto 2 anche in `tests/invariants.test.ts`.
- **Da non toccare** (funziona, dice la corte): `setSubject` come unico punto di nascita dei legami; `bury` e
  `checkAlive` come unico punto di uscita; `libertyTarget`; `warBlock`; il protettorato come alleato per il passaggio;
  le rivendicazioni di nucleo.

## Mappa del codice

| cosa | dove |
|---|---|
| dichiarazione di guerra | `declareWar` in `src/engine/diplomacy.ts` (riga 28 circa) |
| proposte fra nazioni (alleanza, garanzia, sussidio, `join_war`…) | `checkProposal` (riga 185 circa) e `applyProposal` (riga 249 circa) |
| trattati e scadenze | `addTreaty` e il ciclo delle scadenze in `diplomacy.ts` |
| stati soggetti | `src/engine/vassals.ts`: i soggetti del 1881 in `INITIAL` (riga 35 circa), `warBlock`, `tighten`, `loosen`, `declareIndependence`, `weeklySubjects` |

## Compiti

### 1. Il signore difende i soggetti — 🟡
- [ ] In `declareWar`: se la vittima è vassallo o protettorato, il signore entra fra i difensori. Per il tributario
  decide il signore (una regola deterministica: entra se la sua forza supera quella dell'attaccante, altrimenti no).
- **Caso già visto** (blocco A2): la Bulgaria, signora della Serbia, restava fuori dalla guerra turco-serba con
  truppe a Kraljevo.
- **Test**: la Francia che attacca Hyderabad trova contro il Regno Unito.

### 2. `join_war` con gli stessi divieti di `declareWar` — 🟢
- [ ] In `checkProposal`, `case 'join_war'` (riga 211 circa): applicare `warBlock(w, from, against)` e rifiutare se
  chi entra è alleato o soggetto del nemico.
- **Test**: i due casi della sonda 1C della corte rifiutati; un turno di `checkInvariants` dopo `applyProposal`
  in `tests/invariants.test.ts`.

### 3. Indipendenze già nel 1881 — 🟢
- [ ] In `vassals.ts`: si proclama l'indipendenza solo se anche l'obiettivo di libertà (`libertyTarget`) è ≥ 75,
  oppure abbassare il desiderio iniziale a ≤ 75 per Canada, Corea, Maldive, Kongo, Kuwait, Tibet, Terengganu.
  Scegliere una delle due strade e dire quale nel commento.
- **Test**: 40 semi, 52 settimane: nessuna proclamazione nel 1881.

### 4. La garanzia è violata da chi attacca il garantito — 🟢
- [ ] In `declareWar`: se il dichiarante ha una garanzia verso la vittima, la garanzia cade e il dichiarante prende
  la pena del patto rotto (−15 di stima da tutti), come per le altre violazioni.
- **Test**: Germania garante del Belgio che lo attacca: garanzia sparita, stima di un terzo −15.

### 5. Stima non comprabile — 🟢
- [ ] `case 'subsidy'`: un sussidio per coppia di nazioni ogni sei mesi; da sussidi al massimo +20 di stima l'anno.
- **Test**: due sussidi nello stesso trimestre: il secondo rifiutato.

### 6. Niente cicli allenta-stringi — 🟢
- [ ] `tighten` e `loosen`: un'azione sul legame per soggetto ogni sei mesi; aggiornare `since` anche in `loosen`.
- **Test**: il secondo ciclo entro sei mesi è rifiutato.

### 7. Alleanze con scadenza — 🟢
- [ ] `applyProposal`, `case 'alliance'` (riga 252 circa): oggi passa `null` e ignora `p.years`. Usare
  `p.years ?? 5`. Per le alleanze iniziali la scadenza storica (Duplice alleanza: rinnovo nel 1883), con la fonte.
- **Test**: un'alleanza chiesta per 5 anni ha la data di fine.

### 8. Alleanze incompatibili — 🟢
- [ ] `checkProposal`, `case 'alliance'`: rifiutare un'alleanza con chi è alleato di un rivale del proponente o è in
  guerra con un suo alleato.
- **Test**: l'Italia non ottiene quattro alleanze insieme con potenze rivali fra loro.

## Accettazione del blocco

- Test verdi, 0 violazioni delle invarianti, determinismo invariato.
- Nel rapporto 1881-1899: annotare quante guerre si allargano per la difesa dei vassalli.
- `STATO.md` aggiornato (prossimo blocco: B3).
