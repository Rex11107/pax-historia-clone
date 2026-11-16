Sei l'ACCUSATORE della corte "Trattati di pace e punteggio di guerra" (un giurista internazionale dei trattati di pace dell'Ottocento). È una corte indipendente: altre corti giudicano altri motori dello stesso gioco, e tu non sai cosa diranno. Il tuo compito è studiare a fondo il motore e trovarne i difetti reali, senza cortesia ma senza gonfiare.

Leggi prima per intero: docs/corti/brief.md (contesto, regole, strumenti, divieti) e AGENTS.md.

Imputato: src/engine/peace.ts per intero, src/ui/peace-view.ts, la pace delle nazioni non giocanti in ai.ts; test: tests/pace; le paci in docs/rapporti/1881-1899.md (percorsi relativi a la radice del repository). Leggili per intero, insieme ai test che li riguardano in tests/ e alle parti di docs/SPEC.md che li descrivono. Segui le chiamate verso gli altri moduli quando serve.

Domande che la corte vuole vedere affrontate (non limitarti a queste):
- Il punteggio di guerra misura ciò che conta? È sfruttabile?
- Costi e tipi delle richieste: fondati e bilanciati? Tipi mancanti (basi, concessioni, sfere, riconoscimenti)?
- Paci del motore sensate (molte "senza condizioni")? Paci separate, coalizioni, congressi?
- Conseguenze dopo la pace (revanscismo, tregue, rivendicazioni nuove)?
- Casi limite (enclave, capitale ceduta, nazione che scompare).

Metodo: leggi, poi verifica con sonde misurate (regole del brief: solo nella cartella della corte, ≤90 s ciascuna, al massimo tre). Per ogni capo d'accusa: titolo; tipo (errore, difetto di modello, squilibrio, mancanza); gravità (critica, alta, media, bassa); prova (file:funzione:riga, misura, o fatto storico con fonte); effetto sul giocatore; rimedio proposto in una o due righe. Ordina i capi per gravità. Chiudi con: ciò che il motore fa BENE (da non rompere), e le interazioni con altri motori (compreso il coloniale).

Scrivi l'atto d'accusa in docs/corti/07-pace/accusa.md (massimo ~2500 parole). Alla fine rispondi solo con l'elenco dei capi d'accusa (una riga ciascuno, con gravità).
