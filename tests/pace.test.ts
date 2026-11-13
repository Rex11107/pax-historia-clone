import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { declareWar } from '../src/engine/diplomacy';
import { MAP } from './helpers';

describe('pace', () => {
  const occupy = (w: ReturnType<typeof newGame>, by: string, pred: (p: { id: number; iso?: string; modern: string }) => boolean) => w.map.provinces.filter((p) => pred(p)).forEach((p) => { w.state.controller[p.id] = by; });
  it('il motore prende ciò che rivendica e occupa, e impone protettorati realistici', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', 'prova');
    const war = w.state.wars.at(-1)!;
    occupy(w, 'ITA', (p) => w.state.owner[p.id] === 'AUH' && ['IT-TN', 'IT-BZ', 'IT-TS', 'HR-18', 'SI-046'].includes(p.iso ?? ''));
    w.state.nations.AUH.warExhaustion = 60; war.casualties.ITA = 20000; war.casualties.AUH = 60000;
    expect(P.warScore(w, war).winner).toBe('att');
    const terms = P.engineTerms(w, war);
    const ceded = terms.flatMap((d) => (d.type === 'cede' ? d.provinces.map((p) => w.map.provinces[p].name) : []));
    expect(ceded).toContain('Trento');
    expect(ceded).not.toContain('Bolzano'); // tedesca e non rivendicata
    expect(terms.some((d) => d.from === 'GER')).toBe(false); // la Germania alleata non è stata battuta
    expect(P.totalCost(w, terms).cost).toBeLessThanOrEqual(P.budgetOf(w, war, 'ITA') + 0.01);
    P.concludePeace(w, war, terms);
    const trento = w.map.provinces.find((p) => p.name === 'Trento')!.id;
    expect(w.state.owner[trento]).toBe('ITA');
    expect(w.state.wars.includes(war)).toBe(false);
    // l'Austria conserva una rivendicazione sul Trentino perso
    const C = await import('../src/engine/claims');
    expect(C.claimOf(w, 'AUH', trento)?.reason).toMatch(/persa/);

    const w2 = newGame(MAP);
    declareWar(w2, 'FRA', 'TUN', 'Krumiri');
    occupy(w2, 'FRA', (p) => w2.state.owner[p.id] === 'TUN');
    const t2 = P.engineTerms(w2, w2.state.wars.at(-1)!);
    expect(t2.some((d) => d.type === 'vassal' && d.level === 'protettorato')).toBe(true);
  });

  it('regole: niente capitale, niente territori irraggiungibili, guerre lontane solo riparazioni', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    declareWar(w, 'SPA', 'PER', 'prova');
    const war = w.state.wars.at(-1)!;
    occupy(w, 'SPA', (p) => w.state.owner[p.id] === 'PER');
    const persia = w.map.provinces.filter((p) => w.state.owner[p.id] === 'PER' && !p.coast && p.id !== w.state.nations.PER.capital).map((p) => p.id);
    expect(P.checkCession(w, 'PER', 'SPA', persia.slice(0, 1)).refusal).toMatch(/raggiungibile/);
    expect(P.checkCession(w, 'PER', 'SPA', [w.state.nations.PER.capital]).refusal).toMatch(/capitale/);
    expect(P.demandCost(w, { type: 'vassal', from: 'PER', to: 'SPA', level: 'vassallo' }).refusal).toMatch(/lontano/);
    expect(P.engineTerms(w, war).every((d) => ['indemnity', 'trade', 'dismantle'].includes(d.type))).toBe(true);
    // la proposta del giocatore oltre i punti viene rifiutata, ma in modalità "il giocatore dirige" passa
    const big: import('../src/engine/peace').Demand[] = [{ type: 'indemnity', from: 'PER', to: 'SPA', amount: 100000 }];
    expect(P.peaceAnswer(w, war, 'SPA', big).ok).toBe(false);
    expect(P.peaceAnswer(w, war, 'SPA', big, 'own').ok).toBe(true);
  });

  it('liberazione: nasce una nazione o i territori vanno allo Stato del popolo', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    declareWar(w, 'RUS', 'TUR', 'prova');
    const war = w.state.wars.at(-1)!;
    const bul = P.provincesOfPeople(w, 'TUR', 'bulgari');
    expect(bul.length).toBeGreaterThan(0);
    expect(P.liberationTarget(w, 'bulgari', 'TUR', bul)).toBe('BUL');
    const alb = P.provincesOfPeople(w, 'TUR', 'albanesi');
    expect(P.liberationTarget(w, 'albanesi', 'TUR', alb)).toBe('ALB');
    P.concludePeace(w, war, [{ type: 'liberate', from: 'TUR', eth: 'albanesi', provinces: alb, to: 'RUS' }]);
    expect(w.state.nations.ALB?.alive).toBe(true);
    expect(w.state.owner[alb[0]]).toBe('ALB');
  });
});
