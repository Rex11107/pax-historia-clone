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
| Intelligenza (02) | piano per gruppi con un obiettivo per fronte; guarnigioni; arruolamento a debito | nessun fronte sguarnito; Guerra del Pacifico verso il 1883 |
| Coloniale (00) | guerra coloniale come campagna, con un fronte per coppia | 0 vittorie senza condizioni; 0 fasi ripetute |
| Politica (05) | frequenza delle crisi per paese: troppe nei Paesi Bassi e in Belgio (legislatura di 2 anni), nessuna in Italia, Spagna (manca il turno) e Russia; Belgio col Congo −2,6 di stabilità (obiettivo meno di −2) | `scripts/sim/governi.mts`: governi per paese vicini a quelli storici (scheda B3, tabella delle misure) |
| Costruzione e ricerca (04) | `provinceCapacity` con la popolazione grezza (lasciata così in A2: è capienza militare locale); costi e tempi delle opere | — |

**Prima di cominciare**: rileggere in `STATO.md` le misure di riferimento e tenerle aggiornate dopo ogni intervento.
