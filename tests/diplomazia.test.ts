import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { declareWar, checkProposal, applyProposal, expireTreaties, SUBSIDY_GAP } from '../src/engine/diplomacy';
import { budget } from '../src/engine/economy';
import { atWar, opinion, treatyBetween } from '../src/engine/world';
import { dayOf } from '../src/scenario/politics1881';
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
    // e la Russia deve stare vincendo (corte 07, capo 1)
    const war = s.wars.at(-1)!;
    war.casualties.RUS = 20000; war.casualties.AUH = 250000; s.nations.AUH.warExhaustion = 70;
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

// Blocco B2 (corte 06): diplomazia coerente
describe('diplomazia coerente (corte 06)', () => {
  it('il signore difende il suo soggetto (giurato 2.1)', () => {
    const w = newGame(MAP, 'ITA');
    declareWar(w, 'FRA', 'HYD', 'prova');
    expect(w.state.wars.at(-1)!.defenders).toContain('GBR');
    const w2 = newGame(MAP, 'ITA');
    declareWar(w2, 'ITA', 'CAM', 'prova');
    expect(w2.state.wars.at(-1)!.defenders).toContain('FRA');
    // il tributario solo se il signore è più forte di chi attacca: la Porta non muove guerra alla Francia per Tunisi
    const w3 = newGame(MAP, 'ITA');
    declareWar(w3, 'FRA', 'TUN', 'prova');
    expect(w3.state.wars.at(-1)!.defenders).toEqual(['TUN']);
    // un soggetto che attacca un altro soggetto dello stesso signore non lo trascina in guerra contro di sé
    const w4 = newGame(MAP, 'ITA');
    declareWar(w4, 'MDV', 'HYD', 'prova');
    expect(w4.state.wars.at(-1)?.defenders ?? []).not.toContain('GBR');
  });

  it('join_war con gli stessi divieti di una dichiarazione (capo 2)', () => {
    const w = newGame(MAP, 'ITA');
    declareWar(w, 'ITA', 'AUH', 'prova');
    // la Germania alleata dell'Austria-Ungheria non entra in guerra contro di lei
    expect(checkProposal(w, 'ITA', 'GER', { type: 'join_war', against: 'AUH' })).toMatch(/alleanza|legame/);
    declareWar(w, 'ITA', 'TUR', 'prova');
    // l'Egitto tributario della Porta non entra in guerra contro il suo signore
    expect(checkProposal(w, 'ITA', 'EGY', { type: 'join_war', against: 'TUR' })).toMatch(/signore e soggetto/);
    // un protettorato non decide da solo la politica estera
    expect(checkProposal(w, 'ITA', 'HYD', { type: 'join_war', against: 'TUR' })).toMatch(/protettorato/);
    // un caso lecito resta lecito
    expect(checkProposal(w, 'ITA', 'GRE', { type: 'join_war', against: 'TUR' })).toBeNull();
  });

  it('nessuna proclamazione d\'indipendenza nel 1881 (capo 5)', async () => {
    const V = await import('../src/engine/vassals');
    let proclaimed = 0;
    for (let seed = 0; seed < 40; seed++) {
      const w = newGame(MAP, 'SMR', `indip${seed}`);
      for (let week = 0; week < 52; week++) {
        w.state.day += 7;
        const sink: import('../src/engine/types').GameEvent[] = [];
        V.weeklySubjects(w, sink);
        proclaimed += sink.filter((e) => /proclama/.test(e.text)).length;
      }
    }
    expect(proclaimed).toBe(0);
  }, 60000);

  it('chi attacca lo Stato che ha garantito viola la garanzia alla dichiarazione (capo 8)', () => {
    const w = newGame(MAP, 'ITA');
    const op0 = opinion(w.state, 'ITA', 'GER');
    declareWar(w, 'GER', 'BEL', 'prova');
    expect(w.state.treaties.some((t) => t.type === 'guarantee' && t.a === 'GER' && t.b === 'BEL' && !t.violated)).toBe(false);
    expect(opinion(w.state, 'ITA', 'GER')).toBe(Math.max(-100, op0 - 15));
  });

  it('la stima non si compra: un sussidio ogni sei mesi, al più 20 punti l\'anno (giurato 3.1)', () => {
    const w = newGame(MAP, 'GBR');
    const s = w.state;
    s.nations.GBR.treasury = 5000;
    const p = { type: 'subsidy' as const, giver: 'GBR', amount: 100 };
    const op0 = opinion(s, 'RUS', 'GBR');
    expect(checkProposal(w, 'GBR', 'RUS', p)).toBeNull();
    applyProposal(w, 'GBR', 'RUS', p);
    expect(checkProposal(w, 'GBR', 'RUS', p)).toMatch(/sei mesi/);
    s.day += SUBSIDY_GAP;
    expect(checkProposal(w, 'GBR', 'RUS', p)).toBeNull();
    applyProposal(w, 'GBR', 'RUS', p);
    // due sussidi da 100 milioni in meno di un anno: 20 punti in tutto, non 40
    expect(opinion(s, 'RUS', 'GBR') - op0).toBeLessThanOrEqual(20);
  });

  it('niente cicli di allenta e stringi: un\'azione sul legame ogni sei mesi (giurato 3.2)', async () => {
    const V = await import('../src/engine/vassals');
    const w = newGame(MAP, 'GBR');
    const x = V.subjectOf(w, 'HYD')!;
    x.liberty = 20;
    expect(V.loosen(w, 'GBR', 'HYD')).toBeNull();
    expect(x.level).toBe('vassallo');
    expect(V.tighten(w, 'GBR', 'HYD')).toMatch(/sei mesi/);
    w.state.day += V.BOND_GAP;
    expect(V.tighten(w, 'GBR', 'HYD')).toBeNull();
    expect(x.level).toBe('protettorato');
  });

  it('le alleanze hanno una scadenza e si rinnovano fra chi si stima (giurato 1.1)', () => {
    const w0 = newGame(MAP, 'ITA');
    applyProposal(w0, 'ITA', 'GBR', { type: 'alliance', years: 5 });
    expect(treatyBetween(w0.state, 'ITA', 'GBR', 'alliance')?.endDay).toBe(w0.state.day + 5 * 365);
    // la Duplice scade il 7 ottobre 1884 e, fra Germania e Austria-Ungheria che si stimano, si rinnova
    const w = newGame(MAP, 'ITA');
    const s = w.state;
    const dual = treatyBetween(s, 'GER', 'AUH', 'alliance')!;
    expect(dual.endDay).toBe(dayOf(1884, 10, 7));
    s.day = dual.endDay!;
    expireTreaties(w, []);
    expect(treatyBetween(s, 'GER', 'AUH', 'alliance')?.endDay).toBe(s.day + 5 * 365);
    // fra chi non si stima più scade
    s.day = dual.endDay!;
    s.nations.AUH.opinion.GER = -10;
    expireTreaties(w, []);
    expect(treatyBetween(s, 'GER', 'AUH', 'alliance')).toBeUndefined();
  });

  it('niente alleanze con l\'alleato di un rivale (capo 7)', () => {
    const w = newGame(MAP, 'ITA');
    // la Germania è alleata dell'Austria-Ungheria, rivale dell'Italia
    expect(checkProposal(w, 'ITA', 'GER', { type: 'alliance' })).toMatch(/rivale/);
    // un'alleanza lecita passa; dopo, l'alleato di un rivale e chi è in guerra con un alleato restano esclusi
    expect(checkProposal(w, 'ITA', 'GBR', { type: 'alliance' })).toBeNull();
    applyProposal(w, 'ITA', 'GBR', { type: 'alliance' });
    declareWar(w, 'RUS', 'GBR', 'prova');
    expect(checkProposal(w, 'ITA', 'RUS', { type: 'alliance' })).toMatch(/in guerra/);
  });
});

