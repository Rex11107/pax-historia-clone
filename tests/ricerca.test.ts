import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { budget } from '../src/engine/economy';
import { MAP } from './helpers';

describe('ricerca', () => {
  it('conoscenze del 1881, anticipo, scienziati, sblocchi e giacimenti', async () => {
    const R = await import('../src/engine/research');
    const C = await import('../src/engine/construction');
    const w = newGame(MAP);
    expect(R.knows(w, 'GBR', 'thomas')).toBe(true);
    expect(R.knows(w, 'ITA', 'thomas')).toBe(false);
    expect(R.knows(w, 'ITA', 'forti_poligonali')).toBe(true);
    expect(R.researchSlots(w, 'GBR')).toBe(3);
    // niente effetti per ciò che si sapeva già nel 1881 (è nei profili)
    expect(R.techEffects(w, 'GBR').industry).toBe(0);
    // l'anticipo costa: la mitragliatrice (1884) nel 1881 dura il 120% in più
    const maxim = R.tech('mitragliatrice')!;
    expect(R.weeksFor(w, maxim)).toBeGreaterThan(maxim.weeks * 1.8);
    // scienziati solo dove esistevano, attivi nei loro anni
    expect(R.scientistsFor(w, 'ITA', R.tech('dinamo')!).map((s) => s.id)).toContain('ferraris');
    expect(R.scientistsFor(w, 'TUR', R.tech('dinamo')!)).toHaveLength(0);
    expect(R.scientistsFor(w, 'FRA', R.tech('ripetizione')!).map((s) => s.id)).not.toContain('maxim');
    // il secondo livello del porto serve la ricerca
    const tunisi = w.map.locate(10.17, 36.8)!;
    expect(C.buildRefusal(w, 'TUN', tunisi, 'porto')).toMatch(/ricerca|livello|cantieri|servono/);
    // ricerca completa: si sblocca il livello e arrivano i giacimenti (Thomas: minette di Briey alla Francia)
    const briey = w.map.locate(5.9, 49.25)!;
    expect(R.siteLots(w, briey)).toHaveLength(0);
    expect(R.startResearch(w, 'FRA', 'thomas')).toBeNull();
    for (let i = 0; i < 80 && !R.knows(w, 'FRA', 'thomas'); i++) R.weeklyResearch(w, []);
    expect(R.knows(w, 'FRA', 'thomas')).toBe(true);
    expect(R.siteLots(w, briey)).toContain('ferro');
    expect(budget(w, 'FRA').research).toBeGreaterThanOrEqual(0);
  });

  it('collaborazione: medicina facile, militare difficile, entrambi ottengono il risultato', async () => {
    const R = await import('../src/engine/research');
    const { changeOpinion } = await import('../src/engine/world');
    const w = newGame(MAP);
    changeOpinion(w.state, 'GER', 'ITA', 40);
    const med = R.collabScore(w, 'ITA', 'GER', 'batteriologia');
    const mil = R.collabScore(w, 'ITA', 'FRA', 'mitragliatrice');
    expect(mil.score).toBeLessThan(med.score);
    // la Germania conosce già l'antisepsi: Italia prima la ricerca da sola
    R.research(w).known.ITA.push('antisepsi');
    expect(R.proposeCollab(w, 'ITA', 'GER', 'batteriologia', 'golgi')).toBeNull();
    const p = R.projectsOf(w, 'ITA')[0];
    expect(p.nations).toEqual(['ITA', 'GER']);
    expect(p.scientists.GER).toBe('koch');
    // costi divisi
    const full = R.weeklyCost(w, 'GER', R.tech('batteriologia')!, R.scientist('koch'));
    expect(R.researchCost(w, 'ITA') + R.researchCost(w, 'GER')).toBeCloseTo(full, 1);
    for (let i = 0; i < 80 && R.projectsOf(w, 'ITA').length; i++) R.weeklyResearch(w, []);
    expect(R.knows(w, 'ITA', 'batteriologia') && R.knows(w, 'GER', 'batteriologia')).toBe(true);
  });

  it('conoscenze del 1881 per paese e date storiche (corte 04, capo 6)', async () => {
    const R = await import('../src/engine/research');
    const w = newGame(MAP);
    // chi aveva comprato o imitato non «riscopre» ciò che già usava
    expect(R.knows(w, 'USA', 'pezzi_intercambiabili')).toBe(true);
    expect(R.knows(w, 'USA', 'telefono')).toBe(true);
    expect(R.knows(w, 'GER', 'thomas')).toBe(true);
    expect(R.knows(w, 'JAP', 'retrocarica')).toBe(true);
    expect(R.knows(w, 'CHI', 'telegrafo')).toBe(true);
    // ma non ciò che non avevano: il Giappone non ha il telefono, l'Italia non ha Thomas
    expect(R.knows(w, 'JAP', 'telefono')).toBe(false);
    expect(R.knows(w, 'ITA', 'thomas')).toBe(false);
    // il cherosene di Baku esiste dal 1860-70: la Russia lo conosce
    expect(R.knows(w, 'RUS', 'raffinazione')).toBe(true);
  });

  it('velocità: l\'industria rende meno e la massa economica conta', async () => {
    const R = await import('../src/engine/research');
    const w = newGame(MAP, 'SMR');
    const lb = (inc: number) => ({ income: inc } as never);
    w.state.nations.BEL.lastBudget = lb(6);
    const poor = R.baseSpeed(w, 'BEL');
    w.state.nations.BEL.lastBudget = lb(60);
    const rich = R.baseSpeed(w, 'BEL');
    expect(rich).toBeGreaterThan(poor * 1.2);
    // a parità di entrate, l'industria alta va più veloce ma con rendimenti decrescenti: da 20 a 50 si guadagna più che da 50 a 80
    w.state.nations.GER.lastBudget = lb(60);
    w.state.nations.JAP.lastBudget = lb(60);
    expect(R.baseSpeed(w, 'GER')).toBeGreaterThan(R.baseSpeed(w, 'JAP'));
    expect(R.baseSpeed(w, 'GER')).toBeLessThan(1);
  });

  it('l\'IA propone patti di ricerca agli alleati', async () => {
    const R = await import('../src/engine/research');
    const D = await import('../src/engine/diplomacy');
    const w = newGame(MAP, 'SMR');
    D.addTreaty(w, 'alliance', 'GER', 'AUH', 10);
    let pact = false;
    for (let i = 0; i < 400 && !pact; i++) {
      for (const t of ['GER', 'AUH']) w.state.nations[t].treasury = 500;
      R.weeklyResearch(w, []);
      pact = R.research(w).projects.some((p) => p.nations.length > 1 && p.nations.includes('GER') && p.nations.includes('AUH'));
      w.state.day += 7;
    }
    expect(pact).toBe(true);
  });
});
