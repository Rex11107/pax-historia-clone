import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { subjectOf } from '../src/engine/vassals';
import * as C from '../src/engine/colonial';
import { MAP, EU, find } from './helpers';

describe('interessi coloniali', () => {
  const st = (w: ReturnType<typeof newGame>, id: string) => C.interestStatus(w, C.BY_ID.get(id)!);
  it('tre stadi con date e prerequisiti leggeri: Assab già italiana, Tunisi aperta, Libia nel 1911', () => {
    const w = newGame(MAP, 'ITA', 'col1');
    expect(st(w, 'ita-assab').state).toBe('done');
    expect(st(w, 'ita-tunisia').state).toBe('available');
    expect(st(w, 'ita-massaua').reasons.join()).toMatch(/1882/);
    expect(st(w, 'ita-libia').reasons.join()).toMatch(/1911/);
    expect(st(w, 'ita-eritrea').reasons.join()).toMatch(/Massaua/);
    expect(st(w, 'ita-albania').reasons.join()).toMatch(/maggiori richieste/);
    // Tunisi italiana: la Libia si apre un anno dopo, non nel 1911
    const c = C.colonial(w);
    c.done['ita-tunisia'] = w.state.day;
    w.state.day += 200;
    expect(st(w, 'ita-libia').state).toBe('locked');
    w.state.day += 200;
    expect(st(w, 'ita-libia').state).toBe('available');
    // in modalità libera niente date
    const w2 = newGame(MAP, 'ITA', 'col1b');
    w2.state.options = { colonialMode: 'libero' };
    expect(st(w2, 'ita-massaua').state).toBe('available');
    expect(st(w2, 'ita-albania').state).toBe('locked');
  });
  it('protettorato per trattato: il sultano di Obbia accetta, e la provincia conta per l\'interesse', () => {
    const w = newGame(MAP, 'ITA', 'col2');
    w.state.day = 365 * 7 + 40; // febbraio 1888
    const seed = C.BY_ID.get('ita-somalia-nord')!;
    expect(C.interestStatus(w, seed).state).toBe('available');
    const act = C.actionsFor(w, seed).find((a) => a.path === 'protettorato' && a.target === 'OBB')!;
    expect(act).toBeTruthy();
    w.state.nations.OBB.opinion.ITA = 60;
    const ev = C.evaluate(w, act);
    expect(ev.refusal).toBeUndefined();
    expect(ev.ok).toBe(true);
    expect(C.execute(w, act)).toBeNull();
    expect(subjectOf(w, 'OBB')?.overlord).toBe('ITA');
    expect(C.progress(w, seed)).toBeGreaterThan(0);
    // la Migiurtinia senza stima e senza paura rifiuta, e per sei mesi non se ne riparla
    const mig = C.actionsFor(w, seed).find((a) => a.path === 'protettorato' && a.target === 'MIG')!;
    w.state.nations.MIG.opinion.ITA = -60;
    expect(C.execute(w, mig)).toMatch(/rifiutato/);
    expect(C.evaluate(w, mig).refusal).toMatch(/rifiutato da poco/);
  });
  it('crisi egiziana: Mahdi, occupazione britannica, liquidazione; l\'Italia subentra a Massaua con l\'assenso di Londra', () => {
    const w = newGame(MAP, 'ITA', 'col3');
    const own = (n: string) => w.state.owner[find(w, n)];
    const step = (day: number) => { w.state.day = day; C.weeklyColonial(w, []); };
    step(260);
    expect(w.state.situations.some((x) => x.id === 'mahdi')).toBe(true);
    step(650);
    expect(subjectOf(w, 'EGY')?.overlord).toBe('GBR');
    step(850);
    expect(w.state.nations.MAH?.alive).toBe(true);
    expect(own('El Obeid')).toBe('MAH');
    expect(own('Massaua')).toBe('EGY');
    step(1200);
    step(1600);
    expect(own('Khartum')).toBe('MAH');
    const c = C.colonial(w);
    expect(c.liquidating?.provinces).toContain(find(w, 'Massaua'));
    // subentro: decide Londra, protettore dell'Egitto; la liquidazione pesa più di tutto
    const seed = C.BY_ID.get('ita-massaua')!;
    const act = C.actionsFor(w, seed).find((a) => a.path === 'assenso')!;
    expect(act.path === 'assenso' && act.decider).toBe('GBR');
    const ev = C.evaluate(w, act);
    expect(ev.parts.some(([k]) => /ritira/.test(k))).toBe(true);
    expect(ev.ok).toBe(true);
    expect(C.execute(w, act)).toBeNull();
    expect(own('Massaua')).toBe('ITA');
    expect(C.colonial(w).done['ita-massaua']).toBeDefined();
    // a fine liquidazione: Zeila e Berbera agli inglesi, l'Harar emirato
    step(c.liquidating!.until + 1);
    expect(own('Zeila')).toBe('GBR');
    expect(own('Harar')).toBe('HAR');
    expect(w.state.nations.HAR?.alive).toBe(true);
  });
  it('stadio 3: la decisione arriva dopo le elezioni; consolidamento o maggiori richieste', () => {
    const w = newGame(MAP, 'ITA', 'col4');
    const c = C.colonial(w);
    for (const id of ['ita-dancalia', 'ita-massaua', 'ita-eritrea', 'ita-somalia-nord']) c.done[id] = -1;
    c.ready.ITA = 2000;
    w.state.day = 3000;
    C.weeklyColonial(w, [{ day: 2999, type: 'election', text: 'elezioni', nations: ['ITA'] }]);
    expect(c.pending.ITA).toBeTruthy();
    expect(C.decideAmbition(w, 'ITA', 'richieste')).toBeNull();
    expect(st(w, 'ita-albania').state).toBe('available');
  });
  it('una colonia persa riapre l\'obiettivo; le politiche cambiano integrazione e resistenza', () => {
    const w = newGame(MAP, 'ITA', 'col5');
    const seed = C.BY_ID.get('ita-massaua')!;
    C.colonial(w);
    for (const p of C.interestProvinces(w, seed)) { w.state.owner[p] = 'ITA'; w.state.controller[p] = 'ITA'; }
    w.state.day = 400;
    C.checkCompletions(w, []);
    const c = C.colonial(w);
    expect(c.done['ita-massaua']).toBe(400);
    const ad = c.admin['ita-massaua'];
    expect(C.setPolicy(w, 'ita-massaua', 'culto', 'assimilazione')).toBeNull();
    for (let i = 0; i < 20; i++) { w.state.day += 7; C.weeklyColonial(w, []); }
    expect(ad.integration).toBeGreaterThan(1);
    expect(ad.integration).toBeLessThan(15); // decenni, non mesi
    for (const p of C.interestProvinces(w, seed)) { w.state.owner[p] = 'EGY'; w.state.controller[p] = 'EGY'; }
    C.checkCompletions(w, []);
    expect(c.done['ita-massaua']).toBeUndefined();
  });
  it('l\'IA segue gli interessi: niente spedizioni casuali, colonie nei luoghi storici', () => {
    const w = newGame(MAP, 'SWI', 'col6');
    for (let i = 0; i < 52 * 6; i++) runTurn(w);
    const c = C.colonial(w);
    // l'Italia ha preso Massaua con il ritiro egiziano, e nessuna potenza ha terre fuori dai suoi interessi
    expect(w.state.owner[find(w, 'Massaua')]).toBe('ITA');
    for (const tag of ['ITA', 'FRA', 'GER', 'BEL', 'POR', 'SPA']) {
      const mine = new Set(C.interestsOf(tag).flatMap((x) => C.interestProvinces(w, x)));
      const stray = w.map.provinces.filter((p) => p.id >= EU && w.state.owner[p.id] === tag && p.owner !== tag && !p.impassable && !mine.has(p.id));
      expect(stray.map((p) => p.name), tag).toEqual([]);
    }
    expect(Object.keys(c.done).length).toBeGreaterThan(4);
  }, 120000);
});
