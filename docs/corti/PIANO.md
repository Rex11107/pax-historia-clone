# Piano di implementazione dalle corti

16 novembre 2026. Unisce i verdetti delle undici corti (00-10). Ogni voce rimanda alla corte che l'ha chiesta. Una PR per blocco; dopo ogni blocco si rifà il rapporto `scripts/sim/storia.mts` e si confronta.

## Voti delle corti (media dei quattro criteri)

| corte | media | stato |
|---|---|---|
| 08 Mappa | 7,6 | sana |
| 09 LLM | 6,8 | sicurezza da chiudere |
| 10 Interfaccia e salvataggi | 6,4 | salvataggi a rischio |
| 03 Economia | 5,6 | modello delle spese sbagliato |
| 01 Guerra | 5,7 | errori piccoli, modello povero |
| 04 Costruzione e ricerca | 5,1 | effetti dichiarati e non applicati |
| 02 Intelligenza | 5,0 | AI ferma e immune al giocatore |
| 07 Pace | 4,9 | sfruttabile |
| 06 Diplomazia | 4,8 | sfruttabile |
| 05 Politica | 4,5 | decorativa e ferma al 1881 |

Il filo comune: **il mondo è fermo al 1881** (02, 05, 06, 09), **le conseguenze non costano** (03, 05, 06, 07), **il giocatore è immune o privilegiato** (02, 06, 07).

## Fase A — errori certi, senza scelte di progetto

### A1. Guerra e intelligenza
- Trinceramento "al fronte" con scadenza (02).
- Leve: niente resa al primo colpo (01).
- Ritirata senza stretti né piste (01).
- Spareggi in ogni ordinamento del piano (02).
- Età della Guerra del Pacifico contata dal 1881 (00, 02, 07).
- Marina del Giappone (01).
- Test di esito: leve, ritirate, unità ferme.

### A2. Economia, costruzione e ricerca
- Risorse e popolazione coloniali pesate ovunque: bilancio, opere, logistica, scelte dell'AI (03, 04).
- Peso coloniale anche sulle province occupate (03).
- Debiti storici di Stati Uniti, Giappone, Cina (03).
- Ricerca legata all'industria attuale, non a quella del 1881 (04).
- Sblocchi di `bellica` e `miniera`; giacimenti e miniere d'oro e diamanti attivi; Borinage (04).
- Mitragliatrice senza stanchezza; `cancelProject` solo dal proprietario (04).
- Rimborso e prestito volontari per il giocatore (03).

### A3. Salvataggi, aggiornamenti, sicurezza
- Versione dei salvataggi e migrazione; scrittura atomica con copia di riserva; salvataggi non automatici visibili (10).
- Confronto delle versioni corretto; salvare prima di ricaricare all'aggiornamento (10).
- HTTPS obbligatorio per il fornitore LLM; plausibilità anche sulle controproposte (09).
- Nomi di provincia senza "(ovest)/(est)" dove esiste un nome d'epoca; le quattro oasi eccezione registrate (08).

## Fase B — blocchi di regole (gli exploit)

### B1. Una sola pace (02, 07, 00)
- Le guerre del giocatore finiscono: il vincitore propone, e dopo rifiuti ripetuti impone.
- Pace bianca solo se il nemico non vince o è esausto.
- La pace del dialogo e quella del Game Master passano da `peaceAnswer`.
- Liberazioni con destinatario fissato, mai dei popoli propri del perdente, dentro le regole sui confini; Stato liberato amico del liberatore e con una guarnigione.
- Perdite pesate sulla forza degli eserciti; occupazioni contate solo nella guerra in corso; vassallaggio solo fra disuguali.

### B2. Diplomazia coerente (06)
- Il signore difende vassalli e protettorati.
- `join_war` con i divieti della dichiarazione di guerra.
- Garanzia violata da chi attacca il garantito.
- Alleanze con scadenza, mai incompatibili.
- Stima non comprabile; un'azione sul legame per soggetto ogni sei mesi.
- Niente indipendenze nel 1881 (Canada, Corea, Maldive…).

### B3. Politica che conta (05)
- Capi di governo con anni di vita e di carriera, e un ripiego.
- La stabilità pesa su entrate e leva; sotto 30, disordini.
- Monarchie costituzionali e autocrazie sbloccate.
- Elezioni senza effetto a valanga.
- Repubbliche presidenziali con regime proprio.
- Colonie pesate sulla stabilità come sul bilancio.

### B4. Coloniale, passi 1-3 del verdetto (00)
- Una guerra coloniale non blocca la politica coloniale altrove; niente spegnimento di un anno; `fearOf` senza il proprio signore; tappe egiziane che aspettano.
- Dati storici corretti e test dei nomi sulla mappa.
- `stance` dei regni africani.

## Fase C — bilanciamento (una partita di misura dopo ogni passo)
- **Economia** (03): esercito e flotta al costo storico, gettito per paese, spesa dell'AI a fasce, opere al 5-15% l'anno, tasso d'interesse per paese e default, crescita della popolazione. Obiettivo: risparmio in pace 5-15%.
- **Guerra** (01): fuoco tecnologico sulle perdite inflitte, malattia e clima, rifornimento per km, occupazione dopo una sosta, assedi a contatore, ritirata dalla battaglia, artiglieria proporzionata.
- **Intelligenza** (02): piano per gruppi con un obiettivo per fronte, guarnigioni, arruolamento a debito, prestazioni del piano e dei rifornimenti (prima della fase D).
- **Coloniale** (00): guerra coloniale come campagna con fronte per coppia; scadenze di verifica.
- **Politica** (05): frequenza delle crisi per paese.

## Fase D — sistemi nuovi
- **Dominio del mare per zona** e marina che cresce; stretti come Calais–Dover non più strade (01).
- **Riserva istruita e mobilitazione vera** (01).
- **Un mondo che si muove anche senza modello** (02, 05, 06, 09): alleanze che nascono e scadono, crisi fra Stati con ultimatum e mediazione (fra il 1871 e il 1914 nessuna grande potenza europea ne combatté un'altra), eventi politici dell'epoca. Il Game Master resta narratore.
- **Interfaccia "Agenda e fronti"** e interruttore storica/plausibile/libera (00).
- Chiave LLM cifrata sul dispositivo; contesto del modello ridotto e costo visibile (09).
