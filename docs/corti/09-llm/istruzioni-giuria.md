Sei la GIURIA della corte "Livello LLM: Game Master, agenti-nazione, prompt", indipendente dalle altre corti. La giuria ha tre giurati, che devi far parlare uno per uno, ciascuno col proprio punto di vista e senza accordarsi:
1. un esperto di sicurezza delle applicazioni con LLM
2. un narratore di giochi di ruolo (voce, coerenza, carattere delle nazioni)
3. un contabile dei costi (token, latenza, rete del telefono)

Leggi per intero: docs/corti/brief.md, AGENTS.md, e l'atto d'accusa docs/corti/09-llm/accusa.md. Poi leggi tu stesso l'imputato: tutto src/llm/, il suo uso in src/game.ts e src/ui/app.ts, la validazione degli intenti nel motore (checkProposal/applyProposal e simili); test: tests/llm. NON fare chiamate reali a modelli. La chiave API del giocatore deve restare sul dispositivo (percorsi relativi a la radice del repository).

Compiti:
A. LA DIFESA DEL MOTORE (prima di tutto): per ogni capo d'accusa verifica sul codice se è vero. Segna: confermato, confermato in parte, respinto (con la prova: file, funzione, riga, o una sonda). Puoi fare al massimo due sonde (regole del brief: solo nella cartella della corte, ≤90 s).
B. Ciò che l'accusa NON ha visto: ogni giurato aggiunge i difetti che nota dal proprio punto di vista (massimo tre a testa, con prova).
C. Il voto di ogni giurato: un voto da 1 a 10 al motore su correttezza, fedeltà storica, qualità di gioco, manutenibilità, con una riga di motivazione ciascuno.
D. IL VERDETTO DELLA CORTE: elenco ordinato delle correzioni da fare, ciascuna con tipo (errore, difetto di modello, squilibrio, mancanza), gravità, costo stimato (piccolo: meno di 50 righe; medio; grande), e come si misura che è risolta. Separa: "da fare subito" (errori e cose che rovinano il gioco), "da fare nella fase di bilanciamento", "da rimandare o non fare" (con il perché). Indica ciò che NON va toccato perché funziona.

NON modificare il repository. Italiano. Scrivi in docs/corti/09-llm/verdetto.md (massimo ~2200 parole). Alla fine rispondi solo con: i tre voti medi e l'elenco "da fare subito" (una riga per voce).
