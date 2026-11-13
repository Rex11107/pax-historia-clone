import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { assignOrders } from '../src/engine/orders';
import { declareWar, checkProposal, applyProposal, makePeace } from '../src/engine/diplomacy';
import { budget, recruit, setPolicy } from '../src/engine/economy';
import { supplyMap } from '../src/engine/supply';
import { atWar, formatDate } from '../src/engine/world';
import { MAP, find } from './helpers';

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
