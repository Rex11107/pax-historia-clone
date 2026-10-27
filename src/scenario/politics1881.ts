// Situazione politica interna al 1° gennaio 1881: regime, partiti o fazioni, governo, elezioni.
// Quote = seggi della camera elettiva (o peso a corte per le autocrazie), in percentuale, approssimate.

import type { Tag } from '../engine/types';

export type Regime = 'parliamentary' | 'constitutional' | 'autocracy';
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
}

export const dayOf = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1881, 0, 1)) / 86400000);

const p = (id: string, name: string, program: Program, axis: number, leaders: string[], share: number): PartySeed => ({ id, name, program, axis, leaders, share });

export const POLITICS: Record<Tag, PoliticsSeed> = {
  ITA: {
    regime: 'parliamentary', crown: true, majoritarian: true, managed: 3, election: [1882, 10, 29], term: 5,
    parties: [
      p('sinistra', 'Sinistra storica', 'liberale', -0.5, ['Benedetto Cairoli', 'Agostino Depretis'], 60),
      p('destra', 'Destra storica', 'conservatore', 1, ['Marco Minghetti', 'Quintino Sella'], 36),
      p('estrema', 'Estrema sinistra', 'radicale', -2, ['Agostino Bertani', 'Felice Cavallotti'], 4),
    ],
    gov: ['sinistra'], head: 'Benedetto Cairoli',
  },
  FRA: {
    regime: 'parliamentary', majoritarian: true, election: [1881, 8, 21], term: 4,
    parties: [
      p('opportunisti', 'Repubblicani opportunisti', 'liberale', -0.5, ['Jules Ferry', 'Léon Gambetta', 'Charles de Freycinet'], 50),
      p('radicali', 'Radicali', 'radicale', -1.5, ['Georges Clemenceau'], 11),
      p('destra', 'Monarchici e bonapartisti', 'clericale', 1.8, ['Duca di Broglie'], 39),
    ],
    gov: ['opportunisti'], head: 'Jules Ferry',
  },
  GBR: {
    regime: 'parliamentary', crown: true, majoritarian: true, election: [1885, 11, 24], term: 6,
    parties: [
      p('liberali', 'Liberali', 'liberale', -0.5, ['William Gladstone', 'Lord Hartington'], 54),
      p('conservatori', 'Conservatori', 'conservatore', 1, ['Lord Salisbury', 'Sir Stafford Northcote'], 36),
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
      p('riformisti', 'Riformisti', 'riformista', -0.5, ['Michail Loris-Melikov', 'Dmitrij Miljutin'], 45),
      p('reazionari', 'Reazionari', 'reazionario', 2, ['Konstantin Pobedonoscev', 'Dmitrij Tolstoj'], 35),
      p('panslavisti', 'Panslavisti', 'panslavista', 1, ['Nikolaj Ignat\'ev'], 20),
    ],
    gov: ['riformisti'], head: 'Michail Loris-Melikov',
  },
  TUR: {
    regime: 'autocracy', crown: true,
    parties: [
      p('palazzo', 'Uomini del Palazzo', 'corte', 1, ['Küçük Said Pascià'], 55),
      p('ulema', 'Ulema e conservatori religiosi', 'tradizionalista', 2, ['lo Şeyhülislam'], 25),
      p('costituzionalisti', 'Costituzionalisti', 'riformista', -1, ['Midhat Pascià'], 20),
    ],
    gov: ['palazzo'], head: 'Küçük Said Pascià',
  },
  SPA: {
    regime: 'parliamentary', crown: true, managed: 25, election: [1881, 8, 21], term: 5,
    parties: [
      p('conservatori', 'Conservatori', 'conservatore', 1, ['Antonio Cánovas del Castillo'], 75),
      p('fusionisti', 'Liberali fusionisti', 'liberale', -0.5, ['Práxedes Mateo Sagasta'], 15),
      p('repubblicani', 'Repubblicani', 'radicale', -2, ['Emilio Castelar'], 6),
      p('carlisti', 'Carlisti', 'tradizionalista', 2, ['Cándido Nocedal'], 4),
    ],
    gov: ['conservatori'], head: 'Antonio Cánovas del Castillo',
  },
  POR: {
    regime: 'parliamentary', crown: true, managed: 25, election: [1881, 8, 21], term: 4,
    parties: [
      p('progressisti', 'Progressisti', 'liberale', -0.5, ['Anselmo Braamcamp'], 65),
      p('rigeneratori', 'Rigeneratori', 'conservatore', 0.8, ['António Fontes Pereira de Melo'], 30),
      p('repubblicani', 'Repubblicani', 'radicale', -2, ['Elias Garcia'], 5),
    ],
    gov: ['progressisti'], head: 'Anselmo Braamcamp',
  },
  BEL: {
    regime: 'parliamentary', crown: true, election: [1882, 6, 13], term: 2,
    parties: [
      p('liberali', 'Liberali', 'liberale', -0.5, ['Walthère Frère-Orban'], 55),
      p('cattolici', 'Cattolici', 'clericale', 1, ['Jules Malou'], 45),
    ],
    gov: ['liberali'], head: 'Walthère Frère-Orban',
  },
  NED: {
    regime: 'parliamentary', crown: true, election: [1881, 6, 14], term: 2,
    parties: [
      p('liberali', 'Liberali', 'liberale', -0.5, ['Theodoor van Lynden van Sandenburg', 'Jan Kappeyne van de Coppello'], 55),
      p('cattolici', 'Cattolici', 'clericale', 1, ['Herman Schaepman'], 20),
      p('antirivoluzionari', 'Antirivoluzionari', 'clericale', 1.5, ['Abraham Kuyper'], 15),
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
  const parl = /costituzional|parlament|repubblic/.test(government);
  if (parl) return {
    regime: /parlament|repubblic/.test(government) ? 'parliamentary' : 'constitutional', crown: !/repubblic/.test(government), election: [1883, 6, 1], term: 4,
    parties: [p('governo', 'Partito di governo', 'conservatore', 0.8, [leader || 'il capo del governo'], 60), p('opposizione', 'Opposizione liberale', 'liberale', -0.8, ['il capo dell\'opposizione'], 40)],
    gov: ['governo'], head: leader || 'il capo del governo',
  };
  return {
    regime: 'autocracy', crown: true,
    parties: [p('corte', 'Corte', 'corte', 1, [leader || 'il sovrano'], 65), p('notabili', 'Notabili e capi locali', 'tradizionalista', 1.5, ['i notabili'], 35)],
    gov: ['corte'], head: leader || 'il sovrano',
  };
}
