# C — Bilanciamento

Si fa dopo i blocchi A e B. **Una partita di misura dopo ogni intervento**: il rapporto 1881-1899
(`scripts/sim/storia.mts`) prima e dopo, confrontato nella descrizione della PR. Un ramo per area
(`bil/economia`, `bil/guerra`…), un intervento per commit.

I dettagli sono nella sezione «Da fare nella fase di bilanciamento» di ciascun verdetto (`docs/corti/NN-…/verdetto.md`).
Quasi tutto è 🔴: si cambiano numeri che muovono l'intera simulazione.

| area (corte) | interventi | misura |
|---|---|---|
| Economia (03) | esercito e flotta al costo storico; gettito per paese; spesa dell'IA a fasce; opere al 5-15% l'anno; interesse per paese e default (sostituisce il tetto provvisorio di 12 anni di entrate del debito volontario, `DEBT_CAP_YEARS` in `economy.ts`); crescita della popolazione | risparmio in pace delle grandi potenze fra 5 e 15% (dopo A2: Regno Unito 30%, Stati Uniti 43%, Germania 30%) |
| Guerra (01) | fuoco tecnologico; malattia e clima; rifornimento per km; occupazione dopo una sosta; assedi a contatore; artiglieria proporzionata | battaglie e perdite plausibili nelle guerre del rapporto |
| ~~Intelligenza (02)~~ fatto (#38, esito sotto) | piano per gruppi con un obiettivo per fronte; guarnigioni; arruolamento a debito. Dopo B4: il Cile manda l'esercito sull'altopiano (Tarma), dove muore senza rifornimenti, e perde la Guerra del Pacifico nel 1881; con il Regno Unito in guerra coloniale pianificano anche i trenta Stati indiani (141 ms a turno contro 106) | nessun fronte sguarnito; Guerra del Pacifico verso il 1883 (l'ancora di Ancón c'è già, `War.resistance`); tempo del turno di nuovo vicino a `main` |
| Coloniale (00) | guerra coloniale come campagna, con un fronte per coppia (passo 4 del verdetto); scadenze di verifica con cause registrate e il «regolamento» su Congo e coste 1884-86 (passo 5); Samori oggi diventa protettorato già nel 1882 | `scripts/sim/traguardi.mts` su 4 semi: 0 paci senza condizioni (dopo B4: 0-2 per seme), 0 fasi ripetute; Congo e Sudan compiuti (dopo B4: mai) |
| Politica (05) | frequenza delle crisi per paese: troppe nei Paesi Bassi e in Belgio (legislatura di 2 anni), nessuna in Italia, Spagna (manca il turno) e Russia; Belgio col Congo −2,6 di stabilità (obiettivo meno di −2) | `scripts/sim/governi.mts`: governi per paese vicini a quelli storici (scheda B3, tabella delle misure) |
| Costruzione e ricerca (04) | `provinceCapacity` con la popolazione grezza (lasciata così in A2: è capienza militare locale); costi e tempi delle opere | — |

**Prima di cominciare**: rileggere in `STATO.md` le misure di riferimento e tenerle aggiornate dopo ogni intervento.

## Esito dell'area intelligenza (ramo `bil/ia`, 19 novembre 2026)

| punto del verdetto 02 | com'è stato fatto |
|---|---|
| 10, prestazioni | `planNation`: forza per provincia calcolata una volta, fronte e bersagli cercati solo intorno alle province nemiche (prima tutta la mappa per ognuna delle trenta nazioni al seguito del Regno Unito), alleanze in cache, Dijkstra fermato a 45 giorni. `updateSupply`: mappa dei belligeranti in cache finché non cambiano controllori, opere, logistica o posizioni nemiche. Primo commit identico al bit a `main` dopo 600 turni |
| 7, piano per gruppi | stima con la formula del combattimento (`attackPower`, `defensePower` in `combat.ts`); si attacca con 1,5 volte la difesa; chi non basta si concentra accanto al bersaglio (`concentramento`); bersagli pesati col rifornimento e con la capienza della provincia; chi è logoro si ritira dove arrivano i rifornimenti (`ritirata`) |
| 8, guarnigioni | la capitale non resta vuota e sul confine con un rivale maggiore in pace resta un corpo, al più un quarto dell'esercito, per chi ha almeno quattro unità |
| 9, arruolamento | forze del teatro (nemici a tre passi dalle nostre terre); in guerra difensiva si arruola a debito fino a `WAR_DEBT_YEARS` = 4 anni di entrate |
| 11, concentrazione ai confini | `borderAlert`: in pace, più di 30.000 uomini stranieri non alleati sul confine, metà del nostro esercito e il 40% del loro → mobilitazione parziale e un evento; in 300 turni del seme `b` scatta due volte (Russia-Qing nel 1881, Bolivia-Cile a guerra finita) |
| rifornimenti | con una marina almeno media riforniscono anche i porti occupati (il Cile a Iquique e Arica) |
| scenario | l'esercito cileno al 1° gennaio 1881 è diviso: 26.000 a Cañete, 8.000 a Tacna, il resto a Santiago; Pisco e Cañete occupate |

Test nuovi in `tests/ia.test.ts` (7). Tempo: 163 ms a turno contro 189 di `main`; `piani` da 42 a 15.

**Non raggiunto**: la Guerra del Pacifico finisce ancora nel settembre 1881 (4 semi su 4). Le unità prendono una
provincia indifesa appena ci entrano, quindi i corpi delle due parti razziano le retrovie del nemico invece di
tenere un fronte; il Cile perde Tarapacá e Iquique a un'unità boliviana di 4.000 uomini. È il punto «occupazione
dopo una sosta» dell'area guerra (01), da fare per prima.
