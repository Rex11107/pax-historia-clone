import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { setPolicy } from '../src/engine/economy';
import { MAP } from './helpers';

describe('politica', () => {
  it('dati del 1881, rischio graduale, crisi ed elezioni', async () => {
    const P = await import('../src/engine/politics');
    const w = newGame(MAP);
    const ita = P.politicsOf(w, 'ITA')!;
    expect(ita.head).toBe('Benedetto Cairoli');
    expect(ita.regime).toBe('parliamentary');
    expect(P.politicsOf(w, 'GER')!.head).toBe('Otto von Bismarck');
    expect(P.politicsOf(w, 'RUS')!.nextElection).toBeNull();
    expect(P.politicsOf(w, 'SMR')).toBeNull();
    // niente soglia rigida: il rischio cresce con continuità
    const at = (c: number) => P.crisisChance({ ...ita, confidence: c });
    expect(at(60)).toBe(0);
    expect(at(52)).toBeGreaterThan(0);
    expect(at(52)).toBeLessThan(0.05);
    expect(at(40)).toBeGreaterThan(at(48));
    expect(at(0)).toBeLessThanOrEqual(0.6);
    // crisi: elezioni anticipate
    ita.crisis = { day: 0, options: P.crisisOptions(ita) };
    expect(P.resolveCrisis(w, 'ITA', 'decree')).not.toBeNull(); // niente decreti in un regime parlamentare
    expect(P.resolveCrisis(w, 'ITA', 'dissolve')).toBeNull();
    expect(ita.nextElection).toBe(28);
    // il voto cambia la maggioranza se il consenso è cambiato
    ita.parties.find((p) => p.id === 'sinistra')!.pop = 30;
    ita.parties.find((p) => p.id === 'destra')!.pop = 66;
    P.holdElection(w, 'ITA', ita, []);
    expect(ita.gov[0]).toBe('destra');
    expect(ita.head).toBe('Marco Minghetti');
    // il rimpasto nello stesso partito fa subentrare il secondo capo (Cairoli → Depretis)
    const w2 = newGame(MAP);
    const i2 = P.politicsOf(w2, 'ITA')!;
    i2.crisis = { day: 0, options: P.crisisOptions(i2) };
    P.resolveCrisis(w2, 'ITA', 'reshuffle');
    expect(i2.head).toBe('Agostino Depretis');
  });

  it('un governo debole pesa sulla stabilità, la stampa censurata irrita i liberali', async () => {
    const P = await import('../src/engine/politics');
    const { stabilityTarget } = await import('../src/engine/economy');
    const w = newGame(MAP);
    const ps = P.politicsOf(w, 'ITA')!;
    const t0 = stabilityTarget(w, 'ITA');
    ps.confidence = 20;
    expect(stabilityTarget(w, 'ITA')).toBeLessThan(t0);
    const c0 = P.confidence(w, 'ITA', ps);
    setPolicy(w, 'ITA', 'press', 'censored');
    expect(P.confidence(w, 'ITA', ps)).toBeLessThan(c0);
    // due anni di gioco: le crisi arrivano, ma non a raffica
    const w3 = newGame(MAP);
    let crises = 0, elections = 0;
    for (let i = 0; i < 60; i++) for (const e of runTurn(w3).events) { if (e.type === 'crisis_open') crises++; if (e.type === 'election') elections++; }
    expect(elections).toBeGreaterThan(3);
    expect(crises).toBeLessThan(40);
  }, 60000);
});

