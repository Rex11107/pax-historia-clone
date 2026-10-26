# Regnum Historia — decisioni di progetto

Documento di riferimento per chi riprende il lavoro (persona o AI). Riscrittura completa del vecchio prototipo "Pax Historia Clone": nulla del codice Python precedente è stato riusato, solo le idee che avevano funzionato.

## Vincoli

- Tutto vive su GitHub: codice, build (Actions), sito (Pages), APK (Releases). Nessun server o servizio intermedio.
- Android tramite APK; anche browser. Il calcolo gira sul dispositivo, l'AI via chiave API dell'utente (BYOK), salvata solo sul dispositivo.
- Single-player, una nazione giocabile, Europa e Mediterraneo dal 1° gennaio 1881. Espansione mondiale solo dopo aver verificato che il gioco funziona.

## Architettura

| Cartella | Ruolo | Regola |
| --- | --- | --- |
| `scripts/map` | genera `public/data/europe1881.json` | ripetibile, nessuna provincia scritta a mano |
| `src/engine` | motore deterministico | nessuna AI, nessun I/O, stato = JSON puro |
| `src/llm` | Game Master, agenti-nazione, contesto | propone; il codice valida ogni scrittura |
| `src/ui` | canvas + pannelli DOM | disegna, non calcola regole |
| `src/game.ts` | sessione | unico punto di contatto UI ↔ motore/AI |

Stack: TypeScript, Vite, Capacitor 8 (Android), Vitest. Nessun framework UI. L'HTTP nativo di Capacitor evita il CORS nell'APK; nel browser dipende dal provider.

## Mappa

