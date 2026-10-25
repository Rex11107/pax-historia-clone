// Impostazioni (chiave API inclusa) e salvataggi, solo sul dispositivo.
// Nell'APK Preferences usa lo storage privato dell'app Android; nel browser localStorage.
// I salvataggi vanno in IndexedDB (stato completo in JSON).

import { Preferences } from '@capacitor/preferences';
import { DEFAULT_CONFIG, type LLMConfig } from '../llm/client';
import type { GameState } from '../engine/types';

const KEY = 'regnum.settings.v1';

export interface Settings extends LLMConfig { animate: boolean }

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

export async function saveGame(slot: string, state: GameState, label: string) {
  const meta: SaveMeta = { slot, label, savedAt: Date.now(), turn: state.turn, day: state.day, player: state.player };
  await tx('readwrite', (s) => s.put({ meta, state: JSON.stringify(state) }, slot));
}

export async function loadGame(slot: string): Promise<GameState | null> {
  const rec = await tx<{ state: string } | undefined>('readonly', (s) => s.get(slot));
  return rec ? JSON.parse(rec.state) : null;
}

export async function listSaves(): Promise<SaveMeta[]> {
  const all = await tx<{ meta: SaveMeta }[]>('readonly', (s) => s.getAll());
  return all.map((r) => r.meta).sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteSave(slot: string) {
  await tx('readwrite', (s) => s.delete(slot));
}
