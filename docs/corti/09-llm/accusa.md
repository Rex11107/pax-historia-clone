# Atto d'accusa: Livello LLM — Game Master, agenti-nazione, prompt

L'accusa è dell'ingegnere di sistemi con modelli linguistici (sicurezza e costi). Imputati: tutto `src/llm/` (`client.ts`, `gm.ts`, `agents.ts`, `context.ts`, `prompts.ts`), l'uso in `src/game.ts` e `src/ui/app.ts`, la validazione degli intenti nel motore; test `tests/llm.test.ts`. Nessuna chiamata reale a modelli. Nessuna modifica fuori dalla corte.

---

## Capi d'accusa, dal più grave

### 1. La traiettoria del mondo non è deterministica: il GM scrive guerre e trattati sui dadi del modello
- **Tipo**: difetto di modello. **Gravità**: alta.
- **Prova**: `gm.ts` — `applyWorldActions` dichiara guerre (`declareWar(A,B)`), fa paci e trattati fra nazioni non giocanti, mosse da `narrate()` con `temperature: 0.8`. `game.ts` crea il seme con `String(Date.now())`, ma anche a parità di seme l'esito diverge, perché quelle azioni non vengono dal motore ma dal modello. Il salvataggio serializza l'intero `GameState` (`storage.ts`), quindi **due partite identiche divergono**.
- **Effetto**: il principio 2 di AGENTS.md («stesso input, stesso risultato») vale solo per `src/engine/`; la partita intera non è riproducibile, e un salvataggio non può essere rivissuto con un esito coerente.
- **Rimedio**: separare i fatti (motore, deterministici) dalla narrazione; le guerre NPC dovrebbero nascere da regole o da un seme del motore, non dal testo libero.

### 2. Senza chiave niente diplomazia e niente guerre fra nazioni non giocanti
- **Tipo**: mancanza. **Gravità**: alta.
- **Prova**: `game.ts` — `translate` e `narrate` sono dietro `hasKey`; `client.ts` lancia `LLMError` se `!cfg.apiKey`; `agents.talk` richiede anch'essa la chiave. `applyWorldActions` (l'unico punto in cui due NPC possono arrivare alla guerra) vive **dentro** `narrate()`. Senza chiave resta solo `fallbackNarrative`, che *racconta* ma non *muove* il mondo.
- **Effetto**: è il problema noto del brief («le nazioni non giocanti non dichiarano mai guerre fra Stati»). Il gioco è giocabile (turni, ordini da mappa), ma il mondo diplomatico è congelato.
- **Rimedio**: un motore minimo deterministico per le guerre NPC (casus belli e rivalità già nel profilo), indipendente dall'LLM.

