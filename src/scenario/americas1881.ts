import type { NationProfile } from '../engine/types';

// Stati delle Americhe al 1° gennaio 1881 (fase 9 dell'estensione della mappa: Sud America e Panama colombiano).

type P = Omit<NationProfile, 'tag'>;

const base = (o: Partial<P> & Pick<P, 'name' | 'short' | 'adjective' | 'color' | 'capital'>): P => ({
  government: 'repubblica', leader: '', major: false,
  industry: 5, militaryQuality: 30, cohesion: 45, finance: 10, naval: 0, rail: 0,
  doctrine: 'defensive', armyPeace: 5000, debt: 0,
  temperament: 'repubblica giovane e instabile, divisa fra caudillos, conservatori e liberali',
  goals: ['preservare l\'indipendenza'], redLines: ['occupazione della capitale'],
  rivals: [], friends: [],
  ...o,
});

export const AMERICAS_NATIONS: Record<string, P> = {
  BRA: base({ name: 'Impero del Brasile', short: ["l'", 'Impero del Brasile'], adjective: 'brasiliano', color: '#4a9a4a', capital: [-43.2, -22.9], government: 'impero', leader: 'Imperatore Pedro II (presidente del consiglio José Antônio Saraiva)',
    industry: 8, militaryQuality: 35, cohesion: 55, finance: 25, naval: 25, rail: 10, armyPeace: 15000,
    temperament: 'impero costituzionale stabile e prudente, ricco di caffè e ancora schiavista; la questione dell\'abolizione divide il paese',
    goals: ['abolizione graduale della schiavitù', 'tenere il primato sul Río de la Plata', 'difendere le frontiere amazzoniche'], rivals: ['ARG'], friends: ['GBR', 'URU'] }),
  ARG: base({ name: 'Repubblica Argentina', short: ["l'", 'Argentina'], adjective: 'argentino', color: '#7ab8e0', capital: [-58.4, -34.6], leader: 'Presidente Julio Argentino Roca',
    industry: 8, militaryQuality: 40, cohesion: 50, finance: 18, naval: 8, rail: 8, armyPeace: 9000,
    temperament: 'repubblica in rapida crescita, appena unificata con la capitale federale a Buenos Aires; vuole immigrati europei, ferrovie e la Patagonia',
    goals: ['avere tutta la Patagonia', 'occupare il Chaco', 'attirare immigrati'], rivals: ['CHL', 'BRA'], friends: ['GBR'] }),
  CHL: base({ name: 'Repubblica del Cile', short: ['il ', 'Cile'], adjective: 'cileno', color: '#b05068', capital: [-70.65, -33.45], leader: 'Presidente Aníbal Pinto (generale Manuel Baquedano al fronte)',
    industry: 8, militaryQuality: 55, cohesion: 65, finance: 15, naval: 20, rail: 8, armyPeace: 40000, doctrine: 'offensive',
    temperament: 'repubblica ordinata e combattiva, in guerra con Perù e Bolivia per il salnitro: ha conquistato il deserto e marcia su Lima',
    goals: ['prendere Lima e imporre la pace', 'tenere Tarapacá e il Litorale', 'chiudere l\'Araucanía'], rivals: ['PRU', 'BOL', 'ARG'], friends: ['GBR'] }),
  PRU: base({ name: 'Repubblica del Perù', short: ['il ', 'Perù'], adjective: 'peruviano', color: '#d88a5a', capital: [-77.03, -12.05], government: 'dittatura', leader: 'Nicolás de Piérola (capo supremo)',
    industry: 5, militaryQuality: 25, cohesion: 35, finance: 4, naval: 2, rail: 6, armyPeace: 25000, debt: 60,
    temperament: 'repubblica in bancarotta dopo il guano, sconfitta in mare e nel deserto; Piérola difende Lima con milizie improvvisate',
    goals: ['difendere Lima', 'riavere Tarapacá, Arica e Tacna'], rivals: ['CHL'], friends: ['BOL'] }),
  BOL: base({ name: 'Repubblica di Bolivia', short: ['la ', 'Bolivia'], adjective: 'boliviano', color: '#a8b040', capital: [-65.26, -19.04], leader: 'Presidente Narciso Campero',
    industry: 3, militaryQuality: 20, cohesion: 30, finance: 4, armyPeace: 4000,
    temperament: 'repubblica andina povera e instabile, che dopo la sconfitta di Tacna si è ritirata sull\'altopiano', goals: ['riavere il Litorale e lo sbocco al mare'], rivals: ['CHL'], friends: ['PRU'] }),
  ECU: base({ name: 'Repubblica dell\'Ecuador', short: ["l'", 'Ecuador'], adjective: 'ecuadoriano', color: '#e0d070', capital: [-78.5, -0.22], government: 'dittatura', leader: 'Ignacio de Veintemilla',
    industry: 3, cohesion: 35, finance: 4, armyPeace: 3000, temperament: 'repubblica cattolica divisa fra la Sierra conservatrice e Guayaquil liberale', goals: ['tenere l\'Oriente amazzonico'], rivals: ['PRU'], friends: [] }),
  COL: base({ name: 'Stati Uniti di Colombia', short: ['la ', 'Colombia'], adjective: 'colombiano', color: '#e8b030', capital: [-74.07, 4.6], leader: 'Presidente Rafael Núñez',
    industry: 4, cohesion: 30, finance: 6, armyPeace: 3000, temperament: 'federazione liberale di nove stati quasi sovrani; a Panama i francesi di Lesseps cominciano il canale',
    goals: ['tenere unito Panama', 'riforme di Núñez'], rivals: ['VEN'], friends: [] }),
  VEN: base({ name: 'Stati Uniti di Venezuela', short: ['il ', 'Venezuela'], adjective: 'venezuelano', color: '#a04a7a', capital: [-66.9, 10.5], government: 'dittatura', leader: 'Antonio Guzmán Blanco (Quinquenio)',
    industry: 4, cohesion: 35, finance: 6, armyPeace: 4000, temperament: 'repubblica federale in mano al caudillo liberale Guzmán Blanco, che costruisce Caracas e litiga con gli inglesi sull\'Essequibo',
    goals: ['riavere la Guayana Esequiba'], rivals: ['GBR', 'COL'], friends: [] }),
  PAR: base({ name: 'Repubblica del Paraguay', short: ['il ', 'Paraguay'], adjective: 'paraguaiano', color: '#5a7ab0', capital: [-57.6, -25.28], leader: 'Presidente Bernardino Caballero',
    industry: 2, militaryQuality: 25, cohesion: 55, finance: 3, armyPeace: 1500, temperament: 'paese dissanguato dalla guerra della Triplice Alleanza, che vende le terre dello Stato per pagare i debiti', goals: ['tenere il Chaco Boreal', 'ricostruire'], rivals: ['BOL', 'BRA'], friends: [] }),
  URU: base({ name: 'Repubblica Orientale dell\'Uruguay', short: ["l'", 'Uruguay'], adjective: 'uruguaiano', color: '#80c8c8', capital: [-56.18, -34.88], leader: 'Presidente Francisco Antonino Vidal (il generale Máximo Santos dietro le quinte)',
    industry: 6, cohesion: 45, finance: 8, armyPeace: 3000, temperament: 'piccola repubblica di allevatori fra Brasile e Argentina, governata dai militari colorados', goals: ['restare neutrale fra i vicini'], rivals: [], friends: ['BRA'] }),
  // ===== Nord America, America centrale e Caraibi (fase 10) =====
  USA: base({ name: 'Stati Uniti d\'America', short: ['gli ', 'Stati Uniti'], adjective: 'statunitense', color: '#3a6ab0', capital: [-77.03, 38.9], leader: 'Presidente Rutherford B. Hayes (James A. Garfield, eletto, si insedia il 4 marzo)',
    major: true, industry: 75, militaryQuality: 45, cohesion: 70, finance: 80, naval: 15, rail: 70, armyPeace: 27000,
    temperament: 'repubblica industriale in piena espansione dopo la Ricostruzione, con un esercito minuscolo impegnato contro gli Apache e una flotta antiquata; guarda all\'interno e all\'emisfero occidentale',
    goals: ['dottrina Monroe', 'ferrovie fino al Pacifico', 'un canale americano fra i due oceani'], redLines: ['potenze europee nelle Americhe'], rivals: ['GBR', 'SPA'], friends: ['RUS'] }),
  CAN: base({ name: 'Dominion del Canada', short: ['il ', 'Canada'], adjective: 'canadese', color: '#d06a6a', capital: [-75.7, 45.42], government: 'monarchia', leader: 'Primo ministro John A. Macdonald (governatore generale il marchese di Lorne)',
    industry: 30, militaryQuality: 35, cohesion: 55, finance: 40, rail: 30, armyPeace: 2000,
    temperament: 'dominio autonomo dell\'Impero britannico, che costruisce la ferrovia del Pacifico per tenere unita la federazione fino alla Columbia Britannica',
    goals: ['ferrovia transcontinentale', 'popolare il Nord-Ovest'], rivals: ['USA'], friends: ['GBR'] }),
  MEX: base({ name: 'Stati Uniti Messicani', short: ['il ', 'Messico'], adjective: 'messicano', color: '#4a8a5a', capital: [-99.13, 19.43], leader: 'Presidente Manuel González (Porfirio Díaz dietro le quinte)',
    industry: 8, militaryQuality: 35, cohesion: 45, finance: 12, rail: 6, armyPeace: 30000,
    temperament: 'repubblica pacificata dal porfirismo che apre le porte a ferrovie e capitali stranieri, mentre combatte Apache, yaqui e i maya ribelli dello Yucatán',
    goals: ['ferrovie verso gli Stati Uniti', 'domare i maya di Chan Santa Cruz'], rivals: ['USA', 'GUA'], friends: [] }),
  GUA: base({ name: 'Repubblica del Guatemala', short: ['il ', 'Guatemala'], adjective: 'guatemalteco', color: '#5ab0a0', capital: [-90.5, 14.6], government: 'dittatura', leader: 'Justo Rufino Barrios',
    industry: 3, cohesion: 40, finance: 5, armyPeace: 4000, temperament: 'dittatura liberale del caffè che sogna di riunire l\'America centrale sotto la sua guida', goals: ['unione centroamericana', 'Chiapas e Soconusco'], rivals: ['MEX', 'ELS'], friends: [] }),
  HON: base({ name: 'Repubblica di Honduras', short: ["l'", 'Honduras'], adjective: 'honduregno', color: '#8a9ad0', capital: [-87.2, 14.1], leader: 'Presidente Marco Aurelio Soto', industry: 2, finance: 3, armyPeace: 1500, friends: ['GUA'] }),
  ELS: base({ name: 'Repubblica di El Salvador', short: ['', 'El Salvador'], adjective: 'salvadoregno', color: '#4a6ad0', capital: [-89.2, 13.7], leader: 'Presidente Rafael Zaldívar', industry: 3, finance: 4, armyPeace: 2000, rivals: ['GUA'] }),
  NIC: base({ name: 'Repubblica di Nicaragua', short: ['il ', 'Nicaragua'], adjective: 'nicaraguense', color: '#c8a85a', capital: [-86.25, 12.13], leader: 'Presidente Joaquín Zavala', industry: 2, finance: 3, armyPeace: 1500, goals: ['la Mosquitia', 'il canale del Nicaragua'] }),
  COS: base({ name: 'Repubblica di Costa Rica', short: ['la ', 'Costa Rica'], adjective: 'costaricano', color: '#a05a9a', capital: [-84.1, 9.93], government: 'dittatura', leader: 'Tomás Guardia', industry: 3, finance: 4, armyPeace: 1000, goals: ['ferrovia dell\'Atlantico'] }),
  HAI: base({ name: 'Repubblica di Haiti', short: ['', 'Haiti'], adjective: 'haitiano', color: '#7a4ab0', capital: [-72.34, 18.54], leader: 'Presidente Lysius Salomon', industry: 2, cohesion: 30, finance: 3, armyPeace: 6000, temperament: 'prima repubblica nera, orgogliosa e povera, divisa fra élite mulatta e nera', rivals: ['DOM'] }),
  DOM: base({ name: 'Repubblica Dominicana', short: ['la ', 'Repubblica Dominicana'], adjective: 'dominicano', color: '#d07a4a', capital: [-69.9, 18.48], leader: 'Presidente Fernando Arturo de Meriño (Gregorio Luperón e Ulises Heureaux)', industry: 2, cohesion: 30, finance: 3, armyPeace: 2000, rivals: ['HAI'] }),
};

