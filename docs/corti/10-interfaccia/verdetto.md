# Corte 10 — Interfaccia, salvataggi e aggiornamenti: verdetto

> **Dichiarazione**: atto d'accusa e verdetto scritti **nella stessa sessione** dallo stesso modello, l'accusa prima. Ogni capo è stato riverificato sul codice (leggo `game.ts`, `storage.ts`, `update.ts`, `main.ts`, `style.css`, `capacitor.config.json`, `.github/workflows/build.yml`). Non ho eseguito `vite build`/Playwright né screenshot: i giudizi di ergonomia derivano dal codice/CSS, non da una misura visiva.

I tre giurati: (1) giocatore nuovo sul telefono, (2) esperto di accessibilità, (3) ingegnere della persistenza.

---

## A. La difesa del motore: capo per capo

| capo | esito | verifica della giuria |
|---|---|---|
| 1. Nessuna migrazione dei salvataggi | **confermato** | `game.ts fromState` confronta solo `owner.length` e lancia errore; `state.version` è `1` ma non è mai letto; `storage.ts` non ha migrazione. |
| 2. Autosalvataggio senza debounce | **confermato** | `game.ts` `save('auto')` in `playTurn`/`talk`/`acceptOffer`; `saveGame` fa `JSON.stringify` + `put` intero a ogni azione. |
| 3. `build()` fragile | **confermato** | `update.ts build(v)` prende l'ultimo segmento; «v0.2.0»→0 non è più recente di «0.1.72». |
| 4. `installUpdate` ricarica senza salvare | **confermato** | `update.ts` `location.reload()`; autosalvataggio solo a fine turno. |
| 5. Nessun onboarding | **confermato** | `main.ts` menu + partita; `app.ts` spiega in un paragrafo nella scheda home, nessun primo turno guidato. |
| 6. Testo sotto la soglia | **confermato** | `style.css` `.bar` 0.72rem, `.msg small` 0.75rem, `.top-nation` 0.78rem, `.stats` 0.82rem. Valori verificati. |
| 7. Touch target/focus | **confermato** | `style.css` `.icon-btn` 40×40px, `:hover`/`:active` ma niente `:focus-visible`, tab `padding: 0 2px`. |

---

## B. Ciò che l'accusa non ha visto

### Giurato 1 — giocatore nuovo
1. **I salvataggi non-auto sono invisibili**: `main.ts` usa solo lo slot `auto`; `listSaves()` restituisce tutto ma nessun elenco per nome/data. Un salvataggio manuale esiste ma non si può riaprire dal menu.
2. **Nessun riepilogo pre-turno**: prima di «Fine settimana» non c'è un sommario di ciò che le unità/IA faranno; il giocatore avanza alla cieca.
3. **Azioni irreversibili senza conferma**: una direttiva può dichiarare guerra; nessun «confermi?» prima di eseguire.

### Giurato 2 — esperto di accessibilità
1. **Contrasto del colore di stato**: `.pos #9fd1ad` e `.neg #f0a4a9` su carta chiara non rispettano il contrasto minimo e non hanno alternativa simbolica (solo colore per esiti positivi/negativi).
2. **Icone senza nome accessibile**: i chip bussola/risorse/pedine hanno `aria-pressed` ma non un'etichetta testuale; uno screen reader non sa cosa fanno.
3. **Zoom impedito sul canvas**: `touch-action: none` sulla mappa blocca lo zoom a gesto per chi ne ha bisogno; nessuna alternativa.

### Giurato 3 — ingegnere della persistenza
1. **Scrittura non atomica**: `saveGame` fa `put` in-place; un'interruzione a metà può lasciare l'ultimo salvataggio buono corrotto. Manca «scrivi nuovo, poi rinomina» o un backup.
2. **Compatibilità solo per numero di province**: se cambiano le *regole* ma non le province, un vecchio salvataggio carica con regole nuove senza avviso → stati potenzialmente incoerenti.
3. **`version` usato come costante decorativa**: `GameState.version = 1` non partecipa a nessun confronto; è un campo morto.

