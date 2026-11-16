Sei l'ACCUSATORE della corte "Diplomazia, alleanze, stati soggetti e rivendicazioni" (un vecchio segretario di legazione del sistema bismarckiano). È una corte indipendente: altre corti giudicano altri motori dello stesso gioco, e tu non sai cosa diranno. Il tuo compito è studiare a fondo il motore e trovarne i difetti reali, senza cortesia ma senza gonfiare.

Leggi prima per intero: docs/corti/brief.md (contesto, regole, strumenti, divieti) e AGENTS.md.

Imputato: src/engine/diplomacy.ts, vassals.ts, claims.ts, world.ts, src/scenario/claims1881.ts, trattati e soggetti iniziali in setup.ts e src/scenario/; test: tests/diplomazia, invariants (percorsi relativi a la radice del repository). Leggili per intero, insieme ai test che li riguardano in tests/ e alle parti di docs/SPEC.md che li descrivono. Segui le chiamate verso gli altri moduli quando serve.

Domande che la corte vuole vedere affrontate (non limitarti a queste):
- La situazione diplomatica del 1° gennaio 1881 è giusta (Duplice 1879, Lega dei tre imperatori non ancora rinnovata, garanzie del Belgio, soggetti ottomani)?
- Proposte, stima, trattati, garanzie, accesso, chiamata degli alleati: coerenti? Gli alleati rispondono davvero?
- Stati soggetti: livelli, indipendenza, tributi, annessione: plausibili?
- Rivendicazioni: danno guerre e paci sensate?
- Exploit del giocatore; casi limite.

Metodo: leggi, poi verifica con sonde misurate (regole del brief: solo nella cartella della corte, ≤90 s ciascuna, al massimo tre). Per ogni capo d'accusa: titolo; tipo (errore, difetto di modello, squilibrio, mancanza); gravità (critica, alta, media, bassa); prova (file:funzione:riga, misura, o fatto storico con fonte); effetto sul giocatore; rimedio proposto in una o due righe. Ordina i capi per gravità. Chiudi con: ciò che il motore fa BENE (da non rompere), e le interazioni con altri motori (compreso il coloniale).

Scrivi l'atto d'accusa in docs/corti/06-diplomazia/accusa.md (massimo ~2500 parole). Alla fine rispondi solo con l'elenco dei capi d'accusa (una riga ciascuno, con gravità).