- Base d'epoca (`scripts/map/historical.mjs`): dove esistono dati aperti le province partono dalle unità amministrative del tempo invece che da quelle moderne. HistoGIS (CC BY 4.0) per i 37 Regierungsbezirke prussiani, gli 8 Kreise bavaresi, i 4 distretti del Baden e i 386 distretti della Cisleitania; RISTAT 1897 (CC0) per i 681 uezd dell'Impero russo nell'area di gioco. Ogni unità porta il proprietario certo (GER, AUH, RUS) e il padre storico (provincia prussiana, Kronland, governatorato). Precedenza Prussia > Baviera > Baden > Cisleitania > Russia; le coste restano quelle di Natural Earth. Fuori copertura restano le province moderne; in Transleitania vengono tagliate sui Kronländer (Ungheria, Croazia-Slavonia, Confine militare). Gli uezd si accorpano dentro il governatorato fino a ~7.000-14.000 km².
- Accorpamenti: chiave = paese moderno + padre storico (o regione moderna dove non c'è dato d'epoca). Così una provincia non scavalca mai né un confine d'epoca né una futura linea etnica/statale. Italia per compartimenti del 1881 (Rieti con l'Umbria, Molise con gli Abruzzi, Aosta col Piemonte, Friuli col Veneto). Isole piccole unite alla provincia vicina dello stesso stato.
- Nomi: unità d'epoca col nome del tempo (Regierungsbezirk, distretto; uezd ricavato dall'aggettivo russo con tabella delle forme irregolari, mai il nome di una città moderna); stati tedeschi minori dalla tabella `RENAMES`.
- Province residue: Natural Earth admin-1 (dominio pubblico).
- Province da gioco nella zona italiana (`scripts/map/compact.mjs`, prima fase: Italia, Svizzera, Savoia-Nizza-Provenza-Corsica, Austria alpina e adriatica, Croazia, Bosnia): le linee amministrative non sono fatte per essere annesse, quindi le province si ricostruiscono da atomi (unità amministrative tagliate dai bacini HydroBASINS di livello 8) raggruppati per compattezza (Polsby-Popper), 2.800-7.500 km², estensione massima 190 km. Vincoli rigidi: stesso proprietario 1881, stesso paese moderno, stessa area linguistica (Ticino, Romandia, Alto Adige). Vincolo morbido: il confine di una regione storica si attraversa solo se la forma migliora molto. Nome: la città principale, altrimenti il nome amministrativo prevalente non ancora usato. Eccezioni volute per le rivendicazioni dell'epoca, anche a costo di province piccole o strette: Trieste città a sé (il resto della contea di Gorizia unito attorno a Gorizia, a cavallo del confine moderno); contea di Nizza (a est del Var) separata dal resto delle Alpi Marittime; Dalmazia divisa fra costa e isole (minoranze italiane) e interno croato; Cattaro separata dall'Erzegovina lungo il confine montenegrino. Gli atomi delle unità d'epoca prendono il paese moderno dalla propria posizione, non dal capoluogo del distretto. Le capitali si trovano per contenimento geometrico (`GameMap.locate`). Il resto d'Europa seguirà dopo la verifica della zona italiana; lì le dimensioni dovranno dipendere anche dalla popolazione (province grandi dove la terra è vuota).
- Regioni storiche (`scripts/map/regions.mjs`), il livello contenitore sopra le province: padre d'epoca dove c'è (provincia prussiana, Kronland, governatorato), compartimenti italiani del 1881, vilayet ottomani ricostruiti dalle province turche moderne, regioni storiche approssimate altrove (Andalusia, Valacchia, Rumelia orientale, Alsazia-Lorena…). 265 regioni. Servono a trattati ("cedo la Galizia"), all'AI (campo `regions` nelle proposte, riassunto per regioni nel contesto) e alle etichette a zoom intermedio. Cessioni: in pace al massimo una regione piccola (≤4 province); in guerra fino a 30 province, una regione si ottiene occupandone i tre quarti.
- Territori protetti (`PROTECTED` in `map-config.mjs`): Gibilterra, Helgoland, Ceuta, Melilla e i microstati San Marino, Monaco, Liechtenstein, Andorra non vengono mai assorbiti. Se la semplificazione li cancella diventano province-simbolo (`tiny`), con i vicini calcolati prima della semplificazione (Helgoland: stretto verso la costa). I microstati sono nazioni neutrali non giocabili, senza esercito, garantite dai protettori dell'epoca (Francia per Monaco e Andorra, Italia per San Marino, Austria per il Liechtenstein, Spagna per Andorra). Quelle oltre 22.000 km² vengono divise con HydroBASINS livello 7 (`scripts/map/basins.mjs`): si sceglie il livello Pfafstetter più grossolano che dà abbastanza bacini, i gruppi troppo grandi scendono di livello, i pezzi piccoli si uniscono al vicino col confine più lungo. I confini interni corrono sugli spartiacque. Ripiego senza HydroBASINS: tagli lungo i fiumi di Natural Earth. Niente tagli rettilinei. Ogni pezzo prende il nome della sua città principale.
- Accorpamento delle province piccole (min ~2.600 km²) solo dentro la stessa regione moderna e, in Svizzera, la stessa area linguistica (Ticino italiano, Romandia francese): così una cessione futura segue linee credibili. Mai fra paesi moderni diversi.
- Nomi d'epoca al posto di quelli moderni dove servono (Königsberg, Memel, Posen, Bromberg, Vjatka, Ekaterinoslav, Tiflis…), tabella `RENAMES`.
- Proprietari 1881: sovrapposizione con historical-basemaps `world_1880` (GPL-3.0), poi correzioni in `map-config.mjs` (Alsazia-Lorena, Savoia/Nizza, Bessarabia, Kars, Caucaso, Rumelia orientale, Tessaglia, Creta, Belgrado, Cattaro, Schleswig…). 111 località di controllo: `STRICT_MAP=1 npm run map` fallisce se una è sbagliata.
- Adiacenze dalla topologia (archi condivisi) + stretti fino a 45 km fra masse di terra distinte. Proiezione LAEA (52N 10E), coordinate in km.
- Terreno dai poligoni fisici di Natural Earth (catene montuose, altopiani, deserti, paludi), con un ripiego a punti.
- Confini lungo i fiumi (415) marcati nei dati: chi attacca attraverso un fiume ha potenza ×0,75. Livello fisico separato `physical1881.json` (rilievi, fiumi, laghi) mostrato col pulsante "Rilievi e fiumi".

