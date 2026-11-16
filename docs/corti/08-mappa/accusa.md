# Atto d'accusa: Mappa, territorio e scenario iniziale

L'accusa è del cartografo dell'Istituto Geografico Militare. Imputati: `src/engine/map.ts`, `desert.ts`, `setup.ts`, `public/data/europe1881.json` (sondato, non letto per intero: 3,3 MB), `scripts/map/` (letto, non eseguito `build-map`), `src/scenario/*1881.ts`; test `mappa`, `deserto`, `sea`.

Ho usato due sonde nella cartella della corte e `npm run map:check` (1 s). Nessuna modifica al repository fuori dalla corte. I numeri di popolazione a confronto («censimenti dell'epoca») vengono dalla mia memoria, non da una ricerca in questa sessione: vanno presi come ordine di grandezza, non come fonti.

---

## Capi d'accusa, dal più grave

### 1. Granularità fortemente disomogenea: l'impero coloniale britannico ha 558 province, la Germania 115, l'Italia 60
- **Tipo**: squilibrio. **Gravità**: media.
- **Prova** (sonda): 4.532 province in tutto; GBR 558 (e la top-8 è tutta indiana: Purnea, Moradabad, Dacca, Meerut…), RUS 457, CHI 280, TUR 212, FRA 164, AUH 149, SPA 137, NED 136, BRA 125, USA 144, ma GER 115, ITA 60, COR 29. Il mondo coloniale è 4-9 volte più risolto dell'Europa centrale.
- **Effetto sul gioco**: la provincia non è un'unità uniforme. `economy.ts:74` fa dipendere l'amministrazione da `provinces × 0.0004` con tetto a 0,12: RUS (457), GBR (558), CHI (280) e TUR (212) sforano il tetto e pagano il massimo +12%, mentre GER (115), ITA (60), AUH (149) restano sotto. Le potenze territoriali pagano più amministrazione delle potenze industriali *per il solo taglio della mappa*.
- **Rimedio**: o si accetta e si documenta un peso diverso per provincia (es. costo amministrativo per abitante, non per provincia), o si uniforma la granularità. Va deciso con la corte 03.

### 2. `locate()` e `nearest()` senza indice spaziale: O(4532) a ogni chiamata
- **Tipo**: difetto (prestazione). **Gravità**: media.
- **Prova**: `map.ts` — `locate()` itera **tutte** le province (`for (const p of this.provinces)`) con un filtro a bounding box precalcolato; `nearest()` pure. `newGame` chiama `locate` per ogni capitale di 166 nazioni, per ognuna delle ~400 opere di `BUILDINGS_1881` e per le occupazioni; poi `buildRefusal`, `siteLots` e il semina-ferrovie richiamano `locate`/`nearest` a runtime.
- **Effetto**: costo di avvio e di ogni lookup inutile su 4.532 province. Non è il collo di bottiglia del turno (la fase costruzione pesa ~6 ms, sonda 2 della corte 04), ma è un lavoro che cresce col mondo.
- **Rimedio**: un indice a griglia (binning su coordinate) o un kd-tree; <50 righe.

### 3. Nomi con disambiguatore moderno fra parentesi, contro i nomi d'epoca
- **Tipo**: difetto di modello. **Gravità**: bassa.
- **Prova**: `map:check` e sonda mostrano nomi come `Najran (ovest)`, `Kharj (est)`, `Abu Dhabi (ovest)`, `Nordland (ovest)`, `San Francisco (California)`. I test (`mappa.test.ts`) vietano «( )» solo per le province eritree, ma il resto del mondo li usa come disambiguatore fra province della stessa regione storica.
- **Effetto**: il giocatore vede una parentesi da shapefile moderno, non un nome del 1881; regola 8 di AGENTS.md (nomi d'epoca) violata in modo sparso e incoerente.
- **Rimedio**: nomi d'epoca univoci (o un campo `disambiguator` separato dal nome mostrato).

### 4. Ottanta province costiere senza adiacenza terrestre né stretto: solo mare, senza segnalarlo
- **Tipo**: mancanza. **Gravità**: bassa.
- **Prova** (sonda 2): 80 province abitabili con zero adiacenze (terrestri + stretti + piste); tutte `coast=true` e tutte raggiungibili via mare (verificato: Hawaii, Zanzibar, Socotra, Isola di Pasqua, Baleari, Tórshavn → `seaRoute` restituisce una rotta). Non è un errore di raggiungibilità, ma il dato «questa provincia si tocca solo via mare» è implicito (coast + grado 0), non un campo.
- **Effetto**: nessun test garantisce che *ogni* isola abitata sia nel grafo marino (`sea.zones`); una isola nuova fuori dalle zone diventerebbe silenziosamente irraggiungibile.
- **Rimedio**: un campo esplicito (es. `landLocked`) o un test che per ogni provincia abitata con grado 0 verifichi la copertura di una zona marittima.

### 5. Quattro oasi con vicini non-deserto (regola 13, solo informativa)
- **Tipo**: squilibrio. **Gravità**: bassa.
- **Prova** (`map:check`): `Figuig` (vicini Bouarfa, Aïn Sefra), `Liwa` (Abu Dhabi ovest), `Najran (ovest)` (Asir, Saada), `Giabrin` (Kharj est). Il controllo le stampa come **informative** perché la regola 13 è un giudizio, ma sono quattro violazioni note e non dichiarate in `check-allow.json`.
- **Effetto**: bellezza regola-agente: quattro oasi «stanno» ai margini del deserto invece che dentro, e nessuno se ne assume l'eccezione.
- **Rimedio**: assorbirle o allargarle (regola 13) o registrarle esplicitamente in `check-allow.json`.

### 6. La funzione di proiezione si chiama `laea` ma implementa la cilindrica di Miller
- **Tipo**: errore (nome). **Gravità**: bassa.
- **Prova**: `map.ts` — `export function laea(...)` calcola `x = R·lon·π/180`, `y = R·1.25·ln(tan(π/4 + 0.4·φ))`: è la cilindrica di Miller, non la Lambert Azimuthal Equal-Area che il nome `laea` dichiara. Il commento sovrastante è corretto («cilindrica di Miller»); il nome no. `decodeArcs` e i test usano `locate` con successo, quindi la proiezione è *coerente* con la generazione: il difetto è solo l'etichetta.
- **Effetto**: chi legge il codice (anche lo storico-cartografo) è indotto in errore sul datum usato.
- **Rimedio**: rinomina in `miller()` (o `proj()`), in 1 riga + i riferimenti.

---

## Ciò che il motore fa BENE (da non rompere)

- **Topologia controllata**: `npm run map:check` esce pulito — `exclave 0, enclave 0, deserto 0, forma 0, dentro 0, nome 0, oasi 0, rif 0, blocco 0`. Il blocco (`lock/`) e i controlli geometrici funzionano.
- **Popolazioni credibili**: i totali della sonda combaciano coi censimenti che ricordo — USA 50,2 M (censimento 1880: 50,2), GER 45,2 M (1880: 45,2), ITA 28,5 M (1881: 28,4), JAP 36,4 M (1880: ~36,6), AUH 39,4 M, RUS 100,6 M, CHI 375,9 M, EGY 13,1 M. È una qualità da preservare.
- **Confini 1881 puntuali**: Trento/Trieste austriache, Nizza francese, Alsazia tedesca, Sangiaccato di Novi Pazar ottomano, Tessaglia promessa alla Grecia, Bukhara/Khiva protettorati russi, Herat/Kabul afgani, la guerra del Pacifico con le occupazioni cilene (`AMERICAS_OCCUPATIONS`). Tutto verificato dai test.
- **Rotterdam navali e canali**: `sea.zones` (2.916) + canali datati (`Suez` aperto, `Kiel` 1896, `Panama` 1914) con il test New York–San Francisco che aggira Capo Horn finché Panama è chiusa. Esemplare.
- **Desert** con la regola della «terra di nessuno» e la protezione anti-border-gore: il deserto passa solo a chi controlla tutte le terre transitabili attorno dello stesso paese (test Gadames).
- **Fonti dichiarate** nel dato (`sources` in testa all'JSON) e pipeline riproducibile (`scripts/map/`, `lock`, `check-*`): rispetta AGENTS.md.

## Interazioni con gli altri motori

- **Coloniale (00)** e **Economia (03)**: il capo 1 (granularità) si somma al problema delle casse e del peso coloniale; l'amministrazione per provincia penalizza gli imperi.
- **Costruzione (04)**: la corte 04 ha già trovato che rendite/logistica/scelte AI usano la popolazione coloniale *grezza*; qui il dato mappa è corretto, è il motore 04 a pesarlo male.
- **Guerra (01)**: la velocità via ferrovia e le rotte (`sea`) dipendono dalla topologia qui sotto accusa; il capo 4 (isole solo-mare) interessa anche gli sbarchi.

## Segnalazioni per altre corti

- La sonda «popolazioni» è una risorsa: i totali per nazione potrebbero essere ri-esposti in un pannello, oggi manca un riepilogo demografico al giocatore (corte 10).
