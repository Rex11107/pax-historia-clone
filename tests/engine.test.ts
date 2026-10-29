import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { assignOrders, planPath } from '../src/engine/orders';
import { declareWar, checkProposal, applyProposal, makePeace } from '../src/engine/diplomacy';
import { budget, recruit, setPolicy } from '../src/engine/economy';
import { supplyMap } from '../src/engine/supply';
import { atWar, formatDate } from '../src/engine/world';
import type { MapData } from '../src/engine/types';

const MAP: MapData = JSON.parse(fs.readFileSync('public/data/europe1881.json', 'utf8'));
const find = (w: ReturnType<typeof newGame>, name: string, owner?: string) => {
  const p = w.map.provinces.find((x) => x.name === name && (!owner || x.owner === owner)) ?? w.map.provinces.find((x) => x.name.startsWith(name) && (!owner || x.owner === owner));
  if (!p) throw new Error(`provincia ${name} non trovata`);
  return p.id;
};

describe('mappa', () => {
  it('ha centinaia di province e le nazioni principali', () => {
    expect(MAP.provinces.length).toBeGreaterThan(800);
    const owners = new Set(MAP.provinces.map((p) => p.owner));
    for (const t of ['ITA', 'FRA', 'GER', 'AUH', 'GBR', 'RUS', 'TUR']) expect(owners.has(t)).toBe(true);
  });
  it('confini storici 1881: Trento e Trieste austriache, Nizza francese, Alsazia tedesca', () => {
    const w = newGame(MAP);
    expect(w.map.provinces[find(w, 'Trento')].owner).toBe('AUH');
    expect(w.map.provinces[find(w, 'Trieste')].owner).toBe('AUH');
    expect(w.map.provinces[find(w, 'Nizza')].owner).toBe('FRA');
    expect(w.map.provinces[find(w, 'Strasburgo')].owner).toBe('GER');
  });
  it('Sicilia e Sardegna sono raggiungibili via stretto', () => {
    const w = newGame(MAP);
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    expect(planPath(w, u, find(w, 'Palermo'), false)).not.toBeNull();
  });
});

