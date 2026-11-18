# B4 — Coloniale, passi 1-3 del verdetto della corte 00

> **Fatto** il 17 novembre 2026 (ramo `fix/b4-coloniale`). Esito in fondo alla scheda.

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
- [x] In `scripts/sim/storia.mts`, una tabella dei traguardi: per ogni ancora la data in cui avviene (o «mai») e la
  causa del ritardo. Eseguire con quattro semi e annotare qui i risultati **prima** di cambiare il motore.
  (Alla corte: Tunisi per trattato 0 semi su 4.)

### 1. Politica coloniale senza blocchi inutili — 🔴
- [x] Una guerra coloniale in corso non blocca la diplomazia coloniale verso altri bersagli.
- [x] Niente spegnimento di un anno se una via esiste ancora.
- [x] Dentro la finestra storica, un'urgenza deterministica con tetto al posto del dado.
- [x] `fearOf(w, target, besides)` non conta il signore della stessa nazione che agisce.
- [x] Le tappe egiziane aspettano le loro condizioni invece di saltare.
- **Misura**: Tunisi entro il 1882 in almeno 18 semi su 20.

### 2. Dati corretti e test dei nomi — 🟢 + 🟡
- [x] 🟢 Un test in `tests/colonie.test.ts`: ogni nome di provincia e ogni sigla di nazione citati in
  `src/scenario/colonial1881.ts` esistono sulla mappa (usare `tests/helpers.ts`).
- [x] 🟡 Correggere i dati che il test trova sbagliati, con la fonte.
- Chi tocca `src/scenario/*1881.ts` esegue `npm run map:check`.

### 3. Posizione dei regni africani verso le potenze — 🟡
- [x] Un campo nuovo `stance` per gli attori locali (oggi non esiste): ostile, neutrale o favorevole verso ciascuna
  potenza. Esempi del verdetto: Rabih ostile alla Francia, i Lozi verso Londra, gli Aro ostili. `evaluate` ne tiene
  conto, così i protettorati impossibili non avvengono.
- **Misura**: Rabih, Lozi e Aro mai protettorati impossibili.

### 4. Guerre coloniali più permissive, ma una alla volta — 🔴
- [x] La parte coloniale entra in guerra più facilmente, ma mai due o tre guerre contro lo stesso avversario in pochi
  mesi: dopo una vittoria serve un trattato limitato e una tregua di anni (principio 6 del verdetto).
- [x] Gli eventi storici non devono mancare per dieci anni (richiesta del giocatore): nel rapporto, nessun decennio
  senza eventi coloniali.

### 5. Guerra del Pacifico verso Ancón — 🟡
- [x] Oggi finisce il 23 luglio 1881; storicamente nel 1883 (trattato di Ancón). Il verdetto chiede l'età della guerra
  contata dal 1881 (già fatto in A1) e la chiusura con Ancón come ancora.

## Rimandato (passi 4-6 del verdetto)

Guerra coloniale come campagna con un fronte per coppia (fase C); scadenze di verifica con cause registrate;
interfaccia «Agenda e fronti» e interruttore storica/plausibile/libera (fase D).

## Accettazione del blocco

- La tabella dei traguardi su almeno quattro semi, prima e dopo, nella descrizione della PR.
- Test verdi, 0 violazioni, determinismo invariato.
- `STATO.md` aggiornato (prossimo: fase C).

## Esito (17 novembre 2026)

| punto | com'è stato fatto |
|---|---|
| 0 | `scripts/sim/traguardi.mts` (nuovo): per ogni seme le date delle ancore, come passa Tunisi, guerre coloniali, guerre ripetute fra la stessa coppia entro tre anni, paci «senza condizioni», protettorati impossibili, anni di fila senza eventi coloniali. Circa 3 minuti a seme. `scripts/sim/tunisi.mts` (nuovo) misura solo il 1881-82 su venti semi |
| 1 | `europeanWar`: solo una guerra contro uno Stato europeo o una grande potenza ferma la politica coloniale (in `aiColonial` e in `evaluate`). Una spedizione in marcia non ferma i trattati. `urgency`: cresce di settimana in settimana nella finestra fino a `URGENCY_CAP` = 6, poi decade in due anni; sostituisce l'attesa a dadi e pesa nel «momento storico» del protettorato (al più 25). Raffreddamento di tre mesi, non un anno, se la finestra è aperta. `fearOf` senza il proprio signore; nuova `pressureOf` (truppe a un passo o confine di terra: l'Algeria per Tunisi). L'IA tenta anche un trattato a meno di 10 punti dalla soglia, se non ha una spedizione possibile: il rifiuto è una causa registrata. `anchor` nei dati (solo `fra-tunisia` e `gbr-sudan`): per un'ancora l'urgenza spinge anche la guerra e una via aperta non si raffredda. Tel el-Kebir aspetta che Londra sia libera dalla guerra europea (la crisi di Urabi resta aperta quattro anni). Una campagna alla volta; tregua di `TRUCE_YEARS` = 3 anni dopo la pace fra la stessa coppia |
| 2 | Test dei nomi in `tests/colonie.test.ts`: tutti i nomi e le sigle esistevano già. Dati corretti dal verdetto: il Bogos passa all'Etiopia col trattato Hewett (non è più in liquidazione); Cheren nel giugno 1889; Bissandugu (marzo 1887); il Congo riconosciuto potenza per potenza, non «a Berlino»; il trattato di Binger con Kong (1889) |
| 3 | `LOCAL_STANCE` in `colonial1881.ts`: Rabih ostile alla Francia, gli Aro a tutti, i Lozi verso Londra, Kong verso la Francia. Vale per i trattati (`evaluate`) e per la pace (`protectorateRefusal`): chi rifiuta ogni protettore perde province, non diventa protettorato |
| 4 | Una campagna alla volta e tregua di tre anni (sopra). Decennio senza eventi coloniali: il massimo è 3,7 anni |
| 5 | `War.resistance` (facoltativo): la Guerra del Pacifico ha l'ancora di Ancón (20 ottobre 1883 ± 3 mesi per seme); prima si chiude solo se chi perde è sfinito (70) o chi vince allo stremo (95) |

