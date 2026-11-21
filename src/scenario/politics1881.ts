// Situazione politica interna al 1° gennaio 1881: regime, partiti o fazioni, governo, elezioni.
// Quote = seggi della camera elettiva (o peso a corte per le autocrazie), in percentuale, approssimate.

import type { Tag } from '../engine/types';

// presidential: repubblica presidenziale, mandato fisso e niente crisi di fiducia (corte 05, capo 5)
export type Regime = 'parliamentary' | 'constitutional' | 'autocracy' | 'presidential';
export type Program = 'liberale' | 'conservatore' | 'clericale' | 'radicale' | 'socialista' | 'nazionalista' | 'minoranze'
  | 'agrario' | 'corte' | 'riformista' | 'reazionario' | 'panslavista' | 'tradizionalista';

export interface PartySeed {
  id: string;
  name: string;
  program: Program;
  /** asse sinistra (-2) / destra (+2), per le coalizioni */
  axis: number;
  /** capi in ordine: il primo guida il partito, gli altri subentrano a un rimpasto */
  leaders: string[];
  share: number;
}

export interface PoliticsSeed {
  regime: Regime;
  parties: PartySeed[];
  /** partiti (o fazione) al governo */
  gov: string[];
  /** capo del governo; se `fixedHead` lo sceglie la Corona e non cambia col parlamento */
  head: string;
  fixedHead?: boolean;
  /** la Corona può governare per decreto e nominare governi (monarchie) */
  crown?: boolean;
  /** prossime elezioni (data storica) e durata della legislatura */
  election?: [number, number, number];
  term?: number;
  /** elezioni "fatte" dal governo (encasillado, prefetti): punti in più ai partiti al potere */
  managed?: number;
  /** premio di maggioranza dei sistemi uninominali */
  majoritarian?: boolean;
  /** si rinnova metà della Camera a ogni voto (Paesi Bassi fino al 1888, Belgio fino al 1894): i seggi si muovono
   *  solo per metà verso il risultato */
  halfRenewal?: boolean;
  /** durata media storica di un gabinetto, in anni, 1881-1899: anche con la maggioranza i gabinetti cadono per
   *  fazioni e logoramento (Italia: trasformismo; Francia: ministeri brevi). Senza, solo le crisi di fiducia */
  cabinetYears?: number;
  /** turno o rotativismo (Spagna, Portogallo): alla crisi di gabinetto la Corona chiama l'opposizione dinastica,
   *  che poi «fa» le elezioni */
  turno?: boolean;
  /** moltiplica il rischio di crisi di fiducia: partiti disciplinati e maggioranze lunghe (i cattolici belgi al
   *  governo dal 1884 al 1914), tarato sul numero storico di governi 1881-1899 */
  crisisScale?: number;
}

/** Fatti politici datati che il motore applica (corte 05, capo 6: «prima situazione di prova»). */
export interface PoliticalEvent { tag: Tag; date: [number, number, number]; gov: string[]; head: string; text: string }
export const POLITICAL_EVENTS: PoliticalEvent[] = [
  // l'assassinio di Alessandro II (13 marzo 1881) e il manifesto del 29 aprile: cade Loris-Melikov, il ministero
  // dell'Interno passa a Ignat'ev; dal giugno 1882 a Dmitrij Tolstoj, la «controriforma»
  { tag: 'RUS', date: [1881, 3, 13], gov: ['panslavisti'], head: 'Nikolaj Ignat\'ev', text: 'Alessandro II è ucciso a Pietroburgo da una bomba della Narodnaja Volja. Il nuovo zar Alessandro III congeda i riformisti: cade Loris-Melikov.' },
  { tag: 'RUS', date: [1882, 6, 12], gov: ['reazionari'], head: 'Dmitrij Tolstoj', text: 'Ignat\'ev cade per il progetto di Zemskij Sobor: all\'Interno va Dmitrij Tolstoj, comincia la controriforma.' },
];

export const dayOf = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1881, 0, 1)) / 86400000);

const p = (id: string, name: string, program: Program, axis: number, leaders: string[], share: number): PartySeed => ({ id, name, program, axis, leaders, share });

/**
 * Anni in cui un capo di partito senza scheda di ministro può guidare un governo (fino alla morte, al ritiro o alla
 * fine della carriera nazionale). Chiave «sigla:nome». I capi con scheda usano gli anni di `ministers1881.ts`; i
 * nomi che non stanno in nessuna delle due tabelle si considerano attivi per dieci anni, fino al 1890.
 */
