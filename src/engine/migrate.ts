// Versioni dei salvataggi (corte 10, capo 1). Un salvataggio è lo stato di gioco in JSON: quando lo stato cambia
// forma, un passo di migrazione porta i salvataggi vecchi alla forma nuova invece di rifiutarli.
// Deterministico e senza effetti esterni: riceve uno stato letto dal disco e la mappa, restituisce lo stato pronto.

import type { GameState, MapData } from './types';

/** Versione della forma dello stato. Si alza di uno a ogni cambiamento che un salvataggio vecchio non ha. */
export const SAVE_VERSION = 4;

/**
 * Impronta della mappa: numero di province e centri arrotondati al decimo di grado. Cambia se le province si
 * spostano o cambiano numero, non se cambia un nome (le rinomine d'epoca della corte 08 non devono invalidare
 * le partite).
 */
export function mapKey(map: MapData): string {
  let h = 0x811c9dc5;
  const mix = (n: number) => { h ^= n & 0xffff; h = Math.imul(h, 0x01000193) >>> 0; h ^= n >>> 16; h = Math.imul(h, 0x01000193) >>> 0; };
  for (const p of map.provinces) { mix(Math.round(p.lonlat[0] * 10) + 1e5); mix(Math.round(p.lonlat[1] * 10) + 1e5); }
  return `${map.provinces.length}:${h.toString(36)}`;
}

/** Stato come esce dal disco: la forma può essere quella di qualsiasi versione precedente. */
type Raw = Partial<GameState> & { version?: number; [k: string]: unknown };

/**
 * Passi di migrazione: STEPS[v] porta uno stato dalla versione v alla v + 1. Ogni passo riempie solo ciò che manca,
 * così rieseguirlo su uno stato già migrato non cambia nulla.
 */
const STEPS: Record<number, (s: Raw, map: MapData) => void> = {
  // 0 → 1: i salvataggi più vecchi non avevano il numero di versione né alcuni elenchi
  0: (s) => {
    s.dispatches ??= [];
    s.chats ??= {};
    s.memory ??= [];
    s.events ??= [];
    s.situations ??= [];
    s.treaties ??= [];
    s.battles ??= {};
    s.chronicle ??= '';
  },
  // 1 → 2: l'impronta della mappa con cui la partita è nata (da qui in poi si riconosce una mappa cambiata).
  // Per i salvataggi della versione 1 si assume la mappa attuale: il numero di province l'ha già controllato.
  1: (s, map) => {
    s.mapKey ??= mapKey(map);
    // `dispatches` mancava anche in salvataggi con versione 1 (prima lo riempiva Game.fromState)
    s.dispatches ??= [];
  },
  // 2 → 3 (blocco B3): la quota di popoli estranei pesa le colonie col peso coloniale. Il riferimento salvato era
  // calcolato col peso pieno e, confrontato col nuovo, darebbe a tutti gli imperi un salto di stabilità: si toglie,
  // e alla prima settimana si ricalcola dallo stato del salvataggio
  2: (s) => { delete s.ethnicBase; },
  // 3 → 4 (fase C): sulla stabilità le colonie pesano ancora a metà (`COLONIAL_STABILITY`): stesso motivo, il
  // riferimento si ricalcola
  3: (s) => { delete s.ethnicBase; },
};

export interface Migrated { state: GameState; warnings: string[] }

/**
 * Porta un salvataggio alla versione attuale. Lancia un errore (con un messaggio per il giocatore) se non si può:
 * mappa con un numero di province diverso, o salvataggio fatto con una versione del gioco più recente.
 */
export function migrate(raw: unknown, map: MapData): Migrated {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Raw).owner) || !(raw as Raw).nations)
    throw new Error('Il salvataggio è danneggiato: mancano le province o le nazioni.');
  const s = raw as Raw;
  const warnings: string[] = [];
  const from = typeof s.version === 'number' ? s.version : 0;
  if (from > SAVE_VERSION) throw new Error('Questo salvataggio è stato fatto con una versione più recente del gioco: aggiorna l\'app per riprenderlo.');
  // le province si indicano per posizione: con un numero diverso ogni indice punterebbe alla provincia sbagliata.
  // Il passaggio a un formato per nome di provincia è rimandato (docs/piano/blocchi/A3-salvataggi.md, «Rimandato»)
  if (s.owner!.length !== map.provinces.length)
    throw new Error('Questo salvataggio è stato fatto con una versione precedente della mappa e non si può riprendere: inizia una nuova partita.');
  for (let v = from; v < SAVE_VERSION; v++) STEPS[v]?.(s, map);
  s.version = SAVE_VERSION;
  if (s.mapKey && s.mapKey !== mapKey(map))
    warnings.push('La mappa è stata ritoccata dopo questo salvataggio: alcune province potrebbero avere confini un po\' diversi.');
  s.mapKey = mapKey(map);
  if (from < SAVE_VERSION) warnings.push(`Salvataggio aggiornato dalla versione ${from} alla ${SAVE_VERSION}.`);
  return { state: s as GameState, warnings };
}
