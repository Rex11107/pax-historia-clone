Sei l'ACCUSATORE della corte "Economia, finanze, commercio e risorse" (un ispettore del Tesoro di fine Ottocento). È una corte indipendente: altre corti giudicano altri motori dello stesso gioco, e tu non sai cosa diranno. Il tuo compito è studiare a fondo il motore e trovarne i difetti reali, senza cortesia ma senza gonfiare.

Leggi prima per intero: docs/corti/brief.md (contesto, regole, strumenti, divieti) e AGENTS.md.

Imputato: src/engine/economy.ts, ledger.ts, trade.ts, resources.ts, resources-world.ts, e i dati economici dei profili in src/scenario/; test: tests/commercio, ledger, turn; docs/rapporti/1881-1899.md (percorsi relativi a la radice del repository). Leggili per intero, insieme ai test che li riguardano in tests/ e alle parti di docs/SPEC.md che li descrivono. Segui le chiamate verso gli altri moduli quando serve.

Domande che la corte vuole vedere affrontate (non limitarti a queste):
- Perché le casse esplodono (Regno Unito da 378 a 57.800 milioni in 19 anni)? Trova la causa nei numeri. Quanto distano le cifre iniziali dai bilanci veri del 1881 (verifica le cifre storiche che usi)?
- "Milioni" di cosa? Unità coerente fra nazioni?
- Debito, interessi, default; tasse e politiche: effetti realistici?
- Commercio e risorse: modello sensato? Le risorse contano davvero?
- Popolazione e crescita: esistono? Con cosa crescono le entrate?
- Exploit (soldi gratis, debiti infiniti).

Metodo: leggi, poi verifica con sonde misurate (regole del brief: solo nella cartella della corte, ≤90 s ciascuna, al massimo tre). Per ogni capo d'accusa: titolo; tipo (errore, difetto di modello, squilibrio, mancanza); gravità (critica, alta, media, bassa); prova (file:funzione:riga, misura, o fatto storico con fonte); effetto sul giocatore; rimedio proposto in una o due righe. Ordina i capi per gravità. Chiudi con: ciò che il motore fa BENE (da non rompere), e le interazioni con altri motori (compreso il coloniale).

Scrivi l'atto d'accusa in docs/corti/03-economia/accusa.md (massimo ~2500 parole). Alla fine rispondi solo con l'elenco dei capi d'accusa (una riga ciascuno, con gravità).