---

## C. I voti (1-10)

| | correttezza | fedeltà storica | qualità di gioco | manutenibilità |
|---|---|---|---|---|
| Giocatore nuovo | 6 | 8 | 7 | 7 |
| Accessibilità | 6 | 7 | 6 | 6 |
| Persistenza | 5 | 7 | 7 | 5 |
| **media** | **5,7** | **7,3** | **6,7** | **6,0** |

Motivazioni in una riga: (giocatore) «testi d'epoca e mappa convincono, ma nessun accompagnamento e salvataggi nascosti»; (accessibilità) «struttura attenta (safe-area, reduced-motion) ma contrasto e nomi accessibili scarsi»; (persistenza) «nessuna migrazione né scrittura atomica: il tallone d'Achille».

---

## D. Il verdetto della corte

### Da fare subito (errori e perdita di dati)
1. **Migrazione dei salvataggi** (capo 1, *mancanza*, critica, medio): leggere `state.version`, applicare upgrade, e passare a un formato per tag di provincia invece di indici. Misura: un salvataggio pre-aggiornamento riapre dopo un cambio mappa.
2. **Confronto semantico delle versioni** (capo 3, *errore*, media, 3 righe): `split('.').map(Number)`. Misura: un release «0.2.0» viene proposto come aggiornamento.
3. **Salva prima di ricaricare** (capo 4, *errore*, media, piccolo): in `installUpdate` (web) salvare lo stato corrente prima di `location.reload()`. Misura: nessun turno perso all'aggiornamento.
4. **Scrittura atomica con backup** (persistenza 1, *errore*, media, piccolo): write-then-rename o copia di sicurezza dello slot `auto`. Misura: un crash non corrompe l'ultimo salvataggio.

### Da fare nella fase di bilanciamento
5. **Onboarding del primo turno** (capo 5, *mancanza*, media, medio): primo turno guidato o scheda Aiuto. Misura: un giocatore nuovo completa il primo turno senza aiuto esterno.
6. **Corpi piccoli ≥0.875rem** (capo 6, *squilibrio*, bassa, piccolo): alzare `.bar`/`.msg small`/`.top-nation`. Misura: nessun testo informativo sotto ~12px.
7. **Touch target ≥44px e `:focus-visible`** (capo 7, *squilibrio*, bassa, piccolo). Misura: controlli toccabili e focus visibile.
8. **Debounce dell'autosalvataggio** (capo 2, *squilibrio*, media, piccolo): coalescing e salvataggio per fase. Misura: una scrittura per cambio di fase, non una per azione.

### Da rimandare o non fare
- **Salvataggi manuali nell'elenco di avvio** (giocatore 1): utile, ma secondario rispetto alla migrazione (voce 1).
- **Doppio canale colore+simbolo** (accessibilità 1): bello, ma il cambio palette coinvolge tutto lo style; rimandare.
- **Riepilogo pre-turno e conferme** (giocatore 2/3): dipendono da decisioni di design del flusso di turno, non prioritarie ora.

### Da non toccare (funziona)
Il principio «il motore dispone» (l'interfaccia chiama `buildRefusal`/`planPath`/`checkProposal`); le safe-area e `prefers-reduced-motion`; `aria-pressed`/`aria-label` dove presenti; la chiave API fuori dal `GameState`; la pipeline CI (`tsc`→`map:check`→`test`→`build`→Pages+APK firmato) e `allowMixedContent:false`.

### Interazioni con le altre corti
- **Mappa (08)**: la migrazione (voce 1) scatta quando il numero di province cambia.
- **LLM (09)**: il diario `dispatches` e il fallback senza chiave condizionano l'esperienza di turno.
- **Guerra (01) / Diplomazia (06)**: il flusso «Fine settimana» e la conferma delle guerre dipendono dai capi 8/da rimandare.
