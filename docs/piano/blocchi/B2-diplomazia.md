# B2 — Diplomazia coerente

> **Fatto** il 17 novembre 2026 (ramo `fix/b2-diplomazia`). Esito in fondo alla scheda.

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
- [x] In `declareWar`: se la vittima è vassallo o protettorato, il signore entra fra i difensori. Per il tributario
  decide il signore (una regola deterministica: entra se la sua forza supera quella dell'attaccante, altrimenti no).
- **Caso già visto** (blocco A2): la Bulgaria, signora della Serbia, restava fuori dalla guerra turco-serba con
  truppe a Kraljevo.
- **Dopo B1**: `declareWar` calcola anche `war.pre` (province già occupate fra le parti): chi entra fra i difensori
  va aggiunto *prima* di quel calcolo, così le sue occupazioni preesistenti sono escluse dal punteggio. E se il
  signore entra in una guerra del giocatore che perde, la pace separata (`separatePeace`) fa uscire il giocatore con i
  suoi vassalli, non con il signore.
- **Test**: la Francia che attacca Hyderabad trova contro il Regno Unito.

### 2. `join_war` con gli stessi divieti di `declareWar` — 🟢
- [x] In `checkProposal`, `case 'join_war'` (riga 211 circa): applicare `warBlock(w, from, against)` e rifiutare se
  chi entra è alleato o soggetto del nemico.
- **Test**: i due casi della sonda 1C della corte rifiutati; un turno di `checkInvariants` dopo `applyProposal`
  in `tests/invariants.test.ts`.

### 3. Indipendenze già nel 1881 — 🟢
- [x] In `vassals.ts`: si proclama l'indipendenza solo se anche l'obiettivo di libertà (`libertyTarget`) è ≥ 75,
  oppure abbassare il desiderio iniziale a ≤ 75 per Canada, Corea, Maldive, Kongo, Kuwait, Tibet, Terengganu.
  Scegliere una delle due strade e dire quale nel commento.
- **Test**: 40 semi, 52 settimane: nessuna proclamazione nel 1881.

### 4. La garanzia è violata da chi attacca il garantito — 🟢
- [x] In `declareWar`: se il dichiarante ha una garanzia verso la vittima, la garanzia cade e il dichiarante prende
  la pena del patto rotto (−15 di stima da tutti), come per le altre violazioni.
- **Test**: Germania garante del Belgio che lo attacca: garanzia sparita, stima di un terzo −15.

### 5. Stima non comprabile — 🟢
- [x] `case 'subsidy'`: un sussidio per coppia di nazioni ogni sei mesi; da sussidi al massimo +20 di stima l'anno.
- **Test**: due sussidi nello stesso trimestre: il secondo rifiutato.

### 6. Niente cicli allenta-stringi — 🟢
- [x] `tighten` e `loosen`: un'azione sul legame per soggetto ogni sei mesi; aggiornare `since` anche in `loosen`.
- **Test**: il secondo ciclo entro sei mesi è rifiutato.

### 7. Alleanze con scadenza — 🟢
- [x] `applyProposal`, `case 'alliance'` (riga 252 circa): oggi passa `null` e ignora `p.years`. Usare
  `p.years ?? 5`. Per le alleanze iniziali la scadenza storica (Duplice alleanza: rinnovo nel 1883), con la fonte.
- **Test**: un'alleanza chiesta per 5 anni ha la data di fine.

### 8. Alleanze incompatibili — 🟢
- [x] `checkProposal`, `case 'alliance'`: rifiutare un'alleanza con chi è alleato di un rivale del proponente o è in
  guerra con un suo alleato.
- **Test**: l'Italia non ottiene quattro alleanze insieme con potenze rivali fra loro.

## Accettazione del blocco

- Test verdi, 0 violazioni delle invarianti, determinismo invariato.
- Nel rapporto 1881-1899: annotare quante guerre si allargano per la difesa dei vassalli.
- `STATO.md` aggiornato (prossimo blocco: B3).

## Esito (17 novembre 2026)

| punto | com'è stato fatto |
|---|---|
| 1 | `declareWar`: il signore entra fra i difensori del vassallo e del protettorato; del tributario solo se il suo esercito supera quello di chi attacca. Mai contro un proprio soggetto (un soggetto che attacca un altro soggetto dello stesso signore). La Francia che attacca Hyderabad trova il Regno Unito |
| 2 | `checkProposal` `join_war`: `warBlock`, alleanza o protettorato col nemico, signore e soggetto in qualunque verso |
| 3 | `weeklySubjects`: si proclama solo se anche l'obiettivo (`libertyTarget`) è ≥ 75. 40 semi × 52 settimane: 0 proclamazioni |
| 4 | `declareWar`: la garanzia del dichiarante verso la vittima cade alla dichiarazione, con −15 di stima da tutti |
| 5 | Un sussidio per coppia ogni 182 giorni (`SUBSIDY_GAP`), al più 20 punti di stima l'anno da sussidi (`s.subsidies`, campo facoltativo) |
| 6 | `tighten` e `loosen`: un'azione sul legame ogni 182 giorni (`BOND_GAP`); `loosen` aggiorna `since` |
| 7 | Alleanze di 5 anni (`ALLIANCE_YEARS`, o `p.years`), anche dal Game Master. La Duplice scade il 7 ottobre 1884. Fra nazioni non giocanti che si stimano ancora (stima ≥ 0 in tutti e due i versi) l'alleanza si rinnova alla scadenza |
| 8 | `allianceConflict`: niente alleanza con l'alleato di un proprio rivale o con chi è in guerra con un proprio alleato, nei due versi; vale anche per il Game Master, non per i rinnovi |

**Effetti nel rapporto 1881-1899**: nessuno sul contenuto (le nazioni non giocanti non dichiarano guerre fra Stati e
la Duplice si rinnova), quindi il file non è stato sostituito. I tempi misurati sono saliti da 131 a 160 ms a turno, ma
per la macchina: sulla stessa macchina `main` e questo ramo vanno alla stessa velocità (sonda di 60 turni: 203-212
contro 195 ms).

**Da decidere (per il giocatore)**: con il punto 8 la **Triplice alleanza** (1882) non può nascere, perché l'Italia ha
l'Austria-Ungheria fra i rivali e la Germania ne è alleata. È la regola della corte, ma la storia va al contrario.
Possibili rimedi: un'eccezione per le alleanze a tre che includono il rivale stesso, o togliere l'Austria-Ungheria dai
rivali dell'Italia dopo un evento. Da decidere nella fase D (alleanze che nascono e scadono).

**Rimandato**
- I soggetti degli alleati chiamati entrano ancora in qualunque guerra (giurato 2.2): la Germania che attacca il Belgio
  porta in guerra gli Stati indiani. Il tributario non ha limiti di politica estera (giurato 2.3). Fase C/D.
- Situazione diplomatica del 1881 incompleta (capo 4: garanti del Belgio, Lussemburgo, Cipro, Afghanistan), stima
  senza ritorno verso una base (capo 10), annessioni mai usate (capo 11): fase C.

