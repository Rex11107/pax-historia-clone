# AGENTS.md — regole non negoziabili

Regnum Historia è un gioco di grande strategia storica: Europa e Mediterraneo dal 1º gennaio 1881,
TypeScript + Vite + Capacitor (APK Android), pubblicato su GitHub Pages e nelle Releases.
Questo file è il contratto per chi lavora al codice. `docs/SPEC.md` resta la descrizione estesa
delle fasi; in caso di dubbio, vince questo file.

## Principi

1. **Il modello propone, il codice dispone.** Nessuna azione dell'AI scrive lo stato del mondo:
   l'AI produce intenti strutturati, il motore li valida e li applica.
2. **`src/engine/` è deterministico**: niente chiamate di rete, niente file, niente LLM, niente
   `Date.now()` o `Math.random()` nello stato. Stesso input, stesso risultato.
3. **Le regole di gioco stanno nel motore**, non nell'interfaccia: la mappa disegna, il motore decide.
4. **Un turno è una settimana** (7 giorni simulati). Non cambiare questa unità senza motivo dichiarato.

## Mappa

5. **La mappa si genera, non si scrive a mano.** `public/data/europe1881.json` è un artefatto:
   nasce da `scripts/map/` con `npm run map`. Non modificare province, archi o `arcSides` a mano:
   il file è un mosaico topologico e ogni ritocco manuale rompe le adiacenze (è già successo).
6. **La mappa approvata è bloccata.** `scripts/map/lock/*.json` è il riferimento: le aree già
   approvate devono restare identiche. Se il lock non copre la zona che stai toccando, prima
   estendi il lock, poi rigenera.
7. **`MAP_LOCK=0` solo per ricostruire il lock**, mai in un commit destinato alla pubblicazione.
8. **Nomi d'epoca obbligatori**: 1881, non nomi moderni. "Impero ottomano", "Austria-Ungheria",
   "Regno d'Italia", "Cisleitania", non "Turchia", "Austria", "Italia".
9. **Le fonti si citano**: Natural Earth, historical-basemaps 1880, HydroBASINS, HistoGIS, RISTAT,
   DataMeet, GeoNames. Ogni nuovo dato dichiara la sua fonte e la sua licenza.
10. **`data-raw/` e `node_modules/` non si committano.** Contengono i dataset scaricati.

### Oasi, deserto e terra di nessuno

11. **Un collegamento non salta una terra di nessuno.** Se una pista attraversa una provincia
    libera (senza padrone, percorribile) deve agganciarsi a quella, non passarle sopra per
    arrivare a una provincia più lontana.
12. **Un'oasi ha al massimo 2 collegamenti con province non-oasi.** Il resto deve passare da
    altre oasi.
13. **Un'oasi sta dentro il deserto.** Se non è circondata da deserto va assorbita (confine
    della provincia reso naturale) o allargata a provincia normale prendendo territorio ai
    vicini, con confini naturali e senza mangiare troppo deserto: può essere piccola.

Le regole 11 e 12 sono **applicate**: stanno in `scripts/map/check-oasi.mjs`, importato da
`check-map.mjs`, quindi girano con `npm run map:check` e nel workflow `Build`. Una mappa che le
viola non si pubblica; le eccezioni accettate vanno in `check-allow.json` sotto `oasi`. La
regola 13 è un giudizio, quindi il controllo la stampa come informativa senza far fallire nulla.
Non riscriverle qui: questo è il promemoria, il codice è la regola.

## Verifica

Misure reali sul repo (8 novembre 2026), non stime:

| comando | tempo | cosa fa |
|---|---|---|
| `npm run typecheck` | meno di 1 s | `tsc --noEmit` |
| `npm run map:check` | 1 s | controlli geometrici, crea `data-raw/tmp` da sé |
| `npx vitest run tests/engine.test.ts -t "vassalli"` | 2 s | un test mirato |
| `npm run quick` | 150 s | test dei file cambiati |
| `npm test` | 142 s | tutti i 67 test |

**`--changed` non riduce nulla, oggi**: i 67 test stanno in due file e `engine.test.ts` importa tutto
il motore, quindi ogni modifica in `src/engine` segna entrambi i file come "affected" (2 su 2).
Il ciclo corto vero è il filtro per nome:

```bash
npx vitest run tests/engine.test.ts -t "vassalli"    # 2 s, 1 test, 50 saltati
npm run quick -- tests/engine.test.ts -t "vassalli"  # equivalente
```

Quando i test saranno divisi per sottosistema (combat, economia, diplomazia…), `npm run quick`
diventerà selettivo da solo. Fino ad allora, per il giro corto si usa `-t`; `npm test` completo
prima di una PR.

- Se tocchi `scripts/map/`, `public/data/` o `src/scenario/*1881.ts`, **`npm run map:check` è
  obbligatorio** prima di committare: esce diverso da `exclave 0, enclave 0, forma 0`? Fermati.
  Le segnalazioni preesistenti accettate stanno in `scripts/map/check-allow.json`.
- La build non si lancia a mano: la esegue GitHub Actions.

## Pubblicazione

11. **Si lavora su branch e pull request**, mai direttamente su `main`.
12. **Sito e APK si aggiornano solo con un push su `main`**: il workflow `.github/workflows/build.yml`
    parte da lì, e una PR da sola non produce nulla. `main` = versione pubblicata.
13. Se il job `test` della CI fallisce, non viene pubblicato niente: il sito resta alla versione
    precedente. Non serve "aggiustare" la release a mano.

## Stile

14. **Italiano** per interfaccia, testi, commenti e nomi delle province. Codice e identificatori in
    inglese quando è idioma del progetto.
15. **Commenti che spiegano il perché**, non il cosa. Un commento per ogni scelta storica o
    geometrica non ovvia.
16. **Niente refactor non richiesti** dentro una correzione: un commit, un motivo.

## Prima di dire "fatto"

- `npm run check` verde (o `npm test` se hai toccato il motore).
- Se hai toccato la mappa: `npm run map:check` identico a prima, oppure differenza dichiarata e voluta.
- Se hai toccato il codice dell'interfaccia: `npx tsc --noEmit` verde, perché è il primo passo della CI.
- Il diff contiene solo i file che servono.
