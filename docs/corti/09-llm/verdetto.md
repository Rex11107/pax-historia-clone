# Corte 09 — Livello LLM: verdetto

> **Dichiarazione**: atto d'accusa e verdetto scritti **nella stessa sessione** dallo stesso modello, l'accusa prima e come compito a sé. Ogni capo è stato riverificato sul codice (`client.ts`, `gm.ts`, `agents.ts`, `context.ts`, `prompts.ts`, `game.ts`, `storage.ts`, `app.ts`); non ho fatto chiamate reali a modelli. I conteggi di token sono **stime**, non misure (non ho API attive).

I tre giurati: (1) esperto di sicurezza LLM, (2) narratore di GDR, (3) contabile dei costi.

---

## A. La difesa del motore: capo per capo

| capo | esito | verifica della giuria |
|---|---|---|
| 1. Traiettoria non deterministica | **confermato** | `gm.ts applyWorldActions` dichiara guerre/trattati fra NPC da `narrate()` (temperature 0.8); `storage.ts` serializza tutto il state. A parità di seme si diverge. Il nucleo `src/engine/` resta deterministico, ma il *mondo* no. |
| 2. Senza chiave niente diplomazia NPC | **confermato** | `game.ts` mette `translate`/`narrate` dietro `hasKey`; `applyWorldActions` vive dentro `narrate`. `talk` richiede chiave. Senza key solo `fallbackNarrative` (racconta, non muove). Conferma il problema noto. |
| 3. Costo senza budget né visibilità | **confermato in parte** | Il contesto è davvero enorme (`nationsBlock` 166 nazioni, `provinceIndex` con etnie) e `usage` non è mostrato. Ma «centinaia di migliaia di token» è una **stima non misurata**: la giuria la ridimensiona a «decine di migliaia per turno», senza prova numerica. |
| 4. Chiave verso qualunque `baseUrl` | **confermato** | `client.ts` non forza `https://`; `Bearer` inviato a endpoint libero; `storage.ts` salva in `Preferences` JSON chiaro. |
| 5. `opinion_delta` senza validazione | **confermato** | `agents.ts` `changeOpinion(±10)` e `gm.ts` `opinion(±15)` con solo clamp. È l'unico canale dove il testo scrive stato senza gate di merito. |
| 6. Prompt injection non difesa | **confermato** | direttive/messaggi in `user` senza delimitatori né anti-injection; `notes`/`narrative` liberi finiscono in state. Lo strutturato è protetto dal motore. |
| 7. Plausibilità solo su «accept» | **confermato** | `agents.ts` nei rami `counter`/`propose` chiama solo `checkProposal`, non `plausibility`. |
| 8. `usage` accumulatore globale | **confermato** | `client.ts` `usage` mai azzerato né persistito né mostrato. |

---

## B. Ciò che l'accusa non ha visto

### Giurato 1 — sicurezza applicazioni LLM
1. **La cronologia chat è serializzata nel salvataggio senza tetto per nazione**: `s.chats[tag]` cresce fino a 80 messaggi **per 166 nazioni**; il JSON del salvataggio può ingrassare in modo asimmetrico. Non è una fuga, ma è stato non governato.
2. **Ripetizioni fino a 4 con backoff**: una sola chiamata può costare fino a 4×; non esiste un tetto di spesa per turno che la blocchi.
3. **`parseJSON` accetta ciò che circonda il primo `{`…ultimo `}`**: tollerante ma fragile rispetto a un modello che infila `}` in un testo libero; la riparazione non è testata su casi reali.

### Giurato 2 — narratore
1. **`fallbackNarrative` è un elenco puntato senza voce d'epoca**: l'esperienza senza chiave non è «un GM di riserva», è un bollettino. La discontinuità qualitativa è netta.
2. **`narrative` può uscire di una parola** e finire nel dispaccio senza controllo di lunghezza/qualità: nessun minimo garantito.
3. **`chronicle` aggiornata solo ogni 6 turni** e troncata a 1500 caratteri senza rolling: il GM può contraddire la cronaca precedente senza che nulla lo vincoli.

### Giurato 3 — contabile
1. **`maxTokens` di `narrate` è 1400 + 2500 di `REASONING_HEADROOM`** = fino a ~3900 richiesti per un dispaccio di 80-180 parole (~250 token): overshoot sistematico.
2. **Temperature alte (0.8/0.85)** spingono verbosità e costo, senza una contropartita di qualità misurabile.
3. **Nessun prezzo stimato per turno**: il giocatore non sa a cosa va incontro, e non c'è un «piano economico» (es. modello cheap per la traduzione ordini, forte per la narrazione).

