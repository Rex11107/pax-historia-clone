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
    P.concludePeace(w, war, [{ type: 'liberate', from: 'TUR', eth: 'albanesi', provinces: alb, by: 'RUS', to: 'ALB' }]);
    expect(w.state.nations.ALB?.alive).toBe(true);
    expect(w.state.owner[alb[0]]).toBe('ALB');
  });

  it('le guerre perse dal giocatore finiscono: offerta, pressione, pace imposta (corte 07, capo 2)', async () => {
    const P = await import('../src/engine/peace');
    const { aiEndOfTurn, PEACE_OFFER_WEEKS, PEACE_PRESSURE_WEEKS } = await import('../src/engine/ai');
    const w = newGame(MAP, 'ITA');
    const s = w.state;
    declareWar(w, 'ITA', 'AUH', 'prova');
    const war = s.wars.at(-1)!;
    occupy(w, 'AUH', (p) => s.owner[p.id] === 'ITA' && p.id !== s.nations.ITA.capital);
    war.casualties.ITA = 150000; war.casualties.AUH = 10000;
    s.day = 70;
    expect(P.warScore(w, war).winner).toBe('def');
    const week = () => { s.day += 7; const sink: import('../src/engine/types').GameEvent[] = []; aiEndOfTurn(w, sink); return sink; };
    expect(week().some((e) => e.type === 'peace_offer')).toBe(true);
    expect(war.offer).toBeTruthy();
    const ex0 = s.nations.ITA.warExhaustion, st0 = s.nations.ITA.stability;
    for (let i = 0; i < PEACE_OFFER_WEEKS; i++) week();
    expect(s.wars.includes(war)).toBe(true);
    expect(s.nations.ITA.warExhaustion).toBeGreaterThan(ex0);
    expect(s.nations.ITA.stability).toBeLessThan(st0);
    let imposed = false;
    for (let i = 0; i < PEACE_PRESSURE_WEEKS && !imposed; i++) imposed = week().some((e) => e.type === 'peace_imposed');
    expect(imposed).toBe(true);
    expect(s.wars.includes(war)).toBe(false);
    // le occupazioni finiscono: l'Italia riavrà ciò che non ha ceduto
    expect(s.owner.some((o, p) => o === 'ITA' && s.controller[p] !== 'ITA')).toBe(false);
  });

  it('se il giocatore vince nessuno gli impone nulla', async () => {
    const { aiEndOfTurn } = await import('../src/engine/ai');
    const w = newGame(MAP, 'ITA');
    const s = w.state;
    declareWar(w, 'ITA', 'AUH', 'prova');
    const war = s.wars.at(-1)!;
    occupy(w, 'ITA', (p) => s.owner[p.id] === 'AUH' && p.id !== s.nations.AUH.capital);
    s.day = 70;
    for (let i = 0; i < 12; i++) { s.day += 7; aiEndOfTurn(w, []); }
    expect(s.wars.includes(war)).toBe(true);
    expect(war.offer).toBeUndefined();
  });

  it('il giocatore alleato minore esce con una pace separata; la guerra degli altri continua', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP, 'ROM');
    const s = w.state;
    declareWar(w, 'RUS', 'TUR', 'prova');
    const war = s.wars.at(-1)!;
    war.attackers.push('ROM');
    occupy(w, 'TUR', (p) => s.owner[p.id] === 'ROM' && p.id !== s.nations.ROM.capital);
    war.casualties.RUS = 200000; war.casualties.ROM = 30000; war.casualties.TUR = 5000;
    expect(P.warScore(w, war).winner).toBe('def');
    P.playerPeace(w, war);
    expect(s.wars.includes(war)).toBe(true);
    expect(war.attackers).not.toContain('ROM');
    expect(war.attackers).toContain('RUS');
    expect(s.owner.some((o, p) => o === 'ROM' && s.controller[p] === 'TUR')).toBe(false);
  });

  it('le perdite contano in proporzione agli eserciti (corte 07, capo 4)', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', 'prova');
    const war = w.state.wars.at(-1)!;
    war.defenders = ['AUH']; // senza la Germania alleata: il caso della corte
    war.casualties = { ITA: 0, AUH: 1000 };
    expect(P.warScore(w, war).points).toBeLessThan(3);
    war.casualties = { ITA: 0, AUH: 300000 };
    expect(P.warScore(w, war).points).toBeGreaterThanOrEqual(23);
  });

  it('le province occupate prima della guerra non contano (corte 07, giurato 3.3)', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    const s = w.state;
    // l'Italia tiene già province austriache (un'altra guerra) quando dichiara una nuova guerra all'Austria
    occupy(w, 'ITA', (p) => s.owner[p.id] === 'AUH' && ['IT-TN', 'IT-TS'].includes(p.iso ?? ''));
    declareWar(w, 'ITA', 'AUH', 'prova');
    const war = s.wars.at(-1)!;
    expect(war.pre?.length).toBeGreaterThan(0);
    expect(P.warScore(w, war).att).toBe(0);
  });

  it('vassallaggio solo fra disuguali (corte 07, capo 5)', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    expect(P.demandCost(w, { type: 'vassal', from: 'POR', to: 'SPA', level: 'vassallo' }).refusal).toMatch(/troppo grande/);
    expect(P.demandCost(w, { type: 'vassal', from: 'BUL', to: 'SER', level: 'vassallo' }).refusal).toMatch(/troppo grande/);
    const tun = P.demandCost(w, { type: 'vassal', from: 'TUN', to: 'FRA', level: 'protettorato' });
    expect(tun.refusal).toBeNull();
    // più il soggetto è grande, più costa
    expect(tun.cost).toBeGreaterThan(60);
  });

  it('la modalità toglie il tetto dei punti, non il controllo di chi vince (corte 07, capo 10)', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP, 'SER');
    declareWar(w, 'TUR', 'SER', 'prova');
    const war = w.state.wars.at(-1)!;
    occupy(w, 'TUR', (p) => w.state.owner[p.id] === 'SER' && p.id !== w.state.nations.SER.capital);
    expect(P.warScore(w, war).winner).toBe('att');
    const ask: import('../src/engine/peace').Demand[] = [{ type: 'indemnity', from: 'TUR', to: 'SER', amount: 10 }];
    for (const mode of ['engine', 'own', 'all'] as const) expect(P.peaceAnswer(w, war, 'SER', ask, mode).ok).toBe(false);
    // la Serbia battuta non ottiene nemmeno la pace bianca
    expect(P.peaceAnswer(w, war, 'SER', [], 'own').ok).toBe(false);
    // chi non combatte non detta nulla
    expect(P.peaceAnswer(w, war, 'FRA', [], 'all').ok).toBe(false);
  });

  it('liberazione: destinatario fissato, mai il popolo dello Stato, mai a sé stessi (corte 07, capo 6)', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    // i tedeschi della Germania non si «liberano» verso l'Austria-Ungheria
    const ted = P.provincesOfPeople(w, 'GER', 'tedeschi');
    expect(P.demandCost(w, { type: 'liberate', from: 'GER', eth: 'tedeschi', provinces: ted, by: 'AUH', to: 'AUH' }).refusal).toMatch(/popolo dell/);
    expect(P.liberationDemand(w, 'GER', 'tedeschi', 'AUH')).toBeNull();
    // un destinatario diverso da quello del popolo è rifiutato, anche se le province sono giuste
    const d = P.liberationDemand(w, 'TUR', 'albanesi', 'GRE')!;
    expect(d.to).toBe('ALB');
    expect(P.demandCost(w, { ...d, to: 'MOR' }).refusal).toMatch(/andrebbero/);
    expect(P.demandCost(w, d).refusal).toBeNull();
    // i greci ottomani vanno alla Grecia: la richiesta tiene solo il pezzo che la tocca
    const gr = P.liberationDemand(w, 'TUR', 'greci', 'RUS')!;
    expect(gr.to).toBe('GRE');
    expect(gr.provinces.length).toBeLessThan(P.provincesOfPeople(w, 'TUR', 'greci').length);
    expect(P.demandCost(w, { ...gr, provinces: P.provincesOfPeople(w, 'TUR', 'greci') }).refusal).toBeTruthy();
  });

  it('liberazione dentro le regole sui confini: la Polonia non stacca la Prussia orientale (giurato 3.1)', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    const pol = P.provincesOfPeople(w, 'GER', 'polacchi');
    expect(P.liberationCheck(w, 'GER', 'POL', pol).refusal).toMatch(/spezzato/);
    expect(P.liberationDemand(w, 'GER', 'polacchi', 'RUS')).toBeNull();
    // senza le regole sui confini (impostazione del giocatore) la richiesta resta possibile
    expect(P.liberationCheck(w, 'GER', 'POL', pol, false).refusal).toBeNull();
  });

  it('lo Stato liberato nasce amico del liberatore e con una guarnigione (capo 7)', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    declareWar(w, 'GRE', 'TUR', 'prova');
    const war = w.state.wars.at(-1)!;
    const d = P.liberationDemand(w, 'TUR', 'albanesi', 'GRE')!;
    const sink: import('../src/engine/types').GameEvent[] = [];
    P.concludePeace(w, war, [d], sink);
    expect(w.state.nations.ALB.opinion.GRE).toBe(60);
    const g = w.state.units.filter((u) => u.nation === 'ALB');
    expect(g.length).toBe(1);
    expect(w.state.owner[g[0].location]).toBe('ALB');
    expect(g[0].strength).toBeGreaterThanOrEqual(2000);
    expect(sink.find((e) => e.type === 'liberation')?.text).toMatch(/nasce con/);
  });
});
