import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { applyProposal, declareWar } from '../src/engine/diplomacy';
import { startProject } from '../src/engine/construction';
import { recruit } from '../src/engine/economy';
import type { MapData } from '../src/engine/types';

const MAP: MapData = JSON.parse(fs.readFileSync('public/data/europe1881.json', 'utf8'));
const sum = (e?: Record<string, number>) => Object.values(e ?? {}).reduce((a, b) => a + b, 0);

describe('bilancio unico', () => {
  it('casse a fine turno = casse a inizio turno + saldo del bilancio + movimenti fuori bilancio, per ogni nazione', () => {
    const w = newGame(MAP, 'ITA');
    const s = w.state;
    declareWar(w, 'GER', 'FRA', ''); // la guerra fa arruolare e indebitare
    for (let t = 0; t < 12; t++) {
      // il giocatore spende fra un turno e l'altro: i movimenti entrano nella settimana in corso
      if (t === 1) expect(recruit(w, 'ITA', 'infantry', s.nations.ITA.capital)).toBeNull();
      if (t === 2) expect((['ferrovia', 'agricoltura', 'tessile'] as const).some((k) => startProject(w, 'ITA', s.nations.ITA.capital, k) === null)).toBe(true);
      if (t === 3) applyProposal(w, 'ITA', 'GRE', { type: 'subsidy', amount: 5 });
      const start = Object.fromEntries(Object.values(s.nations).map((n) => [n.tag, n.treasury - sum(n.extra)]));
      runTurn(w);
      for (const n of Object.values(s.nations)) {
        if (!n.alive || start[n.tag] === undefined || !n.lastBudget) continue;
        expect(n.treasury, `${n.tag}, turno ${t + 1}`).toBeCloseTo(start[n.tag] + n.lastBudget.net + sum(n.lastExtra), 1);
        expect(n.treasury).toBeGreaterThanOrEqual(0);
      }
    }
    expect(s.nations.ITA.treasury).toBeGreaterThan(0);
    // qualcuno ha arruolato, costruito, si è indebitato o ha rimborsato: il registro non è vuoto
    const kinds = new Set(Object.values(s.nations).flatMap((n) => Object.keys(n.lastExtra ?? {})));
    expect(kinds.size).toBeGreaterThan(0);
  }, 120000);

  it('un sussidio esce da una cassa ed entra nell\'altra', () => {
    const w = newGame(MAP, 'ITA');
    const s = w.state;
    const tot = s.nations.ITA.treasury + s.nations.GRE.treasury;
    applyProposal(w, 'ITA', 'GRE', { type: 'subsidy', amount: 7 });
    expect(s.nations.ITA.extra?.sussidi).toBe(-7);
    expect(s.nations.GRE.extra?.sussidi).toBe(7);
    expect(s.nations.ITA.treasury + s.nations.GRE.treasury).toBeCloseTo(tot, 6);
  });

  it('solo il registro scrive casse e debito', () => {
    const bad = /(treasury|\.debt)\s*(\+|-|\*|\/)?=(?!=)/;
    const found: string[] = [];
    for (const dir of ['src/engine', 'src/ui', 'src/llm', 'src']) for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.ts') || (dir === 'src/engine' && f === 'ledger.ts')) continue;
      fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').forEach((line, i) => { if (bad.test(line)) found.push(`${dir}/${f}:${i + 1}`); });
    }
    expect(found).toEqual([]);
  });
});
