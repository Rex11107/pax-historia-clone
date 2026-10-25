import type { NationProfile } from '../engine/types';

// Profili statici delle nazioni al 1° gennaio 1881. Scala 0-100.
// Numeri approssimati da fonti storiche generali (eserciti di pace, debito pubblico);
// servono a dare asimmetrie credibili, non a riprodurre bilanci esatti.

type P = Omit<NationProfile, 'tag'>;

const base = (o: Partial<P> & Pick<P, 'name' | 'short' | 'adjective' | 'color' | 'capital'>): P => ({
  government: 'monarchia', leader: '', major: false,
  industry: 25, militaryQuality: 40, cohesion: 55, finance: 40, naval: 10, rail: 20,
  doctrine: 'defensive', armyPeace: 20000, debt: 200,
  temperament: 'prudente, attento a non irritare le grandi potenze',
  goals: ['preservare l\'indipendenza'], redLines: ['cessione di territorio nazionale'],
  rivals: [], friends: [],
  ...o,
});

export const NATIONS: Record<string, P> = {
  ITA: base({
    name: 'Regno d\'Italia', short: ["l'", 'Italia'], adjective: 'italiano', color: '#4c9a52', capital: [12.48, 41.9], major: true,
    government: 'monarchia costituzionale', leader: 'Re Umberto I; presidente del Consiglio Benedetto Cairoli',
    industry: 38, militaryQuality: 50, cohesion: 55, finance: 35, naval: 45, rail: 35, doctrine: 'defensive',
    armyPeace: 200000, debt: 10500,
    temperament: 'potenza giovane, ambiziosa ma insicura; cerca riconoscimento come grande potenza',
    goals: ['ottenere influenza in Tunisia', 'recuperare Trento e Trieste (irredentismo)', 'uscire dall\'isolamento diplomatico'],
    redLines: ['perdita di territorio metropolitano', 'restaurazione del potere temporale del Papa'],
    rivals: ['AUH', 'FRA'], friends: ['GBR'],
  }),
  FRA: base({
    name: 'Repubblica francese', short: ['la ', 'Francia'], adjective: 'francese', color: '#3d64b0', capital: [2.35, 48.86], major: true,
    government: 'repubblica parlamentare', leader: 'Presidente Jules Grévy; presidente del Consiglio Jules Ferry',
    industry: 72, militaryQuality: 66, cohesion: 58, finance: 80, naval: 75, rail: 65, doctrine: 'offensive',
    armyPeace: 500000, debt: 20000,
    temperament: 'orgogliosa e revanscista, ma prudente in Europa finché è isolata; espansiva in Africa',
    goals: ['protettorato sulla Tunisia', 'riconquista dell\'Alsazia-Lorena nel lungo periodo', 'espansione coloniale'],
    redLines: ['guerra con la Germania senza alleati', 'perdita dell\'Algeria'],
    rivals: ['GER', 'ITA'], friends: ['RUS'],
  }),
  GER: base({
    name: 'Impero tedesco', short: ['la ', 'Germania'], adjective: 'tedesco', color: '#5c6068', capital: [13.4, 52.52], major: true,
    government: 'impero federale', leader: 'Kaiser Guglielmo I; cancelliere Otto von Bismarck',
    industry: 82, militaryQuality: 88, cohesion: 72, finance: 75, naval: 35, rail: 80, doctrine: 'mobile',
    armyPeace: 430000, debt: 4000,
    temperament: 'calcolatrice e conservatrice; vuole mantenere la Francia isolata e l\'equilibrio continentale',
    goals: ['isolare la Francia', 'sistema di alleanze con Austria e Russia', 'evitare guerre su due fronti'],
    redLines: ['cessione dell\'Alsazia-Lorena', 'alleanza franco-russa'],
    rivals: ['FRA'], friends: ['AUH', 'RUS'],
  }),
  AUH: base({
    name: 'Impero austro-ungarico', short: ["l'", 'Austria-Ungheria'], adjective: 'austro-ungarico', color: '#d1b347', capital: [16.37, 48.21], major: true,
    government: 'duplice monarchia', leader: 'Imperatore Francesco Giuseppe; ministro degli esteri Haymerle',
    industry: 52, militaryQuality: 60, cohesion: 35, finance: 45, naval: 35, rail: 50, doctrine: 'defensive',
    armyPeace: 280000, debt: 15000,
    temperament: 'conservatrice e diffidente; teme il nazionalismo slavo e l\'irredentismo italiano',
    goals: ['egemonia nei Balcani occidentali', 'contenere la Russia nei Balcani', 'mantenere Bosnia-Erzegovina'],
    redLines: ['cessione del Trentino o di Trieste', 'grande Serbia o grande Bulgaria'],
    rivals: ['RUS', 'ITA', 'SER'], friends: ['GER'],
  }),
  GBR: base({
    name: 'Regno Unito', short: ['il ', 'Regno Unito'], adjective: 'britannico', color: '#b53b3b', capital: [-0.12, 51.5], major: true,
    government: 'monarchia parlamentare', leader: 'Regina Vittoria; primo ministro William Gladstone',
    industry: 95, militaryQuality: 62, cohesion: 72, finance: 95, naval: 100, rail: 80, doctrine: 'colonial',
    armyPeace: 130000, debt: 19000,
    temperament: 'distaccata dal continente, pragmatica, ossessionata dalle rotte verso l\'India',
    goals: ['sicurezza di Suez e del Mediterraneo', 'contenere la Russia verso gli Stretti', 'equilibrio di potenza in Europa'],
    redLines: ['controllo russo degli Stretti', 'minaccia all\'Egitto o a Malta'],
    rivals: ['RUS'], friends: [],
  }),
  RUS: base({
    name: 'Impero russo', short: ['la ', 'Russia'], adjective: 'russo', color: '#2f6650', capital: [30.32, 59.94], major: true,
    government: 'autocrazia', leader: 'Zar Alessandro II',
    industry: 35, militaryQuality: 45, cohesion: 50, finance: 30, naval: 40, rail: 30, doctrine: 'offensive',
    armyPeace: 750000, debt: 18000,
    temperament: 'imponente ma lenta, panslavista, irritata per il Congresso di Berlino',
    goals: ['influenza su Bulgaria e Balcani', 'accesso agli Stretti', 'sicurezza della Polonia'],
    redLines: ['indipendenza polacca', 'Stretti in mano britannica'],
    rivals: ['TUR', 'AUH', 'GBR'], friends: ['SER', 'MNE', 'BUL'],
  }),
  TUR: base({
    name: 'Impero ottomano', short: ["l'", 'Impero ottomano'], adjective: 'ottomano', color: '#9a7b45', capital: [28.98, 41.01], major: true,
    government: 'sultanato', leader: 'Sultano Abdülhamid II',
    industry: 15, militaryQuality: 42, cohesion: 30, finance: 8, naval: 25, rail: 10, doctrine: 'defensive',
    armyPeace: 160000, debt: 5200,
    temperament: 'sospettosa, in bancarotta, cerca protettori senza farsi smembrare',
    goals: ['conservare le province balcaniche rimaste', 'evitare la perdita di Tunisia ed Egitto', 'ottenere prestiti'],
    redLines: ['perdita di Costantinopoli', 'occupazione degli Stretti'],
    rivals: ['RUS', 'GRE'], friends: ['GBR'],
  }),
  SPA: base({ name: 'Regno di Spagna', short: ['la ', 'Spagna'], adjective: 'spagnolo', color: '#e2a63b', capital: [-3.7, 40.42], government: 'monarchia costituzionale', leader: 'Re Alfonso XII', industry: 30, militaryQuality: 38, cohesion: 50, finance: 25, naval: 30, rail: 30, armyPeace: 100000, debt: 6000, goals: ['stabilità interna', 'influenza in Marocco'], rivals: [], friends: [] }),
  POR: base({ name: 'Regno del Portogallo', short: ['il ', 'Portogallo'], adjective: 'portoghese', color: '#2b8f8a', capital: [-9.14, 38.72], leader: 'Re Luigi I', industry: 20, finance: 25, naval: 25, armyPeace: 30000, debt: 2000, friends: ['GBR'] }),
  SWI: base({ name: 'Confederazione svizzera', short: ['la ', 'Svizzera'], adjective: 'svizzero', color: '#c95b5b', capital: [7.45, 46.95], government: 'repubblica federale', leader: 'Consiglio federale', industry: 55, militaryQuality: 55, cohesion: 75, finance: 70, rail: 60, armyPeace: 20000, debt: 50, temperament: 'neutrale e inamovibile', goals: ['neutralità'] }),
  BEL: base({ name: 'Regno del Belgio', short: ['il ', 'Belgio'], adjective: 'belga', color: '#c3a11f', capital: [4.35, 50.85], government: 'monarchia costituzionale', leader: 'Re Leopoldo II', industry: 75, finance: 70, rail: 85, armyPeace: 45000, debt: 1500, goals: ['neutralità garantita', 'affari in Africa'] }),
  NED: base({ name: 'Regno dei Paesi Bassi', short: ['i ', 'Paesi Bassi'], adjective: 'olandese', color: '#e0803a', capital: [4.9, 52.37], leader: 'Re Guglielmo III', industry: 55, finance: 75, naval: 40, rail: 55, armyPeace: 40000, debt: 2000, goals: ['commercio', 'neutralità'] }),
  LUX: base({ name: 'Granducato di Lussemburgo', short: ['il ', 'Lussemburgo'], adjective: 'lussemburghese', color: '#6aa8a8', capital: [6.13, 49.61], leader: 'Granduca Guglielmo III', industry: 50, finance: 60, rail: 60, armyPeace: 500, debt: 10 }),
  DEN: base({ name: 'Regno di Danimarca', short: ['la ', 'Danimarca'], adjective: 'danese', color: '#b0544a', capital: [12.57, 55.68], leader: 'Re Cristiano IX', industry: 40, finance: 60, naval: 25, rail: 40, armyPeace: 35000, debt: 200, goals: ['recuperare lo Schleswig'], rivals: ['GER'] }),
  SWE: base({ name: 'Regni Uniti di Svezia e Norvegia', short: ['la ', 'Svezia-Norvegia'], adjective: 'svedese', color: '#4a7fb8', capital: [18.07, 59.33], leader: 'Re Oscar II', industry: 40, finance: 60, naval: 30, rail: 35, armyPeace: 40000, debt: 300, rivals: ['RUS'] }),
  GRE: base({ name: 'Regno di Grecia', short: ['la ', 'Grecia'], adjective: 'greco', color: '#6ea8dc', capital: [23.73, 37.98], government: 'monarchia costituzionale', leader: 'Re Giorgio I', industry: 12, finance: 15, naval: 20, armyPeace: 30000, debt: 400, temperament: 'irredentista, impaziente, conta sulle potenze', goals: ['annessione della Tessaglia e dell\'Epiro', 'Creta'], redLines: [], rivals: ['TUR'], friends: ['GBR'] }),
  ROM: base({ name: 'Principato di Romania', short: ['la ', 'Romania'], adjective: 'romeno', color: '#b4a33a', capital: [26.1, 44.43], leader: 'Principe Carlo I', industry: 15, finance: 25, armyPeace: 40000, debt: 600, goals: ['proclamazione del regno', 'Transilvania nel lungo periodo'], rivals: ['RUS', 'AUH'] }),
  SER: base({ name: 'Principato di Serbia', short: ['la ', 'Serbia'], adjective: 'serbo', color: '#a35e5e', capital: [20.46, 44.82], leader: 'Principe Milan Obrenović', industry: 10, finance: 15, armyPeace: 25000, debt: 200, goals: ['Bosnia', 'sbocco al mare'], rivals: ['AUH', 'TUR'], friends: ['RUS'] }),
  MNE: base({ name: 'Principato del Montenegro', short: ['il ', 'Montenegro'], adjective: 'montenegrino', color: '#7a5d8c', capital: [18.94, 42.39], leader: 'Principe Nicola I', industry: 5, finance: 10, militaryQuality: 50, armyPeace: 10000, debt: 20, friends: ['RUS'], rivals: ['TUR'] }),
  BUL: base({ name: 'Principato di Bulgaria', short: ['la ', 'Bulgaria'], adjective: 'bulgaro', color: '#69a06a', capital: [23.32, 42.7], leader: 'Principe Alessandro di Battenberg', industry: 8, finance: 15, armyPeace: 20000, debt: 50, goals: ['unione con la Rumelia orientale'], friends: ['RUS'], rivals: ['TUR'] }),
  EGY: base({ name: 'Chedivato d\'Egitto', short: ["l'", 'Egitto'], adjective: 'egiziano', color: '#cdb67b', capital: [31.24, 30.04], government: 'chedivato (vassallo ottomano)', leader: 'Chedivè Tawfiq', industry: 12, finance: 10, cohesion: 40, armyPeace: 15000, debt: 2000, temperament: 'debole, sotto controllo finanziario anglo-francese', goals: ['autonomia dalle potenze'] }),
  MOR: base({ name: 'Sultanato del Marocco', short: ['il ', 'Marocco'], adjective: 'marocchino', color: '#8b4b3b', capital: [-6.84, 34.02], government: 'sultanato', leader: 'Sultano Hassan I', industry: 5, finance: 15, cohesion: 35, armyPeace: 30000, debt: 30, goals: ['indipendenza'] }),
  TUN: base({ name: 'Beilicato di Tunisi', short: ['', 'Tunisi'], adjective: 'tunisino', color: '#b2805c', capital: [10.17, 36.8], government: 'beilicato (vassallo ottomano)', leader: 'Bey Muhammad III as-Sadiq', industry: 5, finance: 5, cohesion: 35, armyPeace: 8000, debt: 150, temperament: 'indebitato, conteso fra Francia e Italia', goals: ['sopravvivere fra Francia e Italia'] }),
  PER: base({ name: 'Persia', short: ['la ', 'Persia'], adjective: 'persiano', color: '#7e9f8c', capital: [51.39, 35.69], government: 'scià', leader: 'Scià Naser al-Din', industry: 5, finance: 15, cohesion: 40, armyPeace: 30000, debt: 10 }),
  ARA: base({ name: 'Emirati d\'Arabia', short: ["l'", 'Arabia'], adjective: 'arabo', color: '#c4b483', capital: [43.0, 26.0], government: 'emirati tribali', leader: 'Emiro di Ha\'il', industry: 2, finance: 5, cohesion: 30, armyPeace: 10000, debt: 0 }),
  NUL: base({ name: 'Territori tribali', short: ['le ', 'tribù'], adjective: 'tribale', color: '#b8b2a6', capital: [5, 28], government: 'nessuno', industry: 0, finance: 0, cohesion: 20, armyPeace: 0, debt: 0 }),
};

