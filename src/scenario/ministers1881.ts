// Ministri storici delle grandi potenze (1881-1890 circa), con effetti di gioco fondati su ciò che fecero.
// `party` = id del partito o della fazione in `politics1881.ts`; null = tecnico, militare o funzionario
// della Corona (nominabile con qualunque governo). `years` = anni in cui può servire (fino alla morte
// o al ritiro). I capi di governo hanno il portafoglio "capo": i loro effetti valgono quando guidano il governo.

import type { Tag } from '../engine/types';

export type Portfolio = 'capo' | 'esteri' | 'guerra' | 'finanze' | 'interno';

export interface MinisterEffects {
  /** moltiplicatori */
  income?: number; upkeep?: number; exhaustion?: number; manpower?: number; interest?: number; quality?: number;
  /** addendi */
  stability?: number; rail?: number; confidence?: number;
  /** opinione settimanale delle altre nazioni verso di noi */
  relations?: Partial<Record<Tag, number>>;
}

export interface MinisterSeed {
  id: string;
  name: string;
  nation: Tag;
  party: string | null;
  portfolios: Portfolio[];
  years: [number, number];
  effects: MinisterEffects;
  /** fondamento storico, una riga */
  note: string;
}

const m = (id: string, nation: Tag, name: string, party: string | null, portfolios: Portfolio[], years: [number, number], effects: MinisterEffects, note: string): MinisterSeed =>
  ({ id, nation, name, party, portfolios, years, effects, note });