export const LEADER_YEARS: Record<string, [number, number]> = {
  // Stati Uniti: anni della candidatura o della presidenza (Biographical Directory of the U.S. Congress; presidenze)
  'USA:James A. Garfield': [1881, 1881], // presidente dal 4 marzo, ucciso il 19 settembre 1881
  'USA:Chester A. Arthur': [1881, 1884], // presidente fino al 4 marzo 1885, non ricandidato
  'USA:James G. Blaine': [1884, 1892], // candidato nel 1884, segretario di Stato, morto nel 1893
  'USA:Benjamin Harrison': [1888, 1893], // presidente 1889-1893
  'USA:William McKinley': [1896, 1901], // presidente dal 1897, ucciso nel 1901
  'USA:Grover Cleveland': [1884, 1897], // presidente 1885-1889 e 1893-1897
  'USA:William J. Bryan': [1896, 1912], // candidato nel 1896, 1900, 1908
  'USA:James B. Weaver': [1880, 1892], // candidato greenback 1880 e populista 1892
  // capi di governo dopo il 1885 (fase C, corte 05: i partiti restavano senza capi e governava «un notabile»)
  'ITA:Giovanni Giolitti': [1889, 1914], // presidente del Consiglio 1892-93, poi dal 1903
  'ITA:Antonio di Rudinì': [1886, 1898], // presidente del Consiglio 1891-92 e 1896-98
  'ITA:Luigi Pelloux': [1898, 1900],
  'FRA:Maurice Rouvier': [1884, 1905],
  'FRA:René Goblet': [1886, 1893],
  'FRA:Charles Floquet': [1885, 1893],
  'FRA:Alexandre Ribot': [1890, 1917],
  'FRA:Charles Dupuy': [1892, 1899],
  'FRA:Jules Méline': [1890, 1903],
  'FRA:Henri Brisson': [1881, 1898],
  'FRA:Léon Bourgeois': [1890, 1914],
  'GBR:Arthur Balfour': [1891, 1911],
  'RUS:Nikolaj Ignat\'ev': [1881, 1882],
  'RUS:Ivan Durnovo': [1889, 1895],
  'RUS:Ivan Goremykin': [1895, 1899],
  'SPA:Francisco Silvela': [1891, 1903],
  'NED:Aeneas Mackay': [1888, 1891], // primo gabinetto confessionale
  'NED:Gijsbert van Tienhoven': [1891, 1894],
  'NED:Joan Röell': [1894, 1897],
  'NED:Nicolaas Pierson': [1897, 1901],
  'BEL:Auguste Beernaert': [1884, 1894],
  'BEL:Jules de Burlet': [1894, 1896],
  'BEL:Paul de Smet de Naeyer': [1896, 1899],
};

