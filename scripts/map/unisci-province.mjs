// Unisce una provincia a un'altra confinante, direttamente sulla mappa pubblicata, senza rigenerarla.
//
//   node scripts/map/unisci-province.mjs "<assorbita>" "<che assorbe>" ["<nuovo nome>"] [--file public/data/europe1881.json]
//
// Lavora sulla topologia: toglie gli archi in comune (e solo quelli), ricuce gli anelli, somma popolazione
// e area, poi rinumera province e archi in tutti gli elenchi che li citano (vicini, arcSides, stretti,
// piste, fiumi di confine). Una provincia tolta a mano senza rinumerare lascia riferimenti spostati:
// check-riferimenti.mjs li intercetta.
//
// Dopo l'unione: `node scripts/map/ritocchi-estrai.mjs <mappa generata> public/data/europe1881.json`
// perché l'unione sopravviva a `npm run map`, poi `npm run map:check`.
import fs from 'node:fs';

const args = process.argv.slice(2);
const fi = args.indexOf('--file');
const file = fi >= 0 ? args.splice(fi, 2)[1] : 'public/data/europe1881.json';
const [nomeB, nomeA, nuovoNome] = args;
if (!nomeB || !nomeA) { console.error('uso: unisci-province.mjs "<assorbita>" "<che assorbe>" ["<nuovo nome>"]'); process.exit(1); }

const raw = fs.readFileSync(file, 'utf8');
const M = JSON.parse(raw);
const P = M.provinces;
const B = P.find((p) => p.name === nomeB), A = P.find((p) => p.name === nomeA);
if (!A || !B) { console.error(`provincia non trovata: ${!A ? nomeA : nomeB}`); process.exit(1); }
const a = A.id, b = B.id;

// archi decodificati (coordinate intere in decimi di km)
const pts = M.arcs.map((flat) => { const o = []; let x = 0, y = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; o.push([x, y]); } return o; });
const dec = (r) => (r < 0 ? ~r : r);
const polysOf = (p) => (!p.arcs?.length ? [] : typeof p.arcs[0][0] === 'number' ? [p.arcs] : p.arcs);
const shared = new Set();
M.arcSides.forEach(([s, t], i) => { if ((s === a && t === b) || (s === b && t === a)) shared.add(i); });
if (!shared.size) { console.error(`${nomeB} e ${nomeA} non confinano`); process.exit(1); }

// ricucitura degli anelli
const refs = [...polysOf(A), ...polysOf(B)].flat(2).filter((r) => !shared.has(dec(r)));
const key = (c) => c[0] + ',' + c[1];
const ends = (r) => { const s = pts[dec(r)]; return r < 0 ? [s[s.length - 1], s[0]] : [s[0], s[s.length - 1]]; };
const byStart = new Map();
for (const r of refs) { const k = key(ends(r)[0]); if (!byStart.has(k)) byStart.set(k, []); byStart.get(k).push(r); }
const used = new Set(), rings = [];
for (const r0 of refs) {
  if (used.has(r0)) continue;
  const ring = [];
  let r = r0;
  while (r != null && !used.has(r)) {
    used.add(r); ring.push(r);
    const nxt = (byStart.get(key(ends(r)[1])) ?? []).find((q) => !used.has(q));
    r = nxt ?? null;
  }
  if (key(ends(ring[0])[0]) !== key(ends(ring[ring.length - 1])[1])) { console.error('anello non chiuso: unione annullata'); process.exit(1); }
  rings.push(ring);
}
const coords = (ring) => ring.flatMap((r, i) => { const s = r < 0 ? [...pts[dec(r)]].reverse() : pts[dec(r)]; return i ? s.slice(1) : s; });
const signed = (c) => { let s = 0; for (let i = 0, j = c.length - 1; i < c.length; j = i++) s += (c[j][0] - c[i][0]) * (c[j][1] + c[i][1]); return s / 2; };
const outerSign = Math.sign(signed(coords(polysOf(A)[0][0])));
const inside = (pt, c) => { let o = false; for (let i = 0, j = c.length - 1; i < c.length; j = i++) if ((c[i][1] > pt[1]) !== (c[j][1] > pt[1]) && pt[0] < ((c[j][0] - c[i][0]) * (pt[1] - c[i][1])) / (c[j][1] - c[i][1]) + c[i][0]) o = !o; return o; };
const outers = rings.filter((r) => Math.sign(signed(coords(r))) === outerSign).map((r) => [r]);
for (const h of rings.filter((r) => Math.sign(signed(coords(r))) !== outerSign)) {
  const p0 = coords(h)[0];
  const host = outers.find((o) => inside(p0, coords(o[0])));
  if (!host) { console.error('buco senza anello esterno: unione annullata'); process.exit(1); }
  host.push(h);
}
A.arcs = outers.length === 1 ? outers[0] : outers;

// dati della provincia unita
A.n = [...new Set([...(A.n ?? []), ...(B.n ?? [])])];
A.pop += B.pop;
A.area += B.area;
A.coast = A.coast || B.coast;
if (nuovoNome) A.name = nuovoNome;
if (B.oasis && !A.oasis) delete A.oasis;

// rinumerazione degli archi (via quelli in comune, ormai interni)
const arcMap = new Map();
let k = 0;
M.arcs.forEach((_, i) => { if (!shared.has(i)) arcMap.set(i, k++); });
const ra = (r) => (r < 0 ? ~arcMap.get(~r) : arcMap.get(r));
M.arcs = M.arcs.filter((_, i) => !shared.has(i));
M.arcSides = M.arcSides.filter((_, i) => !shared.has(i)).map(([s, t]) => [s === b ? a : s, t === b ? a : t]);
for (const p of P) if (p.arcs?.length) p.arcs = typeof p.arcs[0][0] === 'number' ? p.arcs.map((ring) => ring.map(ra)) : p.arcs.map((poly) => poly.map((ring) => ring.map(ra)));

// rinumerazione delle province (b sparisce, gli id dopo scalano di uno)
const pm = (i) => (i === b ? a : i > b ? i - 1 : i);
P.splice(b, 1);
for (const p of P) {
  p.id = pm(p.id);
  if (p.n) p.n = [...new Set(p.n.map(pm))].filter((q) => q !== p.id).sort((x, y) => x - y);
}
M.arcSides = M.arcSides.map(([s, t]) => [s == null || s < 0 ? s : pm(s), t == null || t < 0 ? t : pm(t)]);
const seen = new Set();
M.straits = M.straits.map(([s, t, w]) => [pm(s), pm(t), w]).filter(([s, t]) => { const kk = Math.min(s, t) + ',' + Math.max(s, t); if (s === t || seen.has(kk)) return false; seen.add(kk); return true; });
M.routes = (M.routes ?? []).map((r) => ({ ...r, a: pm(r.a), b: pm(r.b) })).filter((r) => r.a !== r.b);
M.rivers = (M.rivers ?? []).map(([s, t, n]) => [pm(s), pm(t), n]).filter(([s, t]) => s !== t);
if (M.euCount != null && b < M.euCount) M.euCount--;

fs.writeFileSync(file, JSON.stringify(M) + (raw.endsWith('\n') ? '\n' : ''));
console.log(`${nomeB} unita a ${nomeA}${nuovoNome ? ` (ora ${nuovoNome})` : ''}: ${shared.size} archi in comune tolti, ${outers.length} poligoni, ${P.length} province`);
