import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { assignOrders, planPath } from '../src/engine/orders';
import { checkProposal } from '../src/engine/diplomacy';
import { MAP } from './helpers';

describe('deserto, oasi e piste carovaniere', () => {
  const byName = (w: ReturnType<typeof newGame>, n: string) => w.map.provinces.find((p) => p.name === n)!;
  it('il deserto non si attraversa e all\'inizio è in gran parte terra di nessuno', () => {
    const w = newGame(MAP, 'FRA', 'des');
    const deserts = w.map.provinces.filter((p) => p.impassable);
    expect(deserts.length).toBeGreaterThan(10);
    expect(deserts.every((p) => p.region)).toBe(true);
    expect(deserts.filter((p) => w.state.owner[p.id] === '').length).toBeGreaterThan(5);
    const u = w.state.units.find((x) => x.nation === 'FRA')!;
    expect(planPath(w, u, deserts[0].id, true)).toBeNull();
    expect(w.state.units.some((x) => w.map.provinces[x.location].impassable)).toBe(false);
  });
  it('le oasi si raggiungono lungo le piste, più lente di una strada', () => {
    const w = newGame(MAP, 'FRA', 'pista');
    const mzab = byName(w, 'Mzab').id, golea = byName(w, 'El Goléa').id;
    const e = w.map.edge(mzab, golea);
    expect(e?.route).toBeTruthy();
    const u = w.state.units.find((x) => x.nation === 'FRA')!;
    u.location = mzab;
    const plan = planPath(w, u, golea, false);
    expect(plan).not.toBeNull();
    expect(plan!.days).toBeGreaterThan(e!.km / 22);
  });
  it('un\'oasi di nessuno passa a chi ci entra', () => {
    const w = newGame(MAP, 'FRA', 'oasi');
    const mzab = byName(w, 'Mzab').id, golea = byName(w, 'El Goléa').id;
    expect(w.state.owner[golea]).toBe('');
    const u = w.state.units.find((x) => x.nation === 'FRA')!;
    u.location = mzab;
    expect(assignOrders(w, u.id, [{ type: 'move', target: golea, status: 'pending' }], 'replace')).toEqual([]);
    for (let i = 0; i < 12 && w.state.owner[golea] !== 'FRA'; i++) runTurn(w);
    expect(w.state.owner[golea]).toBe('FRA');
  });
  it('il deserto va a chi controlla tutte le terre transitabili attorno', async () => {
    const { desertOwner, updateDeserts } = await import('../src/engine/desert');
    const w = newGame(MAP, 'FRA', 'dom');
    const land = (id: number) => w.map.adj[id].filter((e) => !e.strait && !e.route && w.map.passable(e.to) && w.map.provinces[e.to].modern === w.map.provinces[id].modern);
    const d = w.map.provinces.find((p) => p.impassable && w.state.owner[p.id] === '' && land(p.id).length)!;
    for (const e of land(d.id)) w.state.controller[e.to] = 'ITA';
    expect(desertOwner(w, d.id)).toBe('ITA');
    updateDeserts(w);
    expect(w.state.owner[d.id]).toBe('ITA');
    const one = land(d.id)[0];
    w.state.controller[one.to] = 'FRA';
    updateDeserts(w);
    expect(w.state.owner[d.id]).toBe('');
    expect(checkProposal(w, 'FRA', 'ITA', { type: 'cede_provinces', giver: 'ITA', provinces: [d.id] })).toMatch(/deserto/);
  });
  it('nessun deserto passa a chi ne tocca solo il bordo da un altro paese (Gadames e il deserto algerino)', () => {
    const w = newGame(MAP, 'ITA', 'gore');
    for (const p of w.map.provinces) if (p.impassable && w.state.owner[p.id] === 'TUR') expect(['LBY', 'SAU']).toContain(p.modern); // il Fezzan, e il Rub al-Khali chiuso dall'al-Hasa ottomano
    for (const p of w.map.provinces) if (p.impassable && w.state.owner[p.id] === 'EGY') expect(['EGY', 'SDN', 'SDS', 'ERI']).toContain(p.modern); // il Sudan egiziano
  });
  it('il Sangiaccato di Novi Pazar è ottomano, il Sinai separato dal canale', () => {
    const w = newGame(MAP);
    const np = w.map.locate(20.51, 43.14);
    expect(np).not.toBeNull();
    expect(w.map.provinces[np!].owner).toBe('TUR');
    expect(MAP.canals?.length).toBeGreaterThan(0);
  });
});
