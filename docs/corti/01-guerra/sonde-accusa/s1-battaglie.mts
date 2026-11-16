// Sonda 1: battaglie sintetiche (resolveBattles giorno per giorno, rifornimento fisso a 1)
import fs from 'node:fs';
const R = '/home/claude/pax-historia-clone/src/engine/';
const { newGame } = await import(R + 'setup.ts');
const { resolveBattles } = await import(R + 'combat.ts');
const { declareWar } = await import(R + 'diplomacy.ts');
const { invalidatePresence } = await import(R + 'world.ts');
const { buildings, touchBuildings } = await import(R + 'construction.ts');
const MAP = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const find = (w: any, n: string) => w.map.provinces.find((p: any) => p.name === n)?.id ?? w.map.provinces.find((p: any) => p.name.startsWith(n)).id;

function battle(label: string, att: [string, string, number, any?][], def: [string, string, number, any?][], prov: string, opts: { fort?: number; entrench?: number } = {}, pair: [string, string] = ['ITA', 'AUH']) {
  const w = newGame(MAP);
  const s = w.state;
  declareWar(w, pair[0], pair[1], 'sonda');
  const p = find(w, prov);
  const b = buildings(w); b[p].fortezza = opts.fort ?? 0; touchBuildings();
  s.controller[p] = pair[1];
  s.units = [];
  let k = 0;
  const mk = (nation: string, type: string, men: number, extra: any = {}) => ({ id: `x${k++}`, nation, type, name: `${nation}-${type}-${k}`, strength: men, maxStrength: extra.max ?? men, morale: extra.morale ?? 0.8, supply: 1, experience: 0, entrench: extra.entrench ?? 0, location: p, move: null, orders: [], inBattle: false, recovering: 0 });
  for (const [n, t, m, e] of att) s.units.push(mk(n, t, m, e));
  for (const [n, t, m, e] of def) s.units.push(mk(n, t, m, { entrench: opts.entrench ?? 0, ...(e ?? {}) }));
  const startA = att.reduce((x, a) => x + a[2], 0), startD = def.reduce((x, a) => x + a[2], 0);
  let days = 0; const sink: any[] = [];
  for (; days < 120; days++) { s.day++; invalidatePresence(w); resolveBattles(w, sink); if (!Object.keys(s.battles).length) break; }
  const end = sink.find((e) => e.type === 'battle_ended');
  const surr = sink.filter((e) => e.type === 'unit_destroyed').length;
  const ret = sink.filter((e) => e.type === 'retreat').length;
  console.log(`${label.padEnd(58)} ${w.map.provinces[p].terrain.padEnd(8)} giorni ${String(days + 1).padStart(3)} | perdite ${JSON.stringify(end?.data?.losses)} su ${startA}/${startD} | vince ${end?.data?.winner} | ritirate ${ret} rese ${surr}`);
}
const I = (n = 20000, e?: any): [string, string, number, any?] => ['ITA', 'infantry', n, e];
const A = (n = 20000, e?: any): [string, string, number, any?] => ['AUH', 'infantry', n, e];
battle('20k vs 20k pianura', [I()], [A()], 'Milano');
battle('100k vs 20k pianura (concentrazione)', [I(), I(), I(), I(), I()], [A()], 'Milano');
battle('100k vs 100k pianura', [I(), I(), I(), I(), I()], [A(), A(), A(), A(), A()], 'Milano');
battle('500k vs 500k pianura', Array.from({ length: 25 }, () => I()), Array.from({ length: 25 }, () => A()), 'Milano');
battle('40k vs 20k montagna trincerata (1.0)', [I(), I()], [A()], 'Trento', { entrench: 1 });
battle('40k vs 20k montagna trincerata + fortezza 3', [I(), I()], [A()], 'Trento', { entrench: 1, fort: 3 });
battle('100k vs 20k montagna trincerata + fortezza 3', [I(), I(), I(), I(), I()], [A()], 'Trento', { entrench: 1, fort: 3 });
battle('40k+16k art vs 20k montagna trinc + fort 3', [I(), I(), ['ITA', 'artillery', 8000], ['ITA', 'artillery', 8000]], [A()], 'Trento', { entrench: 1, fort: 3 });
battle('1 corpo + 10 brigate artiglieria (100k) vs 100k fanteria', [I(), ...Array.from({ length: 10 }, () => ['ITA', 'artillery', 8000] as any)], [A(), A(), A(), A(), A()], 'Milano');
battle('100k fanteria vs 100k fanteria (controllo)', [I(), I(), I(), I(), I()], [A(), A(), A(), A(), A()], 'Milano');
battle('nuova leva (5k/20k) attaccata da 20k', [I()], [A(5000, { max: 20000, morale: 0.5 })], 'Milano');
battle('nuova leva (5k/20k) difesa da 1 corpo pieno', [I()], [A(5000, { max: 20000, morale: 0.5 }), A()], 'Milano');
battle('cavalleria 8k vs fanteria 8k pianura', [['ITA', 'cavalry', 8000]], [A(8000)], 'Milano');
// grandi potenze contro piccoli Stati, qualità del profilo
battle('GER 60k vs SER 20k pianura (Belgrado)', [['GER', 'infantry', 20000], ['GER', 'infantry', 20000], ['GER', 'infantry', 20000]], [['SER', 'infantry', 20000]], 'Belgrado', {}, ['GER', 'SER']);
battle('ITA 20k vs ETH 20k pianura? (Adua)', [I()], [['ETH', 'infantry', 20000]], 'Adua', {}, ['ITA', 'ETH']);
battle('ITA 20k vs ETH 60k (Adua 1896: 17,7k vs ~100k)', [I(17700)], [['ETH', 'infantry', 60000], ['ETH', 'infantry', 40000]], 'Adua', {}, ['ITA', 'ETH']);
battle('GBR 20k vs ZUL 20k', [['GBR', 'infantry', 20000]], [['ZUL', 'infantry', 20000]], 'Ulundi', {}, ['GBR', 'ZUL']);
const w = newGame(MAP);
for (const t of ['GER', 'FRA', 'RUS', 'AUH', 'ITA', 'GBR', 'TUR', 'SER', 'ETH', 'ZUL', 'JAP', 'USA', 'CHI', 'MAH']) {
  const pr = w.profiles[t]; if (!pr) { console.log(t, 'assente'); continue; }
  const us = w.state.units.filter((u: any) => u.nation === t);
  console.log(t, 'qualità', pr.militaryQuality, 'dottrina', pr.doctrine, 'navale', pr.naval, 'unità', us.length, 'uomini', us.reduce((x: number, u: any) => x + u.strength, 0), 'riserva', w.state.nations[t].manpower, 'tesoro', Math.round(w.state.nations[t].treasury));
}
console.log('province NOBODY', w.state.controller.filter((c: string) => c === '' || c === '-' || c === 'NOBODY' || c == null).length);
