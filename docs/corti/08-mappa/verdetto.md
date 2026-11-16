# Corte 08 — Mappa, territorio e scenario iniziale: verdetto

> **Dichiarazione**: atto d'accusa e verdetto sono stati scritti **nella stessa sessione** dallo stesso modello, l'accusa prima e come compito a sé. Per compensare, ogni capo è stato riverificato sul codice o con una sonda della giuria (`sonde/sonda-accusa.mts`, `sonde/sonda2-accusa.mts`) e con `npm run map:check`. Branch `feat/fase2-storia`. Nessuna modifica fuori dalla corte. I confronti coi censimenti vengono **dalla memoria** dei giurati, non da una ricerca: sono ordini di grandezza.

I tre giurati: (1) geografo storico degli atlanti del 1880, (2) demografo storico, (3) ingegnere di dati geografici.

---

## A. La difesa del motore: capo per capo

| capo | esito | verifica della giuria |
|---|---|---|
| 1. Granularità disomogenea (GBR 558 vs GER 115/ITA 60) | **confermato** | Sonda: GBR 558, RUS 457, CHI 280, TUR 212, ma GER 115, ITA 60, COR 29. `economy.ts:74` lega l'amministrazione a `provinces×0.0004` (tetto 0,12): RUS/GBR/CHI/TUR sforano e pagano il massimo, le potenze industriali no. È uno squilibrio reale, ma l'impatto sta in `economy.ts`, quindi è un'interazione con la corte 03. |
| 2. `locate()`/`nearest()` O(4532) | **confermato** | `map.ts`: entrambe iterano `this.provinces` per intero; `locate` filtra col bounding box precalcolato ma non indicizza. `newGame` le chiama per 166 capitali + ~400 opere + occupazioni. Costo di avvio reale ma non il collo di bottiglia del turno. |
| 3. Nomi con «( )» moderni | **confermato** | `map:check` e sonda: `Najran (ovest)`, `Kharj (est)`, `Abu Dhabi (ovest)`, `Nordland (ovest)`, `San Francisco (California)`. I test vietano «( )» solo per l'Eritrea. Regola 8 di AGENTS.md applicata in modo sparso. |
| 4. 80 isole solo-mare senza segnalarlo | **confermato, come mancanza di copertura dei test** | Sonda 2: 80 province abitabili con grado 0, tutte `coast=true`, tutte raggiungibili via `seaRoute` (verificate Hawaii, Zanzibar, Socotra, Pasqua). Non è un errore di raggiungibilità: è la mancanza di un test che garantisca la copertura marittima di ogni isola. |
| 5. 4 oasi con vicini non-deserto | **confermato** | `map:check`: Figuig, Liwa, Najran (ovest), Giabrin. Solo informative (regola 13), non in `check-allow.json`. |
| 6. `laea` che è Miller | **confermato** | `map.ts`: `x=R·lon·π/180, y=R·1.25·ln(tan(π/4+0.4φ))` è la cilindrica di Miller; il nome `laea` e il riferimento alla Lambert azimutale sono fuorvianti, il commento è corretto. Nessun errore funzionale (i test passano). |

---

## B. Ciò che l'accusa non ha visto

### Giurato 1 — geografo storico
1. **Doppia fonte di verità per i canali**: il dato ha `canals` top-level (polilinee di *disegno*, es. il Suez in 5 spezzate) e `sea.canals` (3 record di *instradamento*: Suez, Kiel, Panama). Vanno tenuti sincronizzati a mano; nulla li verifica insieme.
2. **L'etnìa è attribuita via confini moderni**: le `RULES` di `ethnic1881.ts` sono chiavate su codici ISO/moderni (`IT-BZ`, `CN-XJ`, `FR-67`…). Per province i cui confini 1881 divergono dal moderno (Alsazia-Lorena, Kars, Balcani ottomani) la composizione può ereditare l'errore. È dichiarato in un commento, non nel dato.
3. **`hreg`/`hist` esistono ma non sono coperti**: ogni provincia ha `hreg` (regione storica) e `hist`, ma nessun test li usa per verificare i nomi d'epoca; restano metadati morti.

### Giurato 2 — demografo storico
1. **La popolazione coloniale è al lordo e il peso è solo nel motore**: l'India conta ~200 M nel *dato* e viene sgonfiata da `colonialWeight` in `setup.ts`. Un demografo preferirebbe il peso nel dato o un pop-pesato visibile per provincia: oggi il `pop` grezzo inganna (GBR appare 262,9 M).
2. **`fiscal` come occultamento demografico**: il Qing ha `fiscal: 0.15`, cioè la Cina (375,9 M) tassa come ~56 M. È una scelta di design legittima per l'asimmetria, ma nasconde la vera popolazione: andrebbe documentata in una scheda demografica.
3. **Assenza di crescita demografica 1881-1914**: nessun parametro di natalità/mortalità/migrazione. Non è richiesto dallo SPEC, ma un gran-strategia trentennale ne risente (la Russia del 1914 era ~170 M, qui resta ~100).

