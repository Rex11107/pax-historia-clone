import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { assignOrders, planPath } from '../src/engine/orders';
import { declareWar, checkProposal, applyProposal, makePeace } from '../src/engine/diplomacy';
import { budget, recruit, setPolicy } from '../src/engine/economy';
import { supplyMap } from '../src/engine/supply';
import { atWar, formatDate } from '../src/engine/world';
import type { MapData } from '../src/engine/types';

const MAP: MapData = JSON.parse(fs.readFileSync('public/data/europe1881.json', 'utf8'));
const find = (w: ReturnType<typeof newGame>, name: string, owner?: string) => {
  const p = w.map.provinces.find((x) => x.name === name && (!owner || x.owner === owner)) ?? w.map.provinces.find((x) => x.name.startsWith(name) && (!owner || x.owner === owner));
  if (!p) throw new Error(`provincia ${name} non trovata`);
  return p.id;
};

describe('mappa', () => {
  it('ha centinaia di province e le nazioni principali', () => {
    expect(MAP.provinces.length).toBeGreaterThan(800);
    const owners = new Set(MAP.provinces.map((p) => p.owner));
    for (const t of ['ITA', 'FRA', 'GER', 'AUH', 'GBR', 'RUS', 'TUR']) expect(owners.has(t)).toBe(true);
  });
  it('confini storici 1881: Trento e Trieste austriache, Nizza francese, Alsazia tedesca', () => {
    const w = newGame(MAP);
    expect(w.map.provinces[find(w, 'Trento')].owner).toBe('AUH');
    expect(w.map.provinces[find(w, 'Trieste')].owner).toBe('AUH');
    expect(w.map.provinces[find(w, 'Nizza')].owner).toBe('FRA');
    expect(w.map.provinces[find(w, 'Strasburgo')].owner).toBe('GER');
  });
  it('Sicilia e Sardegna sono raggiungibili via stretto', () => {
    const w = newGame(MAP);
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    expect(planPath(w, u, find(w, 'Palermo'), false)).not.toBeNull();
  });
});

describe('motore', () => {
  it('nuova partita: capitale, eserciti, data', () => {
    const w = newGame(MAP);
    expect(w.map.provinces[w.state.nations.ITA.capital].name).toBe('Roma');
    expect(w.state.units.filter((u) => u.nation === 'ITA').length).toBeGreaterThanOrEqual(5);
    expect(formatDate(0)).toBe('1 gennaio 1881');
  });

  it('il movimento è progressivo, non un teletrasporto', () => {
    const w = newGame(MAP);
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    const target = find(w, 'Milano');
    expect(assignOrders(w, u.id, [{ type: 'move', target }], 'replace')).toEqual([]);
    const r = runTurn(w);
    const xs = r.frames.map((f) => f[u.id][0] + ',' + f[u.id][1]);
    expect(new Set(xs).size).toBeGreaterThan(3); // posizioni intermedie diverse giorno per giorno
  });

  it('rifiuta ordini verso territorio neutrale', () => {
    const w = newGame(MAP);
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    const errs = assignOrders(w, u.id, [{ type: 'move', target: find(w, 'Vienna') }], 'replace');
    expect(errs.length).toBe(1);
  });

  it('guerra Italia-Austria: alleanza tedesca, combattimento, perdite, determinismo', () => {
    const run = () => {
      const w = newGame(MAP);
      expect(declareWar(w, 'ITA', 'AUH', 'test')).toBeNull();
      expect(atWar(w.state, 'ITA', 'GER')).toBe(true); // Duplice Alleanza
      const tr = find(w, 'Trento');
      for (const u of w.state.units.filter((x) => x.nation === 'ITA').slice(0, 4)) assignOrders(w, u.id, [{ type: 'attack', target: tr }], 'replace');
      const evs: string[] = [];
      for (let i = 0; i < 6; i++) evs.push(...runTurn(w).events.map((e) => e.type));
      return { w, evs };
    };
    const a = run(), b = run();
    expect(a.evs).toContain('battle_started');
    expect(JSON.stringify(a.w.state.units)).toBe(JSON.stringify(b.w.state.units));
    expect(a.w.state.nations.ITA.warExhaustion).toBeGreaterThan(0);
  });

  it('rifornimento: pieno in patria, cala in profondità nel territorio nemico', () => {
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', '');
    const m = supplyMap(w, 'ITA');
    expect(m[find(w, 'Milano')]).toBeGreaterThan(0.7);
    expect(m[find(w, 'Vienna')]).toBeLessThan(0.5);
  });

  it('economia: bilancio coerente e politiche con effetto', () => {
    const w = newGame(MAP);
    const b0 = budget(w, 'ITA');
    expect(b0.income).toBeGreaterThan(10);
    setPolicy(w, 'ITA', 'tax', 'high');
    expect(budget(w, 'ITA').income).toBeGreaterThan(b0.income);
    expect(recruit(w, 'ITA', 'infantry', w.state.nations.ITA.capital)).toBeNull();
    expect(recruit(w, 'ITA', 'infantry', find(w, 'Vienna'))).not.toBeNull();
  });

  it('diplomazia: veto meccanico sulle cessioni non sostenute da occupazione', () => {
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', '');
    const tr = find(w, 'Trento');
    expect(checkProposal(w, 'ITA', 'AUH', { type: 'peace', giver: 'AUH', provinces: [tr] })).toMatch(/non cede/);
    w.state.controller[tr] = 'ITA';
    expect(checkProposal(w, 'ITA', 'AUH', { type: 'peace', giver: 'AUH', provinces: [tr] })).toBeNull();
    applyProposal(w, 'ITA', 'AUH', { type: 'peace', giver: 'AUH', provinces: [tr] });
    expect(w.state.owner[tr]).toBe('ITA');
    expect(atWar(w.state, 'ITA', 'AUH')).toBe(false);
  });

  it('pace separata e trattati', () => {
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', '');
    expect(makePeace(w, 'ITA', 'GER')).toBeNull();
    expect(atWar(w.state, 'ITA', 'GER')).toBe(false);
    expect(atWar(w.state, 'ITA', 'AUH')).toBe(true);
    expect(checkProposal(w, 'ITA', 'GBR', { type: 'alliance' })).toBeNull();
    applyProposal(w, 'ITA', 'GBR', { type: 'alliance' });
    expect(checkProposal(w, 'ITA', 'GBR', { type: 'alliance' })).toMatch(/già/);
  });

  it('un turno di pace è veloce', () => {
    const w = newGame(MAP);
    const t = performance.now();
    for (let i = 0; i < 4; i++) runTurn(w);
    expect(performance.now() - t).toBeLessThan(4000);
  });

  it('guerra fra AI: le nazioni si muovono da sole', () => {
    const w = newGame(MAP);
    declareWar(w, 'RUS', 'TUR', 'test');
    const before = JSON.stringify(w.state.units.filter((u) => u.nation === 'RUS').map((u) => u.location));
    for (let i = 0; i < 3; i++) runTurn(w);
    const after = JSON.stringify(w.state.units.filter((u) => u.nation === 'RUS').map((u) => u.location));
    expect(after).not.toBe(before);
  });
});

