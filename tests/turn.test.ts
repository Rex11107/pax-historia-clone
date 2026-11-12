import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { newGame } from '../src/engine/setup';
import { runTurn, WEEKLY_PHASES } from '../src/engine/turn';
import { applyProposal, declareWar } from '../src/engine/diplomacy';
import { projects, startProject, weeklyConstruction } from '../src/engine/construction';
import { budget } from '../src/engine/economy';
import { colonial, colonyIncome, weeklyColonial } from '../src/engine/colonial';
import { INTERESTS_1881 } from '../src/scenario/colonial1881';
import type { MapData } from '../src/engine/types';

const MAP: MapData = JSON.parse(fs.readFileSync('public/data/europe1881.json', 'utf8'));

describe('ordine del turno', () => {
  it('le fasi di fine settimana girano nell\'ordine documentato in SPEC.md', () => {
    expect(WEEKLY_PHASES.map(([n]) => n)).toEqual(['commercio', 'economia', 'riparazioni', 'politica', 'ministri', 'costruzione', 'soggetti', 'ricerca', 'ia', 'colonie', 'espansione', 'trattati', 'deserti']);
  });

  it('le casse cambiano solo per il saldo del bilancio nella fase dell\'economia', () => {
    const w = newGame(MAP, 'SMR');
    runTurn(w); // il primo turno fissa lastBudget
    let before: Record<string, number> = {};
    runTurn(w, (phase) => {
      if (phase === 'commercio') before = Object.fromEntries(Object.values(w.state.nations).map((n) => [n.tag, n.treasury - n.debt]));
      if (phase !== 'economia') return;
      for (const n of Object.values(w.state.nations)) {
        if (!n.alive || !n.lastBudget) continue;
        // ricchezza netta (casse meno debito): cresce del saldo; il nuovo debito costa il 10% in più
        const delta = n.treasury - n.debt - before[n.tag];
        if (n.treasury > 0) expect(delta).toBeCloseTo(n.lastBudget.net, 1);
        else expect(delta).toBeLessThanOrEqual(n.lastBudget.net + 0.05);
      }
    });
  });

  it('ciò che uno paga l\'altro lo incassa: tributi, commercio e indennità a somma zero', () => {
    const w = newGame(MAP, 'SMR');
    for (let i = 0; i < 6; i++) runTurn(w);
    const sum = (k: 'tribute' | 'trade' | 'reparations') => Object.values(w.state.nations).reduce((a, n) => a + (n.alive ? n.lastBudget?.[k] ?? 0 : 0), 0);
    // ogni nazione arrotonda al centesimo: resta al più qualche centesimo su tutto il mondo
    expect(Math.abs(sum('tribute'))).toBeLessThan(0.1);
    expect(Math.abs(sum('trade'))).toBeLessThan(0.1);
    expect(Math.abs(sum('reparations'))).toBeLessThan(0.1);
  });

  it('le entrate delle colonie sono una voce del bilancio, non un versamento a parte', () => {
    const w = newGame(MAP, 'SMR');
    const c = colonial(w);
    // una colonia amministrata a concessioni per ogni interesse: qualcuna ha già terre e popolazione
    for (const seed of INTERESTS_1881) c.admin[seed.id] ??= { culto: 'tolleranza', economia: 'concessioni', rappresentanza: 'notabili', integration: 20, resistance: 15 };
    const tag = Object.keys(w.state.nations).find((t) => colonyIncome(w, t) > 0.1)!;
    expect(tag).toBeTruthy();
    const b = budget(w, tag);
    expect(b.colonies).toBeCloseTo(colonyIncome(w, tag), 2);
    const lines = b.income + (b.trade ?? 0) + (b.tribute ?? 0) + (b.reparations ?? 0) + (b.colonies ?? 0) - b.upkeep - b.administration - (b.civil ?? 0) - (b.maintenance ?? 0) - (b.research ?? 0) - b.interest - b.infrastructure;
    expect(b.net).toBeCloseTo(lines, 1);
    // la fase delle colonie non versa più nulla in cassa
    const before = w.state.nations[tag].treasury;
    weeklyColonial(w, []);
    expect(w.state.nations[tag].treasury).toBe(before);
  });

  it('nessuna unità nasce vuota', () => {
    const w = newGame(MAP);
    expect(w.state.units.filter((u) => !(u.strength > 0)).map((u) => u.id)).toEqual([]);
  });

  it('un cantiere in una provincia ceduta è perduto', () => {
    const w = newGame(MAP, 'ITA');
    const p = w.map.provinces.find((x) => x.owner === 'ITA' && !x.impassable && x.id !== w.state.nations.ITA.capital)!.id;
    w.state.nations.ITA.treasury = 500;
    expect((['agricoltura', 'tessile', 'ferrovia'] as const).some((k) => startProject(w, 'ITA', p, k) === null)).toBe(true);
    expect(projects(w).some((x) => x.province === p)).toBe(true);
    applyProposal(w, 'FRA', 'ITA', { type: 'cede_provinces', giver: 'ITA', provinces: [p] });
    weeklyConstruction(w, []);
    expect(projects(w).some((x) => x.province === p)).toBe(false);
  });

  it('le perdite di una battaglia contano in una guerra sola', () => {
    const w = newGame(MAP, 'SMR');
    declareWar(w, 'ITA', 'AUH', '');
    declareWar(w, 'ITA', 'TUR', '');
    const s = w.state;
    const it = s.units.find((u) => u.nation === 'ITA')!, au = s.units.find((u) => u.nation === 'AUH')!;
    it.location = au.location; it.orders = []; it.move = null;
    for (const u of s.units) u.orders = [{ type: 'hold', status: 'pending' }]; // nessuno si muove: una sola battaglia
    runTurn(w);
    const [wa, wt] = [s.wars.find((x) => x.defenders.includes('AUH')), s.wars.find((x) => x.defenders.includes('TUR'))];
    expect(wa?.casualties.ITA ?? 0).toBeGreaterThan(0);
    expect(wt?.casualties.ITA ?? 0).toBe(0);
  });
});
