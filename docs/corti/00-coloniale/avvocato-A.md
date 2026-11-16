# Arringa dell'Avvocato A — "Ancore storiche" e campagne coloniali

## 0. La tesi in una frase

Un evento storico importante non è un dado che si tira ogni settimana sperando che esca: è un **appuntamento con una finestra**. Se nessuno ha cambiato le carte in tavola, l'appuntamento si rispetta; se qualcuno le ha cambiate, l'appuntamento salta e il motore deve poter dire *chi* e *perché*. Oggi il motore fa il contrario: Tunisi dipende da `aiColonial` (colonial.ts, righe 529-567), che tira due dadi a settimana (scelta pesata, poi 8-12%), poi `evaluate` con soglia 30, poi un cooldown di sei mesi se il bey rifiuta. La catena di probabilità indipendenti produce code lunghissime: il Bardo nel 1886 non è un'"alternativa", è rumore. È esattamente il difetto R3.

La correzione proposta ha tre pezzi: **ancore** (dati + un piccolo valutatore), **campagne** (un tipo di guerra), **posizioni coloniali** dei bersagli (dati che vietano i protettorati assurdi). Riusa interessi, `setSubject`, `declareWar`, `concludePeace`, `spawnNation`, `situations`.

---

## 1. Modello dati delle ancore

Nuovo file `src/scenario/anchors1881.ts` (dati, come `colonial1881.ts`), nuovo `src/engine/anchors.ts` (valutatore). Le condizioni e gli effetti sono un **vocabolario chiuso** di dati, non funzioni: così l'ancora si può mostrare al giocatore, si può testare e l'LLM la può leggere come contesto senza poterla scrivere.

```ts
type Cond =
  | { alive: Tag } | { dead: Tag }
  | { atWar: [Tag, Tag] } | { notAtWar: Tag }            // notAtWar: con nessuno
  | { subjectOf: [Tag, Tag] } | { freeOf: Tag }           // freeOf: non soggetto (non tributario) di nessuno
  | { guaranteedBy: { target: Tag; notBy: Tag[] } }       // garanzia o alleanza di una grande potenza
  | { interest: string; is: 'open' | 'done' | 'closed' }
  | { anchor: string; is: 'done' | 'lapsed' }
  | { holds: { nation: Tag; names: string[]; share: number } }
  | { opinion: { of: Tag; to: Tag; below?: number; above?: number } }
  | { troopsNear: { nation: Tag; target: Tag; hops: number } }
  | { player: Tag; is: boolean };

type Effect =
  | { protectorate: { target: Tag; by: Tag; liberty: number } }          // setSubject
  | { campaign: CampaignSpec }                                           // declareCampaign (§3)
  | { cede: { from: Tag; to: Tag; names: string[] } }                    // transfer
  | { spawn: { tag: Tag; names: string[]; from: Tag } }                  // spawnNation
  | { recognize: { interest: string } }                                  // terre di nessuno riconosciute
  | { closeInterest: string } | { opinion: [Tag, Tag, number] }
  | { endWar: { war: string; demands: 'anchor' } };

interface Modifier { when: Cond; rate: number; label: string }           // moltiplica la pressione

interface AnchorSeed {
  id: string; name: string; desc: string;
  actor: Tag; target?: Tag;
  interest?: string;            // legame con INTERESTS_1881: l'ancora "possiede" l'interesse finché è attiva
  historical: string;           // data reale, 'AAAA-MM-GG' (convertita in giorno al caricamento)
  window: [string, string];     // apertura e scadenza
  needs: Cond[];                // precondizioni: false → la pressione si ferma (pausa, non morte)
  breaks: { when: Cond; label: string; alt?: string }[];   // R2: false → l'ancora decade, alt = ancora alternativa
  mods?: Modifier[];
  outcome: Effect[];
  text: string;                 // il testo cita la storia solo se la data cade a ±30 giorni dal vero
  onDeadline: 'force' | 'lapse';
  playerActor: 'decision';      // se l'attore è il giocatore: decisione, mai automatismo
  playerTarget: 'campaign' | 'ultimatum';
}
```

Stato in `GameState.anchors?: Record<string, { state: 'waiting'|'active'|'done'|'lapsed'; p: number; day?: number; cause?: string }>` (opzionale: i salvataggi vecchi restano validi).