describe('motore', () => {
  it('nuova partita: capitale, eserciti, data', () => {
    const w = newGame(MAP);
    expect(w.map.provinces[w.state.nations.ITA.capital].name).toBe('Roma');
    expect(w.state.units.filter((u) => u.nation === 'ITA').length).toBeGreaterThanOrEqual(5);
    expect(formatDate(0)).toBe('1 gennaio 1881');
  });

  it('il movimento è progressivo, non un teletrasporto', () => {
    const w = newGame(MAP);
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    const target = find(w, 'Milano');
    expect(assignOrders(w, u.id, [{ type: 'move', target }], 'replace')).toEqual([]);
    const r = runTurn(w);
    const xs = r.frames.map((f) => f[u.id][0] + ',' + f[u.id][1]);
    expect(new Set(xs).size).toBeGreaterThan(3); // posizioni intermedie diverse giorno per giorno
  });

  it('rifiuta ordini verso territorio neutrale', () => {
    const w = newGame(MAP);
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    const errs = assignOrders(w, u.id, [{ type: 'move', target: find(w, 'Vienna') }], 'replace');
    expect(errs.length).toBe(1);
  });

  it('guerra Italia-Austria: alleanza tedesca, combattimento, perdite, determinismo', () => {
    const run = () => {
      const w = newGame(MAP);
      expect(declareWar(w, 'ITA', 'AUH', 'test')).toBeNull();
      expect(atWar(w.state, 'ITA', 'GER')).toBe(true); // Duplice Alleanza
      const tr = find(w, 'Trento');
      for (const u of w.state.units.filter((x) => x.nation === 'ITA').slice(0, 4)) assignOrders(w, u.id, [{ type: 'attack', target: tr }], 'replace');
      const evs: string[] = [];
      for (let i = 0; i < 6; i++) evs.push(...runTurn(w).events.map((e) => e.type));
      return { w, evs };
    };
    const a = run(), b = run();
    expect(a.evs).toContain('battle_started');
    expect(JSON.stringify(a.w.state.units)).toBe(JSON.stringify(b.w.state.units));
    expect(a.w.state.nations.ITA.warExhaustion).toBeGreaterThan(0);
  });

  it('rifornimento: pieno in patria, cala in profondità nel territorio nemico', () => {
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', '');
    const m = supplyMap(w, 'ITA');
    expect(m[find(w, 'Milano')]).toBeGreaterThan(0.7);
    expect(m[find(w, 'Vienna')]).toBeLessThan(0.5);
  });

  it('economia: bilancio coerente e politiche con effetto', () => {
    const w = newGame(MAP);
    const b0 = budget(w, 'ITA');
    expect(b0.income).toBeGreaterThan(10);
    setPolicy(w, 'ITA', 'tax', 'high');
    expect(budget(w, 'ITA').income).toBeGreaterThan(b0.income);
    expect(recruit(w, 'ITA', 'infantry', w.state.nations.ITA.capital)).toBeNull();
    expect(recruit(w, 'ITA', 'infantry', find(w, 'Vienna'))).not.toBeNull();
  });

  it('diplomazia: veto meccanico sulle cessioni non sostenute da occupazione', () => {
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', '');
    const tr = find(w, 'Trento');
    expect(checkProposal(w, 'ITA', 'AUH', { type: 'peace', giver: 'AUH', provinces: [tr] })).toMatch(/non cede/);
    w.state.controller[tr] = 'ITA';
    expect(checkProposal(w, 'ITA', 'AUH', { type: 'peace', giver: 'AUH', provinces: [tr] })).toBeNull();
    applyProposal(w, 'ITA', 'AUH', { type: 'peace', giver: 'AUH', provinces: [tr] });
    expect(w.state.owner[tr]).toBe('ITA');
    expect(atWar(w.state, 'ITA', 'AUH')).toBe(false);
  });

  it('pace separata e trattati', () => {
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', '');
    expect(makePeace(w, 'ITA', 'GER')).toBeNull();
    expect(atWar(w.state, 'ITA', 'GER')).toBe(false);
    expect(atWar(w.state, 'ITA', 'AUH')).toBe(true);
    expect(checkProposal(w, 'ITA', 'GBR', { type: 'alliance' })).toBeNull();
    applyProposal(w, 'ITA', 'GBR', { type: 'alliance' });
    expect(checkProposal(w, 'ITA', 'GBR', { type: 'alliance' })).toMatch(/già/);
  });

  it('un turno di pace è veloce', () => {
    const w = newGame(MAP);
    const t = performance.now();
    for (let i = 0; i < 4; i++) runTurn(w);
    expect(performance.now() - t).toBeLessThan(4000);
  });

  it('guerra fra AI: le nazioni si muovono da sole', () => {
    const w = newGame(MAP);
    declareWar(w, 'RUS', 'TUR', 'test');
    const before = JSON.stringify(w.state.units.filter((u) => u.nation === 'RUS').map((u) => u.location));
    for (let i = 0; i < 3; i++) runTurn(w);
    const after = JSON.stringify(w.state.units.filter((u) => u.nation === 'RUS').map((u) => u.location));
    expect(after).not.toBe(before);
  });
});

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
    expect(checkProposal(w, 'RUS', 'AUH', { type: 'peace', giver: 'AUH', provinces: ids })).toBeNull();
  });
});

