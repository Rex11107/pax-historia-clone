# Dossier per la corte: eventi storici e guerre coloniali in Regnum Historia

## 1. Il caso

Regnum Historia è un gioco di grande strategia (TypeScript, motore deterministico in `src/engine/`, un turno = una settimana, inizio 1° gennaio 1881). Repository locale: `la radice del repository` (branch `feat/fase2-storia`). Le regole del progetto sono in `AGENTS.md` (leggerlo): motore deterministico (niente `Math.random`, solo `rand(seme, …)`), il modello AI (LLM) propone e il codice dispone, nomi d'epoca, niente refactor non richiesti.

Una simulazione di 19 anni con le sole nazioni non giocanti (rapporto: `docs/rapporti/1881-1899.md`) ha mostrato che eventi storici chiave arrivano tardi o mai, e che le guerre coloniali si ripetono in modo poco credibile. Un'analisi di terzi del rapporto è in `analisi-terza.md` (accanto a questo file).

### La richiesta del giocatore (testuale, è il mandato della corte)

> "Prima di procedere, riguardo a questa parte voglio chiederti se secondo te esiste un metodo migliore per risolvere questi eventi. Ricordati che per quanto alternative history, deve preservare parte dell'history reale. Eventi specifici determinati da azioni, ok, eventi specifici che non succedano o dopo quasi 10 anni quello è un problema del motore da aggiustare. Per le guerre coloniali, che non vengano considerate solo guerre ma anche guerre coloniali, più permissive dalla parte coloniale, riducendo le doppie o triple guerra che storicamente sono avvenute in pochi mesi o giù di li."

Tradotto in requisiti:
- R1. Storia alternativa, ma una parte della storia reale va preservata.
- R2. Che un evento storico non avvenga (o cambi) perché qualcuno ha agito diversamente: va bene.
- R3. Che un evento storico non avvenga, o avvenga quasi dieci anni dopo, senza una causa nella partita: è un difetto del motore.
- R4. Le guerre coloniali devono essere un tipo a sé, non guerre ordinarie: più permissive per la potenza coloniale.
- R5. Ridurre le guerre doppie o triple contro lo stesso avversario che nella storia furono una sola campagna di pochi mesi.

## 2. Il motore attuale (da leggere nel codice)

### 2.1 Eventi storici scritti
Solo una catena è scritta: la crisi egiziana e il Mahdi (`src/engine/colonial.ts`, `weeklyEgypt`, righe ~655-720). Ogni tappa ha un giorno fisso con uno scarto dal seme di ±45 giorni (`at(d, k)`), più condizioni (es. Tel el-Kebir solo se GBR ed EGY non sono già in guerra e nessuno dei due è il giocatore). Tutto il resto della storia coloniale è emergente.

### 2.2 Interessi coloniali (`src/scenario/colonial1881.ts`, 46 interessi)
Ogni interesse: nazione, stadio (1 storico, 2 rivendicazione reale, 3 ambizione), province (per nome o paese di oggi), vie possibili (`occupazione`, `protettorato`, `acquisto`, `assenso`, `guerra`), peso storico 0-1, finestra di anni, `earliest`, `requires`, `excludes`. Esempio: `fra-tunisia` (peso 1, finestra 1881-1882, vie protettorato e guerra, esclude `ita-tunisia`).

### 2.3 Come l'AI coloniale decide (`aiColonial`, ~righe 525-575)
Ogni settimana, per ogni potenza coloniale non in guerra e senza spedizioni in corso:
1. sceglie UN interesse con estrazione pesata (peso × (1-progresso) × fattore finestra: 0,25 prima, 2 dentro, 0,8 dopo);
2. poi tira un dado: agisce solo con probabilità `(dentro finestra ? 0,08 : 0,02) × min(1,5; 0,5+peso)` — circa 8-12% a settimana nella finestra;
3. prova prima la diplomazia (protettorato/acquisto/assenso: `evaluate` somma "parti" — presenza, stima, sovranità −20, paura dei vicini, esercito, orgoglio, doni +20, momento storico +10 — e serve ≥30 o ≥20); se riesce, un trattato ogni sei mesi; se fallisce, il bersaglio rifiuta per sei mesi;
4. poi le spedizioni nelle terre di nessuno (una alla volta);
5. infine la guerra, solo se `warOk` (bersaglio non grande potenza, senza signore non tributario, senza amici grandi potenze, esercito < 25% del nostro, nostre truppe a tre passi) e con un altro dado del 20%; dopo la dichiarazione, niente guerra allo stesso bersaglio per 5 anni;
6. se nessuna via è percorribile, l'interesse pesa un decimo per un anno.

