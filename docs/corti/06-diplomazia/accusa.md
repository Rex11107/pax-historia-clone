# Corte 06 — Diplomazia, alleanze, stati soggetti e rivendicazioni: atto d'accusa

Accusatore: vecchio segretario di legazione del sistema bismarckiano. Branch `feat/fase2-storia`, commit `6e698bb`, 16 novembre 2026.
Imputati letti per intero: `src/engine/diplomacy.ts` (321 righe), `vassals.ts` (284), `claims.ts` (93), `world.ts` (148), `src/scenario/claims1881.ts` (103), i trattati iniziali in `src/scenario/europe1881.ts` (r. 142-174) e `setup.ts`, `tests/diplomazia.test.ts`, `tests/invariants.test.ts`, `src/engine/invariants.ts` (r. 66-91), `docs/SPEC.md` r. 86 e 93. Seguite le chiamate in `combat.ts` (`checkViolation`), `llm/agents.ts`, `llm/gm.ts`, `game.ts`, `peace.ts`.

Sonde (in `docs/corti/06-diplomazia/sonde/`, tutte sotto i 90 s):
- `sonda1-regole.mts` (11 s): chiamata degli alleati, proposte del giocatore, entrata in guerra, soggetti del 1881, e la sola fase dei soggetti su 40 semi per 30 settimane.
- `sonda2-tempo.mts` (35 s): 170 settimane di mondo senza LLM, seme `corte06`.
- `sonda3-rivendicazioni.mts` (1 s): tutte le rivendicazioni al 1° gennaio 1881.

I fatti storici vengono dalla mia memoria, non da una ricerca: vanno presi come tali.

---

## Capi d'accusa

### 1. Senza il modello linguistico la diplomazia non esiste
- **Tipo**: mancanza. **Gravità: critica.**
- **Prova**: `addTreaty` è chiamata solo da `applyProposal` (`diplomacy.ts:252-256`), da `gm.ts:146`, dal commercio (`trade.ts:236`) e dalla pace (`peace.ts:386`). `applyProposal` è raggiunta solo da `agents.ts:113, 129`, cioè dal dialogo con il modello (`game.ts:95`), che senza chiave API si ferma (`client.ts:78`). Nessuna nazione non giocante firma da sola un'alleanza, una garanzia, un patto o un accesso. Sonda 2: 170 settimane, **zero trattati non commerciali nuovi, zero scaduti**; i dieci del 1881 restano identici fino al 1884. Il rapporto 1881-1899 non registra alcuna alleanza in diciannove anni. Nemmeno il giocatore, senza modello, può firmare un trattato.
- **Storia (memoria)**: nel periodo coperto nascono la Lega dei tre imperatori rinnovata (18 giugno 1881), il trattato austro-serbo (giugno 1881), la Triplice Alleanza (20 maggio 1882), l'adesione della Romania (1883), il trattato di contro-assicurazione (1887), gli accordi mediterranei (1887), l'intesa franco-russa (1891-1894).
- **Effetto**: il sistema delle alleanze è congelato al 1881; la Francia resta isolata per sempre, la Triplice non nasce.
- **Rimedio**: una diplomazia minima nel motore (stima, rivali comuni, minaccia) che proponga e accetti trattati; più qualche scadenza storica che obbliga a *proporre*, come per il coloniale.

### 2. L'entrata in guerra su invito ignora alleanze e soggezione e rompe le invarianti
- **Tipo**: errore. **Gravità: alta.**
- **Prova**: `checkProposal` caso `join_war` (`diplomacy.ts:211-218`) non chiama `warBlock`, non controlla `allied(who, against)` né il signore; `applyProposal` (r. 279-288) aggiunge la nazione al lato senza `endSubjection` e senza segnare l'alleanza violata. Sonda 1C: Bukhara, protettorato russo, invitata dalla Persia contro la Russia: nessun veto; dopo, è in guerra con la Russia **e resta suo protettorato**, e `allied(BUK, RUS)` vale ancora vero. La Germania invitata contro l'Austria-Ungheria: nessun veto; dopo, è in guerra con l'Austria e **l'alleanza resta in vigore**. Entrambe le situazioni sono esattamente quelle che `invariants.ts:81` e `:89` dichiarano violazioni.
- **Effetto**: unità che si attraversano e si riforniscono fra nemici (`canEnter` usa `allied`), tributi pagati al nemico.
- **Rimedio**: in `checkProposal` lo stesso `warBlock` di `declareWar`, rifiuto se alleati o soggetti del nemico; in alternativa `applyProposal` rompe l'alleanza e il legame come fa `declareWar` r. 35-41.

