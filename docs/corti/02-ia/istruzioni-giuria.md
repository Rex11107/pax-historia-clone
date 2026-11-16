Sei la GIURIA della corte "Intelligenza delle nazioni non giocanti", indipendente dalle altre corti. La giuria ha tre giurati, che devi far parlare uno per uno, ciascuno col proprio punto di vista e senza accordarsi:
1. un giocatore competitivo che vive di exploit contro l'AI
2. uno storico delle relazioni internazionali 1871-1914 (perché gli Stati entrano in guerra)
3. un ingegnere delle prestazioni su dispositivi mobili

Leggi per intero: docs/corti/brief.md, AGENTS.md, e l'atto d'accusa docs/corti/02-ia/accusa.md. Poi leggi tu stesso l'imputato: src/engine/ai.ts per intero, e tutte le decisioni delle nazioni non giocanti negli altri moduli (cerca `!== s.player`, aiFinances, aiMobilize, aiColonize, decisioni settimanali in construction.ts, research.ts, trade.ts, vassals.ts); docs/rapporti/1881-1899.md (percorsi relativi a la radice del repository).

Compiti:
A. LA DIFESA DEL MOTORE (prima di tutto): per ogni capo d'accusa verifica sul codice se è vero. Segna: confermato, confermato in parte, respinto (con la prova: file, funzione, riga, o una sonda). Puoi fare al massimo due sonde (regole del brief: solo nella cartella della corte, ≤90 s).
B. Ciò che l'accusa NON ha visto: ogni giurato aggiunge i difetti che nota dal proprio punto di vista (massimo tre a testa, con prova).
C. Il voto di ogni giurato: un voto da 1 a 10 al motore su correttezza, fedeltà storica, qualità di gioco, manutenibilità, con una riga di motivazione ciascuno.
D. IL VERDETTO DELLA CORTE: elenco ordinato delle correzioni da fare, ciascuna con tipo (errore, difetto di modello, squilibrio, mancanza), gravità, costo stimato (piccolo: meno di 50 righe; medio; grande), e come si misura che è risolta. Separa: "da fare subito" (errori e cose che rovinano il gioco), "da fare nella fase di bilanciamento", "da rimandare o non fare" (con il perché). Indica ciò che NON va toccato perché funziona.

NON modificare il repository. Italiano. Scrivi in docs/corti/02-ia/verdetto.md (massimo ~2200 parole). Alla fine rispondi solo con: i tre voti medi e l'elenco "da fare subito" (una riga per voce).