export const MINISTERS: MinisterSeed[] = [
  // --- Italia ---
  m('cairoli', 'ITA', 'Benedetto Cairoli', 'sinistra', ['capo', 'esteri'], [1881, 1889], { confidence: 2, relations: { AUH: -0.15 } }, 'Garibaldino onesto, simpatie irredentiste; sorpreso dalla Francia a Tunisi.'),
  m('depretis', 'ITA', 'Agostino Depretis', 'sinistra', ['capo', 'interno'], [1881, 1887], { confidence: 6, stability: 1, income: 0.99 }, 'Il trasformismo: assorbe l\'opposizione in parlamento, riforme lente.'),
  m('crispi', 'ITA', 'Francesco Crispi', 'sinistra', ['capo', 'interno', 'esteri'], [1881, 1901], { exhaustion: 0.9, upkeep: 1.05, stability: 1, relations: { FRA: -0.3, GER: 0.2 } }, 'Energico e autoritario, colonialista, ostile alla Francia (guerra doganale), vicino a Bismarck.'),
  m('minghetti', 'ITA', 'Marco Minghetti', 'destra', ['capo', 'finanze'], [1881, 1886], { income: 1.02, interest: 0.97 }, 'Uomo della Destra del pareggio di bilancio.'),
  m('sella', 'ITA', 'Quintino Sella', 'destra', ['capo', 'finanze'], [1881, 1884], { income: 1.05, stability: -2 }, 'Il pareggio a ogni costo: tassa sul macinato, impopolare ma efficace.'),
  m('viscontivenosta', 'ITA', 'Emilio Visconti-Venosta', 'destra', ['esteri'], [1881, 1914], { relations: { FRA: 0.1, GER: 0.1, AUH: 0.1 } }, 'Il ministro degli Esteri della Destra: prudenza e "indipendenti sempre, isolati mai".'),
  m('mancini', 'ITA', 'Pasquale Stanislao Mancini', 'sinistra', ['esteri'], [1881, 1888], { relations: { AUH: 0.3, GER: 0.3 } }, 'Firma la Triplice Alleanza (1882) e avvia l\'impresa di Massaua.'),
  m('robilant', 'ITA', 'Carlo Felice Nicolis di Robilant', null, ['esteri'], [1885, 1888], { relations: { GER: 0.2, AUH: 0.2, GBR: 0.15 } }, 'Diplomatico di carriera: rinnova la Triplice a condizioni migliori (1887).'),
  m('ferrero', 'ITA', 'Emilio Ferrero', null, ['guerra'], [1881, 1907], { manpower: 1.1 }, 'Porta l\'esercito da dieci a dodici corpi d\'armata.'),
  m('ricotti', 'ITA', 'Cesare Ricotti-Magnani', null, ['guerra'], [1881, 1917], { quality: 1.04, upkeep: 0.97 }, 'Il riformatore dell\'esercito: ordinamento e risparmi.'),
  m('milon', 'ITA', 'Bernardino Milon', null, ['guerra'], [1881, 1881], {}, 'Ministro della Guerra del governo Cairoli.'),
  m('magliani', 'ITA', 'Agostino Magliani', null, ['finanze'], [1881, 1891], { stability: 2, interest: 1.04, income: 0.98 }, 'Abolisce il macinato e il corso forzoso: popolare, ma i conti peggiorano.'),
  m('nicotera', 'ITA', 'Giovanni Nicotera', 'sinistra', ['interno'], [1881, 1894], { stability: 2, confidence: -2 }, 'Ministro di polizia dalla mano pesante, inviso a molti.'),
  m('bertani', 'ITA', 'Agostino Bertani', 'estrema', ['capo', 'interno'], [1881, 1886], { stability: -1, income: 1.01, relations: { AUH: -0.2 } }, 'Il medico dell\'inchiesta agraria: riforme sociali, irredentismo.'),
  m('cavallotti', 'ITA', 'Felice Cavallotti', 'estrema', ['capo'], [1881, 1898], { stability: -2, relations: { AUH: -0.3, FRA: 0.15 } }, 'Il bardo della democrazia, radicale e irredentista.'),

  // --- Francia ---
  m('ferry', 'FRA', 'Jules Ferry', 'opportunisti', ['capo', 'esteri'], [1881, 1893], { upkeep: 1.03, stability: -1, relations: { ITA: -0.2, GBR: -0.1, GER: 0.1 } }, 'Scuola laica e grandi conquiste coloniali (Tunisia, Tonchino); ostile ai clericali.'),
  m('gambetta', 'FRA', 'Léon Gambetta', 'opportunisti', ['capo', 'esteri'], [1881, 1882], { exhaustion: 0.9, confidence: -3, relations: { GER: -0.3 } }, 'Il tribuno della Revanche, temuto anche dai suoi per l\'autoritarismo.'),
  m('freycinet', 'FRA', 'Charles de Freycinet', 'opportunisti', ['capo', 'esteri'], [1881, 1923], { rail: 0.06, interest: 1.03, relations: { GBR: 0.15 } }, 'Il piano Freycinet di ferrovie e canali; prudente in Egitto.'),
  m('clemenceau', 'FRA', 'Georges Clemenceau', 'radicali', ['capo', 'interno'], [1881, 1929], { stability: -1, confidence: -2, relations: { GER: -0.2 } }, 'Il "tombeur de ministères": radicale, anticoloniale, intransigente con la Germania.'),
  m('broglie', 'FRA', 'Duca di Broglie', 'destra', ['capo'], [1881, 1901], { stability: 2, income: 0.98 }, 'Monarchico dell\'"ordine morale".'),
  m('barthelemy', 'FRA', 'Jules Barthélemy-Saint-Hilaire', null, ['esteri'], [1881, 1881], { relations: { ITA: -0.25 } }, 'Ministro degli Esteri del protettorato su Tunisi (1881).'),
  m('challemel', 'FRA', 'Paul-Armand Challemel-Lacour', 'opportunisti', ['esteri'], [1881, 1896], { relations: { GBR: -0.1, ITA: -0.1 } }, 'Esteri del secondo governo Ferry, energico in colonia.'),
  m('farre', 'FRA', 'Jean-Joseph Farre', null, ['guerra'], [1881, 1887], {}, 'Generale, ministro della Guerra nel 1880-81.'),
  m('campenon', 'FRA', 'Jean-Baptiste Campenon', null, ['guerra'], [1881, 1891], { quality: 1.03, manpower: 1.05 }, 'Generale repubblicano, riordina l\'esercito.'),
  m('boulanger', 'FRA', 'Georges Boulanger', 'radicali', ['guerra'], [1886, 1891], { confidence: 4, exhaustion: 0.9, stability: -1, relations: { GER: -0.4 } }, 'Il "generale Revanche": popolarissimo, inquieta la Germania e la Repubblica.'),
  m('magnin', 'FRA', 'Joseph Magnin', 'opportunisti', ['finanze'], [1881, 1910], {}, 'Ministro delle Finanze del primo governo Ferry.'),
  m('say', 'FRA', 'Léon Say', 'opportunisti', ['finanze'], [1881, 1896], { income: 1.03, interest: 0.96 }, 'Economista liberale, rigoroso sul bilancio.'),
  m('tirard', 'FRA', 'Pierre Tirard', 'opportunisti', ['finanze', 'capo'], [1881, 1893], { income: 1.01 }, 'Amministratore prudente.'),
  m('constans', 'FRA', 'Ernest Constans', 'opportunisti', ['interno'], [1881, 1913], { stability: 3, confidence: -1 }, 'Il ministro di polizia che piegherà il boulangismo.'),
  m('waldeck', 'FRA', 'Pierre Waldeck-Rousseau', 'opportunisti', ['interno'], [1881, 1904], { stability: 1, confidence: 1 }, 'Legge sui sindacati (1884).'),

  // --- Regno Unito ---
  m('gladstone', 'GBR', 'William Gladstone', 'liberali', ['capo', 'finanze'], [1881, 1898], { income: 1.03, upkeep: 0.95, exhaustion: 1.1 }, 'Finanza sana, poche spese militari, avverso alle guerre (Midlothian).'),
  m('hartington', 'GBR', 'Lord Hartington', 'liberali', ['capo', 'guerra'], [1881, 1908], { stability: 1, confidence: 2 }, 'Whig moderato, uomo di compromesso.'),
  m('salisbury', 'GBR', 'Lord Salisbury', 'conservatori', ['capo', 'esteri'], [1881, 1903], { confidence: 2, relations: { GER: 0.15, AUH: 0.15, ITA: 0.1 } }, 'Splendido isolamento, ma accordi mediterranei con Italia e Austria (1887).'),
  m('northcote', 'GBR', 'Sir Stafford Northcote', 'conservatori', ['capo', 'finanze', 'esteri'], [1881, 1886], { income: 1.02 }, 'Conservatore prudente, già Cancelliere dello Scacchiere.'),
  m('granville', 'GBR', 'Lord Granville', 'liberali', ['esteri'], [1881, 1891], { relations: { FRA: 0.15, GER: 0.1, RUS: 0.1 } }, 'Conciliante fino alla lentezza.'),
  m('rosebery', 'GBR', 'Lord Rosebery', 'liberali', ['esteri', 'capo'], [1881, 1929], { upkeep: 1.02, relations: { GER: 0.1, FRA: -0.1 } }, 'Liberale imperialista.'),
  m('childers', 'GBR', 'Hugh Childers', 'liberali', ['guerra', 'finanze'], [1881, 1896], { quality: 1.04 }, 'Le riforme Childers del sistema reggimentale (1881).'),
  m('wh_smith', 'GBR', 'W. H. Smith', 'conservatori', ['guerra'], [1881, 1891], { upkeep: 0.97 }, 'Amministratore metodico.'),
  m('stanhope', 'GBR', 'Edward Stanhope', 'conservatori', ['guerra'], [1881, 1893], { manpower: 1.05, quality: 1.02 }, 'Il memorandum Stanhope sulla difesa dell\'Impero.'),
  m('rchurchill', 'GBR', 'Lord Randolph Churchill', 'conservatori', ['finanze'], [1885, 1895], { upkeep: 0.92, quality: 0.97, confidence: -2 }, 'Tagli drastici alle spese militari, si dimette in polemica.'),
  m('goschen', 'GBR', 'George Goschen', null, ['finanze'], [1887, 1907], { interest: 0.85 }, 'La conversione del debito pubblico (1888).'),
  m('hicksbeach', 'GBR', 'Sir Michael Hicks Beach', 'conservatori', ['finanze'], [1881, 1916], { income: 1.02 }, 'Cancelliere rigoroso.'),
  m('harcourt', 'GBR', 'Sir William Harcourt', 'liberali', ['interno', 'finanze'], [1881, 1904], { stability: 1 }, 'Ministro dell\'Interno durante il terrorismo feniano.'),
  m('cross', 'GBR', 'Richard Cross', 'conservatori', ['interno'], [1881, 1914], { stability: 2 }, 'Riforme sociali conservatrici.'),
  m('parnell', 'GBR', 'Charles Stewart Parnell', 'homerule', ['capo'], [1881, 1891], { stability: -2 }, 'Il "re senza corona" d\'Irlanda.'),

  // --- Germania ---
  m('bismarck', 'GER', 'Otto von Bismarck', null, ['capo'], [1881, 1898], { confidence: 5, stability: 1, relations: { AUH: 0.2, RUS: 0.15, ITA: 0.1, FRA: -0.05 } }, 'Il sistema di alleanze: Duplice, Tre Imperatori, Triplice, Contrassicurazione.'),
  m('hatzfeldt', 'GER', 'Paul von Hatzfeldt', null, ['esteri'], [1881, 1901], { relations: { GBR: 0.15 } }, 'Segretario di Stato agli Esteri, poi ambasciatore a Londra.'),
  m('hbismarck', 'GER', 'Herbert von Bismarck', null, ['esteri'], [1886, 1904], { relations: { RUS: 0.15, GBR: -0.05 } }, 'Il figlio del cancelliere: il trattato di contrassicurazione (1887).'),
  m('kameke', 'GER', 'Georg von Kameke', null, ['guerra'], [1881, 1883], { quality: 1.02 }, 'Ministro della Guerra prussiano dal 1873.'),
  m('bronsart', 'GER', 'Paul Bronsart von Schellendorff', null, ['guerra'], [1883, 1891], { quality: 1.05 }, 'Riorganizza lo stato maggiore e l\'artiglieria.'),
  m('scholz', 'GER', 'Adolf von Scholz', null, ['finanze'], [1881, 1890], { income: 1.02 }, 'Tesoro del Reich, poi Finanze prussiane: dazi protettivi.'),
  m('boetticher', 'GER', 'Karl Heinrich von Boetticher', null, ['interno'], [1881, 1897], { stability: 2, income: 0.99 }, 'Le assicurazioni sociali (malattia 1883, infortuni 1884).'),
  m('puttkamer', 'GER', 'Robert von Puttkamer', 'conservatori', ['interno'], [1881, 1888], { stability: 2, confidence: -1 }, 'Leggi antisocialiste applicate con durezza.'),

  // --- Austria-Ungheria ---
  m('taaffe', 'AUH', 'Eduard Taaffe', 'anello', ['capo', 'interno'], [1881, 1895], { stability: 2, confidence: 3 }, '"Tenere tutte le nazionalità in uno stato di moderata insoddisfazione".'),
  m('herbst', 'AUH', 'Eduard Herbst', 'liberali', ['capo'], [1881, 1892], { income: 1.02, stability: -1 }, 'Capo dei liberali tedeschi.'),
  m('haymerle', 'AUH', 'Heinrich von Haymerle', null, ['esteri'], [1881, 1881], { relations: { GER: 0.15 } }, 'Ministro degli Esteri comune, muore nell\'ottobre 1881.'),
  m('kalnoky', 'AUH', 'Gustav Kálnoky', null, ['esteri'], [1881, 1898], { relations: { GER: 0.2, RUS: 0.1, ITA: 0.1 } }, 'Lega dei tre imperatori e Triplice: equilibrio con la Russia.'),
  m('bylandt', 'AUH', 'Arthur von Bylandt-Rheidt', null, ['guerra'], [1881, 1888], { quality: 1.02 }, 'Ministro della Guerra comune.'),
  m('bauer', 'AUH', 'Ferdinand von Bauer', null, ['guerra'], [1888, 1893], { quality: 1.03, manpower: 1.05 }, 'Ministro della Guerra comune dal 1888.'),
  m('szlavy', 'AUH', 'József Szlávy', null, ['finanze'], [1881, 1882], {}, 'Ministro delle Finanze comune fino al 1882.'),
  m('kallay', 'AUH', 'Benjámin Kállay', null, ['finanze'], [1882, 1903], { income: 1.02, stability: 1 }, 'Amministra la Bosnia-Erzegovina per vent\'anni.'),
  m('tisza', 'AUH', 'Kálmán Tisza', null, ['interno'], [1881, 1902], { stability: 2, confidence: 2 }, 'Presidente del Consiglio ungherese (1875-90): il compromesso tenuto in piedi.'),

  // --- Russia ---
  m('lorismelikov', 'RUS', 'Michail Loris-Melikov', 'riformisti', ['capo', 'interno'], [1881, 1888], { stability: 1, rail: 0.02, confidence: 2 }, 'La "dittatura del cuore": progetto di consultazione dei zemstvo.'),
  m('miljutin', 'RUS', 'Dmitrij Miljutin', 'riformisti', ['guerra', 'capo'], [1881, 1912], { quality: 1.05, manpower: 1.1 }, 'Il riformatore: coscrizione universale (1874), distretti militari.'),
  m('pobedonoscev', 'RUS', 'Konstantin Pobedonoscev', 'reazionari', ['capo'], [1881, 1907], { stability: 3, income: 0.97 }, 'Il Procuratore del Santo Sinodo, ispiratore della controriforma.'),
  m('dtolstoj', 'RUS', 'Dmitrij Tolstoj', 'reazionari', ['interno', 'capo'], [1881, 1889], { stability: 3, confidence: -1 }, 'Ministro dell\'Interno della reazione (1882-89).'),
  m('ignatev', 'RUS', 'Nikolaj Ignat\'ev', 'panslavisti', ['interno', 'esteri', 'capo'], [1881, 1908], { relations: { TUR: -0.3, AUH: -0.2, BUL: 0.3, SER: 0.2 } }, 'L\'uomo di Santo Stefano, panslavista.'),
  m('gorcakov', 'RUS', 'Aleksandr Gorčakov', null, ['esteri'], [1881, 1882], { relations: { FRA: 0.1 } }, 'Il vecchio cancelliere, ormai in disparte.'),
  m('giers', 'RUS', 'Nikolaj Giers', null, ['esteri'], [1881, 1895], { relations: { GER: 0.2, AUH: 0.1 } }, 'Cauto e filotedesco: Tre Imperatori e Contrassicurazione.'),
  m('vannovskij', 'RUS', 'Pëtr Vannovskij', null, ['guerra'], [1881, 1904], { upkeep: 0.95, quality: 0.98 }, 'Ministro della Guerra di Alessandro III: economie, meno riforme.'),
  m('abaza', 'RUS', 'Aleksandr Abaza', 'riformisti', ['finanze'], [1881, 1895], { stability: 1, income: 0.99 }, 'Abolisce l\'imposta sul sale (1880).'),
  m('bunge', 'RUS', 'Nikolaj Bunge', 'riformisti', ['finanze'], [1881, 1895], { stability: 2, income: 0.98 }, 'Abolisce la capitazione, prime leggi sulle fabbriche.'),
  m('vysnegradskij', 'RUS', 'Ivan Vyšnegradskij', null, ['finanze'], [1883, 1895], { income: 1.05, stability: -2 }, '"Non mangeremo, ma esporteremo": pareggio a spese delle campagne.'),

  // --- Impero ottomano ---
  m('said', 'TUR', 'Küçük Said Pascià', 'palazzo', ['capo'], [1881, 1914], { income: 1.02 }, 'Gran visir riformatore delle finanze e delle scuole.'),
  m('kamil', 'TUR', 'Kâmil Pascià', 'palazzo', ['capo'], [1881, 1913], { relations: { GBR: 0.2 } }, 'Gran visir anglofilo (1885-91).'),
  m('midhat', 'TUR', 'Midhat Pascià', 'costituzionalisti', ['capo'], [1881, 1883], { rail: 0.03, stability: -1, confidence: -2 }, 'Il padre della costituzione del 1876, inviso al sultano.'),
  m('osman', 'TUR', 'Gazi Osman Pascià', 'palazzo', ['guerra'], [1881, 1900], { quality: 1.04, exhaustion: 0.9 }, 'L\'eroe di Plevna, ministro della Guerra.'),

  // --- Spagna ---
  m('canovas', 'SPA', 'Antonio Cánovas del Castillo', 'conservatori', ['capo'], [1881, 1897], { stability: 2, confidence: 2 }, 'L\'architetto della Restaurazione e del turno.'),
  m('sagasta', 'SPA', 'Práxedes Mateo Sagasta', 'fusionisti', ['capo', 'interno'], [1881, 1903], { stability: 1, income: 1.01 }, 'Il liberale del turno: libertà di stampa e di riunione.'),
  m('castelar', 'SPA', 'Emilio Castelar', 'repubblicani', ['capo'], [1881, 1899], { stability: -2 }, 'Ultimo presidente della Prima Repubblica.'),
  m('martinezcampos', 'SPA', 'Arsenio Martínez Campos', null, ['guerra'], [1881, 1900], { quality: 1.03, stability: 1 }, 'Il generale della Restaurazione e della pace di Zanjón.'),
  m('camacho', 'SPA', 'Juan Francisco Camacho', 'fusionisti', ['finanze'], [1881, 1896], { income: 1.03, interest: 0.97 }, 'Riforma tributaria e conversione del debito (1881-82).'),
  m('cosgayon', 'SPA', 'Fernando Cos-Gayón', 'conservatori', ['finanze'], [1881, 1898], { income: 1.01 }, 'Ministro dell\'Hacienda conservatore.'),
  m('vegadearmijo', 'SPA', 'Marchese della Vega de Armijo', 'fusionisti', ['esteri'], [1881, 1908], { relations: { FRA: 0.1 } }, 'Ministro di Stato dei governi Sagasta.'),
  m('romerorobledo', 'SPA', 'Francisco Romero Robledo', 'conservatori', ['interno'], [1881, 1906], { confidence: 3, stability: -1 }, 'Il "gran elector": maestro delle elezioni pilotate.'),
];

/** Gabinetto storico al 1° gennaio 1881. */
export const CABINET_1881: Record<Tag, Partial<Record<Exclude<Portfolio, 'capo'>, string>>> = {
  ITA: { esteri: 'cairoli', guerra: 'milon', finanze: 'magliani', interno: 'depretis' },
  FRA: { esteri: 'barthelemy', guerra: 'farre', finanze: 'magnin', interno: 'constans' },
  GBR: { esteri: 'granville', guerra: 'childers', finanze: 'gladstone', interno: 'harcourt' },
  GER: { esteri: 'hatzfeldt', guerra: 'kameke', finanze: 'scholz', interno: 'boetticher' },
  AUH: { esteri: 'haymerle', guerra: 'bylandt', finanze: 'szlavy', interno: 'tisza' },
  RUS: { esteri: 'gorcakov', guerra: 'miljutin', finanze: 'abaza', interno: 'lorismelikov' },
  TUR: { guerra: 'osman' },
  SPA: { guerra: 'martinezcampos', finanze: 'cosgayon', interno: 'romerorobledo' },
};
