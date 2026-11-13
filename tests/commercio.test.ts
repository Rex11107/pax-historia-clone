import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { declareWar } from '../src/engine/diplomacy';
import { budget } from '../src/engine/economy';
import { MAP } from './helpers';

describe('risorse', () => {
  it('giacimenti storici nelle province giuste e rendita nel bilancio', async () => {
    const { RESOURCES, nationResources } = await import('../src/engine/resources');
    const w = newGame(MAP);
    const at = (lon: number, lat: number) => w.map.resources[w.map.locate(lon, lat)!];
    expect(at(7.2, 51.5)).toContain('carbone'); // Ruhr
    expect(at(49.87, 40.4)).toContain('petrolio'); // Baku
    // deterministico
    expect(JSON.stringify(w.map.resources)).toBe(JSON.stringify(newGame(MAP).map.resources));
    // il deserto non ha risorse proprie, le oasi i datteri
    w.map.provinces.forEach((p) => { if (p.impassable) expect(w.map.resources[p.id].every((r) => RESOURCES[r].strategic || r === 'sale')).toBe(true); });
    const s = w.state;
    const r = nationResources(w.map, w.map.resources, s.controller, s.owner, 'GER', w.profiles.GER.industry);
    expect(r.count.carbone).toBeGreaterThan(0);
    expect(r.missing).not.toContain('carbone');
    expect(budget(w, 'GER').resources).toBeGreaterThan(0);
  });
});

describe('commercio', () => {
  it('prezzi, dazi, malus tolto, relazioni e guerra', async () => {
    const T = await import('../src/engine/trade');
    const { addTreaty } = await import('../src/engine/diplomacy');
    const { changeOpinion, opinion } = await import('../src/engine/world');
    const w = newGame(MAP);
    const s = w.state;
    expect(T.effectiveResources(w, 'TUR').missing).toContain('ferro');
    const seller = (['GBR', 'SWE', 'SPA', 'GER', 'FRA', 'RUS'] as const).find((t) => T.freeLots(w, t, 'ferro') > 0)!;
    expect(seller).toBeTruthy();
    changeOpinion(s, seller, 'TUR', 30);
    const q1 = T.quote(w, seller, 'TUR', 'ferro', 1);
    addTreaty(w, 'trade', seller, 'TUR', 5);
    const q2 = T.quote(w, seller, 'TUR', 'ferro', 1);
    expect(q1.total / q2.total).toBeCloseTo(T.TARIFF, 1); // l'accordo toglie i dazi
    const before = budget(w, 'TUR').net;
    expect(T.signTrade(w, seller, 'TUR', 'ferro', 1)).toBeNull();
    expect(T.signTrade(w, seller, 'TUR', 'ferro', 1)).not.toBeNull(); // niente doppioni
    expect(T.effectiveResources(w, 'TUR').missing).not.toContain('ferro');
    const b = budget(w, 'TUR');
    expect(b.trade).toBeLessThan(0);
    expect(b.net).not.toBe(before);
    expect(budget(w, seller).trade).toBeGreaterThan(0);
    // le relazioni crescono piano
    const op = opinion(s, 'TUR', seller);
    for (let i = 0; i < 12; i++) T.weeklyTrade(w, []);
    expect(opinion(s, 'TUR', seller)).toBeGreaterThan(op);
    // la guerra interrompe i traffici
    declareWar(w, seller, 'TUR', 'prova');
    T.weeklyTrade(w, []);
    expect(T.contractsOf(s, 'TUR').some((c) => c.seller === seller)).toBe(false);
  });

  it('il motore rifiuta chi disprezza e i lotti che non ci sono', async () => {
    const T = await import('../src/engine/trade');
    const { changeOpinion } = await import('../src/engine/world');
    const w = newGame(MAP);
    changeOpinion(w.state, 'GER', 'FRA', -100);
    w.state.player = 'FRA';
    expect(T.quote(w, 'GER', 'FRA', 'carbone', 1).refusal).toMatch(/disprezza/);
    expect(T.quote(w, 'SER', 'FRA', 'petrolio', 1).refusal).toBeTruthy();
    expect(T.tradeTreatyRefusal(w, 'FRA', 'GER')).toMatch(/stima/);
  });
});