describe('deserto, oasi e piste carovaniere', () => {
  const byName = (w: ReturnType<typeof newGame>, n: string) => w.map.provinces.find((p) => p.name === n)!;
  it('il deserto non si attraversa e all\'inizio è in gran parte terra di nessuno', () => {
    const w = newGame(MAP, 'FRA', 'des');
    const deserts = w.map.provinces.filter((p) => p.impassable);
    expect(deserts.length).toBeGreaterThan(10);
    expect(deserts.every((p) => p.region)).toBe(true);
    expect(deserts.filter((p) => w.state.owner[p.id] === '').length).toBeGreaterThan(5);
    const u = w.state.units.find((x) => x.nation === 'FRA')!;
    expect(planPath(w, u, deserts[0].id, true)).toBeNull();
    expect(w.state.units.some((x) => w.map.provinces[x.location].impassable)).toBe(false);
  });
  it('le oasi si raggiungono lungo le piste, più lente di una strada', () => {
    const w = newGame(MAP, 'FRA', 'pista');
    const mzab = byName(w, 'Mzab').id, golea = byName(w, 'El Goléa').id;
    const e = w.map.edge(mzab, golea);
    expect(e?.route).toBeTruthy();
    const u = w.state.units.find((x) => x.nation === 'FRA')!;
    u.location = mzab;
    const plan = planPath(w, u, golea, false);
    expect(plan).not.toBeNull();
    expect(plan!.days).toBeGreaterThan(e!.km / 22);
  });
  it('un\'oasi di nessuno passa a chi ci entra', () => {
    const w = newGame(MAP, 'FRA', 'oasi');
    const mzab = byName(w, 'Mzab').id, golea = byName(w, 'El Goléa').id;
    expect(w.state.owner[golea]).toBe('');
    const u = w.state.units.find((x) => x.nation === 'FRA')!;
    u.location = mzab;
    expect(assignOrders(w, u.id, [{ type: 'move', target: golea, status: 'pending' }], 'replace')).toEqual([]);
    for (let i = 0; i < 12 && w.state.owner[golea] !== 'FRA'; i++) runTurn(w);
    expect(w.state.owner[golea]).toBe('FRA');
  });
  it('il deserto va a chi controlla tutte le terre transitabili attorno', async () => {
    const { desertOwner, updateDeserts } = await import('../src/engine/desert');
    const w = newGame(MAP, 'FRA', 'dom');
    const land = (id: number) => w.map.adj[id].filter((e) => !e.strait && !e.route && w.map.passable(e.to) && w.map.provinces[e.to].modern === w.map.provinces[id].modern);
    const d = w.map.provinces.find((p) => p.impassable && w.state.owner[p.id] === '' && land(p.id).length)!;
    for (const e of land(d.id)) w.state.controller[e.to] = 'ITA';
    expect(desertOwner(w, d.id)).toBe('ITA');
    updateDeserts(w);
    expect(w.state.owner[d.id]).toBe('ITA');
    const one = land(d.id)[0];
    w.state.controller[one.to] = 'FRA';
    updateDeserts(w);
    expect(w.state.owner[d.id]).toBe('');
    expect(checkProposal(w, 'FRA', 'ITA', { type: 'cede_provinces', giver: 'ITA', provinces: [d.id] })).toMatch(/deserto/);
  });
  it('nessun deserto passa a chi ne tocca solo il bordo da un altro paese (Gadames e il deserto algerino)', () => {
    const w = newGame(MAP, 'ITA', 'gore');
    for (const p of w.map.provinces) if (p.impassable && w.state.owner[p.id] === 'TUR') expect(p.modern).toBe('LBY');
    for (const p of w.map.provinces) if (p.impassable && w.state.owner[p.id] === 'EGY') expect(['EGY', 'SDN', 'SDS', 'ERI']).toContain(p.modern); // il Sudan egiziano
  });
  it('il Sangiaccato di Novi Pazar è ottomano, il Sinai separato dal canale', () => {
    const w = newGame(MAP);
    const np = w.map.locate(20.51, 43.14);
    expect(np).not.toBeNull();
    expect(w.map.provinces[np!].owner).toBe('TUR');
    expect(MAP.canals?.length).toBeGreaterThan(0);
  });
});