### 2.4 Una guerra coloniale oggi
È una guerra ordinaria (`declareWar`) con motivazione "impresa coloniale". Si chiude con la pace generica (`ai.ts` → `concludePeace(engineTerms)`): stanchezza ≥55, oppure dopo 6 mesi con stanchezza >35, oppure (aggiunto oggi) punteggio ≥50 dopo 60 giorni, oppure dopo 540 giorni. `engineTerms` (`peace.ts`) dà al vincitore richieste entro un budget = punti di scarto × quota; le province dell'interesse contano come rivendicazioni. Spesso la pace è "senza condizioni" (scarto troppo piccolo), l'interesse resta aperto, e dopo 5 anni si rifà la stessa guerra. Un protettorato non si può imporre in guerra se non con la pace (`vassal` nelle richieste).

### 2.5 Altri fatti utili del motore
- `rand(seed, …)` deterministico; `s.day` giorni dal 1/1/1881; `year(w)`.
- Mappa di 4532 province con proprietari storici 1881; terre di nessuno = territori senza Stato riconosciuto.
- Il motore ha già: stima fra nazioni, trattati, soggetti (protettorato/vassallo/tributario), guerre con punteggio, pace con richieste, colonie amministrate con integrazione/resistenza/rivolte, rotte navali, eventi (`emit`), "situazioni" (schede narrative).
- Il gioco ha anche un Game Master LLM (`src/llm/`), che però non scrive lo stato: produce intenti validati.

## 3. Evidenze dalla simulazione 1881-1899 (seme `regnum`, dopo le correzioni all'AI in guerra)

- Tunisi: protettorato francese solo con la guerra del novembre 1886 (storia: Bardo, 12 maggio 1881). In un'altra corsa, prima delle correzioni, la Francia perde tre province algerine contro Tunisi.
- Francia contro il Uassulu (Samori): guerre nel 1881-82, 1892-93, 1898 (più Mossi 1882-84 e Kong 1899), ogni volta chiuse con poco.
- Belgio (lo Stato libero di Leopoldo modellato come Belgio): guerre a Yaka tre volte, Kuba due, Lunda due, molte chiuse "senza condizioni".
- Protettorati storicamente impossibili: Rabih sotto la Francia (era il suo nemico, ucciso a Kousséri nel 1900), Lozi sotto il Portogallo (andarono in sfera britannica), Aro e Ibadan britannici già nel 1886-87 (gli Aro furono piegati con la guerra del 1901-02).
- Harar resta emirato e diventa protettorato italiano nel 1889: l'Etiopia AI non fa la guerra di Menelik (1887) perché le nazioni non giocanti non dichiarano guerre fra Stati.
- La Guerra del Pacifico (iniziata nel 1879) si chiude l'8 gennaio 1881 per la regola "guerra ferma da 540 giorni": l'età è contata dal 1879.
- Date dell'Egitto spostate di ±45 giorni (scelta voluta) ma il testo cita la battaglia storica.
- Nessuna guerra fra Stati in 19 anni; casse delle potenze che esplodono (problema economico a parte, fuori dal mandato).

## 4. Ricerca: come altri giochi risolvono il problema

Fonti consultate (alcune pagine del forum Paradox erano bloccate da una verifica del browser; dove indicato, il contenuto è conoscenza generale e non citazione):
- **Victoria 3, Journal Entries** (AltChar, 28/1/2022): sostituiscono gli eventi a comparsa con voci dell'"agenda di governo" visibili in anticipo, con esiti visibili, attivazione per condizioni, e un evento che presenta la situazione con approcci diversi. Filosofia dichiarata: evitare eventi storici arbitrari slegati da ciò che accade nella partita; contenuti storici emergenti e visibili. (Conoscenza generale, non verificata qui: hanno condizioni di completamento e di fallimento e spesso una scadenza.)
- **Victoria 3, colonizzazione** (PCGamesN, AltChar, TheGamer): non si dichiara guerra ai nativi; la colonia cresce provincia per provincia a una velocità data dall'istituzione coloniale; cresce una "tensione" coi nativi vicini; oltre una soglia scatta una "rivolta nativa", che è un *diplomatic play* a cui altre potenze possono unirsi; malaria e logistica rendono difficile la guerra; stili di governo coloniale cambiano la tensione.
- **Victoria 2, crisi** (FandomSpot; PC Gamer, intervista su Heart of Darkness): due potenze che colonizzano la stessa provincia accumulano tensione fino a una crisi; le grandi potenze del continente devono schierarsi o perdono prestigio; le parti si comprano il sostegno con concessioni; o una parte cede, o si va a una guerra di crisi senza paci separate. La crisi è lo spareggio della corsa coloniale. Il punteggio di guerra "che matura" impedisce all'AI di combattere guerre già perse.
- **Europa Universalis IV, eventi** (conoscenza generale): eventi con condizioni e "mean time to happen" (tempo medio di attesa che si accorcia o allunga coi modificatori), eventi una volta sola, eventi a data; più missioni e decisioni.
- **Hearts of Iron IV** (conoscenza generale; le pagine non erano raggiungibili): alberi dei focus nazionali con rami storici; regola di partita "AI storica / non storica" che obbliga l'AI a seguire i rami storici; eventi principali (Anschluss, Monaco) agganciati a focus completati, con scelte per gli altri; piani di strategia dell'AI.
- **Storylets / narrativa a qualità** (Kreminski & Wardrip-Fruin, "Sketching a Map of the Storylets Design Space"): moduli narrativi con precondizioni sullo stato; selezione casuale, pesata, per "salienza" (vicinanza a uno stato ideale, con contenuti di riserva), per ricerca di percorsi verso obiettivi narrativi, o da un "drama manager" che spinge la storia verso certi punti.

