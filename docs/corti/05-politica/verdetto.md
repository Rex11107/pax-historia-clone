# Corte 05 — Politica interna: regimi, governi, elezioni, ministri, nazionalità: verdetto

> **Nota sulla procedura**: l'atto d'accusa era già nel repository (commit `2f9bcf7`), scritto in un'altra sessione; questa giuria non l'ha scritto. L'accusa cita sonde e output (`sonda1.out`, `sonda2.out`, `sonda3.out`) che **non sono nella cartella**: la giuria non ha potuto rileggerli e ha rifatto le misure con due sonde proprie (`sonde/giuria1-puntuale.mts`, 2 s; `sonde/giuria2-diciannove-anni.mts`, 1 s). La seconda riproduce esattamente la sonda 3 dell'accusa: 427 eventi `crisis`, 316 aperture, 232 cambi di governo.

Branch `feat/fase2-storia`, commit `1b060bc`. Riletti dalla giuria: `src/engine/politics.ts` (339 righe), `ministers.ts` (169), `ethnic.ts` (84), `src/scenario/politics1881.ts` (le voci di regime e il ripiego, r. 1-45, 200-242), le schede di `ministers1881.ts` citate, `economy.ts` r. 1-120, `tests/politica.test.ts`. I fatti storici dei giurati vengono dalla memoria, non da una ricerca.

---

## A. La difesa del motore: capo per capo

