Sei l'ACCUSATORE della corte "Intelligenza delle nazioni non giocanti" (un programmatore di AI per giochi di strategia). È una corte indipendente: altre corti giudicano altri motori dello stesso gioco, e tu non sai cosa diranno. Il tuo compito è studiare a fondo il motore e trovarne i difetti reali, senza cortesia ma senza gonfiare.

Leggi prima per intero: docs/corti/brief.md (contesto, regole, strumenti, divieti) e AGENTS.md.

Imputato: src/engine/ai.ts per intero, e tutte le decisioni delle nazioni non giocanti negli altri moduli (cerca `!== s.player`, aiFinances, aiMobilize, aiColonize, decisioni settimanali in construction.ts, research.ts, trade.ts, vassals.ts); docs/rapporti/1881-1899.md (percorsi relativi a la radice del repository). Leggili per intero, insieme ai test che li riguardano in tests/ e alle parti di docs/SPEC.md che li descrivono. Segui le chiamate verso gli altri moduli quando serve.

Domande che la corte vuole vedere affrontate (non limitarti a queste):
- Strategia di guerra: obiettivi, concentrazione, difesa, ritirata, mare, alleati. Perché è lenta? Quanto è facile batterla?
- Perché non dichiara mai guerre fra Stati? Cosa servirebbe (rivendicazioni, rivalità, occasioni, alleanze)?
- Pace: quando e come; accetta proposte del giocatore in modo sensato?
- Economia: perché accumula e non spende?
- Usa le stesse regole del giocatore o ha scorciatoie? Exploit del giocatore contro l'AI?
- Prestazioni dei piani (~40 ms) e determinismo.

Metodo: leggi, poi verifica con sonde misurate (regole del brief: solo nella cartella della corte, ≤90 s ciascuna, al massimo tre). Per ogni capo d'accusa: titolo; tipo (errore, difetto di modello, squilibrio, mancanza); gravità (critica, alta, media, bassa); prova (file:funzione:riga, misura, o fatto storico con fonte); effetto sul giocatore; rimedio proposto in una o due righe. Ordina i capi per gravità. Chiudi con: ciò che il motore fa BENE (da non rompere), e le interazioni con altri motori (compreso il coloniale).

Scrivi l'atto d'accusa in docs/corti/02-ia/accusa.md (massimo ~2500 parole). Alla fine rispondi solo con l'elenco dei capi d'accusa (una riga ciascuno, con gravità).