describe('risorse', () => {
  it('giacimenti storici nelle province giuste e rendita nel bilancio', async () => {
    const { RESOURCES, nationResources } = await import('../src/engine/resources');
    const w = newGame(MAP);
    const at = (lon: number, lat: number) => w.map.resources[w.map.locate(lon, lat)!];
    expect(at(7.2, 51.5)).toContain('carbone'); // Ruhr
    expect(at(49.87, 40.4)).toContain('petrolio'); // Baku
    // deterministico
    expect(JSON.stringify(w.map.resources)).toBe(JSON.stringify(newGame(MAP).map.resources));
    // il deserto non ha risorse proprie, le oasi i datteri
    w.map.provinces.forEach((p) => { if (p.impassable) expect(w.map.resources[p.id].every((r) => RESOURCES[r].strategic || r === 'sale')).toBe(true); });
    const s = w.state;
    const r = nationResources(w.map, w.map.resources, s.controller, s.owner, 'GER', w.profiles.GER.industry);
    expect(r.count.carbone).toBeGreaterThan(0);
    expect(r.missing).not.toContain('carbone');
    expect(budget(w, 'GER').resources).toBeGreaterThan(0);
  });
});

describe('commercio', () => {
  it('prezzi, dazi, malus tolto, relazioni e guerra', async () => {
    const T = await import('../src/engine/trade');
    const { addTreaty } = await import('../src/engine/diplomacy');
    const { changeOpinion, opinion } = await import('../src/engine/world');
    const w = newGame(MAP);
    const s = w.state;
    expect(T.effectiveResources(w, 'TUR').missing).toContain('ferro');
    const seller = (['GBR', 'SWE', 'SPA', 'GER', 'FRA', 'RUS'] as const).find((t) => T.freeLots(w, t, 'ferro') > 0)!;
    expect(seller).toBeTruthy();
    changeOpinion(s, seller, 'TUR', 30);
    const q1 = T.quote(w, seller, 'TUR', 'ferro', 1);
    addTreaty(w, 'trade', seller, 'TUR', 5);
    const q2 = T.quote(w, seller, 'TUR', 'ferro', 1);
    expect(q1.total / q2.total).toBeCloseTo(T.TARIFF, 1); // l'accordo toglie i dazi
    const before = budget(w, 'TUR').net;
    expect(T.signTrade(w, seller, 'TUR', 'ferro', 1)).toBeNull();
    expect(T.signTrade(w, seller, 'TUR', 'ferro', 1)).not.toBeNull(); // niente doppioni
    expect(T.effectiveResources(w, 'TUR').missing).not.toContain('ferro');
    const b = budget(w, 'TUR');
    expect(b.trade).toBeLessThan(0);
    expect(b.net).not.toBe(before);
    expect(budget(w, seller).trade).toBeGreaterThan(0);
    // le relazioni crescono piano
    const op = opinion(s, 'TUR', seller);
    for (let i = 0; i < 12; i++) T.weeklyTrade(w, []);
    expect(opinion(s, 'TUR', seller)).toBeGreaterThan(op);
    // la guerra interrompe i traffici
    declareWar(w, seller, 'TUR', 'prova');
    T.weeklyTrade(w, []);
    expect(T.contractsOf(s, 'TUR').some((c) => c.seller === seller)).toBe(false);
  });

  it('il motore rifiuta chi disprezza e i lotti che non ci sono', async () => {
    const T = await import('../src/engine/trade');
    const { changeOpinion } = await import('../src/engine/world');
    const w = newGame(MAP);
    changeOpinion(w.state, 'GER', 'FRA', -100);
    w.state.player = 'FRA';
    expect(T.quote(w, 'GER', 'FRA', 'carbone', 1).refusal).toMatch(/disprezza/);
    expect(T.quote(w, 'SER', 'FRA', 'petrolio', 1).refusal).toBeTruthy();
    expect(T.tradeTreatyRefusal(w, 'FRA', 'GER')).toMatch(/stima/);
  });
});

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