### Giurato 3 — ingegnere di dati
1. **Nessun indice spaziale ovunque**: oltre a `locate`/`nearest` (capo 2), `assignResources` e `siteLots` rifanno lookup per coordinate; un grid index unico servirebbe a tutti.
2. **`arcSides` e `arcs` delta-codificati senza versioning esplicito**: il `version` top-level c'è, ma non esiste un test che una build fresca riproduca l'identico JSON (solo `lock`/`check-blocco`). Riproducibilità dichiarata, non verificata in CI.
3. **`data-raw/` cresce**: le fonti (Natural Earth, HistoGIS, RISTAT…) stanno in `data-raw/` non committato; manca un manifesto delle versioni/estrazione (URL + data + hash), quindi la ridiscesa dei dati non è riproducibile a posteriori.

---

## C. I voti (1-10)

| | correttezza | fedeltà storica | qualità di gioco | manutenibilità |
|---|---|---|---|---|
| Geografo | 8 | 9 | 7 | 8 |
| Demografo | 8 | 8 | 7 | 7 |
| Ingegnere | 7 | 8 | 7 | 7 |
| **media** | **7,7** | **8,3** | **7,0** | **7,3** |

Motivazioni in una riga: (geografo) «confini e capitali del 1881 ottimi, resta l'etichettatura incoerente»; (demografo) «i totali tengono il confronto coi censimenti, ma il pop è lordo e solo il motore lo pesa»; (ingegnere) «topologia e lock solidi, manca l'indice spaziale e la riproducibilità verificata».

---

## D. Il verdetto della corte

### Da fare subito (errori e incoerenze)
1. **Rinomina `laea` → `miller`** (capo 6, *errore di nome*, basso, 1 riga): il nome attuale induce in errore sul datum. Misura: il nome della funzione riflette la proiezione.
2. **Nomi senza «( )»** (capo 3, *difetto di modello*, basso, piccolo): nomi d'epoca univoci o campo `disambiguator` separato; estendere il divieto dei test a tutto il mondo. Misura: `map:check` non emette più nomi con parentesi.
3. **Registrare le 4 oasi eccezione** (capo 5, *squilibrio*, basso, piccolo): assorbirle/allargarle (regola 13) o elencarle in `check-allow.json`. Misura: l'informativa `[oasi]` è vuota o dichiarata.
4. **Test di copertura marittima delle isole** (capo 4, *mancanza*, basso, piccolo): per ogni provincia abitata con grado 0, verificare la presenza in una zona marittima. Misura: nessuna isola abitata è irraggiungibile.

### Da fare nella fase di bilanciamento
5. **Amministrazione per abitante, non per provincia** (capo 1, *squilibrio*, medio, medio): sostituire `provinces×0.0004` con un costo basato sul pop effettivo, che non penalizzi RUS/GBR/CHI/TUR per il solo taglio. Decidere con la corte 03. Misura: le grandi potenze territoriali non pagano il tetto massimo solo perché la mappa è più fitta altrove.
6. **Indice spaziale unico** (capo 2 + ingegnere 1, *difetto*, media, piccolo): grid o kd-tree per `locate`/`nearest`/`assignResources`. Misura: un lookup non itera 4.532 province, e l'avvio scende.
7. **Peso coloniale nel dato o pop-pesato visibile** (demografo 1, *difetto di modello*, media, medio): rendere esplicito il pop pesato per provincia. Misura: GBR non appare con 262,9 M.
8. **Documentare `fiscal`** (demografo 2, *difetto*, basso, piccolo): scheda demografica con pop lordo vs effettivo. Misura: il giocatore capisce perché la Cina vale meno della sua popolazione.

### Da rimandare o non fare
- **Crescita demografica 1881-1914** (demografo 3): grande, e non richiesta dallo SPEC; rimandare finché non esiste un ciclo economico-demografico.
- **Sincronizzare canali di disegno e di instradamento in un'unica struttura** (geografo 1): utile, ma il rischio attuale è nullo; farlo solo se si tocca di nuovo la pipeline mare.
- **Riproducibilità verificata in CI** (ingegnere 3): `build-map` dura 25 min, non sta in CI; bastano il lock e il manifesto delle fonti.
- **Dissociare l'etnìa dai confini moderni** (geografo 2): cambierebbe fonti e dati; accettare l'approssimazione, ma metterla in un campo `stima` già presente, e dichiararla nel dossier, non in un commento.

### Da non toccare (funziona)
`map:check` pulito (exclave/enclave/forma/blocco a zero); i totali demografici contro i censimenti del 1880-81; i confini del 1881 e le occupazioni della guerra del Pacifico; le rotte navali con i canali datati (Suez aperto, Kiel 1896, Panama 1914) e il test di Capo Horn; il desert con la regola della terra di nessuno e l'anti-border-gore; le fonti dichiarate in testa all'JSON; il lock con `MAP_LOCK=0` confinato alla ricostruzione.

### Interazioni con le altre corti
- **Economia (03)**: capo 1 (amministrazione per provincia) e il peso coloniale sono suoi.
- **Costruzione (04)**: la mappa è il dato corretto; è il motore 04 a trascurare il peso coloniale in rendite/logistica/AI.
- **Guerra (01) / Coloniale (00)**: il capo 4 (isole solo-mare) tocca sbarchi e rotte; la granularità (capo 1) tocca guerre e amministrazione imperiali.