describe('microstati e cessioni', () => {
  it('microstati e possedimenti esistono come province proprie', () => {
    const w = newGame(MAP, 'ITA', 'micro');
    const byName = (n: string) => w.map.provinces.find((p) => p.name === n)!;
    expect(byName('Gibilterra').owner).toBe('GBR');
    expect(byName('Helgoland').owner).toBe('GBR');
    expect(byName('San Marino').owner).toBe('SMR');
    expect(byName('Monaco').owner).toBe('MCO');
    expect(byName('Gibilterra').tiny).toBe(true);
    expect(w.map.adj[byName('Gibilterra').id].length).toBeGreaterThan(0);
    expect(w.map.adj[byName('Helgoland').id].some((e) => e.strait)).toBe(true);
    expect(w.state.units.some((u) => ['SMR', 'MCO', 'LIE', 'AND'].includes(u.nation))).toBe(false);
  });
  it('in pace al massimo tre province; in guerra basta occuparne i tre quarti', () => {
    const w = newGame(MAP, 'ITA', 'cess');
    const s = w.state;
    const ids = w.map.provinces.filter((p) => p.owner === 'AUH' && p.lonlat[0] > 22 && p.lonlat[1] > 48.5 && p.lonlat[1] < 50.5).map((p) => p.id).slice(0, 8);
    expect(ids.length).toBe(8);
    expect(checkProposal(w, 'RUS', 'AUH', { type: 'cede_provinces', giver: 'AUH', provinces: ids })).toMatch(/tre province/);
    declareWar(w, 'RUS', 'AUH', 'prova');
    ids.slice(0, 6).forEach((id) => { s.controller[id] = 'RUS'; });
    expect(checkProposal(w, 'RUS', 'AUH', { type: 'peace', giver: 'AUH', provinces: ids })).toBeNull();
  });
});

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
    const d = w.map.provinces.find((p) => p.impassable && w.state.owner[p.id] === '' && w.map.adj[p.id].some((e) => !e.strait && !e.route && w.map.passable(e.to)))!;
    for (const e of w.map.adj[d.id]) if (!e.strait && !e.route && w.map.passable(e.to)) w.state.controller[e.to] = 'ITA';
    expect(desertOwner(w, d.id)).toBe('ITA');
    updateDeserts(w);
    expect(w.state.owner[d.id]).toBe('ITA');
    const one = w.map.adj[d.id].find((e) => !e.strait && !e.route && w.map.passable(e.to))!;
    w.state.controller[one.to] = 'FRA';
    updateDeserts(w);
    expect(w.state.owner[d.id]).toBe('');
    expect(checkProposal(w, 'FRA', 'ITA', { type: 'cede_provinces', giver: 'ITA', provinces: [d.id] })).toMatch(/deserto/);
  });
  it('il Sangiaccato di Novi Pazar è ottomano, il Sinai separato dal canale', () => {
    const w = newGame(MAP);
    const np = w.map.locate(20.51, 43.14);
    expect(np).not.toBeNull();
    expect(w.map.provinces[np!].owner).toBe('TUR');
    expect(MAP.canals?.length).toBeGreaterThan(0);
  });
});
