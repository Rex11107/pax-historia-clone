// Blocco A2 (corti 03 e 04): peso coloniale ovunque, debiti storici, ricerca sull'industria di oggi, sblocchi,
// giacimenti, mitragliatrice, cantieri altrui e debito volontario del giocatore.
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { budget, loanRoom, repayDebt, takeLoan } from '../src/engine/economy';
import { colonialWeight } from '../src/engine/ethnic';
import { nationResources } from '../src/engine/resources';
import { effectiveResources } from '../src/engine/trade';
import * as C from '../src/engine/construction';
import * as R from '../src/engine/research';
import { MAP } from './helpers';

const at = (w: ReturnType<typeof newGame>, lon: number, lat: number) => w.map.locate(lon, lat)!;

describe('peso coloniale', () => {
  it('le risorse delle colonie rendono l\'8% alla madrepatria (corte 03, capo 2)', () => {
    const w = newGame(MAP);
    const s = w.state;
    const colony = (i: number) => s.owner[i] === 'GBR' && colonialWeight(w, 'GBR', i) < 1;
    const ind = C.industryOf(w, 'GBR');
    const full = nationResources(w.map, w.map.resources, s.controller, s.owner, 'GBR', ind, (i) => C.extraLots(w, i));
    const colonial = nationResources(w.map, w.map.resources, s.controller, s.owner, 'GBR', ind, (i) => C.extraLots(w, i), (i) => (colony(i) ? 1 : 0));
    expect(colonial.income).toBeGreaterThan(5);
    // la rendita effettiva perde almeno l'80% della parte coloniale (i contratti del 1881 la spostano di poco)
    const eff = effectiveResources(w, 'GBR');
    expect(eff.income).toBeLessThan(full.income - 0.8 * colonial.income + 2);
  });

  it('occupare non rende più che annettere (corte 03, capo 11)', () => {
    const w = newGame(MAP);
    const s = w.state;
    // la provincia cinese più popolosa
    const p = w.map.provinces.filter((x) => s.owner[x.id] === 'CHI' && !x.impassable).sort((a, b) => b.pop - a.pop)[0].id;
    expect(colonialWeight(w, 'JAP', p)).toBeLessThan(1);
    const base = budget(w, 'JAP').income;
    s.controller[p] = 'JAP';
    C.touchBuildings();
    const occupied = budget(w, 'JAP').income - base;
    s.owner[p] = 'JAP';
    C.touchBuildings();
    const annexed = budget(w, 'JAP').income - base;
    expect(occupied).toBeGreaterThan(0);
    expect(annexed).toBeGreaterThanOrEqual(occupied);
  });

  it('opere e logistica pesano la popolazione coloniale (corte 04, capo 2)', () => {
    const w = newGame(MAP);
    const s = w.state;
    const b = C.buildings(w);
    const india = w.map.provinces.filter((x) => s.owner[x.id] === 'GBR' && s.controller[x.id] === 'GBR' && colonialWeight(w, 'GBR', x.id) < 1 && !b[x.id].tessile).sort((a, c) => c.pop - a.pop)[0];
    const london = at(w, -0.12, 51.5);
    expect(india.pop).toBeGreaterThan(w.map.provinces[london].pop);
    const i0 = C.buildingIncome(w, 'GBR');
    b[india.id].tessile = 1; C.touchBuildings();
    const dIndia = C.buildingIncome(w, 'GBR') - i0;
    delete b[india.id].tessile;
    const l0 = b[london].tessile ?? 0;
    b[london].tessile = l0 + 1; C.touchBuildings();
    const dLondon = C.buildingIncome(w, 'GBR') - i0;
    b[london].tessile = l0 || undefined; C.touchBuildings();
    expect(dIndia).toBeLessThan(dLondon);
    // la logistica britannica non conta più trecento milioni di indiani come carbone e fucili (prima 1580)
    expect(C.logistics(w, 'GBR').capacity).toBeLessThan(1000);
  });
});

