import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { declareWar } from '../src/engine/diplomacy';
import { aiEndOfTurn, aiPlan, borderAlert } from '../src/engine/ai';
import { attackPower, defensePower } from '../src/engine/combat';
import { supplyMap } from '../src/engine/supply';
import type { GameEvent, Unit } from '../src/engine/types';
import { MAP, find } from './helpers';


// Fase C, area intelligenza (corte 02, «Da fare nella fase di bilanciamento», punti 7-11).
const unitOf = (nation: string, location: number, strength: number, maxStrength = 20000): Unit => ({
  id: `${nation}-t${location}-${strength}`, nation, type: 'infantry', name: 'prova', strength, maxStrength,
  morale: 0.8, supply: 1, experience: 0, entrench: 0, location, move: null, orders: [], inBattle: false, recovering: 0,
});

describe('fase C: intelligenza delle nazioni non giocanti', () => {
  it('in guerra la capitale non resta vuota (guarnigione, capo 6)', () => {
    const w = newGame(MAP, 'SMR', 'c-guarnigione');
    declareWar(w, 'ITA', 'AUH', 'prova');
    aiPlan(w);
    for (const t of ['ITA', 'AUH']) {
      const cap = w.state.nations[t].capital;
      const guard = w.state.units.filter((u) => u.nation === t && (u.location === cap || u.orders.some((o) => o.target === cap)));
      expect(guard.length, t).toBeGreaterThan(0);
    }
  });

  it('si attacca una provincia difesa solo con una volta e mezza la sua forza stimata (capo 2)', () => {
    const w = newGame(MAP, 'SMR', 'c-gruppi');
    declareWar(w, 'ITA', 'AUH', 'prova');
    aiPlan(w);
    const by = new Map<number, Unit[]>();
    for (const u of w.state.units) for (const o of u.orders) if (o.label === 'offensiva' && o.target !== undefined) by.set(o.target, [...(by.get(o.target) ?? []), u]);
    expect(by.size).toBeGreaterThan(0);
    for (const [p, us] of by) {
      const def = w.state.units.filter((u) => u.location === p && ['ITA', 'AUH'].includes(u.nation) && u.nation !== us[0].nation).reduce((a, u) => a + defensePower(w, u), 0);
      const att = us.reduce((a, u) => a + attackPower(w, u, p), 0);
      expect(att, w.map.provinces[p].name).toBeGreaterThanOrEqual(def * 1.5 - 1e-9);
    }
  });

  it('un\'unità logora e senza rifornimenti si ritira verso una provincia rifornita (capo 2)', () => {
    const w = newGame(MAP, 'SMR', 'c-ritirata');
    declareWar(w, 'ITA', 'AUH', 'prova');
    // un corpo italiano a pezzi in una provincia austriaca a due passi dal confine
    const edge = w.map.provinces.find((p) => w.state.owner[p.id] === 'AUH' && w.map.adj[p.id].some((e) => w.state.owner[e.to] === 'ITA'))!.id;
    const deep = w.map.adj[edge].map((e) => e.to).find((q) => w.state.owner[q] === 'AUH' && !w.map.adj[q].some((e) => w.state.owner[e.to] === 'ITA'))!;
    for (const x of w.state.units) if (x.nation === 'AUH' && (x.location === deep || x.location === edge)) x.location = w.state.nations.AUH.capital;
    const u = unitOf('ITA', deep, 5000, 20000);
    u.supply = 0.1;
    w.state.controller[deep] = 'ITA';
    w.state.units.push(u);
    aiPlan(w);
    expect(u.orders[0]?.label).toBe('ritirata');
    const sup = supplyMap(w, 'ITA');
    expect(sup[u.orders[0].target!]).toBeGreaterThanOrEqual(0.6);
  });

  it('chi si difende arruola anche a cassa vuota, a debito (capo 8)', () => {
    const w = newGame(MAP, 'SMR', 'c-debito');
    declareWar(w, 'GER', 'NED', 'prova');
    const ned = w.state.nations.NED;
    ned.treasury = 0; ned.debt = 0;
    // l'esercito tedesco entra nei Paesi Bassi
    const cap = ned.capital;
    w.state.units.push(unitOf('GER', w.map.adj[cap][0].to, 200000, 200000));
    const before = w.state.units.filter((u) => u.nation === 'NED').length;
    aiEndOfTurn(w, []);
    expect(w.state.units.filter((u) => u.nation === 'NED').length).toBeGreaterThan(before);
    expect(ned.debt).toBeGreaterThan(0);
  });

  it('truppe ammassate al confine fanno richiamare i riservisti, e se ne vanno si torna alla pace (nota dell\'exploit)', () => {
    const w = newGame(MAP, 'SMR', 'c-confine');
    const bel = w.state.nations.BEL;
    expect(bel.policies.mobilization).toBe('peace');
    const border = w.map.provinces.find((p) => w.state.owner[p.id] === 'GER' && w.map.adj[p.id].some((e) => w.state.owner[e.to] === 'BEL'))!.id;
    // quasi tutto l'esercito tedesco sul confine belga
    for (const u of w.state.units.filter((x) => x.nation === 'GER')) u.location = border;
    const sink: GameEvent[] = [];
    borderAlert(w, 'BEL', sink);
    expect(bel.policies.mobilization).toBe('partial');
    expect(sink.some((e) => e.type === 'mobilization')).toBe(true);
    for (const u of w.state.units.filter((x) => x.nation === 'GER')) u.location = w.state.nations.GER.capital;
    borderAlert(w, 'BEL', sink);
    expect(bel.policies.mobilization).toBe('peace');
  });

  it('in pace la guarnigione normale non fa scattare l\'allarme', () => {
    const w = newGame(MAP, 'SMR', 'c-pace');
    const sink: GameEvent[] = [];
    for (const t of ['BEL', 'SWI', 'SPA', 'GBR', 'SER', 'GER', 'AUH']) borderAlert(w, t, sink);
    expect(sink).toEqual([]);
  });

  it('una marina media rifornisce i porti occupati: il Cile a Iquique nel 1881', () => {
    const w = newGame(MAP, 'SMR', 'c-porti');
    const iq = find(w, 'Iquique');
    expect(w.state.controller[iq]).toBe('CHL');
    expect(supplyMap(w, 'CHL')[iq]).toBeGreaterThan(0.6);
  });
});