export const POLITICS: Record<Tag, PoliticsSeed> = {
  // Stati Uniti: repubblica presidenziale, elezioni ogni quattro anni il primo martedì dopo il primo lunedì di
  // novembre (4 novembre 1884, 6 novembre 1888, 8 novembre 1892, 3 novembre 1896). Quote: Camera eletta nel 1880
  // (147 repubblicani, 135 democratici, 10 greenback su 293)
  USA: {
    regime: 'presidential', majoritarian: true, election: [1884, 11, 4], term: 4,
    parties: [
      p('repubblicani', 'Partito repubblicano', 'conservatore', 0.8, ['James A. Garfield', 'Chester A. Arthur', 'James G. Blaine', 'Benjamin Harrison', 'William McKinley'], 50),
      p('democratici', 'Partito democratico', 'liberale', -0.5, ['Grover Cleveland', 'William J. Bryan'], 46),
      p('greenback', 'Greenback', 'agrario', -1.5, ['James B. Weaver'], 4),
    ],
    gov: ['repubblicani'], head: 'James A. Garfield',
  },
  ITA: {
    regime: 'parliamentary', crown: true, majoritarian: true, managed: 3, election: [1882, 10, 29], term: 5, cabinetYears: 1.3,
    parties: [
      p('sinistra', 'Sinistra storica', 'liberale', -0.5, ['Benedetto Cairoli', 'Agostino Depretis', 'Francesco Crispi', 'Giovanni Giolitti'], 60),
      p('destra', 'Destra storica', 'conservatore', 1, ['Marco Minghetti', 'Quintino Sella', 'Antonio di Rudinì', 'Luigi Pelloux'], 36),
      p('estrema', 'Estrema sinistra', 'radicale', -2, ['Agostino Bertani', 'Felice Cavallotti'], 4),
    ],
    gov: ['sinistra'], head: 'Benedetto Cairoli',
  },
  FRA: {
    regime: 'parliamentary', majoritarian: true, election: [1881, 8, 21], term: 4, cabinetYears: 2.5,
    parties: [
      p('opportunisti', 'Repubblicani opportunisti', 'liberale', -0.5, ['Jules Ferry', 'Léon Gambetta', 'Charles de Freycinet', 'Maurice Rouvier', 'Alexandre Ribot', 'Charles Dupuy', 'Jules Méline'], 50),
      p('radicali', 'Radicali', 'radicale', -1.5, ['Henri Brisson', 'Charles Floquet', 'René Goblet', 'Léon Bourgeois', 'Georges Clemenceau'], 11),
      p('destra', 'Monarchici e bonapartisti', 'clericale', 1.8, ['Duca di Broglie'], 39),
    ],
    gov: ['opportunisti'], head: 'Jules Ferry',
  },
  GBR: {
    regime: 'parliamentary', crown: true, majoritarian: true, election: [1885, 11, 24], term: 6, cabinetYears: 5,
    parties: [
      p('liberali', 'Liberali', 'liberale', -0.5, ['William Gladstone', 'Lord Rosebery', 'Lord Hartington'], 54),
      p('conservatori', 'Conservatori', 'conservatore', 1, ['Lord Salisbury', 'Sir Stafford Northcote', 'Arthur Balfour'], 36),
      p('homerule', 'Home Rule irlandese', 'minoranze', -1, ['Charles Stewart Parnell'], 10),
    ],
    gov: ['liberali'], head: 'William Gladstone',
  },
  GER: {
    regime: 'constitutional', crown: true, fixedHead: true, election: [1881, 10, 27], term: 3,
    parties: [
      p('conservatori', 'Conservatori', 'conservatore', 1.5, ['Otto von Helldorff'], 29),
      p('nazionalliberali', 'Nazionalliberali', 'liberale', 0.3, ['Rudolf von Bennigsen'], 25),
      p('zentrum', 'Zentrum cattolico', 'clericale', 0.8, ['Ludwig Windthorst'], 24),
      p('progressisti', 'Liberali progressisti', 'radicale', -1, ['Eugen Richter'], 7),
      p('spd', 'Socialdemocratici', 'socialista', -2, ['August Bebel'], 2),
      p('minoranze', 'Polacchi, alsaziani, guelfi', 'minoranze', 0, ['deputati delle minoranze'], 13),
    ],
    gov: ['conservatori', 'zentrum'], head: 'Otto von Bismarck',
  },
  AUH: {
    regime: 'constitutional', crown: true, fixedHead: false, election: [1885, 6, 1], term: 6,
    parties: [
      p('anello', 'Anello di ferro (conservatori, cechi, polacchi)', 'conservatore', 1, ['Eduard Taaffe'], 50),
      p('liberali', 'Liberali tedeschi', 'liberale', -0.5, ['Eduard Herbst'], 38),
      p('quarantottini', 'Indipendentisti magiari', 'nazionalista', -1, ['Lajos Mocsáry'], 12),
    ],
    gov: ['anello'], head: 'Eduard Taaffe',
  },
  RUS: {
    regime: 'autocracy', crown: true,
    parties: [
      p('riformisti', 'Riformisti', 'riformista', -0.5, ['Michail Loris-Melikov'], 45),
      p('reazionari', 'Reazionari', 'reazionario', 2, ['Dmitrij Tolstoj', 'Ivan Durnovo', 'Ivan Goremykin', 'Konstantin Pobedonoscev'], 35),
      p('panslavisti', 'Panslavisti', 'panslavista', 1, ['Nikolaj Ignat\'ev'], 20),
    ],
    gov: ['riformisti'], head: 'Michail Loris-Melikov',
  },
  TUR: {
    regime: 'autocracy', crown: true,
    parties: [
      p('palazzo', 'Uomini del Palazzo', 'corte', 1, ['Küçük Said Pascià', 'Kâmil Pascià'], 55),
      p('ulema', 'Ulema e conservatori religiosi', 'tradizionalista', 2, ['lo Şeyhülislam'], 25),
      p('costituzionalisti', 'Costituzionalisti', 'riformista', -1, ['Midhat Pascià'], 20),
    ],
    gov: ['palazzo'], head: 'Küçük Said Pascià',
  },
  SPA: {
    regime: 'parliamentary', crown: true, managed: 25, election: [1881, 8, 21], term: 5, cabinetYears: 3.5, turno: true,
    parties: [
      p('conservatori', 'Conservatori', 'conservatore', 1, ['Antonio Cánovas del Castillo', 'Francisco Silvela'], 75),
      p('fusionisti', 'Liberali fusionisti', 'liberale', -0.5, ['Práxedes Mateo Sagasta'], 15),
      p('repubblicani', 'Repubblicani', 'radicale', -2, ['Emilio Castelar'], 6),
      p('carlisti', 'Carlisti', 'tradizionalista', 2, ['Cándido Nocedal'], 4),
    ],
    gov: ['conservatori'], head: 'Antonio Cánovas del Castillo',
  },
  POR: {
    regime: 'parliamentary', crown: true, managed: 25, election: [1881, 8, 21], term: 4, cabinetYears: 2.5, turno: true,
    parties: [
      p('progressisti', 'Progressisti', 'liberale', -0.5, ['Anselmo Braamcamp'], 65),
      p('rigeneratori', 'Rigeneratori', 'conservatore', 0.8, ['António Fontes Pereira de Melo'], 30),
      p('repubblicani', 'Repubblicani', 'radicale', -2, ['Elias Garcia'], 5),
    ],
    gov: ['progressisti'], head: 'Anselmo Braamcamp',
  },
  BEL: {
    regime: 'parliamentary', crown: true, election: [1882, 6, 13], term: 2, halfRenewal: true, crisisScale: 0.3,
    parties: [
      p('liberali', 'Liberali', 'liberale', -0.5, ['Walthère Frère-Orban'], 55),
      p('cattolici', 'Cattolici', 'clericale', 1, ['Jules Malou', 'Auguste Beernaert', 'Jules de Burlet', 'Paul de Smet de Naeyer'], 45),
    ],
    gov: ['liberali'], head: 'Walthère Frère-Orban',
  },
  NED: {
    regime: 'parliamentary', crown: true, election: [1881, 6, 14], term: 2, halfRenewal: true, crisisScale: 0.4,
    parties: [
      p('liberali', 'Liberali', 'liberale', -0.5, ['Theodoor van Lynden van Sandenburg', 'Jan Kappeyne van de Coppello', 'Gijsbert van Tienhoven', 'Joan Röell', 'Nicolaas Pierson'], 55),
      p('cattolici', 'Cattolici', 'clericale', 1, ['Herman Schaepman'], 20),
      p('antirivoluzionari', 'Antirivoluzionari', 'clericale', 1.5, ['Aeneas Mackay', 'Abraham Kuyper'], 15),
      p('conservatori', 'Conservatori', 'conservatore', 1.2, ['Johan Heemskerk'], 10),
    ],
    gov: ['liberali'], head: 'Theodoor van Lynden van Sandenburg',
  },
  DEN: {
    regime: 'constitutional', crown: true, fixedHead: false, election: [1881, 5, 24], term: 3,
    parties: [
      p('hojre', 'Højre (conservatori)', 'conservatore', 1.5, ['Jacob Estrup'], 35),
      p('venstre', 'Venstre (liberali agrari)', 'agrario', -0.8, ['Christen Berg'], 60),
      p('altri', 'Indipendenti', 'liberale', 0, ['deputati indipendenti'], 5),
    ],
    gov: ['hojre'], head: 'Jacob Estrup',
  },
  SWE: {
    regime: 'constitutional', crown: true, election: [1881, 9, 1], term: 3,
    parties: [
      p('lantmanna', 'Partito agrario (Lantmanna)', 'agrario', 0.8, ['Arvid Posse'], 55),
      p('ministeriali', 'Ministeriali', 'conservatore', 1.2, ['Louis De Geer'], 35),
      p('venstre', 'Venstre norvegese', 'liberale', -1, ['Johan Sverdrup'], 10),
    ],
    gov: ['lantmanna'], head: 'Arvid Posse',
  },
  SWI: {
    regime: 'parliamentary', election: [1881, 10, 30], term: 3,
    parties: [
      p('radicali', 'Radicali liberali', 'liberale', -0.5, ['Numa Droz'], 60),
      p('centro', 'Centro liberale', 'conservatore', 0.5, ['Alfred Escher'], 15),
      p('cattolici', 'Cattolico-conservatori', 'clericale', 1.5, ['Philipp Anton von Segesser'], 25),
    ],
    gov: ['radicali', 'centro'], head: 'Numa Droz',
  },
  GRE: {
    regime: 'parliamentary', crown: true, election: [1881, 12, 20], term: 4,
    parties: [
      p('koumoundouros', 'Partito di Koumoundouros', 'nazionalista', -0.3, ['Alexandros Koumoundouros'], 50),
      p('trikoupis', 'Nuovo partito (modernizzatori)', 'liberale', 0.5, ['Charilaos Trikoupis'], 40),
      p('deligiorgis', 'Partito di Deligiorgis', 'conservatore', 1, ['Epameinondas Deligiorgis'], 10),
    ],
    gov: ['koumoundouros'], head: 'Alexandros Koumoundouros',
  },
  ROM: {
    regime: 'parliamentary', crown: true, managed: 10, election: [1883, 5, 1], term: 4,
    parties: [
      p('liberali', 'Liberali', 'liberale', -0.5, ['Ion C. Brătianu'], 70),
      p('conservatori', 'Conservatori', 'conservatore', 1, ['Lascăr Catargiu'], 30),
    ],
    gov: ['liberali'], head: 'Ion C. Brătianu',
  },
  SER: {
    regime: 'constitutional', crown: true, election: [1883, 9, 19], term: 3,
    parties: [
      p('progressisti', 'Progressisti', 'liberale', 0.5, ['Milan Piroćanac'], 45),
      p('radicali', 'Radicali', 'radicale', -1.5, ['Nikola Pašić'], 35),
      p('liberali', 'Liberali', 'nazionalista', 0, ['Jovan Ristić'], 20),
    ],
    gov: ['progressisti'], head: 'Milan Piroćanac',
  },
  BUL: {
    regime: 'constitutional', crown: true, election: [1883, 6, 1], term: 3,
    parties: [
      p('liberali', 'Liberali', 'liberale', -1, ['Petko Karavelov', 'Dragan Cankov'], 75),
      p('conservatori', 'Conservatori', 'conservatore', 1, ['Konstantin Stoilov'], 25),
    ],
    gov: ['liberali'], head: 'Petko Karavelov',
  },
  EGY: {
    regime: 'autocracy', crown: true,
    parties: [
      p('corte', 'Corte del chedivè', 'corte', 1, ['Riyad Pascià'], 50),
      p('nazionalisti', 'Nazionalisti dell\'esercito', 'nazionalista', -0.5, ['Ahmad Urabi'], 30),
      p('notabili', 'Notabili costituzionalisti', 'riformista', 0, ['Sharif Pascià'], 20),
    ],
    gov: ['corte'], head: 'Riyad Pascià',
  },
  TUN: {
    regime: 'autocracy', crown: true,
    parties: [
      p('corte', 'Corte del bey', 'corte', 1, ['Mustafa ibn Ismail'], 60),
      p('riformisti', 'Riformisti', 'riformista', -0.5, ['eredi di Khayr al-Din'], 20),
      p('notabili', 'Notabili tradizionalisti', 'tradizionalista', 1.5, ['notabili di Tunisi'], 20),
    ],
    gov: ['corte'], head: 'Mustafa ibn Ismail',
  },
};

