import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { MAP } from './helpers';

describe('costruzione', () => {
  it('opere del 1881, cantieri, ferrovie, fortezze e logistica', async () => {
    const C = await import('../src/engine/construction');
    const w = newGame(MAP);
    const at = (lon: number, lat: number) => w.map.locate(lon, lat)!;
    expect(C.level(w, at(6.18, 49.12), 'fortezza')).toBe(3); // Metz
    expect(C.level(w, at(8.93, 44.41), 'porto')).toBe(3); // Genova
    expect(C.level(w, at(7.01, 51.45), 'bellica')).toBe(3); // Krupp
    expect(C.level(w, at(-2.24, 53.48), 'ferrovia')).toBeGreaterThan(1); // Lancashire
    expect(C.industryOf(w, 'GER')).toBe(w.profiles.GER.industry); // nel 1881 nessun bonus
    // un cantiere: costa, occupa uno slot, finisce dopo le settimane previste
    const milano = at(9.19, 45.46);
    const R = await import('../src/engine/research');
    R.research(w).known.ITA.push('binari_acciaio', 'doppio_binario');
    const t0 = w.state.nations.ITA.treasury;
    const cur = C.level(w, milano, 'ferrovia');
    expect(C.startProject(w, 'ITA', milano, 'ferrovia')).toBeNull();
    expect(w.state.nations.ITA.treasury).toBe(t0 - C.BUILDINGS.ferrovia.cost(cur + 1));
    expect(C.startProject(w, 'ITA', milano, 'ferrovia')).toMatch(/cantiere/);
    expect(C.startProject(w, 'ITA', at(2.35, 48.86), 'fortezza')).not.toBeNull(); // Parigi non è nostra
    for (let i = 0; i < C.BUILDINGS.ferrovia.weeks(cur + 1); i++) C.weeklyConstruction(w, []);
    expect(C.level(w, milano, 'ferrovia')).toBe(cur + 1);
    // l'industria cresce con le industrie costruite (se ci sono le materie prime)
    const b = C.buildings(w);
    b[milano].siderurgia = 3; C.touchBuildings();
    expect(C.industryOf(w, 'ITA')).toBeGreaterThan(w.profiles.ITA.industry);
    // logistica: più eserciti, rapporto più basso
    const l0 = C.logistics(w, 'ITA');
    w.state.units.push(...w.state.units.filter((u) => u.nation === 'ITA').map((u, i) => ({ ...u, id: `${u.id}-x${i}` })));
    C.touchBuildings();
    expect(C.logistics(w, 'ITA').ratio).toBeLessThan(l0.ratio);
    expect(C.provinceCapacity(w, milano)).toBeGreaterThan(30);
  });
});