| capo | esito | verifica della giuria |
|---|---|---|
| 1. La stabilità non tocca casse, leva, ordine | **confermato** | Sonda 1: Italia con stabilità 80 e 15: entrate 31,83, leva 1992, saldo 1,58 identici; Russia 108,29 / 7116 / 14,21 identici. `grep` di `.stability` nel motore: solo `stabilityTarget`, la soglia delle imposte (`economy.ts:185`), ricerca, colonie, pace, soggetti e la politica stessa. |
| 2. I morti governano | **confermato** | `setGov` r. 197-199 sceglie da `leaders` senza anni; `headMinister` (`ministers.ts:55-58`) cerca per nome senza `years`. Sonda 1: Gambetta capo nel giugno 1885 → scheda trovata (anni 1881-1882), fiducia dai ministri **−4** (l'accusa diceva −3: il resto viene dagli altri ministri). Bismarck nel 1899: +5. Sonda 2: al 30 dicembre 1899 Cairoli, Ferry, Gladstone, Bismarck, Taaffe, Loris-Melikov, Said, Cánovas, Braamcamp, Posse, Piroćanac e il «Presidente Hayes (Garfield eletto…)» sono ancora capi, tutti **uguali al 1881**. |
| 3. Costituzionali e autocrazie bloccate | **confermato** | Le sei monarchie costituzionali hanno tutte `crown: true` (`politics1881.ts` r. 72-201). `defaultOption` r. 245: con la Corona la scelta è `decree` (fiducia < 25 o voto recente) o `dissolve`, e `holdElection` r. 221-227 cambia governo solo nei regimi parlamentari. Sonda 1: quattro crisi di fila a fiducia 10 per Svezia, Serbia, Danimarca, Austria-Ungheria, Bulgaria, Germania → quattro decreti, governo identico. Sonda 2: 111 aperture di crisi, **0 cambi**; 127 autocrazie, **0 crisi**: la Russia a stabilità 0 ha fiducia 37 (soglia di rischio 35), l'Impero ottomano 45. |
| 4. Il voto si avvita | **confermato** | `holdElection` r. 215 `p.pop = p.seats`. Sonda 1, Spagna (managed 25): consenso 40 al governo e 50 ai fusionisti → **53,9% ai conservatori**, e il consenso diventa 53,9. L'accusa misurava 51,7: la differenza è il dado di r. 211. La critica storica (il turno: prima cambiava il governo, poi si votava) è giusta. |
| 5. Ripiego generico | **confermato** | Sonda 1: 17 nazioni col ripiego parlamentare, **tutte al voto lo stesso giorno** (giorno 881, 1° giugno 1883); Stati Uniti `parliamentary`, rischio di crisi 6% a settimana con fiducia 45, capo e partiti come descritti. Sonda 2: Bolivia 23 governi, Colombia 17, Messico 16, Haiti 16. |
| 6. Mancano eventi e capo dello Stato | **confermato** | Nessun evento per il 13 marzo 1881; `crown` è un booleano (`PoliticsSeed`). |
| 7. Nazionalità inerti, colonie del Belgio | **confermato** | Sonda 1: quota estranea iniziale Austria-Ungheria 0,56, Regno Unito 0,88, effetto 0 per tutti (`ethnicStability` misura solo lo scarto dal 1881). Belgio con 20 province del bacino del Congo (8,9 M abitanti, peso fiscale 0,08): quota 0,62, effetto **−8** (il tetto), stabilità obiettivo 55,6. |
| 8. Il rapporto conta male le crisi | **confermato** | `resolveCrisis` r. 261-263, 278 e `callElection` r. 337 emettono `crisis`. Sonda 2: Danimarca 34 aperture e 68 eventi, Serbia 29/58, Germania 23/46, Svezia 20/40. Sulla Francia "credibile" la giuria è più severa (vedi storico 1.1). |
| 9. Elezioni senza tendenze | **confermato in parte** | Il meccanismo è come descritto (r. 160-173: seggi passati, umore ±4, estremi solo con instabilità). I risultati francesi e tedeschi del 1881 citati vengono dalla sonda 1 dell'accusa, che non è nel repository: **non verificati** dalla giuria. |
| 10. Ministri fino al 1890 | **confermato in parte** | Il vincolo di anni c'è e funziona (`eligible`), quindi i "funzionari" sono la conseguenza corretta di un catalogo corto. Il vuoto al 1899 non è stato rimisurato dalla giuria. |
| 11. Parlamenti composti | **confermato** | `politics1881.ts:162` (Venstre norvegese nel Riksdag), `:89` (Indipendentisti magiari nel Reichsrat). |
| 12. Stanchezza fissa | **confermato** | `economy.ts:114`: +0,3 a settimana per qualunque guerra. |
| 13. Rami morti, test deboli | **confermato** | Sonda 1: opzioni dell'Italia (Corona) e della Francia (repubblica) identiche; `tests/politica.test.ts` non controlla capi vivi né cambi nei regimi costituzionali. |

L'accusa regge quasi per intero. La giuria corregge due dettagli (il −4 di Gambetta, il 53,9% spagnolo) e non può confermare i numeri che venivano dalle sonde mancanti.

---

## B. Ciò che l'accusa non ha visto

### Giurato 1 — storico costituzionale comparato
1. **La frequenza dei governi è sbagliata nei due sensi, anche dove l'accusa la trova "credibile".** Sonda 2 (sola politica, 19 anni): Paesi Bassi **18 governi**, Belgio 10, Francia **6**, Regno Unito 4. Per quanto ricordo, fra il 1881 e il 1899 i Paesi Bassi ebbero sei o sette gabinetti e il Belgio cinque (Beernaert da solo dal 1884 al 1894), mentre la Francia ebbe una ventina di ministeri e il Regno Unito sette cambi a Downing Street. Il motore produce instabilità dove la legislatura è breve (`term: 2` per Paesi Bassi e Belgio: un voto ogni due anni, ogni voto riscrive i seggi) e stabilità dove la storia era convulsa. La Francia dell'accusa (12 governi in 5,5 anni) era vivace solo per le guerre coloniali (capo 12).
2. **Il suffragio non esiste.** Le grandi riforme del periodo (Italia 1882, dal 2% a circa il 7% della popolazione; Regno Unito 1884-85; suffragio universale maschile in Belgio con voto plurimo nel 1893) non hanno dove agire: i partiti non hanno una base sociale e il corpo elettorale non ha una dimensione. Il primo voto italiano del motore (ottobre 1882) è quello della riforma, e non lo sa.
3. **Una legislatura sciolta riparte da capo.** `holdElection` r. 216 fissa il voto successivo a `term` anni dopo qualunque elezione, anche anticipata; con `term: 2` e scioglimenti frequenti il calendario storico (date di `politics1881.ts`) si perde dopo la prima crisi. È voluto per i regimi parlamentari, ma il Reichstag e lo Storting avevano scadenze fisse.

### Giurato 2 — studioso delle nazionalità
1. **Perdere popoli altrui rende più stabili.** `ethnicStability` r. 82: `min(3, −d × 40)`: se la quota estranea scende, la stabilità sale fino a +3. L'Austria-Ungheria che perde la Croazia in una pace (corte 07) guadagna stabilità; la sconfitta nazionale diventa un sollievo. Nella realtà, per quanto ricordo, le perdite territoriali (Lombardia 1859, Veneto 1866 per l'Austria) furono crisi di regime.
2. **I partiti nazionali non crescono per le loro terre.** I partiti `minoranze` crescono solo con l'instabilità generale (`EXTREME`, r. 168: `max(0, 50 − stabilità) × 0,15`), come radicali e socialisti; nulla lega il consenso degli irlandesi all'Irlanda, dei cechi alla Boemia, alla censura o alla leva. Con la stabilità alta delle potenze (Germania 81-84 secondo l'accusa) il Home Rule e i partiti polacchi restano fermi per vent'anni.
3. **Il modello etnico e quello dei partiti si contraddicono.** `STATE_PEOPLES.AUH.own` contiene solo tedeschi e magiari (`ethnic1881.ts:89`): polacchi e cechi sono estranei "a peso 1", ma il governo Taaffe del 1881 (l'"anello di ferro", `politics1881.ts` r. 84-92) li aveva in maggioranza. La Galizia autonoma e leale di Vienna pesa come la Polonia russa: la nazionalità è un attributo dello Stato, non del rapporto fra un popolo e il suo governo.

### Giurato 3 — progettista di sistemi narrativi
1. **Le scelte di crisi hanno una risposta dominante.** Poiché la stabilità non costa nulla (capo 1), «restare in carica» (−4 di stabilità, +3 di slancio, `resolveCrisis` r. 262) e il «decreto» (sei mesi senza crisi, r. 263) battono sempre le altre opzioni per chi vuole solo continuare a giocare. Una scelta che non costa non è una scelta.
2. **La politica non sente il motore.** `concludePeace` e gli eventi coloniali non toccano fiducia né consenso (nessun riferimento a `politicsOf` in `peace.ts`; in `colonial.ts` solo la decisione delle ambizioni). Per quanto ricordo, Ferry cadde nel marzo 1885 per Lang Son e Crispi nel marzo 1896 per Adua: le due crisi più "narrative" del periodo nascono proprio da una notizia dal fronte. Nel motore una pace umiliante non fa cadere nessuno.
3. **Il cambiamento viene dal dado, non dalle cause.** Fuori dalle guerre, l'unico motore del consenso sono l'umore stagionale (±4, r. 167) e il logoramento (3 punti l'anno, r. 165). Sonda 2: la Francia, senza guerre, ha sei governi in diciannove anni che ruotano fra tre nomi (Gambetta, Freycinet, Ferry), di cui uno morto. Per il giocatore il registro dice *che cosa* è successo, mai *perché*.

---

## C. Voti dei giurati (1-10)

| | correttezza | fedeltà storica | qualità di gioco | manutenibilità | media |
|---|---|---|---|---|---|
| Storico costituzionale | 4 — capi morti, rami morti, conteggi doppi | 4 — gennaio 1881 esatto, poi il mondo si ferma o gira a vuoto | 4 | 6 — codice leggibile, dati ben commentati | **4,5** |
| Studioso delle nazionalità | 5 | 3 — le nazionalità contano solo se conquistate, e al contrario se perse | 4 | 6 — `ethnic.ts` piccolo e chiaro, ottima base dati | **4,5** |
| Progettista narrativo | 5 — il rischio graduale è solido | 4 | 3 — scelte senza costo, cause invisibili | 6 | **4,5** |
| **media per criterio** | **4,7** | **3,7** | **3,7** | **6,0** | **4,5** |

---

## D. Il verdetto della corte

### Da fare subito (errori e cose che rovinano il gioco)
1. **Capi vivi** (capo 2). Errore, alta. Anni per ogni capo in `leaders` (o lettura delle schede di `ministers1881.ts`), filtro in `setGov` e in `headMinister` con le regole di `eligible`, ripiego «un notabile del partito» a lista vuota. *Piccolo.* Misura: sonda 2 della giuria, «nomine di capi oltre gli anni della loro scheda: 0» e nessun capo del 1881 ancora in carica nel 1899 dove la storia lo esclude; test.
2. **La stabilità deve contare** (capo 1, progettista 3.1). Difetto di modello, critica. Entrate e leva × (0,85 + 0,2 × stabilità/100), e sotto 30 disordini con un costo (entrate −5%, rischio di crisi raddoppiato). *Piccolo-medio.* Misura: sonda 1 della giuria, entrate dell'Italia diverse fra stabilità 80 e 15.
3. **Monarchie costituzionali e autocrazie sbloccate** (capo 3). Errore, alta. Dopo un decreto, alla crisi successiva la Corona sceglie `concede`; nelle autocrazie peso della stabilità ≥ 0,5 e crisi possibile. *Piccolo.* Misura: sonda 2, cambi di governo > 0 nei regimi costituzionali e almeno una crisi in Russia in 19 anni; sonda 1, le quattro crisi di fila non danno quattro decreti.
4. **Il consenso non diventa seggi** (capo 4). Difetto, alta. In `holdElection` lasciare `pop` com'era (al più avvicinarlo ai seggi di una frazione). *Piccolo.* Misura: la sonda 1 della Spagna lascia ai fusionisti un consenso di 50 dopo il voto; in 19 anni almeno un'alternanza in Spagna e in Italia.
5. **Ripiego presidenziale e date sfalsate** (capo 5). Errore, alta. Regime `presidential` (mandato fisso, nessuna crisi di fiducia, data storica per gli Stati Uniti), date di ripiego sfalsate con `rand(seme, tag)`, nessun segnaposto come nome di capo. *Medio.* Misura: sonda 1, nessuna data con più di tre nazioni al voto; gli Stati Uniti senza crisi di fiducia.
6. **Conteggio delle crisi** (capo 8). Errore di misura, media. Tipo `crisis_open` per l'apertura e `crisis_end` per gli esiti; il rapporto conta le aperture. *Piccolo.* Misura: sonda 2, eventi di apertura = aperture.
7. **Ramo morto di `crisisOptions`** (capo 13). Errore, bassa. Una Corona parlamentare può nominare un governo (`concede`). *Piccolo.* Misura: le opzioni dell'Italia differiscono da quelle della Francia; test.
8. **Colonie pesate come nel bilancio** (capo 7, prima parte). Squilibrio, media. `colonialWeight` anche in `foreignShare`. *Piccolo.* Misura: il Belgio con il Congo della sonda 1 scende di meno di 2 punti.

### Da fare nella fase di bilanciamento
9. **Stanchezza in proporzione alla guerra** (capo 12): la quota fissa ×0,2 contro uno Stato minore. *Piccolo.*
10. **Frequenza dei governi tarata su una tabella storica** (capo 8, storico 1.1): Paesi Bassi e Belgio meno instabili, Francia più instabile; la legislatura di due anni dei Paesi Bassi non deve rifare i seggi da capo. *Piccolo* (dati). Misura: sonda 2 entro ±50% dei governi storici per le 8 grandi.
11. **La politica sente pace e colonie** (progettista 3.2): una pace con costo per noi o un obiettivo coloniale perso tolgono fiducia al governo. *Piccolo.*
12. **Ancoraggi elettorali 1881-82 e tendenze strutturali** (capo 9, storico 1.2): partiti operai legati all'industria, ancoraggi per le prime elezioni. *Medio.*
13. **Nazionalità** (capo 7 seconda parte, studioso 2.1-2.3): togliere il bonus per le perdite; tensione per popolo e regione che fa crescere i partiti nazionali; foreignness per rapporto popolo-Stato (polacchi in Austria 0,5). *Medio.*
14. **Ministri fino al 1900** (capo 10) e **parlamenti composti** (capo 11). *Piccolo-medio*, soprattutto dati.

### Da rimandare o non fare
- **Sovrani con anni e successioni, eventi politici storici** (capo 6: Alessandro II, Garfield, Home Rule, Boulanger, 1888, 1890): utilissimi ma grandi; vanno fatti con lo stesso meccanismo delle "situazioni" coloniali dopo le voci 1-5, altrimenti agiscono su un motore che non reagisce. Un'eccezione economica: l'assassinio di Alessandro II e il cambio di linea di maggio 1881 come prima situazione di prova.
- **Suffragio e base sociale dei partiti** (storico 1.2): dopo la voce 12.
- **Calendari fissi per le Camere non scioglibili** (storico 1.3): solo se serve dopo la voce 10.

### Da non toccare (funziona)
Il rischio di crisi graduale e deterministico (`crisisChance`); le opzioni di crisi per regime con una settimana per scegliere; i dati del 1° gennaio 1881 (capi, gabinetti, date elettorali, seggi); `eligible` con partito e anni; `policyMood` (censura, imposte, mobilitazione); il modello linguistico che vede la politica ma non la scrive; la base etnica per provincia.

### Interazioni da segnalare alle altre corti
- **Economia (03)**: la voce 2 dà alla stabilità un peso nel bilancio; con le casse gonfiate i deficit spariscono e con loro una causa di logoramento.
- **Pace (07)** e **coloniale (00)**: la voce 11 lega la politica agli esiti delle paci; la corte 07 ha mostrato liberazioni (Croazia) che oggi premiano lo sconfitto (studioso 2.1).
- **Ricerca, diplomazia, soggetti**: le soglie di stabilità (30, 20, debolezza del signore) cambieranno peso con la voce 2.
