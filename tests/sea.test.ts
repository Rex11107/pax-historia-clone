import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { newGame } from '../src/engine/setup';
import { declareWar } from '../src/engine/diplomacy';
import { seaPassages, seaRoute } from '../src/engine/sea';
import { seaDays } from '../src/engine/orders';
import type { MapData } from '../src/engine/types';

const MAP: MapData = JSON.parse(fs.readFileSync('public/data/europe1881.json', 'utf8'));
const port = (w: ReturnType<typeof newGame>, name: string) => {
  const p = w.map.provinces.find((x) => x.name === name && x.coast);
  if (!p) throw new Error(`provincia costiera ${name} non trovata`);
  return p.id;
};

describe('rotte navali', () => {
  it('New York–San Francisco gira intorno a Capo Horn finché Panama è chiuso', () => {
    const w = newGame(MAP);
    const ny = port(w, 'New York'), sf = port(w, 'San Francisco (California)');
    const r = seaRoute(w, 'USA', ny, sf)!;
    expect(r.km).toBeGreaterThan(22000);
    expect(seaPassages(w, r.zones)).toContain('Capo Horn');
    // dal 1914 il canale accorcia la rotta di oltre metà
    w.state.day = MAP.sea!.canals.find((c) => c.name === 'Canale di Panama')!.opens;
    const p = seaRoute(w, 'USA', ny, sf)!;
    expect(p.km).toBeLessThan(r.km / 2);
    expect(seaPassages(w, p.zones)).toContain('Canale di Panama');
  });

  it('Londra–Bombay passa per Suez, ma non in guerra con chi tiene il canale', () => {
    const w = newGame(MAP);
    const lon = port(w, 'Londra'), bom = port(w, 'Bombay');
    const r = seaRoute(w, 'GBR', lon, bom)!;
    expect(seaPassages(w, r.zones)).toContain('Canale di Suez');
    const pace = seaDays(w, lon, bom, 'GBR');
    declareWar(w, 'GBR', 'EGY', '');
    const g = seaRoute(w, 'GBR', lon, bom)!;
    expect(seaPassages(w, g.zones)).toContain('Capo di Buona Speranza');
    expect(seaDays(w, lon, bom, 'GBR')).toBeGreaterThan(pace + 10);
  });

  it('gli stretti uniscono i mari chiusi e il Caspio resta a sé', () => {
    const w = newGame(MAP);
    expect(seaRoute(w, 'RUS', port(w, 'Odessa'), port(w, 'Napoli'))).not.toBeNull();
    expect(seaRoute(w, 'RUS', port(w, 'San Pietroburgo'), port(w, 'Amburgo'))).not.toBeNull();
    expect(seaRoute(w, 'RUS', port(w, 'Astrachan'), port(w, 'Odessa'))).toBeNull();
  });
});
