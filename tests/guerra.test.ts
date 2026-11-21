import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { declareWar } from '../src/engine/diplomacy';
import { recruit } from '../src/engine/economy';
import { firepower, resolveBattles } from '../src/engine/combat';
import { assignOrders, OCCUPY_DAYS, occupyDays, processUnit, SIEGE_DAYS_PER_LEVEL } from '../src/engine/orders';
import { tropicalSickness } from '../src/engine/supply';
import { budget } from '../src/engine/economy';
import { buildings } from '../src/engine/construction';
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

// Fase C, area guerra (corte 01, «Da fare nella fase di bilanciamento», punti 8-13).
describe('fase C: guerra', () => {
  const setup = () => {
    const w = newGame(MAP, 'SMR', 'c-guerra');
    const s = w.state;
    declareWar(w, 'ITA', 'AUH', '');
    // una provincia austriaca di confine senza difensori e senza fortezza
    const p = w.map.provinces.find((x) => s.owner[x.id] === 'AUH' && w.map.passable(x.id) && !buildings(w)[x.id]?.fortezza && w.map.adj[x.id].some((e) => s.owner[e.to] === 'ITA'))!.id;
    s.units = s.units.filter((u) => u.location !== p);
    return { w, s, p };
  };

  it('una provincia nemica si prende dopo una sosta, non passandoci (punto 10)', () => {
    const { w, s, p } = setup();
    const u = unitOf('ITA', p, 20000);
    s.units.push(u);
    const sink: GameEvent[] = [];
    for (let d = 1; d < OCCUPY_DAYS; d++) { processUnit(w, u, sink); expect(s.controller[p]).toBe('AUH'); }
    processUnit(w, u, sink);
    expect(s.controller[p]).toBe('ITA');
  });

  it('chi attraversa una provincia nemica senza fermarsi non la prende', () => {
    const { w, s, p } = setup();
    const beyond = w.map.adj[p].map((e) => e.to).find((q) => s.owner[q] === 'AUH' && q !== p && w.map.passable(q))!;
    const from = w.map.adj[p].map((e) => e.to).find((q) => s.owner[q] === 'ITA')!;
    s.units = s.units.filter((x) => x.location !== beyond);
    const u = unitOf('ITA', from, 20000);
    s.units.push(u);
    expect(assignOrders(w, u.id, [{ type: 'move', target: beyond, status: 'pending' }], 'replace')).toEqual([]);
    const sink: GameEvent[] = [];
    let passed = false;
    for (let d = 0; d < 40 && u.location !== beyond; d++) { processUnit(w, u, sink); if (u.location === p) passed = true; }
    if (passed && u.move?.path.length !== 0) expect(s.controller[p]).toBe('AUH');
  });

  it('una fortezza cade dopo l\'assedio, non dopo la battaglia vinta (punto 10)', () => {
    const { w, s, p } = setup();
    buildings(w)[p].fortezza = 2;
    expect(occupyDays(w, p)).toBe(OCCUPY_DAYS + 2 * SIEGE_DAYS_PER_LEVEL);
    const u = unitOf('ITA', p, 40000);
    const d = unitOf('AUH', p, 1000);
    s.units.push(u, d);
    const sink: GameEvent[] = [];
    const gone = () => !s.units.includes(d) || d.location !== p;
    for (let i = 0; i < 30 && !gone(); i++) { resolveBattles(w, sink); s.day++; }
    resolveBattles(w, sink);
    expect(gone()).toBe(true);
    expect(s.controller[p]).toBe('AUH');
    for (let i = 0; i < OCCUPY_DAYS + 2 * SIEGE_DAYS_PER_LEVEL; i++) processUnit(w, u, sink);
    expect(s.controller[p]).toBe('ITA');
    expect(sink.some((e) => e.type === 'siege')).toBe(true);
  });

  it('il divario di fuoco: fucili a retrocarica e cannoni d\'acciaio contro lance (punto 8)', () => {
    const w = newGame(MAP, 'SMR', 'c-fuoco');
    expect(firepower(w, 'GBR')).toBeGreaterThan(firepower(w, 'WAS') * 1.4);
    expect(firepower(w, 'GER')).toBe(firepower(w, 'GBR'));
    // a pari uomini e qualità, chi ha più fuoco perde meno
    const s = w.state;
    declareWar(w, 'GBR', 'WAS', '');
    const p = s.nations.WAS.capital;
    s.units = s.units.filter((u) => u.location !== p);
    const a = unitOf('GBR', p, 20000), b = unitOf('WAS', p, 20000);
    s.units.push(a, b);
    resolveBattles(w, []);
    expect(20000 - a.strength).toBeLessThan((20000 - b.strength) / 1.5);
  });

  it('l\'artiglieria vale fino a un cannoniere ogni due fanti (punto 12)', () => {
    const w = newGame(MAP, 'SMR', 'c-arti');
    const s = w.state;
    declareWar(w, 'ITA', 'AUH', '');
    const p = s.nations.AUH.capital;
    const run = (art: number, inf: number) => {
      s.units = s.units.filter((u) => u.location !== p);
      const side: Unit[] = [];
      if (art) side.push({ ...unitOf('ITA', p, art), id: 'a', type: 'artillery' });
      if (inf) side.push({ ...unitOf('ITA', p, inf), id: 'i' });
      const d = { ...unitOf('AUH', p, 200000, 200000), id: 'd' };
      s.units.push(...side, d);
      resolveBattles(w, []);
      return 200000 - d.strength;
    };
    // 20.000 artiglieri e 40.000 fanti: pieno vantaggio; 60.000 artiglieri e niente fanti molto meno
    expect(run(20000, 40000)).toBeGreaterThan(run(60000, 0) * 1.3);
  });

  it('un\'unità in battaglia con un ordine di marcia si sgancia, inseguita dalla cavalleria (punto 11)', () => {
    const { w, s, p } = setup();
    const back = w.map.adj[p].map((e) => e.to).find((q) => s.owner[q] === 'ITA' && w.map.passable(q))!;
    s.units = s.units.filter((x) => x.location !== back);
    const u = unitOf('ITA', p, 20000);
    s.units.push(u, { ...unitOf('AUH', p, 30000), id: 'cav', type: 'cavalry' });
    resolveBattles(w, []);
    expect(u.inBattle).toBe(true);
    u.orders = [{ type: 'move', target: back, status: 'pending' }];
    const before = u.strength;
    const sink: GameEvent[] = [];
    processUnit(w, u, sink);
    expect(u.location).toBe(back);
    expect(u.inBattle).toBe(false);
    expect(u.strength).toBeLessThan(before);
    expect(sink.some((e) => e.type === 'retreat')).toBe(true);
  });

  it('le febbri colpiscono le truppe europee in campagna ai tropici, non quelle locali (punto 9)', () => {
    const w = newGame(MAP, 'SMR', 'c-tropici');
    const s = w.state;
    const p = w.map.provinces.find((x) => Math.abs(x.lonlat[1]) < 10 && x.terrain === 'forest' && s.owner[x.id] && s.owner[x.id] !== 'FRA' && Math.abs(w.map.provinces[s.nations[s.owner[x.id]]?.capital ?? x.id].lonlat[1]) < 20)!;
    expect(tropicalSickness(w, unitOf('FRA', p.id, 10000))).toBeGreaterThan(0);
    expect(tropicalSickness(w, unitOf(s.owner[p.id], p.id, 10000))).toBe(0);
    const paris = s.nations.FRA.capital;
    expect(tropicalSickness(w, unitOf('FRA', paris, 10000))).toBe(0);
  });

  it('cavalleria e artiglieria costano di più da mantenere (punto 12)', () => {
    const w = newGame(MAP, 'SMR', 'c-costo');
    const s = w.state;
    const before = budget(w, 'ITA').upkeep;
    for (const u of s.units.filter((x) => x.nation === 'ITA')) u.type = 'cavalry';
    expect(budget(w, 'ITA').upkeep).toBeGreaterThan(before * 1.3);
  });
});