## Motore

- Turno = 7 giorni. Ogni giorno: ordini → battaglie → rifornimenti. Fine turno: economia, AI deterministica, scadenza trattati.
- Movimento fra centri di provincia adiacenti, velocità per arma × terreno × rifornimento × morale; ferrovia (moltiplicatore 1 + 5·rete/100) solo in territorio amico non conteso; stretti +2 giorni. Neutrali impenetrabili senza guerra, alleanza o accesso militare.
- Ordini in coda con precondizione e condizione di uscita (`move`, `attack`, `hold`, `entrench`; condizioni `day_gte`, `supply_gte`, `strength_gte`, `unit_at`, `controlled_by`, `no_enemy_at`). `validateOrder` è obbligatorio per tutto ciò che arriva dall'AI.
- Rifornimento: BFS dalla capitale (e dai porti se marina ≥ 30) nel territorio amico; fuori cala per ogni provincia di distanza. Attrito sotto 0,25.
- Combattimento giornaliero per provincia, potenza = forza × arma × morale × rifornimento × qualità × esperienza, difesa × terreno × trinceramento. Rumore deterministico (seed:giorno:provincia). Ritirata sotto morale 0,25 o forza 30%; resa senza vie di fuga.
- Economia settimanale in milioni: entrate da popolazione × industria × imposte (+3% per accordo commerciale), costi esercito/amministrazione/interessi/opere. Debito automatico se il tesoro va sotto zero.
- Politiche con effetti reali: imposte, mobilitazione, ferrovie, stampa. Stabilità tende a un obiettivo; stanchezza di guerra dalle perdite per milione di abitanti.
- Diplomazia nel codice: guerre con chiamata degli alleati e dei garanti, paci (anche separate) con cessioni e indennità, trattati con scadenza, violazioni rilevate in battaglia, opinioni asimmetriche (-100..100).
- Nazioni non giocanti: difesa del fronte, liberazione, attacco con superiorità ≥ 1,3, arruolamento, pace automatica fra AI esauste.

## AI

- Game Master `translate`: direttive libere → JSON di ordini/politiche/arruolamenti/guerre, validato pezzo per pezzo. Nomi di provincia risolti dal codice.
- Game Master `narrate`: dispaccio dai soli eventi del motore + fino a 3 azioni del mondo (guerra, pace, trattato, opinione) con soglie di plausibilità nel codice. Riassunto per turno, cronaca rinnovata ogni 6 turni.
- Agenti-nazione: system prompt statico per nazione (cacheabile); nell'ultimo messaggio la vista bilaterale e le regole derivate dai numeri ("sei in bancarotta", "temi le minoranze"…). Rispondono con `{reply, intent, proposal, opinion_delta}`. Un "sì" passa da `checkProposal` (veto meccanico: cessioni solo se occupate o con stanchezza ≥ 50) e da `plausibility` (niente alleanze con chi ci detesta).
- Costo stimato con DeepSeek V4 Flash: un turno con dispaccio ≈ 2 chiamate; un messaggio diplomatico = 1 chiamata.

## Semplificazioni note (candidate alle prossime fasi)

1. Nessuna nebbia di guerra; nessuna flotta come unità (il mare conta solo per rifornimenti e stretti).
2. Popolazione 1881 distribuita per peso urbano moderno: indicativa, non esatta.
3. Terreno approssimato; nessun meteo/stagioni.
4. Risorse materiali (acciaio, carbone, grano) non ancora modellate.
5. Bilanciamento del combattimento tarato su poche simulazioni.
6. Le nazioni AI non negoziano fra loro a parole: il GM decide le mosse con limiti.
