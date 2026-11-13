import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { declareWar, checkProposal } from '../src/engine/diplomacy';
import { budget } from '../src/engine/economy';
import { atWar } from '../src/engine/world';
import { MAP } from './helpers';

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

describe('vassalli', () => {
  it('tributari del 1881, tributo, desiderio di indipendenza, protettorato', async () => {
    const V = await import('../src/engine/vassals');
    const w = newGame(MAP);
    expect(V.subjectOf(w, 'EGY')?.overlord).toBe('TUR');
    expect(V.subjectOf(w, 'BUL')?.level).toBe('tributario');
    runTurn(w);
    expect(budget(w, 'TUR').tribute).toBeGreaterThan(0);
    expect(budget(w, 'EGY').tribute).toBeLessThan(0);
    // protettorato: la Francia occupa Tunisi
    declareWar(w, 'FRA', 'TUN', 'Krumiri');
    expect(V.protectorateRefusal(w, 'FRA', 'TUN')).toMatch(/capitale/);
    const cap = w.state.nations.TUN.capital;
    w.state.controller[cap] = 'FRA';
    expect(V.imposeProtectorate(w, 'FRA', 'TUN')).toBeNull();
    const x = V.subjectOf(w, 'TUN')!;
    expect(x.overlord).toBe('FRA');
    expect(x.level).toBe('protettorato');
    expect(atWar(w.state, 'FRA', 'TUN')).toBe(false);
    // un protettorato non firma trattati da solo e non dichiara guerra
    expect(checkProposal(w, 'ITA', 'TUN', { type: 'trade' })).toMatch(/protettorato/);
    expect(declareWar(w, 'TUN', 'ITA', 'prova')).toMatch(/protettorato/);
    // il desiderio di indipendenza va verso l'obiettivo
    x.liberty = 100;
    V.weeklySubjects(w, []);
    expect(x.liberty).toBeLessThan(100);
    // annessione: non prima di due anni e con desiderio basso
    expect(V.annexRefusal(w, 'FRA', 'TUN')).not.toBeNull();
    x.liberty = 10; x.since = -800;
    expect(V.annex(w, 'FRA', 'TUN')).toBeNull();
    expect(w.state.owner[cap]).toBe('FRA');
  });
});