### 3. Ogni alleanza vale contro chiunque: non esiste il casus foederis
- **Tipo**: difetto di modello. **Gravità: alta.**
- **Prova**: `declareWar` r. 44-52: chiunque attacchi una parte trascina l'altra, senza condizioni sul nemico. Sonda 1A: l'Italia attacca l'Austria-Ungheria → entra la Germania; la Francia attacca la Germania → entra l'Austria-Ungheria. Lo stesso accade nella sonda 2 della corte 07 (guerra Francia-Germania con l'Austria a fianco della Germania).
- **Storia (memoria)**: la Duplice del 1879 obbligava all'aiuto reciproco solo contro un attacco russo; contro un altro aggressore bastava la neutralità benevola, salvo che la Russia lo sostenesse. La Triplice stessa distingueva l'attacco francese all'Italia o alla Germania.
- **Effetto**: le guerre si allargano sempre; la Duplice si comporta come un'alleanza generale; il giocatore non può isolare un nemico.
- **Rimedio**: un campo `against?: Tag[]` nel trattato; senza quel campo, alleanza generale come oggi.

### 4. La situazione del 1° gennaio 1881 è incompleta
- **Tipo**: difetto di modello (dati). **Gravità: media.**
- **Prova**: `INITIAL_TREATIES` (`europe1881.ts:142-152`) e `vassals.ts:35-94`. Memoria:
  - garanzia del Belgio del 1839: garanti Regno Unito, Francia, Prussia, **Austria e Russia**; qui mancano gli ultimi due;
  - mancano la neutralità garantita del Lussemburgo (Londra 1867) e della Svizzera (1815);
  - il patto di non aggressione Germania-Russia sta al posto della Lega dei tre imperatori, ormai lettera morta nel 1881; ma senza l'Austria-Russia e senza il rinnovo di giugno 1881 (capo 1);
  - mancano la Convenzione di Cipro del 1878 (alleanza difensiva britannica per l'Asia ottomana contro la Russia) e l'alleanza anglo-portoghese;
  - l'Afghanistan (`AFG`) è indipendente, mentre dopo Gandamak (1879) la sua politica estera era britannica;
  - Bosnia ed Erzegovina (Sarajevo, Mostar) e Cipro (Nicosia) appartengono di pieno diritto all'Austria e al Regno Unito; la sovranità ottomana sopravvive solo come rivendicazione storica (`claims1881.ts:86, 89`). Il modello ha un solo signore per Stato (`setSubject` r. 103-107): quando il Regno Unito prende l'Egitto, la Porta perde ogni legame (rapporto 1881-1899: «Chedivato d'Egitto (vassallo di Regno Unito)»), mentre l'Egitto restò formalmente ottomano fino al 1914.
- **Effetto**: Belgio e Stretti meno protetti del vero; Russia e Impero ottomano senza il contrappeso britannico in Asia.
- **Rimedio**: completare la tabella (6 righe); a lungo termine, distinguere sovranità nominale e controllo effettivo.

### 5. Canada, Corea e Maldive si ribellano nelle prime settimane
- **Tipo**: squilibrio. **Gravità: alta.**
- **Prova**: soggetti iniziali con desiderio ≥ 80, quindi liberi di proclamare l'indipendenza dalla prima settimana con il 6% di probabilità (`vassals.ts:276`): Canada 90 (obiettivo 31), Corea 85, Maldive 85, Kongo, Kuwait, Tibet, Terengganu 80 (sonda 1D). Sonda 1E, la sola fase dei soggetti su 40 semi per 30 settimane: **11 proclamazioni** (Canada 6, Maldive 3, Corea 2), **tutte finite in guerra** col signore. Nella sonda 2 della corte 07 il Canada dichiara l'indipendenza il 15 gennaio 1881 e alla fine il Regno Unito gli paga 939 milioni. Il rapporto 1881-1899 (seme `regnum`) non ne ha: dipende dal seme.
- **Effetto**: una guerra d'indipendenza canadese o coreana nel 1881 a seconda del seme; il Regno Unito impegnato per mesi.
- **Rimedio**: desiderio iniziale sotto la soglia per tutti, o soglia d'indipendenza legata anche all'obiettivo (proclamare solo se anche l'obiettivo è ≥ 75).

### 6. La forza di un soggetto si misura sull'esercito mondiale del signore
- **Tipo**: difetto di modello. **Gravità: media.**
- **Prova**: `army()` (r. 116) somma tutte le unità della nazione, ovunque. `declareIndependence` r. 231 accetta l'indipendenza se l'esercito totale del signore è meno di 1,5 volte quello del soggetto; `libertyTarget` r. 123-124 usa lo stesso rapporto. Sonda 2: 24 marzo 1883, «Regno del Congo proclama l'indipendenza; Regno del Portogallo, troppo debole, la accetta». Il Regno Unito ha 115.500 uomini in tutto il mondo per i suoi 55 soggetti.
- **Effetto**: piccole potenze coloniali perdono i soggetti senza combattere; il Regno Unito sembra debole ovunque.
- **Rimedio**: confrontare le forze entro pochi passi dal soggetto, più la marina per i soggetti d'oltremare.

### 7. Le proposte hanno freni minimi: si può essere alleati di tutti
- **Tipo**: difetto di modello (sfruttabile). **Gravità: media.**
- **Prova**: `plausibility` (`agents.ts:42-55`): l'alleanza è rifiutata solo con stima < −10; garanzia solo con stima < 0; patto di non aggressione, accesso militare e commercio senza alcuna condizione; nessun controllo di compatibilità con le alleanze esistenti o con i rivali del partner (`checkProposal` r. 189-196). Sonda 1B: l'Italia ottiene, senza veti del codice, alleanze con **Francia, Germania, Russia e Regno Unito insieme**, e garanzie da Regno Unito, Russia e Impero ottomano. I sussidi non hanno attesa fra un accordo e l'altro: il freno è solo il 30% delle casse (r. 51), che con le casse gonfiate (Regno Unito 57.849 milioni nel 1899) non frena più. Tutto dipende dal fatto che il modello dica sì.
- **Effetto**: il giocatore con il modello attivo si circonda di garanti e alleati incompatibili; nessuna coerenza di blocchi.
- **Rimedio**: vietare un'alleanza con chi è alleato di un rivale del proponente o in guerra con un suo alleato; soglie di stima per accesso e garanzia; un sussidio all'anno per coppia.

### 8. Garanzie e alleanze si violano senza conseguenze proporzionate
- **Tipo**: errore. **Gravità: media.**
- **Prova**: `declareWar` segna violati solo il patto di non aggressione (r. 40-41, −15 da tutti) e l'alleanza (r. 36-39, ma con il −4 comune). La garanzia del dichiarante resta in vigore: sonda 1A, la Germania attacca il Belgio che essa stessa garantisce: garanzia ancora valida, stima di un terzo 0 → −4, come per qualunque guerra. La violazione arriva solo al primo combattimento (`combat.ts:158-164`, −12 da tutti), e non arriva se il garante non combatte.
- **Storia (memoria)**: il «pezzo di carta» del 1914 costò alla Germania l'entrata in guerra britannica.
- **Rimedio**: in `declareWar` violare anche la garanzia propria verso la vittima, con la stessa pena del patto.

### 9. Le rivendicazioni sono inerti, e in parte sbagliate
- **Tipo**: difetto di modello ed errore di dati. **Gravità: media.**
- **Prova**: `claimOf`/`claimsOn` sono usate solo da `peace.ts` (costo e scelta delle cessioni), dall'interfaccia e dal contesto del modello (grep). Nessuna stima, nessuna crisi, nessuna guerra nasce da una rivendicazione; e le nazioni non giocanti non dichiarano guerre fra Stati (problema noto). Sonda 3, 1574 rivendicazioni su 1021 province:
  - i **soggetti rivendicano il territorio del proprio signore**: Rewa 57 province dell'India britannica, Bhopal 33, Baroda 28, Hyderabad 24 (tutti protettorati britannici); Tunisi e Kuwait (tributari ottomani) sulla Libia e su Bassora; e la Porta ha una rivendicazione storica sulla Bulgaria, suo tributario;
  - la Danimarca ha una rivendicazione **storica su Amburgo e Lubecca** «Schleswig, perso nel 1864» (`claims1881.ts:96`, `iso DE-SH`): le due città libere non furono mai danesi;
  - lo Zululand ha una rivendicazione di nucleo su Port Elizabeth, Graaff-Reinet e Colesberg (Colonia del Capo), il Regno Unito su Taupo nella Nuova Zelanda maori «maggioranza inglesi 55%»: dati etnici sospetti;
  - il commento di r. 11 («Impero ottomano: i deserti…») sta sopra le rivendicazioni americane; quella ottomana è a r. 39.
- **Effetto**: al tavolo della pace un protettorato indiano in coalizione paga 0,6 per le terre del proprio signore; il revanscismo non produce politica.
- **Rimedio**: escludere le rivendicazioni di un soggetto verso il signore e viceversa; correggere `DE-SH` con i nomi; far pesare le rivendicazioni sulla stima (−) e sulla scelta degli alleati.

### 10. La stima non ha memoria né ritorno
- **Tipo**: difetto di modello. **Gravità: bassa.**
- **Prova**: `changeOpinion` (`world.ts`) somma e taglia a ±100; nessuna fase la riporta verso un valore di base. Ogni guerra costa −4 di stima da *tutte* le nazioni (r. 60): la Francia del rapporto, con sette guerre coloniali in diciannove anni, accumula −28 presso ogni Stato del mondo, compresi quelli che non sanno dov'è il Uassulu (calcolo dal codice, non misurato). Nella sonda 2 la stima si muove (15 coppie su 56 di almeno 8 punti, per commercio, ricerca e colonie), ma solo in una direzione per evento.
- **Rimedio**: un ritorno lento verso la base del 1881 (o verso rivali e amici del profilo) e la pena di guerra limitata ai vicini e alle potenze interessate.

### 11. I meccanismi di annessione e di stretta non scattano mai per le nazioni non giocanti
- **Tipo**: squilibrio. **Gravità: bassa.**
- **Prova**: l'annessione del protettorato e la stretta del legame richiedono desiderio sotto 20 (`vassals.ts:174, 202, 278-279`); sonda 1D: **nessun legame iniziale ha l'obiettivo sotto 20**. Il rapporto 1881-1899: 55 legami all'inizio, 68 alla fine, nessuna annessione né stretta, due soli legami finiti (Egitto e Tunisi, per eventi coloniali).
- **Rimedio**: tarare l'obiettivo (truppe e investimenti pesano poco: massimo −15 e −20) o accettarlo e dirlo nella SPEC.

### 12. I test non coprono le regole che contano
- **Tipo**: mancanza. **Gravità: bassa.**
- **Prova**: `tests/diplomazia.test.ts` ha 3 casi (microstati, cessioni, un tributario e un protettorato); nessuno su chiamata degli alleati, garanzie, `join_war`, proclamazione d'indipendenza, rivendicazioni. `tests/invariants.test.ts` controlla le guerre a caso ma non passa mai da `applyProposal`: per questo il capo 2 non è stato visto.
- **Rimedio**: un test per ciascuno dei capi 2, 3, 5, 8.

---

## Ciò che il motore fa bene (da non rompere)

- `setSubject` unico punto di nascita dei legami, senza catene circolari; `bury` unico punto di uscita di una nazione scomparsa (trattati, legami, contratti, cantieri, indennità).
- Le invarianti (`invariants.ts:78-91`) dicono la cosa giusta: proprio per questo il capo 2 si vede.
- `libertyTarget` restituisce le voci una per una: l'interfaccia mostra il perché del desiderio d'indipendenza.
- Tre livelli di soggezione chiari, tributo nel bilancio (`tributeOf`), soglia del 75% oltre la quale il tributo non arriva (la Bulgaria, 78, non paga: per quanto ricordo, la Bulgaria il tributo fissato a Berlino non lo versò mai).
- Protettorato come alleato per il passaggio delle truppe (`allied`), `warBlock` per vassalli e protettorati in `declareWar`.
- Rivendicazioni di nucleo dalle etnie con il limite di quattro passi; revanscismo delle province perse (`recordLoss`, storiche per vent'anni poi pretese).
- Determinismo: `rand(seed, 'vassallo', …)` per le scelte dei soggetti.

## Interazioni con altri motori

- **Coloniale**: i trattati di protettorato coloniali passano da `setSubject` e spostano la vecchia sovranità con −20 (`colonial.ts:365`); le rivendicazioni coloniali entrano in `claimsOn` come pretese. Il modello "un solo signore" fa perdere alla Porta l'Egitto e Tunisi per intero (capo 4). La debolezza misurata sull'esercito mondiale (capo 6) libera il Kongo dal Portogallo.
- **Pace**: le rivendicazioni decidono costi e scelte delle cessioni (capo 9); il vassallaggio imposto in pace non dà il −20 al vecchio signore (vedi verdetto della corte 07).
- **LLM**: tutta la diplomazia passa dal modello (capo 1), e i freni del codice sono deboli (capo 7). Il Game Master firma trattati fra non giocanti solo con stima reciproca ≥ 15 (`gm.ts:146`).
- **IA e guerra**: le nazioni non giocanti non dichiarano guerre fra Stati, quindi alleanze e rivendicazioni restano senza prova; `allied` decide il passaggio delle truppe (`canEnter`), per questo il capo 2 tocca anche i rifornimenti.
- **Economia**: tributi e sussidi passano dal bilancio; i sussidi diventano illimitati con le casse gonfiate (capo 7).