describe('costruzione', () => {
  it('opere del 1881, cantieri, ferrovie, fortezze e logistica', async () => {
    const C = await import('../src/engine/construction');
    const w = newGame(MAP);
    const at = (lon: number, lat: number) => w.map.locate(lon, lat)!;
    expect(C.level(w, at(6.18, 49.12), 'fortezza')).toBe(3); // Metz
    expect(C.level(w, at(8.93, 44.41), 'porto')).toBe(3); // Genova
    expect(C.level(w, at(7.01, 51.45), 'bellica')).toBe(3); // Krupp
    expect(C.level(w, at(-2.24, 53.48), 'ferrovia')).toBeGreaterThan(1); // Lancashire
    expect(C.industryOf(w, 'GER')).toBe(w.profiles.GER.industry); // nel 1881 nessun bonus
    // un cantiere: costa, occupa uno slot, finisce dopo le settimane previste
    const milano = at(9.19, 45.46);
    const R = await import('../src/engine/research');
    R.research(w).known.ITA.push('binari_acciaio', 'doppio_binario');
    const t0 = w.state.nations.ITA.treasury;
    const cur = C.level(w, milano, 'ferrovia');
    expect(C.startProject(w, 'ITA', milano, 'ferrovia')).toBeNull();
    expect(w.state.nations.ITA.treasury).toBe(t0 - C.BUILDINGS.ferrovia.cost(cur + 1));
    expect(C.startProject(w, 'ITA', milano, 'ferrovia')).toMatch(/cantiere/);
    expect(C.startProject(w, 'ITA', at(2.35, 48.86), 'fortezza')).not.toBeNull(); // Parigi non è nostra
    for (let i = 0; i < C.BUILDINGS.ferrovia.weeks(cur + 1); i++) C.weeklyConstruction(w, []);
    expect(C.level(w, milano, 'ferrovia')).toBe(cur + 1);
    // l'industria cresce con le industrie costruite (se ci sono le materie prime)
    const b = C.buildings(w);
    b[milano].siderurgia = 3; C.touchBuildings();
    expect(C.industryOf(w, 'ITA')).toBeGreaterThan(w.profiles.ITA.industry);
    // logistica: più eserciti, rapporto più basso
    const l0 = C.logistics(w, 'ITA');
    w.state.units.push(...w.state.units.filter((u) => u.nation === 'ITA').map((u, i) => ({ ...u, id: `${u.id}-x${i}` })));
    C.touchBuildings();
    expect(C.logistics(w, 'ITA').ratio).toBeLessThan(l0.ratio);
    expect(C.provinceCapacity(w, milano)).toBeGreaterThan(30);
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

describe('ricerca', () => {
  it('conoscenze del 1881, anticipo, scienziati, sblocchi e giacimenti', async () => {
    const R = await import('../src/engine/research');
    const C = await import('../src/engine/construction');
    const w = newGame(MAP);
    expect(R.knows(w, 'GBR', 'thomas')).toBe(true);
    expect(R.knows(w, 'ITA', 'thomas')).toBe(false);
    expect(R.knows(w, 'ITA', 'forti_poligonali')).toBe(true);
    expect(R.researchSlots(w, 'GBR')).toBe(3);
    // niente effetti per ciò che si sapeva già nel 1881 (è nei profili)
    expect(R.techEffects(w, 'GBR').industry).toBe(0);
    // l'anticipo costa: la mitragliatrice (1884) nel 1881 dura il 120% in più
    const maxim = R.tech('mitragliatrice')!;
    expect(R.weeksFor(w, maxim)).toBeGreaterThan(maxim.weeks * 1.8);
    // scienziati solo dove esistevano, attivi nei loro anni
    expect(R.scientistsFor(w, 'ITA', R.tech('dinamo')!).map((s) => s.id)).toContain('ferraris');
    expect(R.scientistsFor(w, 'TUR', R.tech('dinamo')!)).toHaveLength(0);
    expect(R.scientistsFor(w, 'FRA', R.tech('ripetizione')!).map((s) => s.id)).not.toContain('maxim');
    // il secondo livello del porto serve la ricerca
    const tunisi = w.map.locate(10.17, 36.8)!;
    expect(C.buildRefusal(w, 'TUN', tunisi, 'porto')).toMatch(/ricerca|livello|cantieri|servono/);
    // ricerca completa: si sblocca il livello e arrivano i giacimenti (Thomas: minette di Briey alla Francia)
    const briey = w.map.locate(5.9, 49.25)!;
    expect(R.siteLots(w, briey)).toHaveLength(0);
    expect(R.startResearch(w, 'FRA', 'thomas')).toBeNull();
    for (let i = 0; i < 80 && !R.knows(w, 'FRA', 'thomas'); i++) R.weeklyResearch(w, []);
    expect(R.knows(w, 'FRA', 'thomas')).toBe(true);
    expect(R.siteLots(w, briey)).toContain('ferro');
    expect(budget(w, 'FRA').research).toBeGreaterThanOrEqual(0);
  });

  it('collaborazione: medicina facile, militare difficile, entrambi ottengono il risultato', async () => {
    const R = await import('../src/engine/research');
    const { changeOpinion } = await import('../src/engine/world');
    const w = newGame(MAP);
    changeOpinion(w.state, 'GER', 'ITA', 40);
    const med = R.collabScore(w, 'ITA', 'GER', 'batteriologia');
    const mil = R.collabScore(w, 'ITA', 'FRA', 'mitragliatrice');
    expect(mil.score).toBeLessThan(med.score);
    // la Germania conosce già l'antisepsi: Italia prima la ricerca da sola
    R.research(w).known.ITA.push('antisepsi');
    expect(R.proposeCollab(w, 'ITA', 'GER', 'batteriologia', 'golgi')).toBeNull();
    const p = R.projectsOf(w, 'ITA')[0];
    expect(p.nations).toEqual(['ITA', 'GER']);
    expect(p.scientists.GER).toBe('koch');
    // costi divisi
    const full = R.weeklyCost(w, 'GER', R.tech('batteriologia')!, R.scientist('koch'));
    expect(R.researchCost(w, 'ITA') + R.researchCost(w, 'GER')).toBeCloseTo(full, 1);
    for (let i = 0; i < 80 && R.projectsOf(w, 'ITA').length; i++) R.weeklyResearch(w, []);
    expect(R.knows(w, 'ITA', 'batteriologia') && R.knows(w, 'GER', 'batteriologia')).toBe(true);
  });
});

describe('pace', () => {
  const occupy = (w: ReturnType<typeof newGame>, by: string, pred: (p: { id: number; iso?: string; modern: string }) => boolean) => w.map.provinces.filter((p) => pred(p)).forEach((p) => { w.state.controller[p.id] = by; });
  it('il motore prende ciò che rivendica e occupa, e impone protettorati realistici', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', 'prova');
    const war = w.state.wars[0];
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
    expect(w.state.wars).toHaveLength(0);
    // l'Austria conserva una rivendicazione sul Trentino perso
    const C = await import('../src/engine/claims');
    expect(C.claimOf(w, 'AUH', trento)?.reason).toMatch(/persa/);

    const w2 = newGame(MAP);
    declareWar(w2, 'FRA', 'TUN', 'Krumiri');
    occupy(w2, 'FRA', (p) => w2.state.owner[p.id] === 'TUN');
    const t2 = P.engineTerms(w2, w2.state.wars[0]);
    expect(t2.some((d) => d.type === 'vassal' && d.level === 'protettorato')).toBe(true);
  });

  it('regole: niente capitale, niente territori irraggiungibili, guerre lontane solo riparazioni', async () => {
    const P = await import('../src/engine/peace');
    const w = newGame(MAP);
    declareWar(w, 'SPA', 'PER', 'prova');
    const war = w.state.wars[0];
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
    const war = w.state.wars[0];
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

describe('Africa e Arabia', () => {
  const byName = (n: string) => MAP.provinces.find((p) => p.name === n)!;
  it('stati e colonie del 1881 al loro posto', () => {
    const exp: [string, string][] = [['Città del Capo', 'GBR'], ['Khartum', 'EGY'], ['La Mecca', 'TUR'], ['Medina', 'TUR'], ['Zanzibar', 'ZAN'], ['Kumasi', 'ASA'], ['Sokoto', 'SOK'],
      ['Tananarive', 'MAD'], ['Pretoria', 'TRA'], ['Aden', 'GBR'], ['Mascate', 'OMA'], ['Saint-Louis', 'FRA'], ['Luanda', 'POR'], ['Monrovia', 'LIB'], ['Debre Tabor', 'ETH']];
    for (const [n, o] of exp) expect(byName(n)?.owner, n).toBe(o);
  });
  it('le province europee del 27° parallelo confinano con quelle africane, senza coste finte', () => {
    const eu = MAP.provinces.slice(0, 1375).filter((p) => p.lonlat[1] < 27.6 && p.lonlat[0] > 0 && p.lonlat[0] < 32);
    expect(eu.length).toBeGreaterThanOrEqual(4);
    for (const p of eu) expect(p.n.some((j) => j >= 1375), p.name).toBe(true);
  });
  it('fase 2a: Egitto-Sudan e Corno d\'Africa per regioni storiche', () => {
    const exp: [string, string][] = [['Assab', 'ITA'], ['Massaua', 'EGY'], ['Hamasien', 'ETH'], ['Harar', 'EGY'], ['Berbera', 'EGY'], ['Mogadiscio', 'ZAN'], ['Scioa', 'ETH'], ['Gojjam (nord)', 'ETH'], ['Aussa', ''], ['Migiurtinia', '']];
    for (const [n, o] of exp) expect(byName(n)?.owner, n).toBe(o);
    const zone = MAP.provinces.filter((p) => p.id >= 1375 && ['EGY', 'SDN', 'SDS', 'ERI', 'ETH', 'DJI', 'SOL', 'SOM'].includes(p.modern));
    expect(zone.length).toBeGreaterThan(140);
    expect(zone.length).toBeLessThan(210);
  });
  it('ogni nazione presente ha un profilo e un esercito', () => {
    const w = newGame(MAP, 'ITA', 'af');
    for (const t of ['ETH', 'SOK', 'TRA', 'MAD', 'ZAN']) expect(w.state.units.some((u) => u.nation === t), t).toBe(true);
  });
  it('sbarco: l\'Italia porta un corpo d\'armata su una costa di nessuno in Somalia e la annette', () => {
    const w = newGame(MAP, 'ITA', 'sbarco');
    const target = w.map.provinces.find((p) => p.coast && !p.impassable && w.state.owner[p.id] === '' && p.lonlat[0] > 44 && p.lonlat[1] > 3 && p.lonlat[1] < 12)!;
    expect(target).toBeTruthy();
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    const plan = planPath(w, u, target.id, false)!;
    expect(plan.sea).toBeTruthy();
    expect(plan.days).toBeLessThan(40);
    u.orders = [{ type: 'move', target: target.id, status: 'pending' }];
    for (let i = 0; i < 8 && w.state.owner[target.id] !== 'ITA'; i++) runTurn(w);
    expect(w.state.owner[target.id]).toBe('ITA');
  });
  it('senza marina non si sbarca', () => {
    const w = newGame(MAP, 'ETH', 'nomar');
    const u = w.state.units.find((x) => x.nation === 'ETH')!;
    const far = w.map.provinces.find((p) => p.name === 'Città del Capo')!;
    expect(planPath(w, u, far.id, false)?.sea).toBeFalsy();
  });
  it('le potenze coloniali si espandono nelle terre di nessuno, con ritmo', () => {
    const w = newGame(MAP, 'SWI', 'colonie');
    const free = () => w.map.provinces.filter((p) => !p.impassable && w.state.owner[p.id] === '').length;
    const f0 = free();
    for (let i = 0; i < 52; i++) runTurn(w);
    const taken = f0 - free();
    expect(taken).toBeGreaterThan(5);
    expect(taken).toBeLessThan(60);
  }, 60000);
});
