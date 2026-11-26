# C — Bilanciamento

Si fa dopo i blocchi A e B. **Una partita di misura dopo ogni intervento**: il rapporto 1881-1899
(`scripts/sim/storia.mts`) prima e dopo, confrontato nella descrizione della PR. Un ramo per area
(`bil/economia`, `bil/guerra`…), un intervento per commit.

I dettagli sono nella sezione «Da fare nella fase di bilanciamento» di ciascun verdetto (`docs/corti/NN-…/verdetto.md`).
Quasi tutto è 🔴: si cambiano numeri che muovono l'intera simulazione.

| area (corte) | interventi | misura |
|---|---|---|
| Economia (03) | esercito e flotta al costo storico; gettito per paese; spesa dell'IA a fasce; opere al 5-15% l'anno; interesse per paese e default (sostituisce il tetto provvisorio di 12 anni di entrate del debito volontario, `DEBT_CAP_YEARS` in `economy.ts`); crescita della popolazione | risparmio in pace delle grandi potenze fra 5 e 15% (dopo A2: Regno Unito 30%, Stati Uniti 43%, Germania 30%) |
| ~~Guerra (01)~~ fatto (#40, esito sotto) | fuoco tecnologico; malattia e clima; rifornimento per km; occupazione dopo una sosta; assedi a contatore; artiglieria proporzionata | battaglie e perdite plausibili nelle guerre del rapporto |
| ~~Intelligenza (02)~~ fatto (#38, esito sotto) | piano per gruppi con un obiettivo per fronte; guarnigioni; arruolamento a debito. Dopo B4: il Cile manda l'esercito sull'altopiano (Tarma), dove muore senza rifornimenti, e perde la Guerra del Pacifico nel 1881; con il Regno Unito in guerra coloniale pianificano anche i trenta Stati indiani (141 ms a turno contro 106) | nessun fronte sguarnito; Guerra del Pacifico verso il 1883 (l'ancora di Ancón c'è già, `War.resistance`); tempo del turno di nuovo vicino a `main` |
| Coloniale (00) | guerra coloniale come campagna, con un fronte per coppia (passo 4 del verdetto); scadenze di verifica con cause registrate e il «regolamento» su Congo e coste 1884-86 (passo 5); Samori oggi diventa protettorato già nel 1882 | `scripts/sim/traguardi.mts` su 4 semi: 0 paci senza condizioni (dopo B4: 0-2 per seme), 0 fasi ripetute; Congo e Sudan compiuti (dopo B4: mai) |
| ~~Politica (05)~~ fatto (#41, esito sotto) | frequenza delle crisi per paese: troppe nei Paesi Bassi e in Belgio (legislatura di 2 anni), nessuna in Italia, Spagna (manca il turno) e Russia; Belgio col Congo −2,6 di stabilità (obiettivo meno di −2) | `scripts/sim/governi.mts`: governi per paese vicini a quelli storici (scheda B3, tabella delle misure) |
| ~~Costruzione e ricerca (04)~~ fatto (#42, esito sotto) | IA che costruisce per valore, patti dell'IA, velocità legata alla massa economica, conoscenze del 1881 per paese; **rimandati** costi e tempi delle opere (dipendono dalle casse, area economia) e `provinceCapacity` (decisione sotto) | `scripts/sim/costruzione.mts` |

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

## Correzioni piccole (ramo `fix/c-piccole`, 19 novembre 2026)

| correzione | com'è stata fatta | misura |
|---|---|---|
| cessioni | `applyDemand` calcola i resti piccoli staccati dalla capitale (prima `checkCession` senza `antiGore` non li calcolava e restavano exclavi del perdente) | test in `pace.test.ts`, fallisce su `main` (Finnmark (est) restava svedese) |
| Belgio col Congo (politica, 05) | `COLONIAL_STABILITY` = 0,5: sulla stabilità un suddito coloniale pesa la metà del suo peso sul bilancio. Salvataggi alla versione 4 (il riferimento `ethnicBase` si ricalcola) | da −2,6 a −1,4 (obiettivo: meno di −2) |
| Samori (coloniale, 00) | `LOCAL_STANCE.notBefore`: nessun protettorato prima del 1886. `stanceRefusal` unico per trattato, imposizione e **pace**: la richiesta di vassallaggio nella pace scavalcava le posizioni dei regni locali | protettorato fra il 1888 e il 1889 su 4 semi (prima: 1882) |

**Rimane una decisione del giocatore**: la Triplice Alleanza (1882) non può nascere con la regola delle alleanze
incompatibili (scheda B2): eccezione per le alleanze difensive, o fase D.

## Esito dell'area guerra (ramo `bil/guerra`, 21 novembre 2026)

| punto del verdetto 01 | com'è stato fatto |
|---|---|
| 10, occupazione e assedio | `besiege` in `orders.ts`: una provincia nemica senza difensori passa di mano dopo `OCCUPY_DAYS` = 3 giorni di sosta, una terra di nessuno dopo `NOBODY_DAYS` = 7, una fortezza dopo `SIEGE_DAYS_PER_LEVEL` = 30 giorni a livello (evento `siege`); chi passa senza fermarsi non prende nulla; la battaglia vinta non vale più la provincia; un ordine d'attacco resta attivo finché la provincia non è presa. L'IA soccorre le proprie province dove il nemico è entrato. L'interfaccia mostra «occupa X: d/n giorni» |
| 8, divario di fuoco | `firepower` in `combat.ts` (retrocarica 0,35, ripetizione 0,2, mitragliatrice 0,3, cannoni d'acciaio 0,15, tiro rapido 0,15, senza fumo 0,1): le perdite inflitte si moltiplicano per il rapporto di fuoco. Regno Unito 1,5 contro 1,0 dei regni africani; fra europei non cambia nulla |
| 11, ritirata ordinata | `disengage`: un'unità in battaglia con un ordine di marcia si sgancia verso la provincia amica più vicina alla meta, pagando l'inseguimento e un po' di morale |
| 12, armi | l'artiglieria vale fino a un cannoniere ogni due fanti (`artEfficiency`); la cavalleria nemica infligge fino al 10% a chi ripiega (`PURSUIT_LOSS`); mantenimento per arma (`UPKEEP_ARM`: cavalleria 1,4, artiglieria 1,5) |
| 9, febbri | `tropicalSickness` in `supply.ts`: 0,15% al giorno per le truppe di una nazione temperata in campagna fra i tropici, sotto montagne e deserti esclusi; chinino e medicina tropicale la riducono |
| 13, fronte | in una provincia combattono al più il doppio della sua capienza, mai meno di 40.000 uomini |

Test nuovi in `tests/guerra.test.ts` (8). Traguardi su 4 semi: Tunisi fra aprile e ottobre 1881; Samori protettorato
nel 1887 in due semi (storico), nel 1890 e nel 1894 negli altri; il Congo compiuto in un seme (1898); guerre coloniali
11-15 per seme (prima 8-11), paci senza condizioni 1-3.

**Non fatto**: il rifornimento per km e terreno e le province occupate «non subito retrovia» (punto 9, seconda
parte): cambiano la mappa dei rifornimenti di tutte le guerre e vanno misurati da soli. **Guerra del Pacifico**:
finisce fra gennaio e febbraio 1882 (prima settembre 1881); per arrivare ad Ancón servono armate e un fronte (fase D).

## Esito dell'area politica (ramo `bil/politica`, 21 novembre 2026)

| punto del verdetto 05 | com'è stato fatto |
|---|---|
| 10, frequenza dei governi | `halfRenewal` (Paesi Bassi, Belgio: si rinnova metà Camera); `crisisScale` (Belgio 0,3, Paesi Bassi 0,4); `cabinetYears` (Italia 1,3, Francia 2,5, Regno Unito 5, Spagna e Portogallo 3,5): crisi di gabinetto anche con la maggioranza, col capo successivo della stessa maggioranza; `turno` (Spagna, Portogallo): la Corona chiama l'opposizione dinastica, che fa le elezioni; con le elezioni fatte (`managed` ≥ 20) la fiducia guarda la Camera più del paese; un rimpasto con lo stesso capo non è un nuovo governo. Capi dopo il 1885 con gli anni (`LEADER_YEARS`) |
| capo 6, prima situazione | `POLITICAL_EVENTS`: l'assassinio di Alessandro II (13 marzo 1881, cade Loris-Melikov, Ignat'ev all'Interno) e Tolstoj (giugno 1882) |
| 11, la politica sente la pace | `peaceVerdict`: chi cede, paga o si sottomette −8 di luna di miele, chi guadagna +4, chi attacca e non ottiene nulla −4 |
| 9, stanchezza | `baseWeariness`: 0,06 a settimana invece di 0,3 per una grande potenza contro soli Stati minori |
| 13, nazionalità (prima parte) | perdere popoli altrui non dà più stabilità (era fino a +3) |

**Misure** (`governi.mts`, semi `regnum` e `b`; storia fra parentesi):

| paese | governi | prima | storia |
|---|---|---|---|
| Italia | 8-12 | 1 | una dozzina |
| Francia | 14-15 | 17 | una ventina |
| Regno Unito | 4-10 | 5 | 7 |
| Spagna | 6-8 | 1 | 8 (turno) |
| Paesi Bassi | 6-7 | 18 | 6-7 |
| Belgio | 4-5 | 11 | 5 |
| Russia | 6, 4 crisi | 1, nessuna | almeno una crisi (1881) |

In Italia la sequenza esce storica: Cairoli, Depretis dal 1881 al 1887, Crispi, Giolitti. Test nuovi in
`politica.test.ts` (7).

**Errore trovato**: un posto ministeriale vuoto assegnato a `undefined` faceva divergere la partita dal salvataggio
(ordine dei posti). Corretto in `ministers.ts` con `delete`.

**Non fatto**: ancoraggi elettorali e tendenze strutturali (punto 12), partiti nazionali legati alle loro terre
(punto 13, seconda parte), ministri fino al 1900 e parlamenti composti (punto 14).

## Esito dell'area costruzione e ricerca (ramo `bil/costruzione`, 26 novembre 2026)

Misura: `scripts/sim/costruzione.mts` (nuovo; 19 anni, seme `regnum`, solo non giocanti). Prima → dopo:

| indicatore | prima | dopo |
|---|---|---|
| province con opere, Russia / Spagna / Paesi Bassi / Giappone / Impero ottomano | 57→59 / 18→19 / 14→14 / 11→15 / 10→17 | 57→74 / 18→47 / 14→41 / 11→41 / 10→45 |
| livelli di porto a fine periodo, Francia / Italia / Giappone | 22 / 15 / 7 | 33 / 41 / 40 |
| conoscenze al 1899 (le tecniche sono 62): Germania, Francia / Russia, Italia / Spagna / Impero ottomano / Giappone | 62, 62 / 59, 59 / 53 / 23 / 23 | 61, 60 / 50, 53 / 40 / 28 / 21 |
| patti di ricerca fra non giocanti | 0 | 1-3 in 19 anni |
| tempo della simulazione di 19 anni | 3 min 01 | 2 min 35 |

| punto del verdetto 04 | com'è stato fatto |
|---|---|
| 8, IA che costruisce | per ognuna delle 40 province più popolose (pesate col peso coloniale) tutte le opere possibili, porti compresi, con valore per milione speso, un po' di rumore deterministico e le sei migliori provate nell'ordine; fortezze sul confine coi rivali, bellica se la logistica è corta, miniere dove c'è il minerale |
| 9, velocità e massa | `baseSpeed` in `research.ts`: (0,45 + industria/200) × (0,6 + 0,4 × √(entrate/30)); un paese povero va più piano, l'industria rende meno al margine |
| 10, conoscenze per paese | `KNOWN_1881_EXTRA` (USA: pezzi intercambiabili e telefono; Germania: Thomas; Giappone, Impero Qing, Impero ottomano: retrocarica e telegrafo); date di pezzi intercambiabili (1860), telefono (1877), cherosene (1865, `start` 30) |
| 13, patti dell'IA | `aiCollab`: chi avvia una ricerca la propone a un alleato o a un partner commerciale con `collabScore`, il 40% delle volte |
| 15, prestazioni | `hasRes` scorre solo le province controllate (`controlled`, ora esportata) |
| 16, dati | «Bonifica integrale» (Serpieri, 1928) → «Bonifica e colonizzazione dei terreni»; test nuovi: 4 (`ricerca` 2 + 1, `costruzione` 1) |

**Decisioni**:
- `provinceCapacity` **resta con la popolazione grezza**: è la capienza militare locale (quanti uomini si nutrono sul posto), e col peso coloniale le guerre in India e in Africa avrebbero perso i rifornimenti, cioè la parte coloniale di B4. Il peso coloniale vale dove si parla di entrate e logistica dello stato, già fatto in A2.
- Costi e tempi delle opere **non si toccano** adesso: dipendono dalle casse gonfiate (area economia). Rifarli prima significa rifarli dopo.

**Non fatto**: punti 11 (tecniche 1895-1912 e linea navale; lavoro grosso, fase D col mare), 12 (allineamento dei livelli seminati, per il resto di A2) e 14 (medicina tropicale nel coloniale, area coloniale).
Traguardi coloniali invariati dopo le modifiche (Tunisi luglio 1881, Samori 1887; Congo e Sudan ancora «mai» nel seme `regnum`).