**Legame con gli interessi.** Un'ancora attiva sull'interesse `fra-tunisia` lo toglie a `aiColonial`: in `aiColonial` la lista `available(w, tag)` (riga 536) si filtra con `!anchoredBy(w, x.id)`. Così non ci sono due vie in gara per lo stesso fatto. Se l'ancora decade, l'interesse torna all'AI emergente di oggi (con il suo peso e la sua finestra): la storia alternativa resta possibile, solo che non è più "dovuta".

### Esempi (abbreviati)

```ts
{ id: 'bardo', name: 'Il trattato del Bardo', actor: 'FRA', target: 'TUN', interest: 'fra-tunisia',
  historical: '1881-05-12', window: ['1881-03-01', '1882-06-30'],
  needs: [{ alive: 'TUN' }, { freeOf: 'TUN' }, { notAtWar: 'FRA' }],
  breaks: [
    { when: { guaranteedBy: { target: 'TUN', notBy: ['FRA', 'TUR'] } }, label: 'Tunisi è sotto garanzia di un\'altra potenza', alt: 'crisi-tunisina' },
    { when: { subjectOf: ['TUN', 'ITA'] }, label: 'Tunisi è già italiana' },
    { when: { atWar: ['FRA', 'GER'] }, label: 'la Francia è in guerra in Europa' } ],
  mods: [{ when: { troopsNear: { nation: 'ITA', target: 'TUN', hops: 1 } }, rate: 0.5, label: 'truppe italiane a Tunisi' },
         { when: { opinion: { of: 'GBR', to: 'FRA', below: -30 } }, rate: 0.6, label: 'Londra ostile' }],
  outcome: [{ campaign: { goal: 'protettorato', target: 'TUN', days: 60, phases: ['bardo', 'kairouan'] } }],
  onDeadline: 'force', playerActor: 'decision', playerTarget: 'ultimatum' }

{ id: 'tel-el-kebir', actor: 'GBR', target: 'EGY', interest: 'gbr-egitto', historical: '1882-09-13',
  window: ['1882-05-01', '1883-03-31'], needs: [{ alive: 'EGY' }, { freeOf: 'EGY' }],
  breaks: [{ when: { subjectOf: ['EGY', 'FRA'] }, label: 'l\'Egitto è francese' }],
  outcome: [{ campaign: { goal: 'vassallo', target: 'EGY', days: 75, phases: ['alessandria', 'tel-el-kebir'] } }], onDeadline: 'force' }

{ id: 'berlino', name: 'La conferenza di Berlino', actor: 'GER', historical: '1884-11-15',
  window: ['1884-06-01', '1886-06-30'], needs: [{ alive: 'GER' }, { notAtWar: 'GER' }],
  breaks: [{ when: { atWar: ['FRA', 'GBR'] }, label: 'guerra fra potenze coloniali' }],
  outcome: [{ recognize: { interest: 'bel-congo' } }, { opinion: ['FRA', 'GER', 5] }],   // + regola dell'occupazione effettiva (§2)
  onDeadline: 'lapse' }

{ id: 'chelenqo', name: 'Menelik prende Harar', actor: 'ETH', target: 'HAR', historical: '1887-01-06',
  window: ['1886-06-01', '1888-12-31'], needs: [{ alive: 'HAR' }, { freeOf: 'HAR' }, { anchor: 'liquidazione-egiziana', is: 'done' }],
  breaks: [{ when: { subjectOf: ['HAR', 'ITA'] }, label: 'Harar protetto dall\'Italia' }, { when: { subjectOf: ['HAR', 'GBR'] }, label: 'Harar protetto dagli inglesi' }],
  outcome: [{ campaign: { goal: 'annessione', target: 'HAR', days: 90 } }], onDeadline: 'force' }

{ id: 'uccialli', actor: 'ITA', target: 'ETH', interest: 'ita-eritrea', historical: '1889-05-02',
  window: ['1888-06-01', '1890-06-30'], needs: [{ interest: 'ita-massaua', is: 'done' }, { notAtWar: 'ETH' }],
  breaks: [{ when: { opinion: { of: 'ETH', to: 'ITA', below: -60 } }, label: 'rottura con lo Scioa', alt: 'eritrea-guerra' }],
  outcome: [{ cede: { from: 'ETH', to: 'ITA', names: ['Hamasien', 'Seraè', 'Acchelè Guzai', 'Bogos'] } }], onDeadline: 'force' }

{ id: 'dahomey-1', actor: 'FRA', target: 'DAH', interest: 'fra-guinea', historical: '1890-02-21', window: ['1889-09-01', '1891-06-30'],
  outcome: [{ campaign: { front: 'FRA|DAH', phase: 1, goal: 'cessione', names: ['Cotonou', 'Porto-Novo'], days: 240 } }], onDeadline: 'force' }
{ id: 'dahomey-2', /* phase 2, '1892-07-04', needs { anchor: 'dahomey-1', is: 'done' }, goal: 'protettorato', days: 180 */ }

{ id: 'samori', actor: 'FRA', target: 'UAS', interest: 'fra-sudan', front: 'FRA|UAS',
  stages: [ { historical: '1882-02-26', phase: 1, goal: 'nessuna-cessione', days: 90 },        // Keniera: scaramuccia
            { historical: '1886-03-28', phase: 2, goal: 'cessione', names: [/* sponda sinistra del Niger */], days: 150 },  // Kéniéba-Kouré
            { historical: '1891-04-07', phase: 3, goal: 'cessione', names: ['Kankan', 'Bissandugu'], days: 180 },
            { historical: '1898-09-29', phase: 4, goal: 'annessione', days: 400 } ] }

{ id: 'ancon', name: 'Il trattato di Ancón', actor: 'CHL', target: 'PRU', historical: '1883-10-20',
  window: ['1882-06-01', '1884-12-31'], needs: [{ atWar: ['CHL', 'PRU'] }],
  outcome: [{ endWar: { war: 'w_pacifico', demands: 'anchor' } }, { cede: { from: 'PRU', to: 'CHL', names: ['Tarapacá', 'Iquique', 'Pisagua'] } }],
  onDeadline: 'force' }
```