/** Opinioni iniziali reciproche. */
export const AMERICAS_OPINIONS: [string, string, number][] = [
  ['CHL', 'PRU', -90], ['PRU', 'CHL', -100], ['CHL', 'BOL', -70], ['BOL', 'CHL', -90], ['PRU', 'BOL', 50], ['BOL', 'PRU', 40],
  ['ARG', 'CHL', -40], ['CHL', 'ARG', -40], ['ARG', 'BRA', -20], ['BRA', 'ARG', -20], ['BRA', 'URU', 30], ['URU', 'BRA', 20],
  ['PAR', 'BRA', -30], ['PAR', 'ARG', -20], ['PAR', 'BOL', -30], ['BOL', 'PAR', -30], ['ECU', 'PRU', -30], ['PRU', 'ECU', -20],
  ['VEN', 'GBR', -40], ['GBR', 'VEN', -10], ['VEN', 'COL', -20], ['COL', 'VEN', -20], ['BRA', 'GBR', 20], ['ARG', 'GBR', 30], ['CHL', 'GBR', 30],
  ['BRA', 'FRA', -10],
  ['USA', 'GBR', -10], ['GBR', 'USA', 0], ['USA', 'SPA', -30], ['SPA', 'USA', -30], ['USA', 'MEX', -10], ['MEX', 'USA', -30], ['CAN', 'USA', -20], ['GUA', 'MEX', -40], ['MEX', 'GUA', -30],
  ['HAI', 'DOM', -40], ['DOM', 'HAI', -50], ['USA', 'CHL', -20], ['USA', 'PRU', 20], ['NIC', 'GBR', -30], ['GUA', 'GBR', -30], ['ELS', 'GUA', -30], ['GUA', 'ELS', -20], ['HON', 'GUA', 20],
];

/** Province occupate al 1° gennaio 1881: la guerra del Pacifico (1879-1884). */
export const AMERICAS_OCCUPATIONS: { by: string; owners: string[]; names: string[] }[] = [
  { by: 'CHL', owners: ['BOL'], names: ['Antofagasta', 'Cobija', 'Calama', 'Atacama', 'Taltal'] },
  { by: 'CHL', owners: ['PRU'], names: ['Tarapacá', 'Iquique', 'Pisagua', 'Arica', 'Putre', 'Tacna', 'Tarata', 'Moquegua'] },
];