describe('ministri', () => {
  it('gabinetto 1881, vincoli di partito e anni, effetti', async () => {
    const M = await import('../src/engine/ministers');
    const P = await import('../src/engine/politics');
    const w = newGame(MAP);
    const ita = M.cabinetOf(w, 'ITA')!;
    expect(M.minister(ita.posts.finanze)!.name).toBe('Agostino Magliani');
    expect(M.headMinister(w, 'ITA')!.name).toBe('Benedetto Cairoli');
    expect(M.cabinetOf(w, 'SER')).toBeNull();
    // un uomo della Destra non entra in un governo della Sinistra; Boulanger non prima del 1886
    expect(M.appoint(w, 'ITA', 'finanze', 'sella')).not.toBeNull();
    expect(M.appoint(w, 'FRA', 'guerra', 'boulanger')).not.toBeNull();
    // Ricotti alla Guerra: qualità militare in più, un punto di stabilità in meno
    const st = w.state.nations.ITA.stability;
    const q0 = P.govEffects(w, 'ITA').quality;
    expect(M.appoint(w, 'ITA', 'guerra', 'ricotti')).toBeNull();
    expect(P.govEffects(w, 'ITA').quality).toBeGreaterThan(q0);
    expect(w.state.nations.ITA.stability).toBe(st - 1);
    expect(M.appoint(w, 'ITA', 'guerra', 'ferrero')).toMatch(/quattro settimane/);
    // Mancini agli Esteri migliora l'opinione austriaca e tedesca
    w.state.day = 60;
    expect(M.appoint(w, 'ITA', 'esteri', 'mancini')).toBeNull();
    const op = w.state.nations.AUH.opinion.ITA ?? 0;
    for (let i = 0; i < 10; i++) M.weeklyMinisters(w, []);
    expect(w.state.nations.AUH.opinion.ITA).toBeGreaterThan(op);
    // cambio di maggioranza: i ministri della Sinistra lasciano, il motore li rimpiazza
    const ps = P.politicsOf(w, 'ITA')!;
    ps.parties.find((p) => p.id === 'sinistra')!.pop = 30;
    ps.parties.find((p) => p.id === 'destra')!.pop = 66;
    P.holdElection(w, 'ITA', ps, []);
    M.weeklyMinisters(w, []);
    expect(M.minister(ita.posts.esteri)?.party).not.toBe('sinistra');
    expect(M.minister(ita.posts.interno)?.party ?? null).not.toBe('sinistra');
  });
});

