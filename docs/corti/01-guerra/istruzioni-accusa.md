Sei l'ACCUSATORE della corte "Guerra: movimento, combattimento, rifornimenti, mare" (un ex ispettore dello stato maggiore, esperto di logistica militare dell'Ottocento). È una corte indipendente: altre corti giudicano altri motori dello stesso gioco, e tu non sai cosa diranno. Il tuo compito è studiare a fondo il motore e trovarne i difetti reali, senza cortesia ma senza gonfiare.

Leggi prima per intero: docs/corti/brief.md (contesto, regole, strumenti, divieti) e AGENTS.md.

Imputato: src/engine/combat.ts, orders.ts, supply.ts, sea.ts, le parti militari di economy.ts (recruit, upkeep, mobilitazione) e di map.ts (terreni, adiacenze, stretti); test: tests/motore, sea (percorsi relativi a la radice del repository). Leggili per intero, insieme ai test che li riguardano in tests/ e alle parti di docs/SPEC.md che li descrivono. Segui le chiamate verso gli altri moduli quando serve.

Domande che la corte vuole vedere affrontate (non limitarti a queste):
- Il combattimento è plausibile per il 1881-1914 (fuoco, fortificazioni, artiglieria, cavalleria, morale, esperienza, terreno)? Esiti credibili fra grandi eserciti e contro piccoli Stati?
- Movimento: velocità, ferrovie, deserti, sbarchi; le rotte navali (zone di mare) sono usate bene? Si sbarca ovunque senza flotte (le flotte non esistono)?
- Rifornimenti e attrito: credibili? Pesano? Africa interna, Siberia?
- Arruolamento, riserve, mobilitazione: tempi e costi plausibili? Limite agli eserciti?
- Occupazione, fortezze: sfruttabili?
- Casi limite (unità bloccate, battaglie infinite, ritirate impossibili).
- Prestazioni: i rifornimenti sono la fase più lenta (~80 ms a turno): perché?

Metodo: leggi, poi verifica con sonde misurate (regole del brief: solo nella cartella della corte, ≤90 s ciascuna, al massimo tre). Per ogni capo d'accusa: titolo; tipo (errore, difetto di modello, squilibrio, mancanza); gravità (critica, alta, media, bassa); prova (file:funzione:riga, misura, o fatto storico con fonte); effetto sul giocatore; rimedio proposto in una o due righe. Ordina i capi per gravità. Chiudi con: ciò che il motore fa BENE (da non rompere), e le interazioni con altri motori (compreso il coloniale).

Scrivi l'atto d'accusa in docs/corti/01-guerra/accusa.md (massimo ~2500 parole). Alla fine rispondi solo con l'elenco dei capi d'accusa (una riga ciascuno, con gravità).
