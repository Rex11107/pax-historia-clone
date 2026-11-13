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
    for (let i = 0; i < 60; i++) for (const e of runTurn(w3).events) { if (e.type === 'crisis') crises++; if (e.type === 'election') elections++; }
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