/** Trattati in vigore al 1° gennaio 1881. */
export const INITIAL_TREATIES: { type: 'alliance' | 'non_aggression' | 'guarantee'; a: string; b: string }[] = [
  { type: 'alliance', a: 'GER', b: 'AUH' }, // Duplice Alleanza, 1879
  { type: 'guarantee', a: 'GBR', b: 'BEL' }, // Trattato di Londra, 1839
  { type: 'guarantee', a: 'FRA', b: 'BEL' },
  { type: 'guarantee', a: 'GER', b: 'BEL' },
  { type: 'non_aggression', a: 'GER', b: 'RUS' },
];

/** Opinioni iniziali (A verso B), asimmetriche. Valori non elencati: 0. */
export const INITIAL_OPINIONS: [string, string, number][] = [
  ['FRA', 'GER', -70], ['GER', 'FRA', -40],
  ['ITA', 'AUH', -40], ['AUH', 'ITA', -25],
  ['ITA', 'FRA', -15], ['FRA', 'ITA', -10],
  ['GER', 'AUH', 60], ['AUH', 'GER', 55],
  ['RUS', 'AUH', -35], ['AUH', 'RUS', -30],
  ['RUS', 'TUR', -60], ['TUR', 'RUS', -75],
  ['GBR', 'RUS', -45], ['RUS', 'GBR', -40],
  ['GRE', 'TUR', -60], ['TUR', 'GRE', -35],
  ['SER', 'AUH', -30], ['SER', 'TUR', -45], ['MNE', 'TUR', -50], ['BUL', 'TUR', -40],
  ['RUS', 'BUL', 45], ['BUL', 'RUS', 40], ['RUS', 'SER', 30], ['SER', 'RUS', 35], ['RUS', 'MNE', 40], ['MNE', 'RUS', 50],
  ['RUS', 'GER', -10], ['GER', 'RUS', 20],
  ['ITA', 'GBR', 30], ['GBR', 'ITA', 15],
  ['TUN', 'FRA', -20], ['TUN', 'ITA', 5],
  ['DEN', 'GER', -40], ['ROM', 'RUS', -30],
  ['GBR', 'TUR', 15], ['TUR', 'GBR', 20],
];

export const SCENARIO_START = { year: 1881, month: 1, day: 1 };
