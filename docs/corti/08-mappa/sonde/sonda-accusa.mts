// Sonda dell'accusa (corte 08): sondaggio della mappa europe1881.json.
import fs from 'node:fs';
const M = JSON.parse(fs.readFileSync('/home/user/progetti/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const P = M.provinces;
console.log('province totali', P.length);
console.log('impassabili (deserti)', P.filter(p => p.impassable).length);
console.log('nazioni presenti (owner != "")', new Set(P.map(p => p.owner).filter(o => o)).size);
console.log('stretti', (M.straits ?? []).length, '| rotte/piste', (M.routes ?? []).length, '| canali', (M.canals ?? []).map(c => c.name).join(', ') || '(nessuno)');
console.log('fiumi', (M.rivers ?? []).length);

// popolazioni per nazione (somma grezza)
const pop: Record<string, number> = {};
for (const p of P) if (p.owner) pop[p.owner] = (pop[p.owner] ?? 0) + p.pop;
const top = Object.entries(pop).sort((a, b) => b[1] - a[1]).slice(0, 20);
console.log('popolazioni (milioni ab., somma grezza):');
for (const [t, v] of top) console.log(' ', t, (v / 1e6).toFixed(1), 'M  province', P.filter(p => p.owner === t).length);

// province senza alcuna adiacenza (isole o exclavi irraggiungibili)
const adj = P.map(() => new Set<number>());
for (const p of P) for (const q of p.n) if (q !== p.id) adj[p.id].add(q);
for (const [a, b] of M.straits ?? []) { adj[a].add(b); adj[b].add(a); }
for (const r of M.routes ?? []) { adj[r.a].add(r.b); adj[r.b].add(r.a); }
const iso = P.filter(p => adj[p.id].size === 0 && !p.impassable);
console.log('province abitabili senza NESSUNA adiacenza (irraggiungibili):', iso.length, iso.map(p => `${p.name}(${p.owner})`).join(', ') || '(nessuna)');

// microstati e capitali non localizzate
const prof = { ITA: [12.48, 41.9], FRA: [2.35, 48.86], GER: [13.4, 52.52], GBR: [-0.12, 51.5], RUS: [30.32, 59.94], TUR: [28.98, 41.01], USA: [-77.03, 38.9], JAP: [139.7, 35.68], CHI: [116.4, 39.9], AUH: [16.37, 48.21] } as Record<string, [number, number]>;
// qui non abbiamo locate: calcolo solo se il punto cade in una provincia del padrone (approssimato al proprietario)
console.log('check capitali (conteggio province per tag):');
for (const t of ['ITA','FRA','GER','GBR','RUS','TUR','USA','JAP','CHI','AUH']) console.log(' ', t, P.filter(p => p.owner === t).length, 'province');
