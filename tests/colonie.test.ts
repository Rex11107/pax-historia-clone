import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { subjectOf } from '../src/engine/vassals';
import * as C from '../src/engine/colonial';
import { MAP, EU, find } from './helpers';
import { INTERESTS_1881, LOCAL_STANCE } from '../src/scenario/colonial1881';
import { declareWar } from '../src/engine/diplomacy';
import { imposeProtectorate } from '../src/engine/vassals';
import { demandCost, engineTerms } from '../src/engine/peace';

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

// Blocco B4 (corte 00, passi 1-3): niente ritardi senza una causa di partita, dati verificati, posizione dei regni locali.
describe('corte 00: ritardi, dati e posizioni', () => {
  it('ogni nome di provincia, sigla di paese e nazione citati negli interessi coloniali esistono sulla mappa', () => {
    const w = newGame(MAP, 'SMR', 'b4-nomi');
    const ids = new Set(INTERESTS_1881.map((x) => x.id));
    const missing: string[] = [];
    for (const x of INTERESTS_1881) {
      if (!w.profiles[x.nation]) missing.push(`${x.id}: nazione ${x.nation}`);
      for (const n of x.names ?? []) if (!w.map.provinces.some((p) => p.name === n || p.name.startsWith(`${n} (`))) missing.push(`${x.id}: provincia ${n}`);
      for (const m of x.modern ?? []) if (!w.map.provinces.some((p) => p.modern === m)) missing.push(`${x.id}: paese ${m}`);
      for (const r of [...(x.requires ?? []), ...(x.requiresAny ?? []), ...(x.excludes ?? []), ...(x.early ? [x.early.after] : [])]) if (!ids.has(r)) missing.push(`${x.id}: interesse ${r}`);
    }
    for (const [t, st] of Object.entries(LOCAL_STANCE)) {
      if (!w.profiles[t]) missing.push(`posizione: nazione ${t}`);
      for (const o of [...(Array.isArray(st.hostile) ? st.hostile : []), ...(st.toward ? [st.toward] : [])]) if (!w.profiles[o]) missing.push(`posizione di ${t}: ${o}`);
    }
    expect(missing).toEqual([]);
  });

  it('una guerra coloniale non ferma la diplomazia coloniale; una guerra in Europa sì', () => {
    const w = newGame(MAP, 'SMR', 'b4-guerra');
    const act = C.actionsFor(w, C.BY_ID.get('fra-tunisia')!).find((a) => a.path === 'protettorato')!;
    declareWar(w, 'FRA', 'WAS', 'prova');
    expect(C.europeanWar(w, 'FRA')).toBe(false);
    expect(C.evaluate(w, act).refusal ?? '').not.toMatch(/guerra/);
    declareWar(w, 'FRA', 'SWI', 'prova');
    expect(C.europeanWar(w, 'FRA')).toBe(true);
    expect(C.evaluate(w, act).refusal).toMatch(/Europa/);
  });

  it('il bey non teme l\'esercito del suo signore ottomano; le truppe francesi al confine pesano', () => {
    const w = newGame(MAP, 'SMR', 'b4-paura');
    const act = C.actionsFor(w, C.BY_ID.get('fra-tunisia')!).find((a) => a.path === 'protettorato')!;
    const part = (k: RegExp) => C.evaluate(w, act).parts.find(([n]) => k.test(n))?.[1] ?? 0;
    expect(subjectOf(w, 'TUN')?.overlord).toBe('TUR');
    expect(part(/paura dei vicini/)).toBe(0);
    // una forte colonna francese entra dall'Algeria a un passo da Tunisi
    const tun = w.map.provinces.find((p) => w.state.owner[p.id] === 'TUN')!.id;
    const u = w.state.units.find((x) => x.nation === 'FRA')!;
    u.location = tun; u.strength = 40000;
    expect(part(/truppe al confine/)).toBeGreaterThan(15);
  });

  it('l\'urgenza cresce nella finestra fino al tetto e poi decade', () => {
    const w = newGame(MAP, 'SMR', 'b4-urgenza');
    const seed = C.BY_ID.get('fra-madagascar')!; // finestra 1883-1896
    const at = (y: number) => { w.state.day = (y - 1881) * 365 + 10; return C.urgency(w, seed); };
    expect(at(1882)).toBe(1);
    expect(at(1883)).toBeGreaterThan(1);
    expect(at(1884)).toBeGreaterThan(at(1883));
    expect(at(1895)).toBe(C.URGENCY_CAP);
    expect(at(1898)).toBeLessThan(C.URGENCY_CAP);
    expect(at(1900)).toBe(1);
  });

  it('Tel el-Kebir aspetta che Londra sia libera dalla guerra europea, invece di saltare per sempre', () => {
    const w = newGame(MAP, 'SMR', 'b4-egitto');
    const step = (day: number) => { w.state.day = day; C.weeklyColonial(w, []); };
    step(260);
    declareWar(w, 'GBR', 'NED', 'prova');
    step(650);
    expect(subjectOf(w, 'EGY')?.overlord).toBe('TUR');
    w.state.wars = w.state.wars.filter((x) => !x.attackers.includes('GBR'));
    step(700);
    expect(subjectOf(w, 'EGY')?.overlord).toBe('GBR');
  });

  it('il Bogos passa all\'Etiopia col trattato Hewett e non è in liquidazione', () => {
    const w = newGame(MAP, 'ITA', 'b4-bogos');
    const step = (day: number) => { w.state.day = day; C.weeklyColonial(w, []); };
    for (const d of [260, 650, 850, 1200, 1600]) step(d);
    expect(w.state.owner[find(w, 'Bogos')]).toBe('ETH');
    expect(C.colonial(w).liquidating?.provinces).not.toContain(find(w, 'Bogos'));
  });

  it('i regni locali hanno una posizione: Rabih non firma con la Francia, gli Aro con nessuno, i Lozi solo con Londra', () => {
    const w = newGame(MAP, 'SMR', 'b4-posizioni');
    const refusal = (tag: string, target: string, year: number) => {
      w.state.day = (year - 1881) * 365 + 100;
      const seed = INTERESTS_1881.find((x) => x.nation === tag && C.actionsFor(w, x).some((a) => a.path === 'protettorato' && a.target === target));
      if (!seed) return null;
      const act = C.actionsFor(w, seed).find((a) => a.path === 'protettorato' && a.target === target)!;
      const r = C.evaluate(w, act).refusal ?? 'ok';
      return r === 'interesse non disponibile' ? null : r;
    };
    const rab = refusal('FRA', 'RAB', 1897);
    if (rab) expect(rab).toMatch(/protettori/);
    const aro = refusal('GBR', 'ARO', 1890);
    if (aro) expect(aro).toMatch(/protettori/);
    const loz = refusal('POR', 'LOZ', 1887);
    if (loz) expect(loz).toMatch(/protezione/);
    expect([rab, aro, loz].some((x) => x)).toBe(true);
    // nemmeno dopo una guerra vinta: le province si prendono, il protettorato no
    declareWar(w, 'FRA', 'RAB', 'prova');
    w.state.controller[w.state.nations.RAB.capital] = 'FRA';
    expect(imposeProtectorate(w, 'FRA', 'RAB')).toMatch(/protettore/);
  });

  it('la Guerra del Pacifico resta aperta fino ad Ancón: la stanchezza del vincitore non basta a chiuderla', () => {
    const w = newGame(MAP, 'SMR', 'b4-pacifico');
    const war = () => w.state.wars.find((x) => x.id === 'w_pacifico');
    expect(war()!.resistance).toBeGreaterThan(365 * 2 + 200);
    expect(war()!.resistance).toBeLessThan(365 * 3 + 30);
    // luglio 1881, Cile stanco (prima bastava: guerra lunga e stanchezza oltre 35), Perù e Bolivia no
    w.state.day = 200;
    w.state.nations.CHL.warExhaustion = 50;
    runTurn(w);
    expect(war()).toBeDefined();
    // passata la data di Ancón valgono le regole di sempre
    w.state.day = war()!.resistance! + 7;
    w.state.nations.CHL.warExhaustion = 50;
    runTurn(w);
    expect(war()).toBeUndefined();
  }, 60000);

  it('Samori non diventa protettorato prima del 1886, né per trattato né dopo una guerra', () => {
    const w = newGame(MAP, 'SMR', 'c-samori');
    w.state.day = 365 * 2; // 1883
    declareWar(w, 'FRA', 'WAS', 'prova');
    w.state.controller[w.state.nations.WAS.capital] = 'FRA';
    expect(imposeProtectorate(w, 'FRA', 'WAS')).toMatch(/prima del 1886/);
    // nemmeno come richiesta nella pace (prima la via della pace scavalcava le posizioni dei regni locali)
    expect(demandCost(w, { type: 'vassal', from: 'WAS', to: 'FRA', level: 'protettorato' } as never).refusal).toMatch(/prima del 1886/);
    expect(engineTerms(w, w.state.wars.find((x) => x.attackers.includes('FRA') && x.defenders.includes('WAS'))!).some((d) => d.type === 'vassal')).toBe(false);
    w.state.day = 365 * 6; // 1887
    expect(imposeProtectorate(w, 'FRA', 'WAS')).toBeNull();
  });
});
