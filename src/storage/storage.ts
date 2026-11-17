// Impostazioni (chiave API inclusa) e salvataggi, solo sul dispositivo.
// Nell'APK Preferences usa lo storage privato dell'app Android; nel browser localStorage.
// I salvataggi vanno in IndexedDB (stato completo in JSON).

import { Preferences } from '@capacitor/preferences';
import { DEFAULT_CONFIG, type LLMConfig } from '../llm/client';
import type { GameState } from '../engine/types';

const KEY = 'regnum.settings.v1';

export interface Settings extends LLMConfig {
  animate: boolean;
  /** chi detta la pace: il motore, il giocatore nelle sue guerre, il giocatore in tutte */
  peaceMode?: 'engine' | 'own' | 'all';
  /** regole contro il border gore attive */
  antiGore?: boolean;
  /** interessi coloniali: con date e prerequisiti, o liberi */
  colonialMode?: 'storico' | 'libero';
}

export async function loadSettings(): Promise<Settings> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    const v = value ? JSON.parse(value) : {};
    return { apiKey: '', ...DEFAULT_CONFIG, animate: true, ...v };
  } catch {
    return { apiKey: '', ...DEFAULT_CONFIG, animate: true };
  }
}

export async function saveSettings(s: Settings) {
  await Preferences.set({ key: KEY, value: JSON.stringify(s) });
}

const DB = 'regnum-saves';
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('saves');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface SaveMeta { slot: string; label: string; savedAt: number; turn: number; day: number; player: string }

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('saves', mode);
    const r = fn(t.objectStore('saves'));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

interface SaveRecord { meta: SaveMeta; state: string }

/** Copia di riserva di uno slot: l'ultimo salvataggio che è stato letto per intero prima di essere sostituito. */
const BACKUP = '.prev';

/**
 * Scrittura sicura (corte 10, persistenza 1): lo stato si serializza prima di aprire la transazione (un errore lì
 * non tocca il disco), e nella stessa transazione il record attuale, se è integro, diventa la copia di riserva.
 * IndexedDB applica la transazione tutta o niente: il salvataggio buono non si perde a metà scrittura.
 */
export async function saveGame(slot: string, state: GameState, label: string) {
  const meta: SaveMeta = { slot, label, savedAt: Date.now(), turn: state.turn, day: state.day, player: state.player };
  const text = JSON.stringify(state);
  JSON.parse(text); // un JSON che non si rilegge non deve sostituire niente
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const t = d.transaction('saves', 'readwrite');
    const store = t.objectStore('saves');
    const cur = store.get(slot);
    cur.onsuccess = () => {
      const old = cur.result as SaveRecord | undefined;
      if (old && readable(old.state)) store.put(old, slot + BACKUP);
      store.put({ meta, state: text } satisfies SaveRecord, slot);
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('salvataggio interrotto'));
  });
}

const readable = (text: string | undefined): unknown => {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
};

/** Sceglie fra il record di uno slot e la sua copia di riserva: il primo che si legge. Pura, per i test. */
export function chooseRecord(main: { state: string } | undefined, prev: { state: string } | undefined): { state: unknown; fromBackup: boolean } | null {
  const a = readable(main?.state);
  if (a) return { state: a, fromBackup: false };
  const b = readable(prev?.state);
  return b ? { state: b, fromBackup: true } : null;
}

/**
 * Legge uno slot; se è danneggiato ripiega sulla copia di riserva. Restituisce lo stato così com'è sul disco:
 * a validarlo e portarlo alla versione attuale è `migrate` (dentro `Game.fromState`).
 */
export async function loadGame(slot: string): Promise<GameState | null> {
  const main = await tx<SaveRecord | undefined>('readonly', (s) => s.get(slot));
  const prev = await tx<SaveRecord | undefined>('readonly', (s) => s.get(slot + BACKUP));
  const r = chooseRecord(main, prev);
  if (r?.fromBackup) console.warn(`salvataggio «${slot}» illeggibile: ripresa dalla copia di riserva`);
  return (r?.state as GameState) ?? null;
}

/** Tutti i salvataggi, automatico e manuali, dal più recente; le copie di riserva non si elencano. */
export async function listSaves(): Promise<SaveMeta[]> {
  // chiavi e record nella stessa transazione, così corrispondono posizione per posizione (la copia di riserva ha
  // la stessa `meta.slot` dell'originale: la si riconosce solo dalla chiave)
  const d = await db();
  const [keys, all] = await new Promise<[IDBValidKey[], SaveRecord[]]>((resolve, reject) => {
    const t = d.transaction('saves', 'readonly');
    const k = t.objectStore('saves').getAllKeys();
    const v = t.objectStore('saves').getAll();
    t.oncomplete = () => resolve([k.result, v.result as SaveRecord[]]);
    t.onerror = () => reject(t.error);
  });
  return all.filter((_, i) => !String(keys[i]).endsWith(BACKUP)).map((r) => r.meta).sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteSave(slot: string) {
  await tx('readwrite', (s) => s.delete(slot));
  await tx('readwrite', (s) => s.delete(slot + BACKUP));
}
