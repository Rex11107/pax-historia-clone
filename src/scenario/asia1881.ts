import type { NationProfile } from '../engine/types';

// Stati dell'Asia centrale al 1° gennaio 1881 (fase 3 dell'estensione della mappa).

type P = Omit<NationProfile, 'tag'>;

const base = (o: Partial<P> & Pick<P, 'name' | 'short' | 'adjective' | 'color' | 'capital'>): P => ({
  government: 'emirato', leader: '', major: false,
  industry: 2, militaryQuality: 30, cohesion: 45, finance: 6, naval: 0, rail: 0,
  doctrine: 'defensive', armyPeace: 10000, debt: 0,
  temperament: 'diffidente verso gli stranieri, deciso a conservare l\'indipendenza',
  goals: ['preservare l\'indipendenza'], redLines: ['occupazione della capitale'],
  rivals: [], friends: [],
  ...o,
});

export const ASIA_NATIONS: Record<string, P> = {
  AFG: base({ name: 'Emirato dell\'Afghanistan', short: ["l'", 'Afghanistan'], adjective: 'afgano', color: '#8f6a3a', capital: [69.17, 34.53], leader: 'Emiro Abdur Rahman Khan',
    militaryQuality: 40, cohesion: 35, finance: 8, armyPeace: 40000, temperament: 'stretto fra Russia e India britannica, uscito dalla seconda guerra anglo-afgana; Kandahar ancora inglese, Herat in mano al rivale Ayub Khan',
    goals: ['riunire Kabul, Kandahar e Herat', 'tenere fuori russi e inglesi'], rivals: ['PER'], friends: [] }),
  BUK: base({ name: 'Emirato di Bukhara', short: ["l'", 'Emirato di Bukhara'], adjective: 'bukhariota', color: '#3a8f8f', capital: [64.42, 39.77], leader: 'Emiro Muzaffar al-Din',
    cohesion: 40, finance: 12, armyPeace: 15000, temperament: 'protettorato russo dal 1873, conservatore e religioso', goals: ['tenere Hissar, Kulob e Karategin'], rivals: ['AFG', 'KHI'], friends: ['RUS'] }),
  KHI: base({ name: 'Khanato di Khiva', short: ['il ', 'Khanato di Khiva'], adjective: 'khivano', color: '#b08a3a', capital: [60.36, 41.38], government: 'khanato', leader: 'Khan Muhammad Rahim II',
    cohesion: 40, finance: 8, armyPeace: 8000, temperament: 'protettorato russo dal 1873, minacciato dai Turkmeni', goals: ['difendere le oasi dell\'Amu Darya'], rivals: ['BUK'], friends: ['RUS'] }),
};

/** Opinioni iniziali (A verso B). */
export const ASIA_OPINIONS: [string, string, number][] = [
  ['AFG', 'GBR', -50], ['GBR', 'AFG', -20], ['AFG', 'RUS', -30], ['AFG', 'PER', -30], ['PER', 'AFG', -20],
  ['BUK', 'RUS', 10], ['KHI', 'RUS', -10], ['RUS', 'BUK', 20], ['RUS', 'KHI', 10], ['BUK', 'AFG', -30], ['BUK', 'KHI', -20],
];