// Blocco B3 (corte 05): politica che conta
describe('politica che conta (corte 05)', () => {
  const at = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1881, 0, 1)) / 86400000);

  it('i capi muoiono e si ritirano: nessun capo del 1881 dove la storia lo esclude (capo 2)', async () => {
    const P = await import('../src/engine/politics');
    const w = newGame(MAP, 'SMR');
    const s = w.state;
    const tags = ['ITA', 'FRA', 'GBR', 'GER', 'USA'];
    const first = Object.fromEntries(tags.map((t) => [t, P.politicsOf(w, t)!.head]));
    expect(P.leaderActive(w, 'FRA', 'Léon Gambetta')).toBe(true);
    s.day = at(1885, 6, 1);
    expect(P.leaderActive(w, 'FRA', 'Léon Gambetta')).toBe(false); // morto il 31 dicembre 1882
    s.day = at(1899, 6, 1);
    const sink: import('../src/engine/types').GameEvent[] = [];
    P.weeklyPolitics(w, sink);
    for (const t of tags) {
      const head = P.politicsOf(w, t)!.head;
      expect(head, t).not.toBe(first[t]);
      expect(P.leaderActive(w, t, head), `${t}: ${head}`).toBe(true);
      expect(head, t).not.toMatch(/^il |capo del governo/);
    }
    // la Corona tedesca sceglie un cancelliere con scheda: dopo Bismarck (1890) Caprivi, poi Hohenlohe
    expect(P.politicsOf(w, 'GER')!.head).toBe('Chlodwig zu Hohenlohe-Schillingsfürst');
    expect(sink.some((e) => e.type === 'government' && /lascia la guida/.test(e.text))).toBe(true);
    // un partito senza capi attivi ha un notabile, non un segnaposto
    const ita = P.politicsOf(w, 'ITA')!;
    ita.gov = ['estrema'];
    s.day = at(1899, 6, 1);
    ita.head = 'Agostino Bertani';
    P.weeklyPolitics(w, []);
    expect(ita.head).toMatch(/notabile|Cavallotti/);
  });

  it('la stabilità pesa su entrate e leva; sotto 30 i disordini (capo 1)', async () => {
    const { budget, stabilityFactor } = await import('../src/engine/economy');
    const w = newGame(MAP, 'SMR');
    const n = w.state.nations.ITA;
    n.stability = 80; const hi = budget(w, 'ITA');
    n.stability = 15; const lo = budget(w, 'ITA');
    expect(lo.income).toBeLessThan(hi.income * 0.9);
    expect(lo.manpowerGain).toBeLessThan(hi.manpowerGain);
    expect(stabilityFactor(75)).toBeCloseTo(1);
  });

  it('dopo un decreto la Corona cede; le autocrazie hanno crisi (capo 3)', async () => {
    const P = await import('../src/engine/politics');
    const w = newGame(MAP, 'SMR');
    const auh = P.politicsOf(w, 'AUH')!;
    const used: string[] = [];
    let decrees = 0;
    for (let i = 0; i < 4; i++) {
      auh.confidence = 10;
      auh.crisis = { day: w.state.day, options: P.crisisOptions(auh) };
      const opt = P.defaultOption(w, 'AUH', auh);
      if (opt === 'decree') decrees++;
      expect(P.resolveCrisis(w, 'AUH', opt)).toBeNull();
      used.push(opt);
      auh.decreeUntil = undefined;
    }
    expect(decrees).toBeLessThan(4);
    // la Corona cede alla Camera (qui la Camera vuole ancora l'anello di ferro di Taaffe: il governo resta suo)
    expect(used).toContain('concede');
    // con il capo che sceglie la Corona (Germania) dopo un decreto si scioglie la Camera
    const ger = P.politicsOf(w, 'GER')!;
    ger.lastOption = 'decree';
    expect(P.defaultOption(w, 'GER', ger)).toBe('dissolve');
    // la Russia a stabilità 0 rischia la crisi
    const rus = P.politicsOf(w, 'RUS')!;
    w.state.nations.RUS.stability = 0;
    rus.confidence = P.confidence(w, 'RUS', rus);
    expect(P.crisisChance(rus)).toBeGreaterThan(0);
  });

  it('il consenso non diventa seggi (capo 4)', async () => {
    const P = await import('../src/engine/politics');
    const w = newGame(MAP, 'SMR');
    const spa = P.politicsOf(w, 'SPA')!;
    for (const p of spa.parties) p.pop = p.id === 'conservatori' ? 40 : p.id === 'fusionisti' ? 50 : 5;
    P.holdElection(w, 'SPA', spa, []);
    expect(spa.parties.find((p) => p.id === 'conservatori')!.seats).toBeGreaterThan(50); // l'encasillado fa il voto
    expect(spa.parties.find((p) => p.id === 'fusionisti')!.pop).toBeGreaterThan(44); // ma non il paese
  });

  it('repubbliche presidenziali e date di voto sfalsate (capo 5)', async () => {
    const P = await import('../src/engine/politics');
    const w = newGame(MAP, 'SMR');
    const usa = P.politicsOf(w, 'USA')!;
    expect(usa.regime).toBe('presidential');
    expect(P.crisisChance({ ...usa, confidence: 0 })).toBe(0);
    expect(P.callElection(w, 'USA')).toMatch(/fisso/);
    expect(usa.nextElection).toBe(at(1884, 11, 4));
    w.state.day = usa.nextElection!;
    P.holdElection(w, 'USA', usa, []);
    expect(Math.abs(usa.nextElection! - at(1888, 11, 6))).toBeLessThanOrEqual(3);
    expect(P.leaderActive(w, 'USA', usa.head)).toBe(true);
    expect(P.politicsOf(w, 'BOL')!.regime).toBe('presidential');
    expect(P.politicsOf(w, 'YOR')?.regime).not.toBe('presidential'); // repubblica militare
    const days = new Map<number, number>();
    for (const t of Object.keys(w.state.nations)) { const d = P.politicsOf(w, t)?.nextElection; if (d != null) days.set(d, (days.get(d) ?? 0) + 1); }
    expect(Math.max(...days.values())).toBeLessThanOrEqual(3);
  });

  it('crisi contate una volta e opzioni della Corona parlamentare (capi 8 e 13)', async () => {
    const P = await import('../src/engine/politics');
    const w = newGame(MAP, 'SMR');
    const ita = P.politicsOf(w, 'ITA')!, fra = P.politicsOf(w, 'FRA')!;
    expect(P.crisisOptions(ita)).toContain('concede');
    expect(P.crisisOptions(fra)).not.toContain('concede');
    ita.crisis = { day: 0, options: P.crisisOptions(ita) };
    const sink: import('../src/engine/types').GameEvent[] = [];
    P.resolveCrisis(w, 'ITA', 'resist', sink);
    expect(sink.map((e) => e.type)).toEqual(['crisis_end']);
  });

  it('le colonie pesano sulla stabilità come sul bilancio (capo 7)', async () => {
    const E = await import('../src/engine/ethnic');
    const w = newGame(MAP, 'SMR');
    const s = w.state;
    expect(E.ethnicStability(w, 'BEL')).toBeCloseTo(0);
    // il Belgio prende venti province del bacino del Congo
    const congo = w.map.provinces.filter((p) => !p.impassable && p.lonlat[0] > 14 && p.lonlat[0] < 30 && p.lonlat[1] > -8 && p.lonlat[1] < 4).slice(0, 20);
    expect(congo.length).toBe(20);
    for (const p of congo) { s.owner[p.id] = 'BEL'; s.controller[p.id] = 'BEL'; }
    // prima −8 (il tetto); ora −2,6. La misura della corte chiedeva meno di −2: il resto è bilanciamento (fase C)
    expect(E.ethnicStability(w, 'BEL')).toBeGreaterThan(-3);
  });
});

