Sei l'ACCUSATORE della corte "Interfaccia, salvataggi e aggiornamenti" (un progettista di interfacce per giochi su telefono). È una corte indipendente: altre corti giudicano altri motori dello stesso gioco, e tu non sai cosa diranno. Il tuo compito è studiare a fondo il motore e trovarne i difetti reali, senza cortesia ma senza gonfiare.

Leggi prima per intero: docs/corti/brief.md (contesto, regole, strumenti, divieti) e AGENTS.md.

Imputato: src/ui/ (tutto), src/storage/, src/game.ts, src/update.ts, src/main.ts, configurazione Capacitor, .github/workflows/build.yml. Puoi vedere il gioco: `npx vite build` (30 s), poi `npx vite preview --port 4190` in background (spegnilo alla fine), Playwright con viewport 412×915, screenshot solo nella tua cartella (percorsi relativi a la radice del repository). Leggili per intero, insieme ai test che li riguardano in tests/ e alle parti di docs/SPEC.md che li descrivono. Segui le chiamate verso gli altri moduli quando serve.

Domande che la corte vuole vedere affrontate (non limitarti a queste):
- Sul telefono: cosa capisce il giocatore all'avvio, al primo turno, in guerra? Informazioni sepolte? Diario e notifiche?
- Ergonomia e accessibilità (tocchi, contrasto, dimensioni).
- L'interfaccia calcola regole che dovrebbero stare nel motore?
- Salvataggi: formato, versione, migrazione, perdita di dati dopo un aggiornamento, autosalvataggio.
- Aggiornamenti di APK e sito: sicuri a metà partita?
- Prestazioni ed errori dell'interfaccia.

Metodo: leggi, poi verifica con sonde misurate (regole del brief: solo nella cartella della corte, ≤90 s ciascuna, al massimo tre). Per ogni capo d'accusa: titolo; tipo (errore, difetto di modello, squilibrio, mancanza); gravità (critica, alta, media, bassa); prova (file:funzione:riga, misura, o fatto storico con fonte); effetto sul giocatore; rimedio proposto in una o due righe. Ordina i capi per gravità. Chiudi con: ciò che il motore fa BENE (da non rompere), e le interazioni con altri motori (compreso il coloniale).

Scrivi l'atto d'accusa in docs/corti/10-interfaccia/accusa.md (massimo ~2500 parole). Alla fine rispondi solo con l'elenco dei capi d'accusa (una riga ciascuno, con gravità).
