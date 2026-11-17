// Sonda 2 accusa (corte 08): struttura mare, isole sospette.
import fs from 'node:fs';
import { newGame } from '/home/user/progetti/pax-historia-clone/src/engine/setup';
import { seaRoute } from '/home/user/progetti/pax-historia-clone/src/engine/sea';

const M = JSON.parse(fs.readFileSync('/home/user/progetti/pax-historia-clone/public/data/europe1881.json', 'utf8'));
console.log('sea.canals:', JSON.stringify(M.sea?.canals ?? null));
console.log('sea.zones:', (M.sea?.zones ?? []).length);
const w = newGame(M, 'SMR', 'regnum');

// province sospette
for (const name of ['Nenec', 'Isola di Pasqua', 'Socotra', 'Hawaii', 'Zanzibar', 'Isole Baleari', 'Tórshavn']) {
  const p = M.provinces.find((x) => x.name === name);
  if (!p) { console.log(name, 'NON TROVATA'); continue; }
  const adj = new Set(p.n);
  for (const [a, b] of M.straits) { if (a === p.id) adj.add(b); if (b === p.id) adj.add(a); }
  const coastPorts = M.provinces.filter((q) => q.coast && q.owner && q.id !== p.id);
  // prova una rotta dal porto più vicino
  const near = coastPorts.sort((a, b) => (a.lonlat[0]-p.lonlat[0])**2 + (a.lonlat[1]-p.lonlat[1])**2)[0];
  let r = null;
  try { r = seaRoute(w, w.map.provinces[p.id].owner || 'GBR', near.id, p.id); } catch {}
  console.log(name, '| id', p.id, '| owner', p.owner, '| coast', p.coast, '| impass', p.impassable, '| lonlat', p.lonlat, '| adiacenze', adj.size, '| rotta dal porto', near.name, '=', r ? (r.km.toFixed(0) + ' km') : 'NULLA');
}