### 3. Costo per turno senza budget, senza visibilità e col contesto intero
- **Tipo**: squilibrio. **Gravità**: media.
- **Prova**: `context.ts` — `nationsBlock` manda **tutte** le 166 nazioni con profilo completo in ogni `translate`/`narrate`; `worldDigest` aggiunge tutti i trattati, tutte le situazioni, i rapporti con le potenze e i vicini, tutte le unità del giocatore e le forze nemiche entro due province; `provinceIndex` elenca province con `compositionText` (composizione etnica) per ognuna. Due chiamate a turno (`translate` se c'è direttiva + `narrate`) + una per messaggio diplomatico. `client.ts` conteggia `usage` ma **nessuno lo mostra al giocatore**; non c'è un tetto di costo.
- **Effetto**: a fine turno si può spendere per centinaia di migliaia di token solo di prompt; il giocatore non ha idea del costo.
- **Rimedio**: budget di token per turno, `nationsBlock` solo per le nazioni rilevanti, contatore di spesa visibile nelle Impostazioni.

### 4. La chiave API viaggia verso qualunque `baseUrl`, anche non HTTPS
- **Tipo**: sicurezza. **Gravità**: media.
- **Prova**: `client.ts` — `baseUrl` è un campo libero; `chatJSON` invia `Authorization: Bearer ${cfg.apiKey}` a `endpoint(baseUrl)`. Nessun controllo che lo schema sia `https://`; un endpoint `http://` o un proxy intermedio leggono la chiave in chiaro. `storage.ts` salva la chiave in `Preferences`/`localStorage` come JSON non cifrato (niente Android Keystore).
- **Effetto**: la chiave è bene del giocatore (BYOK), ma esposta a una configurazione errata o malevola senza avviso.
- **Rimedio**: rifiutare scheme non-https (con messaggio chiaro) e non persistere la chiave in chiaro (o marcarla come "a rischio").

### 5. `opinion_delta` del modello scrive lo stato senza validazione oltre il clamp
- **Tipo**: difetto di modello. **Gravità**: bassa.
- **Prova**: `agents.ts` — `talk()` fa `changeOpinion(s, tag, me, delta)` dove `delta` è l'intero restituito dal modello, clampato solo a ±10; `gm.ts` per l'azione `opinion` clamp ±15. Nessun gate di coerenza (un alleato può guadagnare +10 a ogni messaggio senza contropartita).
- **Effetto**: il giudizio reciproco è l'unico canale dove il testo del modello scrive direttamente lo stato, senza il «codice dispone».
- **Rimedio**: legare il delta a fatti (trattato firmato, minaccia, concessione) o passarlo per una funzione del motore.

### 6. Prompt injection non difesa
- **Tipo**: sicurezza. **Gravità**: media.
- **Prova**: `prompts.ts` mette le regole in `system`, ma il testo del giocatore (`directive.slice(0,2000)` in `translate`, `text.slice(0,1500)` in `talk`) entra in `user` a fianco, senza delimitatori forti né istruzioni anti-injection. La validazione del motore protegge lo *strutturato* (ordini/proposte/azioni), ma `notes` e `narrative` sono testo libero che finisce in `s.dispatches`/`memory` senza filtro.
- **Effetto**: un giocatore può indurre il GM ad allucinare eventi o a usare un registro sbagliato; non può scrivere direttamente lo stato (qui il codice regge), ma può inquinare cronaca e memoria.
- **Rimedio**: delimitatori (tag XML/JSON per i dati sfidati), istruzione anti-injection, e niente testo libero del modello in strutture che il motore usa come fatti.

### 7. La plausibilità è applicata solo all'«accept», non alle controproposte
- **Tipo**: errore. **Gravità**: bassa.
- **Prova**: `agents.ts` — nel ramo `intent === 'accept'` si chiama `checkProposal(...) ?? plausibility(...)`; nei rami `counter`/`propose` si chiama **solo** `checkProposal`. `plausibility` è il gate «un governo non lo firmerebbe mai» (cedere territorio in pace, sussidi sproporzionati), e qui è saltato: una nazione può *controproporre* di cedere proprie province o pagare sussidi assurdi, se la validità formale lo consente.
- **Effetto**: il difensore della corte 06 (freni sulle proposte) non copre il lato controproposta del giocatore.
- **Rimedio**: `checkProposal ?? plausibility` anche su `counter`/`propose`.

### 8. `usage` è un accumulatore globale senza reset né persistenza
- **Tipo**: mancanza. **Gravità**: bassa.
- **Prova**: `client.ts` — `usage` è un oggetto modulo con `calls/promptTokens/…` incrementati e mai azzerati né salvati; è invisibile all'interfaccia.
- **Effetto**: il contabile dei costi non ha uno strumento; il capo 3 resta senza contatore.
- **Rimedio**: `usage` per partita (o azzerabile) ed esposto in UI.

---

## Ciò che il motore fa BENE (da non rompere)

- **«Il codice dispone» sugli ordini**: `parseOrder`/`parseCondition` risolvono solo id reali; `assignOrders` rifiuta mosse nel deserto o in territorio neutrale; `declareWar` richiede il casus.
- **`applyWorldActions` è sorvegliato**: guerre solo con `motive` (opinione ≤ -40, o rivalità, o situazione), tetto di una guerra a turno, niente guerre del/contro il giocatore imposte dal GM, paci solo se in guerra e dopo 28 giorni.
- **Chiave sul dispositivo**: `Preferences` nell'APK, niente chiave nel `GameState` salvato (verificato: il salvataggio non contiene la chiave).
- **Recupero robusto**: 4 tentativi con backoff, recupero del `reasoning` se il `content` è vuoto, riparazione del JSON, fallback `fallbackNarrative` senza key.
- **Niente anacronismi nel prompt**: `GM_RULES` impone italiano d'epoca e «non inventare numeri o esiti».

## Interazioni con gli altri motori

- **Diplomazia (06)**: i freni del motore sulle proposte (capo 7 della 06) girano solo se la chiave c'è; senza, la diplomazia è vuota (capo 2).
- **Guerra (01) / IA (02)**: le guerre NPC nascono qui (LLM), non dall'AI core; il problema «AI lenta / senza guerre fra Stati» è di questa corte.
- **Economia (03)**: l'azione `opinion` e i sussidi proposti dal modello toccano tesoro e casse gonfie.
- **Coloniale (00)**: le situazioni aperte/chiuse dal GM (crisi coloniali) interagiscono col motore coloniale.
