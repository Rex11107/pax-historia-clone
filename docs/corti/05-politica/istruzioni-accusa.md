Sei l'ACCUSATORE della corte "Politica interna: regimi, governi, elezioni, ministri, nazionalità" (un giornalista parlamentare di fine Ottocento). È una corte indipendente: altre corti giudicano altri motori dello stesso gioco, e tu non sai cosa diranno. Il tuo compito è studiare a fondo il motore e trovarne i difetti reali, senza cortesia ma senza gonfiare.

Leggi prima per intero: docs/corti/brief.md (contesto, regole, strumenti, divieti) e AGENTS.md.

Imputato: src/engine/politics.ts, ministers.ts, ethnic.ts, src/scenario/politics1881.ts, ministers1881.ts, ethnic1881.ts, stabilità e stanchezza in economy.ts; test: tests/politica; docs/rapporti/1881-1899.md (418 crisi e 218 cambi di governo in 19 anni) (percorsi relativi a la radice del repository). Leggili per intero, insieme ai test che li riguardano in tests/ e alle parti di docs/SPEC.md che li descrivono. Segui le chiamate verso gli altri moduli quando serve.

Domande che la corte vuole vedere affrontate (non limitarti a queste):
- Regimi, capi, partiti, scadenze elettorali del 1881: giusti?
- Frequenza di crisi e cadute di governo: credibile nazione per nazione?
- Ministri: storici? effetti?
- Nazionalità e minoranze: hanno effetti (rivolte, separatismo)?
- La politica cambia qualcosa di concreto o è decorativa?
- Eventi dell'epoca che mancano (Alessandro II ucciso il 13 marzo 1881, Home Rule, Boulanger, socialismo).

Metodo: leggi, poi verifica con sonde misurate (regole del brief: solo nella cartella della corte, ≤90 s ciascuna, al massimo tre). Per ogni capo d'accusa: titolo; tipo (errore, difetto di modello, squilibrio, mancanza); gravità (critica, alta, media, bassa); prova (file:funzione:riga, misura, o fatto storico con fonte); effetto sul giocatore; rimedio proposto in una o due righe. Ordina i capi per gravità. Chiudi con: ciò che il motore fa BENE (da non rompere), e le interazioni con altri motori (compreso il coloniale).

Scrivi l'atto d'accusa in docs/corti/05-politica/accusa.md (massimo ~2500 parole). Alla fine rispondi solo con l'elenco dei capi d'accusa (una riga ciascuno, con gravità).
