import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { declareWar } from '../src/engine/diplomacy';
import { concludePeace } from '../src/engine/peace';
import { checkInvariants } from '../src/engine/invariants';
import { annex, setSubject, subjectOf, subjects } from '../src/engine/vassals';
import { startProject, projects } from '../src/engine/construction';
import { signTrade, contracts } from '../src/engine/trade';
import type { MapData } from '../src/engine/types';

const MAP: MapData = JSON.parse(fs.readFileSync('public/data/europe1881.json', 'utf8'));

describe('invarianti dello stato', () => {
  it('lo stato iniziale è sano', () => {
    expect(checkInvariants(newGame(MAP))).toEqual([]);
  });

  it('restano vere dopo ogni fase, con guerre, paci dure e annessioni', () => {
    const w = newGame(MAP, 'SMR');
    const s = w.state;
    const bad: string[] = [];
    const check = (where: string) => { for (const v of checkInvariants(w)) if (bad.length < 10) bad.push(`turno ${s.turn} [${where}] ${v}`); };
    declareWar(w, 'GER', 'FRA', ''); declareWar(w, 'RUS', 'TUR', ''); declareWar(w, 'FRA', 'TUN', '');
    for (let i = 0; i < 14; i++) {
      if (i === 4) declareWar(w, 'GBR', 'HYD', ''); // un signore contro il suo protettorato
      if (i === 6) { const war = s.wars.find((x) => x.attackers[0] === 'FRA' && x.defenders.includes('TUN')); if (war) concludePeace(w, war, [{ type: 'annex', from: 'TUN', to: 'FRA' }]); }
      if (i === 8) { const war = s.wars.find((x) => x.attackers[0] === 'RUS'); if (war) concludePeace(w, war, [{ type: 'vassal', from: 'TUR', to: 'RUS', level: 'vassallo' }]); }
      if (i === 10) { const war = s.wars.find((x) => x.attackers[0] === 'GER'); if (war) concludePeace(w, war, []); }
      check('mosse');
      runTurn(w, check);
    }
    expect(bad).toEqual([]);
    expect(s.nations.TUN.alive).toBe(false);
    expect(subjectOf(w, 'HYD')).toBeUndefined(); // la guerra ha sciolto il protettorato
  }, 120000);

  it('una nazione che scompare esce da trattati, contratti, cantieri e legami', () => {
    const w = newGame(MAP, 'ITA');
    const s = w.state;
    // il Belgio: garantito dalle potenze, con un cantiere e un contratto aperti
    s.nations.BEL.treasury = 500;
    const p = w.map.provinces.find((x) => x.owner === 'BEL' && !x.impassable)!.id;
    expect((['ferrovia', 'agricoltura', 'tessile', 'fortezza'] as const).some((k) => startProject(w, 'BEL', p, k) === null)).toBe(true);
    const lots = Object.keys(w.map.resources.reduce((a, r, i) => { if (s.owner[i] === 'BEL') for (const x of r) a[x] = 1; return a; }, {} as Record<string, number>));
    lots.some((r) => signTrade(w, 'BEL', 'NED', r as never, 1) === null);
    expect(s.treaties.some((t) => t.a === 'BEL' || t.b === 'BEL')).toBe(true);
    setSubject(w, 'BEL', 'FRA', 'protettorato', 10);
    subjects(w).find((x) => x.subject === 'BEL')!.since = -1000;
    expect(annex(w, 'FRA', 'BEL')).toBeNull();
    expect(s.nations.BEL.alive).toBe(false);
    expect(s.treaties.some((t) => t.a === 'BEL' || t.b === 'BEL')).toBe(false);
    expect(projects(w).some((x) => x.nation === 'BEL')).toBe(false);
    expect(contracts(s).some((c) => c.seller === 'BEL' || c.buyer === 'BEL')).toBe(false);
    expect(checkInvariants(w)).toEqual([]);
  });

  it('niente catene circolari: se il signore diventa soggetto del suo soggetto, il vecchio legame cade', () => {
    const w = newGame(MAP, 'ITA');
    expect(subjectOf(w, 'EGY')?.overlord).toBe('TUR');
    setSubject(w, 'TUR', 'EGY', 'vassallo', 50);
    expect(subjectOf(w, 'EGY')).toBeUndefined();
    expect(subjectOf(w, 'TUR')?.overlord).toBe('EGY');
    expect(checkInvariants(w)).toEqual([]);
  });
});
