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

- Province: Natural Earth admin-1 (dominio pubblico), province grandi divise con k-means + Voronoi, piccole accorpate (min ~2.600 km²). Nome = pezzo più popoloso.
- Proprietari 1881: sovrapposizione con historical-basemaps `world_1880` (GPL-3.0), poi correzioni in `map-config.mjs` (Alsazia-Lorena, Savoia/Nizza, Bessarabia, Kars, Caucaso, Rumelia orientale, Tessaglia, Creta, Belgrado, Cattaro, Schleswig…). 80 località di controllo: `STRICT_MAP=1 npm run map` fallisce se una è sbagliata.
- Adiacenze dalla topologia (archi condivisi) + stretti fino a 45 km fra masse di terra distinte. Proiezione LAEA (52N 10E), coordinate in km.
- Terreno approssimato da punti di catene montuose e colline (non da un DEM).

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