/** Ripiego per le nazioni senza dati: corte e opposizione. */
export function genericPolitics(government: string, leader: string): PoliticsSeed {
  // le repubbliche senza dati propri sono presidenziali (corte 05, capo 5): le americane sul modello statunitense,
  // la Liberia per costituzione (1847), le repubbliche boere con un presidente di Stato. Prima erano parlamentari, con
  // crisi di fiducia: la Bolivia cambiava 23 governi in 19 anni. Una «repubblica militare» (Ibadan) resta un'autocrazia
  const notable = (party: string) => `un notabile ${party}`;
  if (/repubblic/.test(government) && !/parlament|militar/.test(government)) return {
    regime: 'presidential', election: [1883, 6, 1], term: 4,
    parties: [p('governo', 'Partito di governo', 'conservatore', 0.8, [leader || notable('del partito di governo')], 60), p('opposizione', 'Opposizione liberale', 'liberale', -0.8, [notable('dell\'opposizione')], 40)],
    gov: ['governo'], head: leader || notable('del partito di governo'),
  };
  const parl = /costituzional|parlament/.test(government);
  if (parl) return {
    regime: /parlament/.test(government) ? 'parliamentary' : 'constitutional', crown: !/repubblic/.test(government), election: [1883, 6, 1], term: 4,
    parties: [p('governo', 'Partito di governo', 'conservatore', 0.8, [leader || notable('del partito di governo')], 60), p('opposizione', 'Opposizione liberale', 'liberale', -0.8, [notable('dell\'opposizione')], 40)],
    gov: ['governo'], head: leader || notable('del partito di governo'),
  };
  return {
    regime: 'autocracy', crown: true,
    parties: [p('corte', 'Corte', 'corte', 1, [leader || 'il sovrano'], 65), p('notabili', 'Notabili e capi locali', 'tradizionalista', 1.5, ['i notabili'], 35)],
    gov: ['corte'], head: leader || 'il sovrano',
  };
}
