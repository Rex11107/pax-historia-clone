// Tipi condivisi del motore. Lo stato di gioco è un oggetto JSON puro:
// si salva, si confronta e si passa all'AI senza conversioni.

export type Tag = string;
export type Terrain = 'plain' | 'hills' | 'mountain' | 'forest' | 'desert' | 'marsh';

/** Dati statici della mappa (generati da scripts/map/build-map.mjs). */
export interface MapData {
  version: number;
  scenario: string;
  arcs: number[][];
  arcSides: [number, number][];
  provinces: ProvinceData[];
  straits: [number, number, number][];
  /** confini che corrono lungo un fiume: [a, b, nome] */
  rivers?: [number, number, string][];
}

export interface ProvinceData {
  id: number;
  name: string;
  owner: Tag;
  modern: string;
  area: number;
  pop: number;
  terrain: Terrain;
  coast: boolean;
  lonlat: [number, number];
  /** centro proiettato, km */
  c: [number, number];
  arcs: number[][] | number[][][];
  n: number[];
  /** troppo piccola per la geometria: disegnata come simbolo (microstati, Gibilterra…) */
  tiny?: boolean;
}

/** Profilo statico di una nazione (dati di scenario, non ricalcolati). Scala 0-100. */
export interface NationProfile {
  tag: Tag;
  name: string;
  /** nome breve con articolo per i testi: [articolo, nome] es. ["l'", 'Italia'] */
  short: [string, string];
  adjective: string;
  color: string;
  government: string;
  leader: string;
  capital: [number, number]; // lon, lat
  major: boolean;
  industry: number;
  militaryQuality: number;
  cohesion: number;
  finance: number;
  naval: number;
  rail: number;
  doctrine: 'offensive' | 'defensive' | 'mobile' | 'colonial';
  armyPeace: number; // uomini in armi all'inizio
  debt: number; // milioni
  temperament: string;
  goals: string[];
  redLines: string[];
  rivals: Tag[];
  friends: Tag[];
  /** microstato: non giocabile, senza esercito */
  micro?: boolean;
}

export type UnitType = 'infantry' | 'cavalry' | 'artillery';

export interface Movement {
  path: number[]; // province ancora da raggiungere, la prima è la tappa corrente
  progress: number; // giorni già percorsi sulla tappa corrente
  legDays: number; // durata della tappa corrente
}

export type Condition =
  | { type: 'always' }
  | { type: 'day_gte'; value: number } // giorni trascorsi dall'attivazione dell'ordine
  | { type: 'supply_gte'; value: number }
  | { type: 'strength_gte'; value: number } // frazione 0-1 dell'organico
  | { type: 'unit_at'; unit: string; province: number }
  | { type: 'controlled_by'; province: number; nation: Tag }
  | { type: 'no_enemy_at'; province: number };

export type OrderType = 'move' | 'attack' | 'hold' | 'entrench';

export interface Order {
  type: OrderType;
  target?: number;
  precondition?: Condition;
  until?: Condition;
  label?: string;
  // stato di esecuzione
  status?: 'pending' | 'active';
  activatedDay?: number;
}

export interface Unit {
  id: string;
  nation: Tag;
  name: string;
  type: UnitType;
  strength: number;
  maxStrength: number;
  morale: number; // 0-1
  supply: number; // 0-1
  experience: number; // 0-1
  entrench: number; // 0-1
  location: number;
  /** provincia da cui è arrivata (per lo svantaggio di attraversare un fiume) */
  from?: number;
  move: Movement | null;
  orders: Order[];
  inBattle: boolean;
  /** giorni di riorganizzazione dopo una ritirata */
  recovering: number;
}

export type TreatyType = 'alliance' | 'non_aggression' | 'trade' | 'military_access' | 'guarantee';

export interface Treaty {
  id: string;
  type: TreatyType;
  a: Tag;
  b: Tag;
  startDay: number;
  endDay: number | null;
  violated?: boolean;
}

export interface Battle {
  province: number;
  startDay: number;
  losses: Record<Tag, number>;
  sides: [Tag[], Tag[]]; // [attaccanti, difensori]
}

export interface War {
  id: string;
  name: string;
  attackers: Tag[];
  defenders: Tag[];
  startDay: number;
  casualties: Record<Tag, number>;
}

export interface Policies {
  tax: 'low' | 'normal' | 'high';
  mobilization: 'peace' | 'partial' | 'full';
  infrastructure: 'none' | 'normal' | 'heavy';
  press: 'free' | 'guided' | 'censored';
}

export interface NationState {
  tag: Tag;
  treasury: number; // milioni
  debt: number;
  manpower: number;
  stability: number; // 0-100
  warExhaustion: number; // 0-100
  rail: number; // 0-100, cresce con gli investimenti
  /** opinione di questa nazione verso le altre, -100..100 (asimmetrica) */
  opinion: Record<Tag, number>;
  policies: Policies;
  capital: number;
  alive: boolean;
  /** perdite nel turno in corso (per la stanchezza di guerra) */
  turnLosses: number;
  /** ultimo bilancio settimanale, per l'interfaccia */
  lastBudget?: Budget;
}

export interface Budget {
  income: number;
  upkeep: number;
  administration: number;
  interest: number;
  infrastructure: number;
  net: number;
  manpowerGain: number;
}

export interface GameEvent {
  day: number;
  type: string;
  text: string;
  nations: Tag[];
  province?: number;
  data?: Record<string, unknown>;
}

export interface Situation {
  id: string;
  title: string;
  summary: string;
  startDay: number;
  nations: Tag[];
}

export interface ChatMessage {
  role: 'player' | 'nation';
  text: string;
  day: number;
  intent?: string;
}

export interface GameState {
  version: 1;
  seed: string;
  scenario: string;
  player: Tag;
  day: number; // giorni dal 1° gennaio 1881
  turn: number;
  owner: Tag[]; // proprietario di diritto per provincia
  controller: Tag[]; // chi controlla di fatto (occupazione)
  nations: Record<Tag, NationState>;
  units: Unit[];
  battles: Record<string, Battle>;
  wars: War[];
  treaties: Treaty[];
  situations: Situation[];
  events: GameEvent[]; // ultimi eventi (potati)
  memory: { turn: number; text: string }[];
  chronicle: string;
  dispatches: { turn: number; day: number; text: string; notes?: string }[];
  chats: Record<Tag, ChatMessage[]>;
  nextId: number;
}

export interface TurnReport {
  turn: number;
  fromDay: number;
  toDay: number;
  events: GameEvent[];
  /** posizioni giornaliere per l'animazione: frames[d][unitId] = [x, y] */
  frames: Record<string, [number, number]>[];
  orderErrors: string[];
}