Per la Guerra del Pacifico serve anche una riga in `aiEndOfTurn` (ai.ts, riga 225): una guerra posseduta da un'ancora attiva (`war.anchor`) non si chiude con la regola dei 540 giorni prima della scadenza dell'ancora. In `setup.ts` (riga 61) `w_pacifico` riceve `anchor: 'ancon'`.

---

## 2. Quando scatta: la pressione deterministica

**Meccanismo (campionamento per inversione).** All'apertura della finestra il motore estrae *una volta* il "destino" dell'ancora: `u = rand(seed, 'ancora', id)`. Poi ogni settimana accumula una pressione `P` da 0 a 1. L'ancora scatta la prima settimana in cui `P ≥ u` **e** tutte le `needs` sono vere.

```ts
// anchors.ts, weeklyAnchors(w, sink), nuova fase 'storia' in WEEKLY_PHASES prima di 'colonie' (turn.ts, riga 44)
const f = (day - open) / (deadline - open);                 // 0..1 nella finestra
const base = curve(f, histFrac);                             // densità con mediana sulla data storica
const mult = needsOk ? product(mods attivi) : 0;             // precondizioni false: pausa
a.p = Math.min(1, a.p + base * mult);
if (needsOk && a.p >= u) fire(a);
```

`curve` è una campana (logistica) con la mediana sulla data storica: senza interferenze, il 50% dei semi produce l'evento prima della data vera, e quasi tutti entro qualche mese. I modificatori spostano l'evento senza dadi nuovi: se l'Italia ha truppe a Tunisi, la pressione cresce a metà velocità e il Bardo slitta *perché* c'è l'Italia. Due vantaggi rispetto a un tiro settimanale: la distribuzione delle date è controllabile (si progetta, non si spera), e lo stesso seme dà la stessa data finché nessuno cambia le condizioni. È un mean-time-to-happen di EU4 reso esplicito e con coda tagliata.

**Alla scadenza.** `onDeadline: 'force'`: se le `needs` sono vere, l'evento avviene alla scadenza (succede solo se i modificatori l'hanno rallentato molto). Se le `needs` sono false da sole (es. la Francia è in guerra per conto suo), l'ancora decade con causa `"precondizione: la Francia è in guerra"`. `'lapse'`: per gli eventi non indispensabili (Berlino) l'ancora decade e lascia la storia all'emergenza.