**Misure**

Tunisi entro il 1882 su venti semi (`tunisi.mts`): **20 su 20**, 18 alla Francia (fra marzo e novembre 1881) e 2
all'Italia; Tel el-Kebir entro il 1882: 20 su 20 (giugno-agosto 1882). Prima: Tunisi alla Francia in 1 seme su 4,
nel gennaio 1887.

Traguardi, prima (`main`) e dopo, sui semi `regnum`, `a`, `b`, `c`:

Prima:

| seme | Tunisi (1881) | Tel el-Kebir (1882) | Khartum (1885) | Ancón (1883) | Congo (1885) | Sudan (1898) | Samori (1898) | Tunisi: come | guerre coloniali | stessa coppia entro 3 anni | senza condizioni | protettorati impossibili | anni senza eventi coloniali (max) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| regnum | gennaio 1887 | luglio 1882 | febbraio 1885 | luglio 1881 | mai | mai | mai | guerra | 7 | 0 | 1 | ARO, RAB, LOZ | 3.5 |
| a | mai | giugno 1882 | gennaio 1885 | luglio 1881 | mai | mai | mai | — | 7 | 0 | 0 | ARO | 1.4 |
| b | mai | luglio 1882 | gennaio 1885 | luglio 1881 | mai | mai | mai | — | 4 | 0 | 0 | 0 | 2.6 |
| c | mai | agosto 1882 | gennaio 1885 | luglio 1881 | mai | mai | gennaio 1883 | — | 5 | 0 | 0 | ARO | 3.3 |

Dopo:

| regnum | aprile 1881 | luglio 1882 | febbraio 1885 | settembre 1881 | mai | mai | agosto 1882 | FRA, guerra | 7 | 0 | 2 | 0 | 3.7 |
| a | giugno 1881 | giugno 1882 | gennaio 1885 | settembre 1881 | mai | mai | febbraio 1882 | FRA, guerra | 6 | 0 | 2 | 0 | 2.1 |
| b | giugno 1881 | luglio 1882 | gennaio 1885 | settembre 1881 | mai | mai | febbraio 1888 | FRA, guerra | 12 | 0 | 2 | 0 | 2.6 |
| c | aprile 1881 | agosto 1882 | gennaio 1885 | settembre 1881 | mai | mai | giugno 1882 | ITA, trattato | 8 | 0 | 0 | 0 | 3.0 |

(«Samori» qui è la data in cui il Uassulu diventa soggetto: oggi un protettorato dopo una guerra breve, presto.)

**Non raggiunto, alla fase C**:
- **Guerra del Pacifico**: l'ancora tiene, ma il Cile la perde sul campo. L'IA manda l'esercito da Santiago, o
  quello davanti a Lima, sull'altopiano (Tarma), dove muore senza rifornimenti; il Perù riprende il sud e la pace
  arriva nel settembre 1881 con il Cile sconfitto. È una causa di partita (una sconfitta), non un ritardo: la cura è
  il piano per fronti e i rifornimenti (corti 01 e 02). Una prova con l'esercito cileno già a Lurín è peggiorata
  (pace nell'aprile 1881) ed è stata tolta.
- **Paci «senza condizioni»** fra 0 e 2 per seme (prima 0-1): guerre coloniali britanniche (Bornu, Aro) in cui non
  si combatte. È il passo 4 del verdetto (campagna con un fronte per coppia).
- **Congo e Sudan**: lo Stato libero non arriva all'80% del Congo in nessun seme e la riconquista del Sudan non si
  compie; servono il «regolamento» del 1884-86 (passo 5) e la campagna.
- **Tempo**: 141 ms a turno contro 106 di `main` sulla stessa macchina (`piani` 29 contro 7, `rifornimenti` 54
  contro 44): il Regno Unito ora fa le sue guerre coloniali e con lui pianificano i trenta Stati indiani che lo
  seguono. Il piano per fronti della fase C lo riduce (solo le unità del teatro).
