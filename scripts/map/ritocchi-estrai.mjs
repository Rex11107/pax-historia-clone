// Estrae i ritocchi fatti a mano su public/data/europe1881.json, confrontandolo con la mappa generata.
//
//   node scripts/map/ritocchi-estrai.mjs <generata.json> <ritoccata.json> [scripts/map/ritocchi.geojson]
//
// Per ogni provincia della mappa ritoccata la cui forma differisce da quella generata con lo stesso nome
// (o che nella generata non c'è) scrive il poligono in gradi; per quelle con la sola forma uguale ma
// deserto, padrone od oasi cambiati scrive un punto interno. Le province generate sparite finiscono in
// `rimosse`. build-map.mjs applica il file con ritocchi.mjs, così i ritocchi sopravvivono a `npm run map`.
import fs from 'node:fs';
import * as turf from '@turf/turf';

const R = 6371, SEAM = -168;
const unproj = ([x, y]) => {
  let lon = (x / R) * (180 / Math.PI);
  if (lon > 180) lon -= 360;
  const lat = ((Math.atan(Math.exp(y / (1.25 * R))) - Math.PI / 4) / 0.4) * (180 / Math.PI);
  return [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5];
};
void SEAM;

export function geometrie(M) {
  const arcs = M.arcs.map((flat) => { const out = []; let x = 0, y = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; out.push([x / 10, y / 10]); } return out; });
  const ring = (r) => { const pts = []; for (const a of r) { const arc = arcs[a < 0 ? ~a : a]; const seq = a < 0 ? [...arc].reverse() : arc; for (let i = pts.length ? 1 : 0; i < seq.length; i++) pts.push(seq[i]); } return pts; };
  return M.provinces.map((p) => {
    if (!p.arcs?.length) return null;
    const polys = typeof p.arcs[0][0] === 'number' ? [p.arcs] : p.arcs;
    return polys.map((poly) => poly.map(ring));
  });
}
const poligono = (g) => turf.feature(g.length === 1 ? { type: 'Polygon', coordinates: g[0] } : { type: 'MultiPolygon', coordinates: g });
// forme uguali a meno di vertici aggiunti sui lati (gli spezzamenti a mano ne inseriscono lungo le linee di taglio):
// conta solo la differenza simmetrica, in km² (le coordinate sono già in km)
const scarto = (a, b) => {
  const pa = poligono(a), pb = poligono(b), area = (f) => (f ? Math.abs(planare(f)) : 0);
  return area(turf.difference(turf.featureCollection([pa, pb]))) + area(turf.difference(turf.featureCollection([pb, pa])));
};
const anello = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return s / 2; };
const planare = (f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).reduce((t, poly) => t + Math.abs(anello(poly[0])) - poly.slice(1).reduce((u, r) => u + Math.abs(anello(r)), 0), 0);
const proprieta = (p) => ({ owner: p.owner ?? '', deserto: p.impassable ? p.region || 'Sahara' : null, oasi: !!p.oasis });

if (import.meta.url === `file://${process.argv[1]}`) {
  const [fa, fb, fo = 'scripts/map/ritocchi.geojson'] = process.argv.slice(2);
  const A = JSON.parse(fs.readFileSync(fa, 'utf8')), B = JSON.parse(fs.readFileSync(fb, 'utf8'));
  const gA = geometrie(A), gB = geometrie(B);
  const byA = new Map(A.provinces.map((p) => [p.name, p]));
  const nomiB = new Set(B.provinces.map((p) => p.name));
  const features = [];
  for (const p of B.provinces) {
    const q = byA.get(p.name), g = gB[p.id];
    if (!g) continue;
    const props = { name: p.name, ...proprieta(p) };
    const sc = q && gA[q.id] ? scarto(gA[q.id], g) : Infinity; if (process.env.DEBUG_SCARTO && sc > 20) console.log("scarto", p.name, Math.round(sc)); const forma = sc > 20;
    const flag = q && JSON.stringify(proprieta(q)) !== JSON.stringify(proprieta(p));
    if (forma) {
      const coords = g.map((poly) => poly.map((r) => r.map(unproj)));
      features.push(turf.feature(coords.length === 1 ? { type: 'Polygon', coordinates: coords[0] } : { type: 'MultiPolygon', coordinates: coords }, props));
    } else if (flag) features.push(turf.point(p.lonlat, props));
  }
  // zona: anche le province attorno ai ritocchi (entro un grado) tengono la forma pubblicata, altrimenti la
  // rigenerazione le raggruppa in altro modo (senza le oasi tolte gli atomi si dividono diversamente)
  const bbOf = (g) => { const pts = g.flat(2).map(unproj); return [Math.min(...pts.map((q) => q[0])) - 1, Math.min(...pts.map((q) => q[1])) - 1, Math.max(...pts.map((q) => q[0])) + 1, Math.max(...pts.map((q) => q[1])) + 1]; };
  const zone = features.filter((f) => f.geometry.type !== 'Point').map((f) => bbOf(gB[B.provinces.find((p) => p.name === f.properties.name).id]));
  const gia = new Set(features.map((f) => f.properties.name));
  for (const p of B.provinces) {
    const g = gB[p.id];
    if (!g || gia.has(p.name)) continue;
    const b = bbOf(g).map((v, i) => v + (i < 2 ? 1 : -1));
    if (!zone.some((z) => b[0] <= z[2] && b[2] >= z[0] && b[1] <= z[3] && b[3] >= z[1])) continue;
    const coords = g.map((poly) => poly.map((r) => r.map(unproj)));
    features.push(turf.feature(coords.length === 1 ? { type: 'Polygon', coordinates: coords[0] } : { type: 'MultiPolygon', coordinates: coords }, { name: p.name, ...proprieta(p), zona: true }));
  }
  // anche gli omonimi delle province fissate (Erg Chech (sud) accanto a (nord) e (ovest)): altrimenti, rimasti soli,
  // la rigenerazione toglierebbe loro il suffisso
  const radice = (n) => n.replace(/ \((nord|sud|est|ovest|centro)\)( [IVX]+)?$/, '');
  const radici = new Set(features.filter((f) => f.geometry.type !== 'Point').map((f) => radice(f.properties.name)));
  for (const p of B.provinces) {
    const g = gB[p.id];
    if (!g || features.some((f) => f.properties.name === p.name) || p.name === radice(p.name) || !radici.has(radice(p.name))) continue;
    const coords = g.map((poly) => poly.map((r) => r.map(unproj)));
    features.push(turf.feature(coords.length === 1 ? { type: 'Polygon', coordinates: coords[0] } : { type: 'MultiPolygon', coordinates: coords }, { name: p.name, ...proprieta(p), zona: true }));
  }
  const rimosse = A.provinces.filter((p) => !nomiB.has(p.name)).map((p) => p.name);
  const out = { type: 'FeatureCollection', rimosse, features };
  fs.writeFileSync(fo, JSON.stringify(out, null, 0).replace(/\},\{"type":"Feature"/g, '},\n{"type":"Feature"') + '\n');
  console.log(`${features.filter((f) => f.geometry.type !== 'Point' && !f.properties.zona).length} forme ritoccate e ${features.filter((f) => f.properties.zona).length} attorno, ${features.filter((f) => f.geometry.type === 'Point').length} solo proprietà, rimosse: ${rimosse.join(', ')}`);
  for (const f of features.filter((x) => !x.properties.zona)) console.log(' ', f.geometry.type === 'Point' ? 'proprietà' : 'forma    ', f.properties.name, JSON.stringify(f.properties));
}