---

## C. I voti (1-10)

| | correttezza | fedeltà storica | qualità di gioco | manutenibilità |
|---|---|---|---|---|
| Sicurezza | 6 | 7 | 7 | 7 |
| Narratore | 6 | 8 | 8 | 7 |
| Contabile | 6 | 7 | 6 | 6 |
| **media** | **6,0** | **7,3** | **7,0** | **6,7** |

Motivazioni in una riga: (sicurezza) «il motore valida bene lo strutturato, ma chiave e injection restano scoperte»; (narratore) «voce e carattere ben impostati nei prompt, fallback e chronicle deboli»; (contabile) «costi non visibili e contesto sovradimensionato».

---

## D. Il verdetto della corte

### Da fare subito (errori e rischi)
1. **HTTPS obbligatorio per `baseUrl`** (capo 4, *sicurezza*, media, piccolo): rifiutare scheme non-https con messaggio. Misura: nessuna Bearer parte verso `http://`.
2. **Non persistere la chiave in chiaro** (capo 4, *sicurezza*, media, medio): Keystore/criptata o almeno avviso esplicito. Misura: la chiave non è leggibile come JSON piatto.
3. **Plausibilità anche su `counter`/`propose`** (capo 7, *errore*, basso, 1 riga): `checkProposal ?? plausibility` su tutti gli intenti. Misura: una nazione non contropropone di cedersi da sola.
4. **Guerre NPC fuori dall'LLM** (capo 2, *mancanza*, alta, medio): motore minimo deterministico (casus belli/rivalità già nei profili) così il mondo si muove anche senza chiave. Misura: partita senza chiave vede guerre fra Stati.

### Da fare nella fase di bilanciamento
5. **Token budget per turno** (capo 3, *squilibrio*, medio, piccolo): tetto di spesa, `nationsBlock` solo per nazioni rilevanti, contatore visibile. Misura: il contesto non manda 166 profili a ogni dispaccio.
6. **Anti-injection nei prompt** (capo 6, *sicurezza*, media, piccolo): delimitatori per i dati sfidati e istruzione esplicita. Misura: un test con direttiva «ignora le istruzioni» non sposta lo stato.
7. **`opinion_delta` legato a fatti** (capo 5, *difetto*, basso, piccolo): delta consentito solo accanto a un trattato/minaccia/concessione. Misura: il giudizio non cresce a ogni messaggio.
8. **`maxTokens` e temperature calibrati** (contabile 1/2, *squilibrio*, basso, piccolo): dispaccio a ~400 token, temperatura 0.5-0.6 per la narrazione. Misura: spesa per turno dimezzata a parità di contenuto.

### Da rimandare o non fare
- **Rendere il mondo intero riproducibile** (capo 1): se le guerre NPC passano al motore (voce 4), l'LLM resta solo testo e la determinismo si ricompone da sé; non serve altro.
- **Rolling coerente della chronicle** (narratore 3): bello solo quando la voce 4 esiste e c'è una memoria strutturata.
- **Prezzi stimati per provider** (contabile 3): dipende dal provider; lasciare un campo «costo/1000 token» nelle Impostazioni, non hardcodarlo.

### Da non toccare (funziona)
La validazione del motore sullo strutturato (`parseOrder`/`assignOrders`/`checkProposal`/`applyWorldActions` con i suoi `motive`); la chiave **fuori** dal salvataggio (`GameState` non la contiene); il recupero robusto (`retry`, recupero del reasoning, riparazione JSON); `fallbackNarrative` come ultima spiaggia; i prompt d'epoca senza anacronismi; `behavioralRules` che traducono i numeri del profilo in regole di comportamento.

### Interazioni con le altre corti
- **Diplomazia (06)**: i freni del motore girano solo con chiave (capo 2); la voce 3 allinea i gate anche alle controproposte.
- **Guerra (01) / IA (02)**: le guerre NPC nascono qui; la voce 4 le riporta nell'alveo deterministico.
- **Economia (03)**: opinioni e sussidi del modello toccano tesoro e casse gonfiate.
- **Coloniale (00)**: le situazioni aperte/chiuse dal GM interagiscono col motore coloniale.
