// Mappa e ricerca di province per nome, condivise dai test del motore.
import fs from 'node:fs';
import type { newGame } from '../src/engine/setup';
import type { MapData } from '../src/engine/types';

export const MAP: MapData = JSON.parse(fs.readFileSync('public/data/europe1881.json', 'utf8'));
/** prima provincia fuori dal rettangolo europeo */
export const EU = MAP.euCount ?? 1375;
export const find = (w: ReturnType<typeof newGame>, name: string, owner?: string) => {
  const p = w.map.provinces.find((x) => x.name === name && (!owner || x.owner === owner)) ?? w.map.provinces.find((x) => x.name.startsWith(name) && (!owner || x.owner === owner));
  if (!p) throw new Error(`provincia ${name} non trovata`);
  return p.id;
};