## 5. Ricerca: come andarono davvero le guerre coloniali (per calibrare)

- **Tunisia 1881** (Wikipedia, "French conquest of Tunisia"): invasione dal 28 aprile, trattato del Bardo il 12 maggio (due settimane, 28.000 uomini); rivolta del sud e di Sfax dal 10 giugno, Kairouan presa senza combattere il 28 ottobre (20 settimane, 32.000 uomini sbarcati). Due fasi, un'unica impresa.
- **Egitto 1882**: bombardamento di Alessandria 11 luglio, Tel el-Kebir 13 settembre (circa due mesi).
- **Samori** (Wikipedia, "Mandingo Wars"): campagne nel 1882, 1883, 1885-86 (trattato di Kéniéba-Kouré, 28 marzo 1886: alla Francia la sponda sinistra del Niger), pausa di cinque anni, 1891 (Kankan), 1892 (quattro mesi), 1893, 1894-95 (Kong), due anni di pace, agosto 1897 - settembre 1898 (cattura di Samori). Cioè: contro lo stesso avversario ci furono davvero più campagne in sedici anni, ma ognuna di pochi mesi, con trattati che cedevano qualcosa ogni volta, ed era percepita come una lunga guerra a fasi.
- **Dahomey** (Wikipedia, "Second Franco-Dahomean War"): prima guerra 1890 (pochi mesi, trattato con tutte le richieste francesi); seconda dal 4 luglio 1892, Abomey presa il 17 novembre 1892 (circa quattro mesi e mezzo), resa di Behanzin il 15 gennaio 1894. Francia 2.164 uomini (+2.600 portatori) contro circa 10.000; perdite francesi 85 in battaglia e 205 per malattia.
- **Rabih** (Wikipedia, "Battle of Kousséri"): nemico della Francia; Togbao 17 luglio 1899, Kousséri 22 aprile 1900.
- **Wesseling, "Colonial Wars and Armed Peace 1870-1914"** (Itinerario 1981, abstract): molte guerre coloniali non furono mai dichiarate; si chiamavano "spedizioni punitive" o "operazioni di polizia"; le durate ufficiali (decenni) e i combattimenti effettivi (brevi) divergono; criterio Singer-Small: guerra "extra-sistemica" ≈ 1.000 morti l'anno per la potenza coloniale. Wesseling, "Divide and Rule" (1991): la spartizione fu decisiva per l'Africa ma marginale per l'Europa.

## 6. Il compito della corte

Proporre, criticare e giudicare **un metodo** (architettura del motore e dei dati, non codice completo) che:
1. garantisca che gli eventi storici importanti avvengano in tempi plausibili salvo cause nella partita (R1-R3), senza diventare un binario;
2. renda la guerra coloniale un tipo a sé, più permissivo per il colonizzatore, a fasi, e che non si ripeta a vuoto (R4-R5);
3. impedisca i protettorati e le alleanze storicamente impossibili;
4. rispetti `AGENTS.md` (determinismo, il motore decide, nomi d'epoca, test, prestazioni sul telefono) e il motore esistente (riusare, non riscrivere tutto);
5. funzioni sia per le nazioni non giocanti sia per il giocatore (cosa vede, cosa può fare, cosa succede se il giocatore è la Francia, o Tunisi).

Il lavoro della corte non modifica il repository.
