# B4 — Coloniale, passi 1-3 del verdetto della corte 00

- **Corte**: 00 (eventi storici e guerre coloniali). Leggere **tutto** `docs/corti/00-coloniale/verdetto.md`: i
  dodici «principi vincolanti» valgono per ogni riga di questo blocco.
- **Ramo**: `fix/b4-coloniale`, da `main` aggiornato.
- **Test**: `tests/colonie.test.ts` (esiste; dura circa 70 s).
- **Rischio**: alto. È la parte del motore con più simulazione lunga; la misura vera è il rapporto 1881-1899 su più
  semi, non un test singolo. Compiti quasi tutti 🔴 o 🟡.
- **Richiesta del giocatore**: gli eventi storici non devono mancare per dieci anni di fila.

## Principi da tenere sotto gli occhi (sintesi del verdetto)

1. Un'ancora storica decide l'**azione** (offrire il trattato, lanciare l'ultimatum, aprire la campagna), mai l'esito.
2. Un ritardo vale solo se ha una **causa di partita** scritta e visibile (guerra europea dell'attore, garanzia di una
   grande potenza, bersaglio già preso, sconfitta). «In guerra coloniale altrove» o «slot occupato» non sono cause.
3. Ancore solo per otto fatti quasi certi: Tunisi 1881-82; fine della prima guerra boera 1881; Egitto 1882 ±1;
   Sudan egiziano 1883-85; Ancón e tregua boliviana 1883-84; regolamento su Congo e coste 1884-86; riconquista del
   Sudan entro il 1900; fine di Samori entro il 1898-1900. Il resto resta emergente.
4. Urgenza con tetto e decadimento; una via impraticabile si raffredda.
5. Mai campagne contro Stati europei, Belgio compreso. Garanzie e alleanze non si sospendono.

## Mappa del codice

| cosa | dove |
|---|---|
| interessi coloniali, stato, azioni | `src/engine/colonial.ts`: `interestStatus` (riga 138 circa), `actionsFor` (207), `evaluate` (264), `execute` (348), `checkCompletions` (391) |
| IA coloniale | `aiColonial` (riga 529 circa); la memoria per coppia oggi è un `cooldown` di cinque anni (riga 561 circa) |
| paura dei terzi | `fearOf` (riga 247 circa) |
| finestre storiche | `windowBonus` (riga 258 circa) e `seed.window` nei dati |
| dati degli interessi | `src/scenario/colonial1881.ts` |
| guerra del Pacifico | `src/scenario/americas1881.ts` riga 86 circa; chiusura d'ufficio in `src/engine/ai.ts` (riga 219 circa) |
| rapporto | `scripts/sim/storia.mts` |

## Compiti

### 0. Linea di base — 🟡
- [ ] In `scripts/sim/storia.mts`, una tabella dei traguardi: per ogni ancora la data in cui avviene (o «mai») e la
  causa del ritardo. Eseguire con quattro semi e annotare qui i risultati **prima** di cambiare il motore.
  (Alla corte: Tunisi per trattato 0 semi su 4.)

### 1. Politica coloniale senza blocchi inutili — 🔴
- [ ] Una guerra coloniale in corso non blocca la diplomazia coloniale verso altri bersagli.
- [ ] Niente spegnimento di un anno se una via esiste ancora.
- [ ] Dentro la finestra storica, un'urgenza deterministica con tetto al posto del dado.
- [ ] `fearOf(w, target, besides)` non conta il signore della stessa nazione che agisce.
- [ ] Le tappe egiziane aspettano le loro condizioni invece di saltare.
- **Misura**: Tunisi entro il 1882 in almeno 18 semi su 20.

### 2. Dati corretti e test dei nomi — 🟢 + 🟡
- [ ] 🟢 Un test in `tests/colonie.test.ts`: ogni nome di provincia e ogni sigla di nazione citati in
  `src/scenario/colonial1881.ts` esistono sulla mappa (usare `tests/helpers.ts`).
- [ ] 🟡 Correggere i dati che il test trova sbagliati, con la fonte.
- Chi tocca `src/scenario/*1881.ts` esegue `npm run map:check`.

### 3. Posizione dei regni africani verso le potenze — 🟡
- [ ] Un campo nuovo `stance` per gli attori locali (oggi non esiste): ostile, neutrale o favorevole verso ciascuna
  potenza. Esempi del verdetto: Rabih ostile alla Francia, i Lozi verso Londra, gli Aro ostili. `evaluate` ne tiene
  conto, così i protettorati impossibili non avvengono.
- **Misura**: Rabih, Lozi e Aro mai protettorati impossibili.

### 4. Guerre coloniali più permissive, ma una alla volta — 🔴
- [ ] La parte coloniale entra in guerra più facilmente, ma mai due o tre guerre contro lo stesso avversario in pochi
  mesi: dopo una vittoria serve un trattato limitato e una tregua di anni (principio 6 del verdetto).
- [ ] Gli eventi storici non devono mancare per dieci anni (richiesta del giocatore): nel rapporto, nessun decennio
  senza eventi coloniali.

### 5. Guerra del Pacifico verso Ancón — 🟡
- [ ] Oggi finisce il 23 luglio 1881; storicamente nel 1883 (trattato di Ancón). Il verdetto chiede l'età della guerra
  contata dal 1881 (già fatto in A1) e la chiusura con Ancón come ancora.

## Rimandato (passi 4-6 del verdetto)

Guerra coloniale come campagna con un fronte per coppia (fase C); scadenze di verifica con cause registrate;
interfaccia «Agenda e fronti» e interruttore storica/plausibile/libera (fase D).

## Accettazione del blocco

- La tabella dei traguardi su almeno quattro semi, prima e dopo, nella descrizione della PR.
- Test verdi, 0 violazioni, determinismo invariato.
- `STATO.md` aggiornato (prossimo: fase C).