**R2, invalidazione.** Ogni settimana si controllano i `breaks`; il primo vero chiude l'ancora come `lapsed` con la sua `label` come causa registrata e, se c'è, attiva l'ancora `alt` (la "crisi tunisina": Francia e Italia in crisi diplomatica, ancora con esiti diversi). **Invariante**: un'ancora non è mai `lapsed` senza una causa scritta. Questo trasforma R3 in una proprietà verificabile.

**Contro il binario.**
1. Le date variano (campana), gli esiti hanno alternative (`alt`), e soprattutto i `breaks` sono raggiungibili con azioni normali di gioco (garanzie, truppe, protettorati, guerre).
2. Opzione di partita `history: 'rigida' | 'plausibile' | 'libera'` accanto a `colonialMode` (types.ts, `options`), come la regola "AI storica" di HOI4: *rigida* = `force` alla scadenza; *plausibile* = alla scadenza scatta solo se la pressione media dei modificatori è ≥ 0,7, altrimenti decade con causa "il momento è passato"; *libera* = ancore spente, resta l'AI di oggi.
3. Le ancore coprono **fatti decisivi** (25-35 per il 1881-1900), non tutto: il resto della spartizione resta emergente con gli interessi.
4. Gli effetti passano dalle funzioni del motore (campagna, `setSubject`): l'esito di una campagna non è garantito, il soldato può perdere.

**Occupazione effettiva.** L'effetto di Berlino aggiunge una regola a `colonialClaims` (colonial.ts, riga 171): dopo la conferenza una rivendicazione su terre di nessuno vale nelle paci solo con presenza a due passi (`presence` già esiste, riga 234). È un'ancora che cambia una regola, non solo la mappa.

---

## 3. La campagna coloniale (R4-R5)

### 3.1 Tipo
`War` (types.ts, riga 180) riceve campi opzionali:
```ts
kind?: 'stato' | 'campagna';
campaign?: { front: string; phase: number; goal: 'protettorato'|'vassallo'|'cessione'|'annessione'|'nessuna-cessione';
             names?: string[]; maxDays: number; anchor?: string; ticks: number };
anchor?: string;
```
Nuova funzione `declareCampaign(w, a, b, spec, sink)` in `colonial.ts` che chiama `declareWar` con un'opzione `{ colonial: true }`. In `declareWar` (diplomacy.ts, righe 42-56) con questa opzione:
- **niente chiamata alle armi** degli alleati del bersaglio (il ciclo sui trattati non gira); i soggetti seguono solo se non tributari;
- **opinione**: −1 invece di −4 per i terzi (riga 60), e nessuna situazione di "guerra" generica;
- nome d'epoca: "Spedizione di Tunisi", "Campagna del Dahomey" (non "Guerra fra…").

