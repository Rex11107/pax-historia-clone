import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { declareWar } from '../src/engine/diplomacy';
import { recruit } from '../src/engine/economy';
import { resolveBattles } from '../src/engine/combat';
import { aiPlan } from '../src/engine/ai';
import { MIN_NAVAL } from '../src/engine/orders';
import type { GameEvent, Unit } from '../src/engine/types';
import { MAP } from './helpers';

// Esiti della guerra chiesti dalle corti 01 e 02 (blocco A1 di docs/corti/PIANO.md).
const unitOf = (nation: string, location: number, strength: number, maxStrength = 20000): Unit => ({
  id: `${nation}-t${location}-${strength}`, nation, type: 'infantry', name: 'prova', strength, maxStrength,
  morale: 0.5, supply: 1, experience: 0, entrench: 0, location, move: null, orders: [], inBattle: false, recovering: 0,
});

describe('guerra: leve, ritirate, piano', () => {
  it('una leva appena arruolata non ripiega al primo colpo', () => {
    const w = newGame(MAP, 'SMR');
    const s = w.state;
    declareWar(w, 'ITA', 'AUH', '');
    const p = w.map.provinces.find((x) => s.owner[x.id] === 'ITA' && x.id !== s.nations.ITA.capital && w.map.passable(x.id))!.id;
    s.units = s.units.filter((u) => u.location !== p);
    s.nations.ITA.treasury = 1000;
    expect(recruit(w, 'ITA', 'infantry', p)).toBeNull();
    const levy = s.units[s.units.length - 1];
    expect(levy.strength).toBeLessThan(levy.maxStrength * 0.3); // nasce sotto la soglia della ritirata
    s.units.push(unitOf('AUH', p, 3000));
    const sink: GameEvent[] = [];
    resolveBattles(w, sink);
    expect(s.units.includes(levy)).toBe(true);
    expect(levy.location).toBe(p);
    expect(sink.some((e) => e.type === 'retreat' && e.nations?.includes('ITA'))).toBe(false);
  });

  it('una ritirata non attraversa uno stretto: senza vie per terra ci si arrende', () => {
    const w = newGame(MAP, 'SMR');
    const s = w.state;
    const [a, b] = MAP.straits.find(([x, y]) => w.map.passable(x) && w.map.passable(y) && s.owner[x] === 'GBR' && s.owner[y] !== 'GBR' && s.owner[y] !== '')
      ?? MAP.straits.find(([x, y]) => w.map.passable(x) && w.map.passable(y) && s.owner[x] === 'GBR')!;
    declareWar(w, 'FRA', 'GBR', '');
    // tutto ciò che confina per terra è in mano ai francesi; oltre lo stretto è britannico
    for (const e of w.map.adj[a]) if (!e.strait) s.controller[e.to] = 'FRA';
    s.controller[b] = 'GBR';
    s.units = s.units.filter((u) => u.location !== a && u.location !== b);
    const gb = unitOf('GBR', a, 5000);
    s.units.push(gb, unitOf('FRA', a, 60000, 60000));
    const sink: GameEvent[] = [];
    for (let d = 0; d < 20 && s.units.includes(gb); d++) { resolveBattles(w, sink); s.day++; }
    expect(s.units.includes(gb)).toBe(false);
    expect(sink.some((e) => e.type === 'retreat' && e.nations?.includes('GBR'))).toBe(false);
  });

  it('gli ordini dell\'AI al fronte scadono: nessuna unità trincerata per sempre', () => {
    const w = newGame(MAP, 'SMR');
    declareWar(w, 'ITA', 'AUH', '');
    for (let i = 0; i < 3; i++) { aiPlan(w); runTurn(w); }
    aiPlan(w);
    const forever = w.state.units.filter((u) => ['ITA', 'AUH'].includes(u.nation) && u.orders.some((o) => o.type === 'entrench' && !o.until));
    expect(forever.map((u) => u.id)).toEqual([]);
  });

  it('il piano dell\'AI non dipende dall\'ordine delle unità in memoria', () => {
    const plan = (rev: boolean) => {
      const w = newGame(MAP, 'SMR');
      declareWar(w, 'ITA', 'AUH', '');
      if (rev) w.state.units.reverse();
      aiPlan(w);
      return w.state.units.filter((u) => u.nation === 'ITA').map((u) => `${u.id}:${JSON.stringify(u.orders.map((o) => [o.type, o.target]))}`).sort();
    };
    expect(plan(true)).toEqual(plan(false));
  });

  it('la Guerra del Pacifico non si chiude d\'ufficio nella prima settimana del 1881', () => {
    const w = newGame(MAP, 'SMR');
    expect(w.state.wars.some((x) => x.id === 'w_pacifico')).toBe(true);
    runTurn(w);
    expect(w.state.wars.some((x) => x.id === 'w_pacifico')).toBe(true);
  });

  it('Giappone e Cina hanno una marina che può imbarcare truppe', () => {
    const w = newGame(MAP);
    expect(w.profiles.JAP.naval).toBeGreaterThanOrEqual(MIN_NAVAL);
    expect(w.profiles.CHI.naval).toBeGreaterThanOrEqual(MIN_NAVAL);
  });
});
