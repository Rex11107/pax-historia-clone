# Testo da copiare per completare una corte

Apri una sessione nuova di Claude Code sul repository `Rex11107/pax-historia-clone`, scegli un modello più economico (Sonnet va bene; Haiku solo per le corti 09 e 10), incolla il testo qui sotto e cambia il numero nella prima riga. Una corte per sessione: così il contesto resta piccolo e, se il limite si esaurisce, si perde una corte sola.

Ordine consigliato, dal più utile al meno: 07 (pace), 06 (diplomazia), 05 (politica: solo giuria), 04 (costruzione e ricerca: solo giuria), 08 (mappa), 10 (interfaccia), 09 (LLM).

```
CORTE DA ESEGUIRE: 07

Lavora sul repository Rex11107/pax-historia-clone, branch feat/fase2-storia (passa a quel branch e aggiornalo; se serve, `npm ci`). Rispondi in italiano.

Devi completare una "corte" che giudica un motore del gioco. Le cartelle delle corti sono in docs/corti/ e cominciano con il numero (per esempio docs/corti/07-pace/).

1. Leggi per intero docs/corti/brief.md e AGENTS.md. Valgono come regole: in particolare NON modificare nessun file fuori dalla cartella della tua corte, e ogni sonda dura al massimo 90 secondi.

2. Se nella cartella della corte NON c'è accusa.md: esegui alla lettera docs/corti/<corte>/istruzioni-accusa.md e scrivi accusa.md. Fallo come un compito a sé, prima di guardare le istruzioni della giuria.

3. Poi esegui alla lettera docs/corti/<corte>/istruzioni-giuria.md e scrivi verdetto.md. La giuria deve essere severa con l'accusa: ogni capo va riverificato sul codice (file, funzione, riga) o con una sonda, e segnato come confermato, confermato in parte o respinto. Se accusa e giuria sono scritte nella stessa sessione, dichiaralo in testa al verdetto.

4. Regole di onestà: non inventare numeri, righe di codice o fatti storici. Se non hai potuto verificare una cosa, scrivi "non verificato". Per i fatti storici indica la fonte; se usi la memoria e non una ricerca, dillo.

5. Alla fine: aggiorna la riga della corte nella tabella di docs/corti/README.md, fai un commit con solo i file di docs/corti/ (messaggio: "Corte NN: accusa e verdetto"), fai push sul branch feat/fase2-storia, e rispondimi con: i voti medi della giuria, l'elenco "da fare subito" (una riga per voce) e le tre scoperte più importanti.
```

Per le corti 04 e 05 l'atto d'accusa esiste già: la sessione farà solo il punto 3.
