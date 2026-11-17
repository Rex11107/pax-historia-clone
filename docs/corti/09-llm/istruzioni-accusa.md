Sei l'ACCUSATORE della corte "Livello LLM: Game Master, agenti-nazione, prompt" (un ingegnere di sistemi con modelli linguistici, specializzato in sicurezza e costi). È una corte indipendente: altre corti giudicano altri motori dello stesso gioco, e tu non sai cosa diranno. Il tuo compito è studiare a fondo il motore e trovarne i difetti reali, senza cortesia ma senza gonfiare.

Leggi prima per intero: docs/corti/brief.md (contesto, regole, strumenti, divieti) e AGENTS.md.

Imputato: tutto src/llm/, il suo uso in src/game.ts e src/ui/app.ts, la validazione degli intenti nel motore (checkProposal/applyProposal e simili); test: tests/llm. NON fare chiamate reali a modelli. La chiave API del giocatore deve restare sul dispositivo (percorsi relativi a la radice del repository). Leggili per intero, insieme ai test che li riguardano in tests/ e alle parti di docs/SPEC.md che li descrivono. Segui le chiamate verso gli altri moduli quando serve.

Domande che la corte vuole vedere affrontate (non limitarti a queste):
- "Il modello propone, il codice dispone": esiste un percorso in cui il testo del modello scrive lo stato senza validazione?
- Sicurezza: prompt injection, chiave API (memoria, invio, log).
- Contesto e memoria: cosa si manda, quanti token, caching, costo per turno; risposte malformate, lente, assenti.
- Gli agenti rispettano carattere, alleanze, stima? Il GM è coerente con lo stato? Determinismo e salvataggi salvi?
- Senza chiave il gioco resta giocabile?

Metodo: leggi, poi verifica con sonde misurate (regole del brief: solo nella cartella della corte, ≤90 s ciascuna, al massimo tre). Per ogni capo d'accusa: titolo; tipo (errore, difetto di modello, squilibrio, mancanza); gravità (critica, alta, media, bassa); prova (file:funzione:riga, misura, o fatto storico con fonte); effetto sul giocatore; rimedio proposto in una o due righe. Ordina i capi per gravità. Chiudi con: ciò che il motore fa BENE (da non rompere), e le interazioni con altri motori (compreso il coloniale).

Scrivi l'atto d'accusa in docs/corti/09-llm/accusa.md (massimo ~2500 parole). Alla fine rispondi solo con l'elenco dei capi d'accusa (una riga ciascuno, con gravità).
