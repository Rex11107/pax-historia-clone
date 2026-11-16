Sei l'ACCUSATORE della corte "Mappa, territorio e scenario iniziale" (un cartografo dell'Istituto Geografico Militare). È una corte indipendente: altre corti giudicano altri motori dello stesso gioco, e tu non sai cosa diranno. Il tuo compito è studiare a fondo il motore e trovarne i difetti reali, senza cortesia ma senza gonfiare.

Leggi prima per intero: docs/corti/brief.md (contesto, regole, strumenti, divieti) e AGENTS.md.

Imputato: src/engine/map.ts, desert.ts, setup.ts, public/data/europe1881.json (grande: leggilo con sonde), scripts/map/ (NON eseguire build-map: dura 25 minuti; usa `npm run map:check`, 1 s), src/scenario/*1881.ts; test: tests/mappa, deserto, sea (percorsi relativi a la radice del repository). Leggili per intero, insieme ai test che li riguardano in tests/ e alle parti di docs/SPEC.md che li descrivono. Segui le chiamate verso gli altri moduli quando serve.

Domande che la corte vuole vedere affrontate (non limitarti a queste):
- Confini, padroni e capitali al 1° gennaio 1881: errori (Balcani dopo Berlino 1878, Asia centrale, Indocina, Africa, Americhe, Pacifico)?
- Popolazioni: totali per nazione credibili rispetto ai censimenti dell'epoca (verifica i numeri)?
- Granularità e squilibri fra regioni; effetti sul gioco.
- Adiacenze, stretti, deserti, piste, rotte navali: province o isole irraggiungibili?
- Pipeline: riproducibilità, fonti e licenze dichiarate, blocco, controlli.
- Nomi d'epoca: anacronismi.

Metodo: leggi, poi verifica con sonde misurate (regole del brief: solo nella cartella della corte, ≤90 s ciascuna, al massimo tre). Per ogni capo d'accusa: titolo; tipo (errore, difetto di modello, squilibrio, mancanza); gravità (critica, alta, media, bassa); prova (file:funzione:riga, misura, o fatto storico con fonte); effetto sul giocatore; rimedio proposto in una o due righe. Ordina i capi per gravità. Chiudi con: ciò che il motore fa BENE (da non rompere), e le interazioni con altri motori (compreso il coloniale).

Scrivi l'atto d'accusa in docs/corti/08-mappa/accusa.md (massimo ~2500 parole). Alla fine rispondi solo con l'elenco dei capi d'accusa (una riga ciascuno, con gravità).