### 3.2 Più permissiva per il colonizzatore
- stanchezza di guerra del colonizzatore a un terzo (in `economy`/stanchezza: moltiplicatore se tutte le sue guerre sono campagne), nessun effetto sulla mobilitazione di casa (`aiMobilize` non si chiama per l'attaccante, riga 65);
- **punteggio per obiettivi** (`campaignScore`, nuovo, in `peace.ts` accanto a `warScore`): 60 punti dal controllo delle province dell'obiettivo (o della capitale se l'obiettivo è il protettorato), 20 dalle battaglie, più **punti che maturano** (+2 a settimana mentre l'obiettivo è tenuto, come in Victoria 2);
- **la pace è l'obiettivo, non un budget**: a punteggio ≥ 50 (≥ 35 per `nessuna-cessione` e `cessione` piccole) la campagna si chiude con `concludePeace(w, war, campaignTerms(war))` dove `campaignTerms` traduce il `goal` in `Demand` (`vassal` livello protettorato, `cede` delle `names`, `annex`). `engineTerms` (riga 470) resta per le guerre fra Stati. Fine della "pace senza condizioni" che oggi lascia l'interesse aperto.

### 3.3 Durata e fasi
Ogni campagna ha `maxDays` (Tunisi 60, Egitto 75, Dahomey 180-240). Alla scadenza: se il colonizzatore ha punteggio > 20, ottiene la fase ridotta (es. solo la costa); altrimenti **ritiro**: pace senza cessioni, stabilità −3 a casa, e il **fronte** registra la sconfitta.

Il **fronte** è la memoria che manca oggi (R5): `ColonialState.fronts?: Record<'FRA|UAS', { phase: number; lastEnd: number; truceUntil: number; history: { phase; outcome; day }[] }>`. Una fase conclusa **non si ripete**: la campagna successiva parte dalla fase dopo, e il trattato intermedio (Kéniéba-Kouré, 1886) impone una tregua fino alla prossima ancora (o, senza ancora, 3 anni). In `aiColonial` (riga 559-563) la via `guerra` diventa `declareCampaign` **solo** se il fronte ha una fase successiva e la tregua è scaduta; il cooldown di 5 anni per bersaglio sparisce, sostituito dal fronte. Così Samori ha quattro campagne storiche in sedici anni, ognuna con un obiettivo diverso e un trattato; il Yaka non può subire tre guerre identiche, perché dopo la prima l'obiettivo è già stato preso o il fronte dice "ritirata: prossima fase fra 3 anni, con un obiettivo diverso".

### 3.4 Chi può intervenire
Nessuno entra automaticamente. Una grande potenza con un interesse chiuso dalla campagna (`excludes`) o amica del bersaglio (`friends`) riceve una **protesta**: opinione −10 e, se è il giocatore, una scelta "protesta / mediazione / ultimatum". L'ultimatum, se il colonizzatore non si ritira entro 4 settimane, diventa una guerra fra Stati ordinaria: un'escalation esplicita, mai un effetto collaterale. Le nazioni non giocanti non lanciano ultimatum (oggi non dichiarano guerre fra Stati); lo fa solo il giocatore o un'ancora apposita (Fascioda come crisi, non come guerra).

### 3.5 Se il bersaglio è il giocatore
- `playerTarget: 'ultimatum'`: quando l'ancora sta per scattare (`P ≥ u`), il giocatore riceve un ultimatum ("La Francia chiede il protettorato: accettare il trattato del Bardo o resistere"). Accettare = protettorato con libertà più alta (60 invece di 45). Rifiutare = campagna, che il giocatore combatte davvero: se resiste fino a `maxDays` la campagna fallisce e l'ancora decade con causa "Tunisi ha resistito" (R2 pieno).
- Il giocatore vede l'ancora con mesi di anticipo (§5) e può romperla con azioni normali: chiedere una garanzia all'Italia o all'Impero ottomano (`guaranteedBy` nei `breaks`), ecc.

---

## 4. Protettorati impossibili

Due livelli, entrambi dati:

**a) Posizione coloniale nel profilo** (`NationProfile`, types.ts, riga 73), campo opzionale:
```ts
colonialStance?: { mode: 'trattati' | 'resistenza' | 'ostile'; foes?: Tag[]; sphere?: Tag[]; treatiesFrom?: number };
// RAB:  { mode: 'ostile', foes: ['FRA'] }           Rabih: solo la guerra (Kousséri)
// ARO:  { mode: 'resistenza', treatiesFrom: 1902 }   gli Aro: prima la campagna
// IBA:  { mode: 'trattati', treatiesFrom: 1893 }
// LOZ:  { mode: 'trattati', sphere: ['GBR'] }        il Barotseland firma solo con Londra
// UAS, DAH: { mode: 'resistenza' }                   Samori, Behanzin
```
**b) Regola in `evaluate`**, caso `protettorato` (colonial.ts, riga 277): `ostile` verso noi → `fail('non tratterà mai con …')`; `resistenza` → il protettorato si ottiene solo come esito di una campagna (fase del fronte), mai per trattato; `sphere` esclude chi non c'è; `treatiesFrom` anticipa il fallimento. Lo stesso controllo in `actionsFor` (riga 222) toglie la via, così l'interfaccia non la mostra e l'AI non la tenta. Il Belgio nel 1882 è un problema di modellazione (Associazione internazionale, non Belgio): l'ancora di Berlino lo segnala e, fino a lì, `bel-congo` ammette solo `occupazione` di stazioni sulla costa e sul fiume.

---

## 5. Il giocatore

