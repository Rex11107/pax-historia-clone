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
};

/** Opinioni iniziali reciproche. */
export const AMERICAS_OPINIONS: [string, string, number][] = [
  ['CHL', 'PRU', -90], ['PRU', 'CHL', -100], ['CHL', 'BOL', -70], ['BOL', 'CHL', -90], ['PRU', 'BOL', 50], ['BOL', 'PRU', 40],
  ['ARG', 'CHL', -40], ['CHL', 'ARG', -40], ['ARG', 'BRA', -20], ['BRA', 'ARG', -20], ['BRA', 'URU', 30], ['URU', 'BRA', 20],
  ['PAR', 'BRA', -30], ['PAR', 'ARG', -20], ['PAR', 'BOL', -30], ['BOL', 'PAR', -30], ['ECU', 'PRU', -30], ['PRU', 'ECU', -20],
  ['VEN', 'GBR', -40], ['GBR', 'VEN', -10], ['VEN', 'COL', -20], ['COL', 'VEN', -20], ['BRA', 'GBR', 20], ['ARG', 'GBR', 30], ['CHL', 'GBR', 30],
  ['BRA', 'FRA', -10],
];

/** Province occupate al 1° gennaio 1881: la guerra del Pacifico (1879-1884). */
export const AMERICAS_OCCUPATIONS: { by: string; owners: string[]; names: string[] }[] = [
  { by: 'CHL', owners: ['BOL'], names: ['Antofagasta', 'Cobija', 'Calama', 'Atacama', 'Taltal'] },
  { by: 'CHL', owners: ['PRU'], names: ['Tarapacá', 'Iquique', 'Pisagua', 'Arica', 'Putre', 'Tacna', 'Tarata', 'Moquegua'] },
];