describe('debiti storici (corte 03, capo 10)', () => {
  it('Stati Uniti, Giappone e Cina partono indebitati', () => {
    const w = newGame(MAP);
    expect(w.state.nations.USA.debt).toBeGreaterThan(10000);
    expect(w.state.nations.USA.debt).toBeLessThan(11500);
    expect(w.state.nations.JAP.debt).toBeGreaterThan(500);
    expect(w.state.nations.CHI.debt).toBeGreaterThan(0);
    expect(budget(w, 'USA').interest).toBeGreaterThan(5);
  });
});

describe('ricerca e opere (corte 04)', () => {
  it('la ricerca segue l\'industria di oggi, non quella del 1881 (capo 3)', () => {
    const w = newGame(MAP);
    const s = w.state;
    expect(w.profiles.SPA.industry).toBeLessThan(35);
    expect(R.researchSlots(w, 'SPA')).toBe(1);
    R.startResearch(w, 'SPA', 'telefono');
    const before = R.researchSlots(w, 'SPA');
    const proj = R.projectsOf(w, 'SPA')[0];
    const v0 = proj ? R.speedOf(w, proj) : 0;
    // la Spagna si industrializza: siderurgie nelle province più popolose (carbone delle Asturie, ferro di Biscaglia)
    const b = C.buildings(w);
    for (const p of w.map.provinces.filter((x) => s.owner[x.id] === 'SPA' && s.controller[x.id] === 'SPA' && !x.impassable).slice(0, 12)) b[p.id].siderurgia = 3;
    C.touchBuildings();
    expect(C.industryOf(w, 'SPA')).toBeGreaterThanOrEqual(35);
    expect(R.researchSlots(w, 'SPA')).toBeGreaterThan(before);
    if (proj) expect(R.speedOf(w, proj)).toBeGreaterThan(v0);
  });

  it('ogni opera si può portare al livello massimo con la ricerca (capo 1)', () => {
    for (const [k, info] of Object.entries(C.BUILDINGS) as [C.BuildingId, C.BuildingInfo][])
      for (let l = 2; l <= info.max; l++) expect(R.unlockTech(k, l), `${k} livello ${l}`).toBeTruthy();
  });

  it('la mitragliatrice non stanca chi la possiede (capo 10)', () => {
    expect(R.tech('mitragliatrice')!.effects.exhaustion).toBeUndefined();
  });

  it('i giacimenti rendono anche dove la risorsa c\'è già, e oro e diamanti si scavano (capi 7 e 8)', () => {
    const w = newGame(MAP);
    const s = w.state;
    // ogni giacimento della ricerca dà un lotto a chi controlla la provincia e conosce la tecnica
    for (const x of R.TECHS) for (const [r, lon, lat, name] of x.sites ?? []) {
      const p = w.map.locate(lon, lat);
      if (p === null || w.map.provinces[p].impassable) continue;
      const ctrl = s.controller[p];
      if (!R.knows(w, ctrl, x.id)) (R.research(w).known[ctrl] ??= []).push(x.id);
      expect(R.siteLots(w, p), name).toContain(r);
    }
    // la minette lorenese: la Mosella ha già il ferro, Thomas ne aggiunge un lotto
    const mosella = at(w, 6.05, 49.33);
    expect(w.map.resources[mosella]).toContain('ferro');
    expect(C.extraLots(w, mosella)).toContain('ferro');
    // Kimberley: la miniera del 1881 scava diamanti
    expect(C.extraLots(w, at(w, 24.77, -28.74)).filter((r) => r === 'diamanti').length).toBeGreaterThanOrEqual(1);
    // il Witwatersrand si apre nel 1886, per chiunque controlli la provincia
    const rand = at(w, 28.0, -26.2);
    expect(R.siteLots(w, rand)).not.toContain('oro');
    s.day = 365 * 5 + 200;
    expect(R.siteLots(w, rand)).toContain('oro');
    expect(C.buildRefusal(w, s.controller[rand], rand, 'miniera')).not.toMatch(/risorse minerarie/);
  });

  it('il Borinage è in Belgio', () => {
    const w = newGame(MAP);
    const p = at(w, 3.89, 50.41);
    expect(w.state.owner[p]).toBe('BEL');
    expect(C.level(w, p, 'miniera')).toBeGreaterThanOrEqual(1);
    expect(C.level(w, at(w, 3.6, 50.4), 'miniera')).toBe(0); // il Nord francese ha solo bestiame
  });

  it('un cantiere lo chiude solo chi l\'ha aperto, e l\'investimento nel vassallo torna indietro (capo 13)', () => {
    const w = newGame(MAP);
    const s = w.state;
    s.nations.ITA.treasury = 500;
    const milano = at(w, 9.19, 45.46);
    expect(C.startProject(w, 'ITA', milano, 'agricoltura')).toBeNull();
    const id = C.projects(w).find((x) => x.nation === 'ITA')!.id;
    expect(C.cancelProject(w, id, 'FRA')).toMatch(/nostro/);
    expect(C.projects(w).some((x) => x.id === id)).toBe(true);
    const t0 = s.nations.ITA.treasury;
    expect(C.cancelProject(w, id, 'ITA')).toBeNull();
    expect(s.nations.ITA.treasury).toBeGreaterThan(t0);
    // in un vassallo: aprire e chiudere non lascia investimento
    const sub = (s.subjects ?? []).find((x) => x.level !== 'tributario' && s.nations[x.overlord]?.alive && s.nations[x.subject]?.alive);
    if (!sub) return;
    const p = w.map.provinces.find((x) => s.owner[x.id] === sub.subject && s.controller[x.id] === sub.subject && !x.impassable && !C.buildRefusal(w, sub.overlord, x.id, 'ferrovia'));
    if (!p) return;
    s.nations[sub.overlord].treasury = 1000;
    const inv0 = sub.invested ?? 0;
    expect(C.startProject(w, sub.overlord, p.id, 'ferrovia')).toBeNull();
    expect(sub.invested).toBeGreaterThan(inv0);
    const pid = C.projects(w).find((x) => x.nation === sub.overlord && x.province === p.id)!.id;
    expect(C.cancelProject(w, pid, sub.overlord)).toBeNull();
    expect(sub.invested).toBe(inv0);
  });
});

