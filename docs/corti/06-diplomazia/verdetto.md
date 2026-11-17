# Corte 06 — Diplomazia, alleanze, stati soggetti e rivendicazioni: verdetto

> **Dichiarazione**: atto d'accusa e verdetto sono stati scritti **nella stessa sessione** dallo stesso modello (Claude Opus 5.5), l'accusa prima e come compito a sé. Per compensare, ogni capo è stato riverificato sul codice o con una sonda nuova della giuria (`sonde/giuria1-verifiche.mts`, 3 s, seme `giuria06`), e dove la verifica ha dato un risultato diverso il capo è ridimensionato.

Branch `feat/fase2-storia`, commit `6e698bb`. Riletti dalla giuria: `diplomacy.ts`, `vassals.ts`, `claims.ts`, `world.ts`, `claims1881.ts`, `europe1881.ts` r. 142-174, `setup.ts` r. 50-60, `tests/diplomazia.test.ts` (3 test), `tests/invariants.test.ts`, `invariants.ts` r. 66-91, `agents.ts` r. 12-131. I fatti storici dei giurati vengono dalla memoria, non da una ricerca.

---

## A. La difesa del motore: capo per capo

| capo | esito | verifica della giuria |
|---|---|---|
| 1. Senza modello niente diplomazia | **confermato in parte** | Il fatto è vero: nessuna funzione del motore crea un'alleanza, una garanzia o un patto per conto di una nazione non giocante (`addTreaty` chiamata da `applyProposal`, `gm.ts:146`, commercio, pace). Ma il brief dichiara che la diplomazia è affidata al livello LLM: è una scelta, non una dimenticanza. Con il modello attivo il Game Master firma trattati fra non giocanti (stima reciproca ≥ 15). Gravità ridotta da critica ad **alta**: chi gioca senza chiave ha un mondo diplomaticamente fermo, e nessuno ha previsto le alleanze storiche dopo il 1881. |
| 2. `join_war` contro alleati e signori | **confermato** | `diplomacy.ts:211-218` senza `warBlock` né `allied`; `applyProposal` r. 279-288 senza `endSubjection`. Le due situazioni prodotte sono quelle vietate da `invariants.ts:81` e `:89`. Serve che il modello accetti e che la stima sia ≥ 25 (`agents.ts:50`): nella sonda è stata alzata a mano, ma il codice non oppone nulla. |
| 3. Nessun casus foederis | **confermato, gravità media** | `declareWar` r. 44-52. La gravità scende: le nazioni non giocanti non dichiarano guerre fra Stati, quindi l'effetto tocca quasi solo il giocatore; e per l'Italia il caso diventerà storicamente giusto con la Triplice (1882). Resta sbagliato per Francia-Germania (l'Austria non era tenuta). |
| 4. Situazione del 1881 incompleta | **confermato** | Tabella a `europe1881.ts:142-152`: tre garanti del Belgio su cinque, nessuna garanzia per Lussemburgo e Svizzera, nessuna Convenzione di Cipro, Afghanistan indipendente (sonda: `AFG` senza signore). La giuria aggiunge sotto le unioni personali. |
| 5. Canada, Corea, Maldive in rivolta | **confermato** | Sonda 1E dell'accusa riletta: la fase dei soggetti girava da sola, con eserciti fermi, ma la finestra è la stessa del gioco vero (il desiderio scende sotto 80 in 2-3 settimane, `vassals.ts:273`). Circa il 15% delle partite ha una guerra d'indipendenza canadese all'inizio (6 semi su 40). |
| 6. Forza sull'esercito mondiale | **confermato** | `army()` r. 116, usata a r. 123 e 231; evento del Kongo nella sonda 2. |
| 7. Freni minimi alle proposte | **confermato in parte** | Le alleanze incompatibili sono confermate (sonda 1B). La parte sui sussidi chiesti alle nazioni non giocanti era una deduzione: all'inizio il 30% delle casse li blocca (0 accordi nella sonda). La giuria trova però il verso opposto, peggiore: vedi giocatore 3.1. |
| 8. Garanzie violate senza pena | **confermato** | Sonda 1A: la Germania attacca il Belgio e la sua garanzia resta in vigore; la pena arriva solo al primo combattimento (`combat.ts:158-164`). |
| 9. Rivendicazioni inerti e in parte sbagliate | **confermato in parte** | Inerzia e rivendicazioni dei soggetti sul signore: confermate (sonda 3). Su Amburgo e Lubecca l'accusa esagera: la sonda della giuria mostra che `DE-SH` copre tre province grandi (Amburgo 949 mila abitanti, Lubecca 424 mila, Schleswig 225 mila), che comprendono l'Holstein, ducato del re di Danimarca fino al 1864. L'errore è nella ragione («Schleswig») e nell'inclusione delle due città libere, non nella pretesa in sé. Gravità bassa per questo punto. |
| 10. Stima senza ritorno | **confermato** | Nessuna fase riporta la stima verso una base; il −28 della Francia è calcolato, non misurato, come dichiarato. |
| 11. Annessione e stretta mai usate | **confermato** | Sonda 1D: nessun obiettivo sotto 20; rapporto: nessuna annessione in diciannove anni. |
| 12. Test scarsi | **confermato** | Tre casi; nessun test passa da `applyProposal` con `join_war`. |

---

## B. Ciò che l'accusa non ha visto

### Giurato 1 — storico della diplomazia bismarckiana
1. **Le alleanze sono eterne.** `applyProposal` caso `alliance` (r. 252) passa `null` come durata e ignora `p.years`; le iniziali hanno `endDay: null` (`setup.ts:57`). Sonda della giuria: un'alleanza chiesta per 5 anni non scade mai. Per quanto ricordo, la Duplice era di cinque anni rinnovabili, la Triplice di cinque, la contro-assicurazione di tre, e proprio il mancato rinnovo del 1890 cambiò l'Europa. Senza scadenze non c'è politica dei rinnovi.
2. **Mancano i trattati che contavano di più nel sistema bismarckiano**: la neutralità benevola (la contro-assicurazione del 1887 era un patto di neutralità), la consultazione (la Lega dei tre imperatori), il segreto. I tipi sono cinque (`TREATY_LABEL`, `diplomacy.ts:8-14`): alleanza, non aggressione, commercio, accesso, garanzia. Tutti i trattati sono pubblici, anche per il modello.
3. **La Rumelia orientale non esiste come autonomia.** Filippopoli è del tutto ottomana (sonda dell'accusa). L'unione bulgara del 1885, la crisi più bismarckiana del decennio, non ha dove accadere: servirebbe una provincia autonoma o un tributario.

### Giurato 2 — giurista dei trattati e della sovranità limitata
1. **Nessun signore difende i suoi soggetti.** `declareWar` r. 44-52 chiama in guerra solo alleati e garanti della vittima; i soggetti seguono il signore (r. 54), ma il signore non segue il soggetto. Sonda della giuria: la Francia attacca Hyderabad, protettorato britannico → difensori: **solo Hyderabad**; l'Italia attacca la Cambogia, protettorato francese → solo la Cambogia; il Regno Unito attacca Bukhara → solo Bukhara. È il contrario dell'istituto: il protettorato è prima di tutto protezione.
2. **I soggetti di un alleato entrano in qualunque guerra.** `declareWar` r. 54 aggiunge i seguaci di *tutti* i difensori, compresi gli alleati e i garanti chiamati: la Germania che attacca il Belgio porta in guerra 29 difensori, fra cui 25 Stati principeschi indiani (sonda 1A dell'accusa). Al contrario `join_war` (r. 282) non porta i seguaci di chi entra.
3. **Il tributario non ha alcun limite di politica estera.** `warBlock` r. 157 limita solo vassalli e protettorati, `checkProposal` r. 195 solo i protettorati: un tributario può allearsi con il nemico del signore e dichiarare guerra a chiunque, salvo al signore stesso. Per l'Egitto del 1881, che per i firmani non poteva firmare trattati politici né fare guerra (memoria), è troppo. Inoltre mancano le unioni personali: il Lussemburgo era del re dei Paesi Bassi fino al 1890.

### Giurato 3 — giocatore di diplomazia multigiocatore
1. **La stima si compra.** `applyProposal` caso `subsidy` r. 275: chi riceve guadagna fino a 20 punti di stima per ogni sussidio, senza limite per periodo; il dono non ha alcun controllo di plausibilità (`agents.ts:51` vale solo se paga la nazione non giocante). Sonda della giuria: sei sussidi da 50 milioni alla Russia lo stesso giorno, stima russa verso il Regno Unito da −40 a −10, e l'alleanza anglo-russa non ha più veti. Con le casse gonfiate del gioco lungo, qualunque stima si compra in un turno.
2. **Allentare e stringere a ripetizione abbassa il desiderio d'indipendenza gratis.** Sonda della giuria: Hyderabad a 24, sei cicli `loosen`+`tighten` nello stesso giorno: resta protettorato, desiderio da 24 a **15**, stima invariata (+10 −10). Sotto 20 si apre l'annessione (dopo due anni dall'ultima stretta).
3. **Attaccare il soggetto invece del signore** (vedi giurista 2.1): si conquistano gli Stati indiani o i protettorati francesi in Indocina senza combattere il Regno Unito o la Francia, e la pace (corte 07) li cede al vincitore. È l'exploit più redditizio del sistema.

---

## C. Voti dei giurati (1-10)

| | correttezza | fedeltà storica | qualità di gioco | manutenibilità | media |
|---|---|---|---|---|---|
| Storico | 5 — poche righe, ma errori nelle regole di chiamata | 4 — alleanze eterne, nessuna dopo il 1881, Duplice generale | 4 — senza modello non succede nulla | 7 — codice compatto, `bury` e `setSubject` esemplari | **5,0** |
| Giurista | 4 — il protettorato non protegge, `join_war` rompe i legami | 5 — tre livelli plausibili, soggetti iniziali ben scelti | 5 — il desiderio d'indipendenza spiegato voce per voce | 6 — invarianti giuste ma non coperte dai test | **5,0** |
| Giocatore | 4 — exploit a costo zero (stima comprata, cicli, soggetti indifesi) | 5 | 3 — un giocatore attento vince la diplomazia in un turno | 6 | **4,5** |
| **media per criterio** | **4,3** | **4,7** | **4,0** | **6,3** | **4,8** |

---

## D. Il verdetto della corte

### Da fare subito (errori e cose che rovinano il gioco)
1. **Il signore difende i soggetti** (giurista 2.1, giocatore 3.3). Errore, critica. In `declareWar` aggiungere ai difensori il signore di un vassallo o di un protettorato attaccato (per il tributario: a scelta del signore, o mai). *Piccolo.* Misura: la Francia che attacca Hyderabad ha contro il Regno Unito; test.
2. **`join_war` coerente** (capo 2). Errore, alta. In `checkProposal` lo stesso `warBlock` di `declareWar`, e rifiuto se chi entra è alleato o soggetto del nemico. *Piccolo.* Misura: i due casi della sonda 1C rifiutati; un turno di `checkInvariants` dopo `applyProposal` in `tests/invariants.test.ts`.
3. **Indipendenze del 1881** (capo 5). Squilibrio, alta. Proclamare solo se anche l'obiettivo è ≥ 75, oppure desiderio iniziale ≤ 75 per Canada, Corea, Maldive, Kongo, Kuwait, Tibet, Terengganu. *Piccolo.* Misura: la sonda 1E dà 0 proclamazioni su 40 semi.
4. **Garanzia violata alla dichiarazione** (capo 8). Errore, media. In `declareWar` violare la garanzia del dichiarante verso la vittima, con la pena del patto (−15 da tutti). *Piccolo.* Misura: sonda 1A, «garanzia GER-BEL ancora valida: no»; terzo a −15.
5. **Stima non comprabile** (giocatore 3.1). Errore di bilanciamento che rovina il gioco, alta. Un sussidio per coppia ogni sei mesi, stima +20 al massimo per anno da sussidi. *Piccolo.* Misura: la sonda della giuria firma un solo sussidio.
6. **Cicli di allentare e stringere** (giocatore 3.2). Errore, media. Un'azione sul legame per soggetto ogni sei mesi (`since` aggiornato anche in `loosen`). *Piccolo.* Misura: il secondo ciclo è rifiutato.
7. **Alleanze con scadenza** (storico 1.1). Errore, media: `p.years` è ignorato. Usare `p.years` (default 5) per le nuove; per le iniziali la scadenza storica (Duplice: rinnovo 1883). *Piccolo.* Misura: l'alleanza chiesta per 5 anni ha `endDay`.
8. **Alleanze incompatibili** (capo 7). Difetto, media. Rifiutare un'alleanza con chi è alleato di un rivale del proponente o è in guerra con un suo alleato. *Piccolo.* Misura: l'Italia della sonda 1B non ottiene più quattro alleanze insieme.

### Da fare nella fase di bilanciamento
9. **Alleanze storiche dopo il 1881** (capo 1, parte minima). Scadenze che obbligano a *proporre* (Lega dei tre imperatori giugno 1881, Triplice maggio 1882, Romania 1883), accettate dal motore se la stima lo consente; senza modello sono l'unica diplomazia del mondo. *Medio.* Misura: sonda 2 dell'accusa, almeno due alleanze nuove entro il 1884.
10. **Situazione del 1881 completa** (capo 4, giurista 2.3): Austria e Russia garanti del Belgio, garanzie di Lussemburgo e Svizzera, Convenzione di Cipro, Afghanistan protettorato britannico, alleanza anglo-portoghese. *Piccolo.* Misura: tabella e un test di `newGame`.
11. **Casus foederis** (capo 3): campo `against?` nel trattato; la Duplice solo contro la Russia. *Piccolo.* Misura: l'Italia che attacca l'Austria nel 1881 non trova la Germania.
12. **Forza locale** (capo 6): eserciti entro pochi passi più la marina. *Piccolo.* Misura: il Portogallo non è più "troppo debole" per il Kongo.
13. **Rivendicazioni** (capo 9): niente rivendicazioni fra soggetto e signore; ragione e confini della pretesa danese (Holstein, non le città libere); far pesare le rivendicazioni sulla stima. *Piccolo.*
14. **Stima con ritorno lento** e pena di guerra limitata ai vicini e alle potenze (capo 10). *Piccolo.*
15. **Soggetti dell'alleato** (giurista 2.2) e **limiti del tributario** (giurista 2.3). *Piccolo.*
16. **Taratura dell'annessione e della stretta** (capo 11) o la scelta dichiarata in SPEC di lasciarle al giocatore. *Piccolo.*
17. **Test** (capo 12): uno per ciascuna delle voci 1-8.

### Da rimandare o non fare
- **Una diplomazia completa nel motore** (capo 1, intero): grande, e senza guerre fra nazioni non giocanti (problema noto, corte 02) le alleanze non verrebbero messe alla prova. Prima la voce 9.
- **Sovranità nominale e controllo effettivo, Rumelia orientale** (capo 4, storico 1.3): grande cambio del modello dei soggetti; rimandare a dopo il verdetto della corte 08 sullo scenario.
- **Neutralità, consultazione, trattati segreti** (storico 1.2): utili solo quando le voci 9 e 11 esistono.

### Da non toccare (funziona)
`setSubject` come unico punto di nascita dei legami; `bury` e `checkAlive` come unico punto di uscita; le invarianti su trattati e soggetti; `libertyTarget` con le voci leggibili; i tre livelli con tributo nel bilancio e la soglia del 75%; `warBlock`; il protettorato come alleato per il passaggio; le rivendicazioni di nucleo con il limite di quattro passi e il revanscismo delle province perse; il determinismo delle scelte dei soggetti.

### Interazioni da segnalare alle altre corti
- **Pace (07)**: la voce 1 cambia le guerre contro i soggetti, che oggi finiscono con la cessione al vincitore senza il signore; la voce 13 cambia i costi delle cessioni.
- **Coloniale (00)**: la voce 12 tocca i protettorati coloniali; "un solo signore" spiega l'Egitto vassallo britannico del rapporto.
- **LLM (09)**: le voci 2, 5, 8 sono freni del codice sulle proposte del modello. **IA (02)**: le voci 9 e 11 hanno senso solo se le nazioni non giocanti dichiarano guerre fra Stati. **Economia (03)**: la voce 5 dipende dalle casse gonfiate.
