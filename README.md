# Regnum Historia

Grand strategy storico con AI: Europa e Mediterraneo dal 1° gennaio 1881. Guidi una nazione; le altre rispondono attraverso un motore deterministico e governi simulati da un modello linguistico, con cui tratti in conversazione libera.

## Scaricare e giocare

- **APK per Android:** [regnum-historia.apk](https://github.com/Rex11107/pax-historia-clone/releases/latest/download/regnum-historia.apk) (sempre l'ultima versione; elenco completo nelle [Releases](https://github.com/Rex11107/pax-historia-clone/releases)). Al primo avvio Android chiede di consentire l'installazione da fonti sconosciute per il browser.
- **Nel browser:** https://rex11107.github.io/pax-historia-clone/

Per la diplomazia e i dispacci narrati serve una chiave API di un provider compatibile OpenAI (predefinito: DeepSeek, modello `deepseek-v4-flash`). Si inserisce in Impostazioni e resta solo sul dispositivo. Senza chiave si possono comunque muovere gli eserciti e far avanzare i turni.

## Come funziona

Il principio del progetto è **il modello propone, il codice dispone**.

| Livello | Dove | Cosa fa |
| --- | --- | --- |
| Mappa | `scripts/map/` → `public/data/europe1881.json` | 1.404 province raggruppate in 265 regioni storiche, con microstati e possedimenti (Gibilterra, Helgoland, San Marino, Monaco…): unità amministrative d'epoca (HistoGIS per Prussia, Baviera, Baden e Cisleitania; RISTAT per l'Impero russo) e, altrove, Natural Earth; proprietari dai confini 1880 di historical-basemaps, verificati su 111 località storiche |
| Motore | `src/engine/` | movimento giorno per giorno tra province, ferrovie, stretti, rifornimenti, combattimento riproducibile, economia, politiche interne, trattati, guerre, riflessi delle nazioni non giocanti |
| AI | `src/llm/` | Game Master (direttive → ordini validati, dispaccio di fine turno, mosse delle altre nazioni entro limiti), agenti-nazione con profilo e regole di comportamento, memoria a livelli |
| Interfaccia | `src/ui/` | mappa su canvas, pannelli Esercito, Diplomazia, Governo, Dispacci; tutto il calcolo resta nel motore |

Un turno è una settimana (7 giorni simulati). Le province occupate sono tratteggiate col colore dell'occupante.

## Sviluppo

```bash
npm install
npm run dev        # server locale
npm test           # test del motore e del livello AI (senza rete)
npm run map        # rigenera la mappa dai dataset (scarica i dati in data-raw/)
npm run build      # build web in dist/
npx cap sync android && (cd android && ./gradlew assembleDebug)   # APK locale
```

Ogni push su `main` esegue i test, pubblica il sito su GitHub Pages e crea una release con l'APK (`.github/workflows/build.yml`).

### Firma dell'APK

Senza configurazione l'APK è di debug: si installa, ma per aggiornarlo bisogna disinstallare la versione precedente. Per aggiornamenti diretti aggiungi in *Settings → Secrets and variables → Actions* i segreti `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

## Licenze e fonti

Codice sotto GPL-3.0-or-later (richiesta dai dati di [historical-basemaps](https://github.com/aourednik/historical-basemaps)). Geografia da [Natural Earth](https://www.naturalearthdata.com/) (pubblico dominio). Spartiacque da HydroBASINS: Lehner, B., Grill G. (2013), Global river hydrography and network routing: baseline data and new approaches to study the world's large river systems, *Hydrological Processes* 27(15): 2171–2186, dati su [www.hydrosheds.org](https://www.hydrosheds.org) (uso libero anche commerciale; nel repository c'è solo il risultato derivato, non i dati originali). Unità amministrative d'epoca da [HistoGIS](https://histogis.acdh.oeaw.ac.at/) (ACDH-CH, Accademia austriaca delle scienze; CC BY 4.0): Regierungsbezirke prussiani, Kreise bavaresi, distretti del Baden, distretti della Cisleitania e Kronländer austro-ungarici. Uezd e governatorati dell'Impero russo da Kessler, Gijs and Andrei Markevich, *Electronic Repository of Russian Historical Statistics, 18th - 21st centuries*, https://ristat.org/, Version I (2020), mappe doi:10.34894/NQOASN (CC0). Nel repository ci sono solo i dati derivati (`public/data/europe1881.json`); per rigenerarli: `NODE_USE_ENV_PROXY=1 node scripts/map/fetch-histogis.mjs`, i file RISTAT dal ramo `data` (istruzioni in `scripts/map/ristat_to_geojson.py`), poi `npm run map`. Nomi delle città minori da [GeoNames](https://www.geonames.org/) (CC BY 4.0, tramite lmfmaier/cities-json). Caratteri Alegreya e Alegreya Sans (SIL Open Font License). Nessun asset di giochi commerciali.