describe('debito volontario (corte 03, capo 6)', () => {
  it('il giocatore rimborsa e prende in prestito passando dal registro', () => {
    const w = newGame(MAP, 'ITA');
    const n = w.state.nations.ITA;
    n.treasury = 300;
    const d0 = n.debt;
    expect(repayDebt(w, 'ITA', 100)).toBeNull();
    expect(n.debt).toBeCloseTo(d0 - 100);
    expect(n.treasury).toBeCloseTo(200);
    expect(n.extra?.rimborso).toBeCloseTo(-100);
    // non si rimborsa più di quanto c'è in cassa
    expect(repayDebt(w, 'ITA', 10000)).toBeNull();
    expect(n.treasury).toBe(0);
    expect(n.debt).toBeCloseTo(d0 - 300);
    expect(repayDebt(w, 'ITA', 10)).toMatch(/vuote/);
    // prestito: entra l'importo, il debito cresce del 10% in più
    const d1 = n.debt;
    expect(takeLoan(w, 'ITA', 200)).toBeNull();
    expect(n.treasury).toBeCloseTo(200);
    expect(n.debt).toBeCloseTo(d1 + 220);
    expect(n.extra?.prestito).toBeCloseTo(200);
    // c'è un tetto: oltre, i banchieri non prestano
    expect(takeLoan(w, 'ITA', loanRoom(w, 'ITA') + 1)).toMatch(/banchieri/);
    expect(takeLoan(w, 'ITA', -5)).toMatch(/importo/);
  });
});
