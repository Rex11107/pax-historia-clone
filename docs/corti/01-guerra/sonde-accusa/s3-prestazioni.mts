// Sonda 3: dove vanno i millisecondi della fase rifornimenti; ferrovie russe sulla linea Mosca-Varsavia
import fs from 'node:fs';
const R = '/home/claude/pax-historia-clone/src/engine/';
const { newGame } = await import(R + 'setup.ts');
const { declareWar } = await import(R + 'diplomacy.ts');
const { supplyMap, updateSupply } = await import(R + 'supply.ts');
const { logistics, cacheVersion, level, provinceCapacity } = await import(R + 'construction.ts');
const { runTurn } = await import(R + 'turn.ts');
const { invalidatePresence, presence } = await import(R + 'world.ts');
const { planPath } = await import(R + 'orders.ts');
const MAP = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const now = () => performance.now();

const w = newGame(MAP);
const s = w.state;
for (const [a, b] of [['RUS', 'TUR'], ['FRA', 'GER'], ['GBR', 'MAH'], ['CHI', 'JAP']]) declareWar(w, a, b, 'sonda');
runTurn(w); // scalda le cache
const tags = [...new Set(s.units.map((u: any) => u.nation))] as string[];
const atWar = (t: string) => s.wars.some((x: any) => x.attackers.includes(t) || x.defenders.includes(t));
console.log('nazioni con unità', tags.length, 'in guerra', tags.filter(atWar).length, 'unità', s.units.length, 'guerre', s.wars.length);

// fasi per un turno intero
const ph: Record<string, number> = {}; let t = now();
const versions = new Set<number>();
runTurn(w, (name: string) => { const n = now(); ph[name] = (ph[name] ?? 0) + n - t; t = n; versions.add(cacheVersion()); });
console.log('ms per fase in un turno di guerra:', Object.fromEntries(Object.entries(ph).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, Math.round(v)])));
console.log('versioni di cache distinte viste nel turno (ogni cambio svuota la cache di pace):', versions.size);

// costo di una supplyMap per nazione
s.day++; invalidatePresence(w);
let tot = 0, totWar = 0, worst: [string, number] = ['', 0];
const pres = presence(w);
for (const tag of tags) { const a = now(); supplyMap(w, tag, pres); const d = now() - a; tot += d; if (atWar(tag)) totWar += d; if (d > worst[1]) worst = [tag, d]; }
console.log(`supplyMap per tutte le ${tags.length} nazioni: ${tot.toFixed(1)} ms (di cui in guerra ${totWar.toFixed(1)}), peggiore ${worst[0]} ${worst[1].toFixed(2)} ms`);
// logistica (memo per giorno): costo a freddo
s.day++; let a = now(); for (const tag of tags) logistics(w, tag); console.log(`logistics() a freddo per tutte: ${(now() - a).toFixed(1)} ms (si ricalcola ogni giorno: chiave di memo con s.day)`);
// updateSupply intero, cache di pace calda e fredda
s.day++; invalidatePresence(w); a = now(); updateSupply(w, []); const warm = now() - a;
s.day++; invalidatePresence(w); a = now(); updateSupply(w, []); const warm2 = now() - a;
console.log(`updateSupply: ${warm.toFixed(1)} ms e ${warm2.toFixed(1)} ms (giorni consecutivi, stessa cache di pace)`);
// costo di s.wars.find per unità sotto 0.25 + crowd map
const low = s.units.filter((u: any) => u.supply < 0.25).length;
console.log('unità sotto 0,25 di rifornimento (attrito):', low);

// ferrovie sulla Mosca-Varsavia
const P = w.map.provinces;
const mosca = P.find((p: any) => p.name.startsWith('Mosca') && p.owner === 'RUS'), vars = P.find((p: any) => p.name.startsWith('Varsavia'));
const u = { ...s.units.find((x: any) => x.nation === 'RUS'), location: mosca.id, move: null, orders: [], supply: 1, morale: 0.8 };
const w2 = newGame(MAP); const u2 = { ...w2.state.units.find((x: any) => x.nation === 'RUS'), location: mosca.id, move: null, orders: [], supply: 1, morale: 0.8 };
const r = planPath(w2, u2, vars.id, false);
console.log('rete russa', w2.state.nations.RUS.rail, 'tedesca', w2.state.nations.GER.rail, 'francese', w2.state.nations.FRA.rail);
console.log('Mosca→Varsavia', r?.days, 'giorni:', [mosca.id, ...(r?.path ?? [])].map((p: number) => `${P[p].name}(fer ${level(w2, p, 'ferrovia')}, ${P[p].terrain}, cap ${provinceCapacity(w2, p)})`).join(' → '));
let km = 0; const path = [mosca.id, ...(r?.path ?? [])]; for (let i = 1; i < path.length; i++) km += w2.map.edge(path[i - 1], path[i]).km;
console.log('km fra centri', Math.round(km));