**Cosa vede.** Un pannello "Agenda storica" (estensione delle `situations`, così il motore resta l'unica fonte): per ogni ancora aperta che lo riguarda, o che riguarda una grande potenza, una scheda con titolo, data storica ("storicamente: 12 maggio 1881"), una **barra di pressione** in tre fasce (lontana / probabile / imminente) senza rivelare `u`, le precondizioni con spunta, e la riga **"cosa la ferma"** (le `breaks` in linguaggio piano). Alla chiusura: "avvenuta il 3 giugno 1881" o "decaduta: Tunisi è sotto garanzia italiana". Nel diario degli eventi le cause restano.

**Se gioca la Francia.** Le ancore con `actor: 'FRA'` diventano **decisioni** (`playerActor: 'decision'`): "Il pretesto dei Krumiri: invadere Tunisi" con il costo e l'obiettivo della campagna già scritti. Il giocatore non è obbligato; se lascia passare la scadenza, l'ancora decade ("la Francia ha rinunciato") e si apre la pressione dell'alternativa italiana. Nessuna ancora muove mai l'esercito del giocatore.

**Se gioca Tunisi.** Ultimatum e campagna come in §3.5; ha tempo (finestra visibile da marzo 1881) per cercare protettori o riarmarsi.

**Se gioca l'Italia.** Vede l'ancora francese su Tunisi con le sue `breaks`: può mettere truppe in Tunisia (rallenta), ottenere una garanzia per il bey (rompe), o tentare il protettorato prima (`ita-tunisia`, oggi peso 0,35). Se rompe il Bardo, si apre la "crisi tunisina" con la Francia: è la storia alternativa che R2 permette, con una causa.

---

## 6. AGENTS.md e i test

- **Determinismo**: un solo `rand(s.seed, 'ancora', id)` per ancora più quelli già presenti; niente `Math.random`, date da stringhe convertite con una funzione pura.
- **Il motore decide**: l'LLM legge l'agenda come contesto per i dispacci; non può far scattare né rompere ancore se non producendo intenti che il motore valida (una garanzia, un trattato).
- **Nomi d'epoca** nei testi; il testo storico ("Wolseley vince a Tel el-Kebir") si usa solo se la data cade entro 30 giorni dal vero, altrimenti un testo neutro (oggi il testo dell'Egitto è fisso anche con 45 giorni di scarto).
- **Prestazioni**: solo le ancore con finestra aperta si valutano; le condizioni sono letture O(1) o O(province dell'interesse), con cache per giorno come `colonialClaims`.

**Test** (`tests/ancore.test.ts`, nuovo; aggiornamenti a `tests/colonie.test.ts`):
1. *Curva*: test puro di `curve`+`u` su 1000 semi senza motore (millisecondi): mediana a ±30 giorni dalla data storica, 95% entro la finestra.
2. *Bardo*: in 12 semi, senza interferenze del giocatore, protettorato di Tunisi entro il 31/12/1882 nel 100% in modalità rigida e ≥ 90% in plausibile; mediana entro giugno 1881.
3. *Invariante R3*: in ogni corsa, ogni ancora `lapsed` ha una `cause` non vuota che corrisponde a una `breaks` o a una `needs`.
4. *R2*: stato preparato con garanzia ITA→TUN al giorno 30: il Bardo decade con quella causa, si apre `crisi-tunisina`.
5. *R5*: simulazione 1881-1899: per ogni fronte, nessuna fase ripetuta; nessuna campagna più lunga di `maxDays`; nessuna pace "senza condizioni" chiusa da una campagna vinta.
6. *Impossibili*: in tutti i semi del test lungo, RAB mai soggetto di FRA, LOZ mai di POR, ARO mai protettorato prima del 1902.
7. *Pacifico*: `w_pacifico` aperta al 1° gennaio 1882; Ancón entro il 1884.
8. *Determinismo*: due corse con lo stesso seme producono lo stesso `state.anchors` (si aggiunge a `tests/determinism.test.ts`).
9. *Giocatore*: con `player: 'FRA'` il Bardo non scatta da solo; compare la decisione.

Le simulazioni lunghe costano (circa 0,22 s a turno): i test 2 e 5-6 con pochi semi e due anni nel giro normale, quelli a 50 semi in uno script separato (`npm run storia:sim`) che produce un rapporto come `docs/rapporti/1881-1899.md`, con la tabella "ancora → data media, dispersione, cause di decadenza".

---

## 7. Costi

| File | Cosa | Stima |
|---|---|---|
| `src/scenario/anchors1881.ts` | 25-35 ancore Africa e "guerre ferme" 1881-1900 | ~450 righe di dati, la parte più costosa (ricerca storica) |
| `src/engine/anchors.ts` | condizioni, pressione, effetti, `weeklyAnchors` | ~300 righe |
| `src/engine/colonial.ts` | `declareCampaign`, fronti, `aiColonial` (filtro ancore, via guerra), `evaluate`/`actionsFor` (stance) | ~150 righe cambiate |
| `src/engine/peace.ts` | `campaignScore`, `campaignTerms` | ~90 righe |
| `src/engine/diplomacy.ts` | opzione `colonial` in `declareWar` | ~15 righe |
| `src/engine/ai.ts` | `aiEndOfTurn`: campagne con la loro pace, guerre con `anchor` | ~25 righe |
| `src/engine/types.ts`, `turn.ts`, `setup.ts` | campi opzionali, fase `storia`, `w_pacifico.anchor` | ~30 righe |
| profili africani | `colonialStance` per ~15 nazioni | ~20 righe |
| `src/ui/` | pannello Agenda, decisioni, ultimatum | ~250 righe |
| `tests/` | `ancore.test.ts`, aggiunte a colonie/determinism | ~300 righe |

Ordine consigliato, un motivo per commit (AGENTS.md, regola 16): (1) ancore + Bardo + Ancón; (2) campagne e fronti; (3) stance; (4) migrazione della catena egiziana (`weeklyEgypt`, righe 655-710) in ancore, *dopo*, senza cambiare il comportamento; (5) interfaccia.

**Rischi**: compatibilità dei salvataggi (tutto opzionale, `anchors` assente = creato all'apertura con le finestre già passate segnate `lapsed: 'salvataggio precedente'`); interazione con la catena egiziana se migrata male; taratura del punteggio delle campagne (troppo permissivo = Africa spartita nel 1888); durata dei test.

---

## 8. Debolezze, dichiarate

1. **È un sistema in più.** Interessi e ancore convivono; il confine ("le ancore per i fatti decisivi, gli interessi per il resto") è un giudizio di chi scrive i dati, e due sistemi si possono contraddire.
2. **Il costo dei dati è alto e parziale.** Ogni ancora richiede ricerca, date, nomi di province; il mondo coperto sarà quello che l'autore conosce (Africa), e le guerre fra Stati che mancano (serbo-bulgara, sino-giapponese, ispano-americana) richiedono altre ancore con la stessa fatica.
3. **La deriva controfattuale.** Dopo una divergenza grande (Tunisi italiana) le ancore successive restano scritte per il mondo storico: `needs` e `breaks` le spengono, ma il mondo alternativo resta *senza* ancore, quindi più povero di eventi proprio dove il giocatore ha agito. Le `alt` coprono i casi previsti, non quelli imprevisti.
4. **`force` è un binario con una porta.** In modalità rigida l'evento avviene se nessuno lo ostacola: è ciò che R3 chiede, ma un'AI passiva verso gli altri (nessuno rompe ancore altrui tranne il giocatore) rende la storia quasi fissa nelle partite in cui il giocatore guarda altrove.
5. **Asimmetria giocatore/AI.** Il giocatore riceve decisioni e ultimatum, l'AI esegue: è voluto, ma il giocatore-Francia "perde" il Bardo se si distrae, l'AI-Francia mai.
6. **Il vocabolario chiuso delle condizioni** tenterà di diventare codice ("solo un'eccezione per l'Egitto"): va difeso nelle revisioni.
7. **Le campagne permissive** possono rendere la conquista troppo facile per chi gioca la potenza coloniale; il punteggio che matura e `maxDays` vanno tarati con simulazioni che costano minuti.
8. **Il destino `u` nascosto** può sembrare arbitrario: la barra in fasce lo attenua, non lo elimina.
9. **Non risolve** l'economia esplosa né il "Belgio di Leopoldo": li segnala soltanto.

La corte troverà queste falle; la tesi regge comunque, perché ognuna ha un controllo nei test o una causa scritta nel diario, ed è questo che oggi manca: oggi quando Tunisi arriva nel 1886 nessuno sa dire perché.
