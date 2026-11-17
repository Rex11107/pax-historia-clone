# Atto d'accusa: Interfaccia, salvataggi e aggiornamenti

L'accusa è del progettista di interfacce per giochi su telefono. Imputati: `src/ui/` (tutto), `src/storage/`, `src/game.ts`, `src/update.ts`, `src/main.ts`, `capacitor.config.json`, `.github/workflows/build.yml`.

**Dichiarazione di metodo onesta**: non ho eseguito `vite build`/Playwright né catturato screenshot; le osservazioni ergonomiche vengono dalla lettura del codice e del CSS, non da una misura visiva. Le osservazioni su file/funzione/riga sono verificate; i giudizi di leggibilità sono conseguenze dirette dei valori nel CSS.

---

## Capi d'accusa, dal più grave

### 1. Nessuna migrazione dei salvataggi: ogni cambio di mappa li azzera tutti
- **Tipo**: mancanza. **Gravità**: critica.
- **Prova**: `game.ts fromState` controlla solo `state.owner?.length !== map.provinces.length` e lancia «questo salvataggio è stato fatto con una versione precedente… inizia una nuova partita». `storage.ts` salva/legge un JSON senza migra`; `GameState.version` è `1` ma non è mai letto. Qualunque cambio nel numero di province (cosa già accaduta più volte in questo progetto: 3.532→4.532 province) invalida tutti i salvataggi.
- **Effetto**: dopo un aggiornamento il giocatore perde ore di partita senza rimedio né upgrade path.
- **Rimedio**: una migrazione per versione (`version` letto e applicato) o un formato a `owner`/`controller` per tag di provincia, non per indice.

### 2. Autosalvataggio a ogni turno e a ogni messaggio, senza debounce
- **Tipo**: squilibrio. **Gravità**: media.
- **Prova**: `game.ts` chiama `save('auto')` in `playTurn` (fine turno), in `talk` e in `acceptOffer`; `storage.saveGame` fa `JSON.stringify(state)` + `put` su IndexedDB. Lo stato serializzato comprende trattati, unità, cronologia chat e memoria. Su telefono è una scrittura pesante e frequente, non differita né versionata.
- **Effetto**: jank percepibile a ogni «Fine settimana» e a ogni messaggio diplomatico; nessun salvataggio intermedio se l'app si chiude a metà turno.
- **Rimedio**: debounce/coalescing delle scritture e salvataggio anche all'ingresso di fase (`onPhase`), non solo a fine turno.

### 3. Rilevamento della versione dell'update fragile
- **Tipo**: errore. **Gravità**: media.
- **Prova**: `update.ts build(v)` = ultimo segmento dopo `.`; `isNewer` confronta `build(r.version) > build(APP_VERSION)`. «v0.1.72» → 72 funziona, ma un tag «v0.2.0» → 0 oppure «v1.0.0» → 0 risulterebbe **non più recente** di «0.1.72» (0 > 72 è falso): un salto di maggiore passerebbe inosservato e l'app non offrirebbe l'aggiornamento.
- **Effetto**: il primo aggiornamento maggiore (es. 0.2 o 1.0) non verrà proposto ai giocatori.
- **Rimedio**: confronto semantico a tre numeri (`split('.').map(Number)`).

### 4. L'aggiornamento web ricarica la pagina a metà partita
- **Tipo**: errore. **Gravità**: media.
- **Prova**: `update.ts installUpdate` nel browser fa `location.reload()`; l'autosalvataggio avviene solo a fine turno (`game.ts`). Se il giocatore accetta l'aggiornamento dal pulsante in home mentre ha un turno aperto, il turno non salvato va perso.
- **Effetto**: perdita di dati non segnalata in un flusso di aggiornamento.
- **Rimedio**: salvare prima del reload, o mostrare «partita in corso: salva prima di aggiornare».

### 5. Nessun onboarding: il giocatore nuovo è scaraventato sulla mappa
- **Tipo**: mancanza. **Gravità**: media.
- **Prova**: `main.ts` costruisce il menu di avvio (scelta nazione + «Nuova partita») e basta; `app.ts` in `viewHome` spiega «Ogni turno dura una settimana…» in un paragrafo sepolto nella scheda (righe 191-192). Nessun primo turno guidato, nessun tutorial su guerra/diplomazia/ricerca.
- **Effetto**: il giocatore nuovo non capisce cosa fare al primo turno né dove sono i comandi; il gioco è pensato per il telefono ma non accompagna.
- **Rimedio**: un primo turno guidato (2-3 tocchi) o una scheda «Aiuto» sempre raggiungibile.

### 6. Testo essenziale sotto il minimo di leggibilità
- **Tipo**: squilibrio (accessibilità). **Gravità**: bassa.
- **Prova**: `style.css` — `.bar` 0.72rem (~11px), `.msg small` 0.75rem, `.top-nation` 0.78rem, `.stats` 0.82rem. I numeri vitali (tesoro, unità) stanno in `.stats` a 0.82rem; i contatori di bilancio a 0.72rem. Sotto la soglia raccomandata (≈12px) per testo informativo.
- **Effetto**: su schermi piccoli la lettura dei numeri chiave è faticosa, peggio per utenti ipovedenti.
- **Rimedio**: alzare i corpi piccoli a ≥0.875rem e usare lo spazio risparmiato altrove.

### 7. Touch target al limite e focus non visibile
- **Tipo**: squilibrio (accessibilità). **Gravità**: bassa.
- **Prova**: `style.css` — `.icon-btn` 40×40px (sotto i 44px raccomandati); gli stati attivi usano `:hover`/`:active`, non `:focus-visible`; le tab sono `padding: 0 2px` su cella di griglia (area toccabile bassa per il pollice).
- **Effetto**: tocchi mancati al volo e nessuna indicazione di focus per chi naviga senza tocco.
- **Rimedio**: ≥44px per controllo, `outline` su `:focus-visible`.

---

## Ciò che l'interfaccia fa BENE (da non rompere)

- **Il motore dispone**: l'interfaccia chiama `buildRefusal`, `planPath`, `checkProposal`, `inputEfficiency`; non calcola regole di gioco (regola 3 di AGENTS.md rispettata).
- **Aree sicure e riduzione del movimento**: `--safe-t/--safe-b` per il notch, `prefers-reduced-motion` disattiva le transizioni.
- **Stati leggibili**: `aria-pressed` sui chip della mappa, `aria-label` sulla selezione nazione, numeri con `tabular-nums`.
- **Chiave fuori dal salvataggio**: `Settings` (chiave) separata da `GameState`, quindi l'autosalvataggio non espone la chiave.
- **Pipeline di build pulita**: CI `tsc` → `map:check` → `npm test` → `build` → Pages + APK firmato se presenti i segreti; l'APK usa un `appId` e `allowMixedContent:false`.

## Interazioni con gli altri motori

- **LLM (09)**: i dispacci e il diario (`dispatches`, cap a 30) dipendono dal livello LLM; senza chiave il fallback è un bollettino (corte 09).
- **Guerra (01)**: l'autosalvataggio frequente preserva lo stato militare, ma un reload a metà turno (capo 4) perde gli ordini in corso.
- **Mappa (08)**: il capo 1 (migrazione) scatta proprio quando la corte 08 tocca il numero di province.
- **Economia/Politica**: le schede Governo/Bilancio mostrano dati del motore senza duplicarli.
