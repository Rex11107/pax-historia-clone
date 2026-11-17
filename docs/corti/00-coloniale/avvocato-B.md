# Arringa dell'Avvocato B: agenda emergente, niente copione

## 0. La tesi in breve, e la prova dal codice

Bardo nel 1886 invece del 1881 non dimostra che serve un copione. Dimostra che il motore prende una decisione storica con un dado e poi la lascia cadere al primo rifiuto. Lo si vede dai numeri di `evaluate` (`colonial.ts`, caso `protettorato`) per FRA→TUN nel gennaio 1881:

| parte | valore |
|---|---|
| presenza (l'Algeria confina) | +15 |
| stima TUN→FRA (−20 nello scenario) × 0,5 | −10 |
| sovranità | −20 |
| sovranità nominale ottomana | −10 |
| paura dei vicini (esercito d'Algeria contro 8.000 uomini) | +30 |
| orgoglio (coesione 35 × 0,35) | −12 |
| doni | +20 |
| momento storico | +10 |
| **totale** | **23 su 30** |

Il bey rifiuta. `execute` mette sei mesi di attesa e toglie 5 punti di stima: il secondo tentativo andrà peggio. In `aiColonial` la guerra passa da `warOk`, che vuole un bersaglio senza un signore che non sia tributario e un dado del 20%. Prima di arrivarci servono un'estrazione pesata (Tunisi esce circa una volta su due) e un dado dell'8-12%. Quando "nessuna via" funziona, l'interesse pesa un decimo per un anno. Sono tre difetti di decisione in fila, e nessuno manca di copione. La Francia del 1881 non aspettava un dado: aveva un pretesto (i Krumiri), una scadenza (l'Italia) e 28.000 uomini pronti.

**Proposta.** Ogni potenza, anche africana o asiatica, ha un'**agenda**: voci ordinate, con un'urgenza che cresce in modo deterministico. Una **scala di escalation** sostituisce il "rifiuto e sei mesi di attesa". La **guerra coloniale** diventa un tipo a sé, con obiettivo limitato e trattato di fase. La storia "tiene" perché le stesse cause producono gli stessi effetti, e lo si misura con simulazioni su molti semi.

## 1. Il modello dell'agenda

### 1.1 Dati: si estende `InterestSeed`, non lo si sostituisce

```ts
// src/scenario/colonial1881.ts (campi nuovi, tutti facoltativi: i salvataggi vecchi restano validi)
interface InterestSeed {
  // ...campi esistenti...
  /** quando la potenza storicamente si mosse: anno e mese (il seme sposta di ±8 settimane) */
  due?: [number, number];
  /** quanto preme: 'crisi' (sale in settimane), 'piano' (mesi), 'occasione' (anni) */
  tempo?: 'crisi' | 'piano' | 'occasione';
  /** pretesto storico: alza la scala di escalation di un gradino (Krumiri, Urabi, i gruppi di Dogali) */
  pretext?: string;
  /** fasi di una campagna lunga: ogni fase ha il suo obiettivo e il suo trattato */
  phases?: Phase[];
}
interface Phase { id: string; names?: string[]; modern?: string[]; due: [number, number];
  demand: 'cessione' | 'protettorato' | 'annessione'; treaty: string; truceYears: number }
```

Gli esempi stanno nel §1.4. I nuovi attori (Etiopia, Uassulu, Mahdi) entrano nella stessa tabella. `COLONIAL_POWERS` già nasce da `INTERESTS_1881.map(x => x.nation)`, quindi basta aggiungere voci con `nation: 'ETH'` perché anche loro abbiano un'agenda. Oggi la condizione "le nazioni non giocanti non dichiarano guerre fra Stati" blocca Menelik. Le guerre d'agenda passano invece dalla guerra coloniale (§3), che ha regole sue.

### 1.2 L'urgenza al posto del dado

In `aiColonial` (`colonial.ts`) si tolgono `rand(... 'colonia' ...)` e l'estrazione pesata `'scelta-coloniale'`. Ogni settimana, per ogni voce disponibile:

```ts
U = base(weight)                              // 20-50
  + rate[tempo] * max(0, settimane da due')   // crisi 4/sett., piano 1, occasione 0,25
  + race                                      // +15 per ogni rivale con voce attiva sulle stesse province
                                              // +30 se il rivale ha fatto un passo (trattato, spedizione) da meno di 26 settimane
  + (pretext && dentro finestra ? 15 : 0)
  - 25 * (dentro una tregua di fase)
due' = due + round((rand(seed, 'agenda', id) - 0.5) * 16) settimane   // l'unico caso di rand: è uno scarto, non un dado
```

La potenza **agisce** quando `U ≥ 60` e ha uno **slot** libero. Gli slot sostituiscono "un interesse per volta, mai se in guerra":

```ts
const SLOTS = { FRA: { diplo: 2, spedizioni: 2, guerre: 2 }, GBR: { diplo: 3, spedizioni: 2, guerre: 2 },
                ITA: { diplo: 1, spedizioni: 1, guerre: 1 }, ETH: { diplo: 1, spedizioni: 0, guerre: 1 }, /*...*/ };
```

Anche la condizione `if (warsOf(s, tag).length) continue` cambia. Una guerra coloniale in corso occupa uno slot "guerre" ma non ferma tutto il resto. Una guerra europea sì: in quel caso la diplomazia coloniale si ferma, come già fa `evaluate`. Fra più voci si sceglie per **salienza**, cioè l'urgenza più alta, e a parità vince l'id. Lo stesso stato produce quindi la stessa scelta.

### 1.3 La scala di escalation, al posto di "rifiuta e torna fra sei mesi"

Per le vie diplomatiche (`protettorato`, `assenso`) ogni voce ha un gradino, salvato in `ColonialState.ladder[id]`:

1. **Offerta**: `evaluate` come oggi.
2. **Pressione**, a `U ≥ 70` o con un pretesto: la potenza manda truppe al confine con l'ordine `'pressione'` di `sendExpedition` verso una provincia propria adiacente. In `evaluate` compaiono `['truppe al confine', +10]` e, se c'è un pretesto, `['il pretesto (Krumiri)', +10]`.
3. **Ultimatum**, a `U ≥ 85`: un'ultima offerta con `['ultimatum', +10]`. Se il bersaglio rifiuta, si passa alla guerra coloniale, purché `paths` includa `guerra`.

Un rifiuto fa salire di un gradino e lascia un'attesa di **4 settimane** sulla stessa via, al posto delle 26 di oggi. Il cooldown `${tag}|${id}` "pesa un decimo per un anno" resta solo quando nessuna via è materialmente percorribile, per esempio senza presenza né marina.

### 1.4 Come escono gli eventi (calcolo atteso, seme medio)

- **Tunisi 1881.** `fra-tunisia` ha `due:[1881,4]`, `tempo:'crisi'`, `pretext:'Krumiri'`. A fine marzo U supera 60 e l'offerta fa 23/30: rifiuto. La pressione dà +10 truppe e +10 pretesto, cioè 43/30. Firma: **Bardo fra aprile e giugno 1881**. Senza pretesto o con TUN più forte si arriva all'ultimatum e alla guerra coloniale con obiettivo `protettorato`: Tunisi si prende in 2-4 settimane (§3). Nel giugno 1881 una seconda fase, `fra-tunisia-sud` ("Sfax e Kairouan", `tempo:'crisi'`), si apre solo se c'è una rivolta (`weeklyAdmin`, resistenza ≥ 70) e chiude la storia a Kairouan in autunno.
- **Egitto 1882.** Il passaggio di Tel el-Kebir in `weeklyEgypt` diventa la voce `gbr-egitto`, con `due:[1882,7]`, `tempo:'crisi'` e pretesto `'Urabi'`. Il pretesto lo accende un **evento di contesto** (§2): la rivolta di Urabi, un fatto interno egiziano che nessun attore europeo del modello causa. Ne esce una guerra coloniale GBR→EGY con obiettivo `vassallo`, chiusa in 6-10 settimane. Se il giocatore è l'Egitto, combatte questa guerra. Oggi invece il passaggio salta.
- **Berlino 1884-85, versione emergente.** Non si scrive la conferenza: si scrive la **regola della crisi**. Quando tre o più potenze hanno voci con U ≥ 50 su province che si sovrappongono (Congo: `bel-congo`, `fra-congo`, `por-angola` e, dal 1884, `ger-camerun`), la tensione della regione sale ogni settimana. Oltre 100 la grande potenza **senza voci nella regione** e con la stima media più alta convoca una conferenza (GER nel 1884, ma potrebbe essere GBR se la Germania ha voci in zona). La conferenza assegna le province contese per **presenza effettiva** (chi controlla o ha trattati) e fissa le **sfere** (§4). Chi ne esce senza nulla subisce la crisi di `checkCompletions`, che esiste già. La data dipende da `earliest:1884` delle voci tedesche e da `due:[1882,…]` di Leopoldo e Brazza: **1884-85 nella maggior parte dei semi**. Se nel 1882 la Francia occupa tutto il bacino, la conferenza non serve e non avviene (R2).
- **Harar 1887.** Nuova voce `eth-harar` con `nation:'ETH'`, `names:['Harar','Gildessa']`, `paths:['guerra','protettorato']`, `due:[1887,1]` e `requires` su "Harar fuori dall'Egitto". In `weeklyEgypt` l'emirato nasce alla fine della liquidazione (1886). Menelik ha l'urgenza, uno slot "guerre" e un esercito venti volte più grande: guerra coloniale di 2-6 settimane (Chelenqo). Se l'Italia ha già un protettorato sull'Harar, il bersaglio diventa una potenza europea. La guerra non è più coloniale ma ordinaria, e Menelik non la sceglie da solo (R2: l'Harar resta italiano perché l'Italia ha agito).
- **Eritrea 1889.** `ita-eritrea` si divide in due fasi. La prima, `Bogos e Cheren`, ha `due:[1888,6]` e passa per occupazione o guerra. La seconda, `Hamasien-Seraè`, ha `due:[1889,5]` e passa per `assenso` da ETH. Menelik ha una voce sua, `eth-corona` (armi e riconoscimento), che in `evaluate/assenso` aggiunge `['convenienza: armi italiane', +20]`. Il risultato è **Uccialli nel 1889**: un assenso, non l'"acquisto per 8 milioni" che si vede oggi.
- **Dahomey 1890 e 1892-94.** `fra-guinea` diventa una campagna in due fasi: `{id:'cotonou', due:[1890,2], demand:'cessione', treaty:'trattato di Ouidah', truceYears:2}` e `{id:'abomey', due:[1892,7], demand:'protettorato', treaty:'resa di Behanzin', truceYears:0}`. Escono due guerre brevi a due anni di distanza, ognuna con un esito diverso. Non sono una guerra ripetuta.
- **Samori 1882-98.** `fra-sudan` si spezza: le terre di Samori diventano la voce `fra-uassulu`, con cinque fasi.

```ts
phases: [
  { id:'kenieba', names:[/* sponda sinistra del Niger */], due:[1885,11], demand:'cessione', treaty:'trattato di Kéniéba-Kouré', truceYears:5 },
  { id:'kankan',  names:['Kankan'], due:[1891,4], demand:'cessione', treaty:'occupazione di Kankan', truceYears:1 },
  { id:'bissandugu', names:['Bissandugu'], due:[1892,1], demand:'cessione', treaty:'ritirata verso est', truceYears:1 },
  { id:'kong', names:['Kong'], due:[1894,12], demand:'cessione', treaty:'Kong', truceYears:2 },
  { id:'cattura', modern:[], due:[1897,8], demand:'annessione', treaty:'cattura di Samori', truceYears:0 },
]
```

Escono cinque guerre in sedici anni, come nella storia. Ognuna ha un obiettivo diverso, dura pochi mesi e si chiude con un trattato che cede qualcosa. La fase successiva si apre solo se la precedente è riuscita, e dopo la sua tregua. Samori ha poi una voce sua, `uas-espansione` (verso Kong e il Wasulu orientale), che spiega perché "scappa a est".

## 2. Perché non serve un copione, e come si misura

R3 chiede una cosa sola: che un ritardo di dieci anni abbia una causa nella partita. Il sistema la soddisfa per costruzione. Un'urgenza che sale senza limite e una scala che sale a ogni rifiuto rendono l'azione **certa**, a meno che qualcosa la blocchi: un rivale più forte, una guerra europea, casse vuote, un bersaglio già preso. Ogni blocco è una causa leggibile, e `evaluate` la scrive già in `parts` e in `refusal`. Il copione aggiunge solo una cosa: costringere un evento a succedere anche quando le cause dicono di no. È esattamente quello che R2 vieta.

**Misura.** Un nuovo script, `scripts/sim/storia.ts`, e un test lungo in `tests/storia.test.ts`. Il test gira 10 semi in CI; il rapporto ne gira 50 in locale. Si simulano solo le nazioni non giocanti fino al 1900, con questa tabella di traguardi:

| traguardo | finestra | soglia (50 semi) |
|---|---|---|
| Protettorato francese su Tunisi | ≤ 31/12/1881 | ≥ 90% (≤ 1882: 100%) |
| Egitto vassallo britannico | 1882 ± 6 mesi | ≥ 90% |
| Conferenza sul Congo | 1883-1886 | ≥ 70% |
| Harar all'Etiopia | 1886-1888 | ≥ 75% |
| Italia ad Asmara/Hamasien | 1888-1890 | ≥ 70% |
| Dahomey francese | 1892-1894 | ≥ 70% |
| Samori catturato | 1896-1900 | ≥ 60% |
| guerre "senza condizioni" coloniali | sempre | 0 |
| guerre coloniali con stesso attaccante, bersaglio e fase | sempre | 0 |

Ogni traguardo mancato deve stampare la **causa** registrata (gradino della scala, `refusal`, slot occupati). Un mancato senza causa fa fallire il test. Questa è la traduzione meccanica di R3.

**Eccezioni dichiarate.** Restano scritti gli **eventi di contesto**, cioè quelli la cui causa sta fuori dagli attori modellati: la proclamazione del Mahdi (1881), la rivolta di Urabi (1881-82), la morte di Gordon con il ritiro egiziano. Restano con data e scarto come oggi in `weeklyEgypt`, ma il loro effetto è solo **aprire pretesti e cambiare condizioni**. Non spostano province per conto di una potenza che potrebbe decidere altrimenti. Il passaggio `stage 2` (Tel el-Kebir) esce dal copione e diventa la voce `gbr-egitto`. Il passaggio `stage 3-5` (El Obeid, Khartum) resta: il Mahdi non è un attore che si possa far ragionare. Gli si dà comunque una voce `mah-sudan` perché, se l'Egitto del giocatore resiste, la guerra esca dalle sue regole.

## 3. La guerra coloniale come tipo a sé (R4-R5)

### 3.1 Dati

```ts
// src/engine/types.ts
interface War { /* ... */ kind?: 'coloniale';
  goal?: { interest: string; phase?: string; provinces: number[]; demand: 'cessione'|'protettorato'|'vassallo'|'annessione' } }
```

`declareWar` (`diplomacy.ts`) riceve un parametro facoltativo `opts?: { kind, goal }` e cambia in tre punti:
- la stima di tutti verso l'aggressore non cala di 4 punti: cala solo per le potenze con voci sulle stesse province (−10);
- i garanti non vengono chiamati (lo fa la crisi, §3.3);
- il nome diventa d'epoca: "Spedizione di Tunisi", "Campagna del Dahomey".

### 3.2 Punteggio, durata, esito

`colonialScore(w, war)` in `peace.ts` usa la quota del **goal** occupata, non di tutto lo Stato: `90 * occ(goal) + 15 * capitale + battaglie`. Nel ramo delle paci di `ai.ts`, prima della condizione su stanchezza ed età, si aggiunge `if (war.kind === 'coloniale')`:
- **vittoria**: goal occupato al 70% o capitale presa, a qualsiasi età. La pace si chiude subito con `colonialTerms`, che applica **l'intero goal** senza budget: `cede` delle province del goal, oppure `vassal` di livello `protettorato` e così via, con `applyDemand` come oggi. Non esiste l'esito "senza condizioni" per chi vince;
- **tetto di 26 settimane**: il colonizzatore incassa ciò che occupa (trattato di fase parziale), e la fase resta aperta con tregua di 2 anni;
- **sconfitta del colonizzatore** (spedizione distrutta, oppure goal occupato al 20% o meno dopo 13 settimane): è la "Dogali". La fase resta aperta, la tregua è di 3 anni, il governo perde stabilità e l'urgenza riparte da `base`;
- **stanchezza**: le perdite coloniali pesano un terzo su `warExhaustion` del colonizzatore. È il criterio di Wesseling: operazioni brevi, non guerre per la metropoli.

`warOk` (`colonial.ts`) diventa `colonialWarOk`. Il rapporto d'esercito sotto il 25% esce: la guerra coloniale è asimmetrica per natura e il prezzo lo pagano malattia e logistica, che il motore ha già. Il vincolo "amici grandi potenze" esce anche lui, perché lo sostituisce la crisi. Restano due condizioni: truppe a tre passi (o un porto e una marina) e il bersaglio non deve essere una grande potenza né soggetto di un'altra potenza europea.

### 3.3 Intervento di altre potenze: la crisi coloniale

Alla dichiarazione, ogni potenza con una voce aperta sulle stesse province (ITA per Tunisi via `ita-tunisia`) o con il bersaglio tra i `friends` riceve una **crisi**, che dura 4 settimane. La potenza sceglie fra tre risposte:
- **protestare**: stima −15 e la sua urgenza sulla regione +20;
- **compenso**: chiede una provincia o un assenso altrove, e l'aggressore lo dà se il costo è sotto la soglia (è lo schema di Vic2, "comprare il sostegno");
- **sostenere il bersaglio**: diventa una guerra ordinaria fra potenze.

L'AI sceglie in modo deterministico dalla forza relativa e dalla stima. Il terzo esito sarà raro, come lo fu davvero (Fascioda finì con un cedimento), ma è possibile.

### 3.4 Ripetizioni

Le guerre si registrano per `(attaccante, bersaglio, interesse, fase)`. Una guerra con la stessa chiave è possibile solo dopo una sconfitta o un tetto raggiunto, mai dopo una vittoria. Il cooldown di 5 anni su `${tag}|${t}|guerra` sparisce. Lo sostituiscono `truceYears` della fase e la regola "fase successiva solo se la precedente è chiusa". Con Samori ci sono cinque guerre ma cinque obiettivi. Contro lo Yaka ci sarebbe una sola fase, e dopo una vittoria non può esserci una seconda guerra.

## 4. Protettorati impossibili

Si codificano in un dato e in una regola.

**Dato.** Si aggiunge un `stance` per gli attori indigeni nei profili (`africa1881.ts`), cioè la loro posizione verso ogni potenza.

```ts
stance?: Partial<Record<Tag, 'cerca' | 'neutrale' | 'ostile' | 'mai'>>
// RAB: { FRA: 'mai' }          Rabih nemico della Francia: solo guerra (Kousséri)
// LOZ: { POR: 'mai', GBR: 'cerca' }   Lewanika chiese la protezione britannica
// ARO: { '*': 'ostile' }       nessun trattato: si piega con la guerra (1901-02)
// TAG/OBB: { FRA/ITA: 'cerca' }   Tagiura, Obbia: sultani che cercavano un protettore
```

In `evaluate/protettorato`, `'mai'` produce `fail`. `'ostile'` vale −40, quindi in pratica solo la scala porta alla guerra. `'cerca'` vale +20.

**Regola.** Le **sfere** decise dalla conferenza (§1.4) o da un trattato bilaterale escludono il protettorato di una potenza estranea alla sfera. Il protettorato di Lozi in mano al Portogallo diventa impossibile appena GBR ha una sfera sul Barotseland. Le alleanze impossibili seguono lo stesso schema: `stance:'mai'` vale anche per `alliance` nei controlli di `diplomacy.ts`.

## 5. Il giocatore

**Cosa vede.** In Governo → Colonie, la scheda "Agenda" (in stile Journal Entries di Vic3) mostra le sue voci con l'urgenza e il gradino della scala, il prossimo passo e il suo `evaluate` con le `parts`. Mostra anche le **voci dei rivali** che toccano le sue province, con l'urgenza in fasce ("la Francia prepara qualcosa su Tunisi") e non in numeri. È la visibilità in anticipo che Vic3 dichiara come principio.

**Cosa fa.**
- **Se gioca la Francia**: nessuna voce scatta da sola. L'urgenza diventa **pressione politica**: con U ≥ 85 per più di 26 settimane, stabilità −1 al mese e il partito coloniale (Ferry, `ministers1881.ts`) protesta. Può ignorarla, e allora Tunisi resta libera o va all'Italia (R2).
- **Se gioca Tunisi**: riceve offerta, pressione e ultimatum come scelte. Può accettare, resistere (guerra coloniale in cui difende con il suo esercito, tetto di 26 settimane a suo favore) o **appellarsi** all'Italia o alla Porta, aprendo la crisi del §3.3. Se tiene 26 settimane o distrugge la spedizione, ottiene la tregua di 3 anni.
- **Se gioca l'Italia**: `ita-tunisia` sale per la corsa, perché la Francia si muove e porta +30 di urgenza. Può fare un'offerta di protettorato prima della Francia: con stima TUN→ITA a +5 parte meglio della Francia. Oppure può sfruttare la crisi alla dichiarazione francese. Se prende Tunisi, `fra-tunisia` si chiude per `excludes` e la Francia entra in crisi coloniale, cosa che esiste già.

Quando è il giocatore il bersaglio di una guerra coloniale, la pace segue le regole del §3.2. In modalità `own/all` il giocatore detta, ma il goal fissato limita le richieste dell'aggressore.

## 6. AGENTS.md

- **Determinismo**: spariscono quattro chiamate a `rand` usate come dadi (`scelta-coloniale`, `colonia`, `guerra-coloniale`, e `ambizione` resta). L'unico `rand` nuovo è lo scarto di `due`, una volta per voce e per seme. Stesso seme, stessa storia: anche i semi diversi divergono poco (debolezza 3, §8).
- **Il motore decide**: l'agenda è dato più regola nel motore. Il GM LLM può solo **proporre il testo** dei pretesti e dei trattati, mai il loro effetto.
- **Nomi d'epoca**: i nomi dei trattati ("Kéniéba-Kouré", "Bardo") e delle spedizioni stanno nei dati.
- **Prestazioni**: l'urgenza costa O(voci) a settimana, circa 70 voci. La crisi di regione è un conteggio su insiemi già in cache (`idSet`). Sul telefono non cambia nulla.
- **Test**: oltre a `tests/storia.test.ts` (§2), tre test mirati in `tests/colonie.test.ts`:
  1. "Tunisi senza giocatore: protettorato entro la settimana 26";
  2. "una guerra coloniale vinta non si ripete per la stessa fase";
  3. "Rabih non firma con la Francia".

  In `tests/determinism.test.ts` resta lo stesso hash.

## 7. Costi

| file | cosa |
|---|---|
| `src/scenario/colonial1881.ts` | `due`, `tempo`, `pretext`, `phases` su circa 46 voci; circa 12 voci nuove (ETH ×3, UAS, MAH, `fra-uassulu`, Dahomey diviso, Tunisi sud, Eritrea divisa) |
| `src/scenario/africa1881.ts` | `stance` per circa 30 attori indigeni |
| `src/engine/colonial.ts` | `aiColonial` riscritto (urgenza, slot, scala); `colonialWarOk`; `ladder` e `campaigns` in `ColonialState`; `weeklyEgypt` stage 2 tolto; crisi di regione e conferenza |
| `src/engine/types.ts` | `War.kind`, `War.goal` |
| `src/engine/diplomacy.ts` | `declareWar(opts)` |
| `src/engine/peace.ts` | `colonialScore`, `colonialTerms` (riusano `applyDemand`) |
| `src/engine/ai.ts` | ramo coloniale nella chiusura delle paci |
| UI Colonie | scheda Agenda, scelte dell'ultimatum, crisi |
| test e script | `tests/storia.test.ts`, `scripts/sim/storia.ts` |

Stima: 600-900 righe di motore, 300 righe di dati, ricerca storica per le date `due` e le `stance`.

**Rischi.**
- **Taratura**: soglie e pendenze sono numeri nuovi e servono più giri di simulazione da 50 semi, circa 4 minuti ciascuno.
- **Salvataggi**: tutti i campi sono facoltativi, `ladder` e `campaigns` si creano al volo.
- **Ordine del turno**: la crisi di 4 settimane si incastra fra `ia` e `colonie`, e va documentata in `docs/SPEC.md`.

## 8. Debolezze, dichiarate

1. **Una data `due` con urgenza crescente è un copione morbido.** La differenza dal copione è reale ma sottile: l'evento non avviene se una causa lo impedisce, e la causa si vede. Chi accusa la proposta di "binario travestito" ha mezzo argomento.
2. **Alcuni eventi restano scritti** (Mahdi, Urabi, ritiro egiziano). Il confine fra "contesto esogeno" e "decisione di un attore" è un giudizio, non una regola.
3. **Poca varietà fra i semi.** Senza dadi, partite diverse divergono solo per lo scarto di `due` e per le reazioni a catena. È voluto, per R1, ma chi vuole sorprese dalla storia alternativa le trova solo se interviene il giocatore.
4. **Le soglie del test sono tarate da noi.** Una soglia del 90% per il Bardo nel 1881 è una scelta, non una verità. Se la taratura fallisce, si ritocca la taratura, e questo può diventare un inseguimento del dato.
5. **La conferenza emergente è la parte più fragile.** La regola di tensione può scattare troppo presto, troppo spesso o in regioni sbagliate (il Niger nel 1883). Va limitata a una conferenza per regione.
6. **Più complessità per il giocatore**: scala, crisi e sfere sono tre concetti nuovi da spiegare nell'interfaccia.
7. **Non tocca le guerre fra Stati europei** (Serbia-Bulgaria, Grecia-Turchia), che il dossier segnala come assenti. La stessa macchina, cioè voci d'agenda con `nation:'SER'`, potrebbe estendersi a loro, ma è fuori dal mandato e non l'ho tarata.
