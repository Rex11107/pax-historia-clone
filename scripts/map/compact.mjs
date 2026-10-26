// Province "da gioco": compatte, di dimensioni simili, senza strisce né sacche.
//
// Le linee amministrative storiche non sono fatte per essere conquistate e annesse: una contea lunga e
// stretta (Litoraneo-montana) o un distretto a ferro di cavallo producono confini frastagliati appena
// cambiano di mano. Qui le province si ricostruiscono da "atomi" piccoli: ogni unità amministrativa
// tagliata dai bacini idrografici di HydroBASINS livello 8 (~300-800 km²). Gli atomi si raggruppano
// cercando la forma più compatta (indice di Polsby-Popper, 4πA/P²) con tre vincoli rigidi:
//   - stesso stato nel 1881 (il proprietario)
//   - stesso paese moderno e stessa area linguistica (Ticino, Alto Adige, Romandia…): le cessioni
//     future restano credibili
//   - dimensione fra MIN e MAX
// e un vincolo morbido: attraversare il confine di una regione storica costa, ma è permesso.
// Una seconda fase sposta gli atomi di bordo da una provincia all'altra finché le forme migliorano.

import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';
import * as topojson from 'topojson-client';

export const ZONE_BBOX = [4.5, 35.3, 20.2, 48.3];
const AUH_ZONE = new Set(['Gefürstete Grafschaft Tirol', 'Trentino', 'Land Vorarlberg', 'Herzogtum Kärnten', 'Herzogtum Steiermark', 'Herzogtum Krain',
  'Triest mit Gebiet', 'Gefürstete Grafschaft Görz und Gradisca', 'Markgrafschaft Istrien', 'Königreich Dalmatien', 'Herzogtum Salzburg',
  'Croazia-Slavonia', 'Confine militare', 'Fiume']);
const FRA_ZONE = new Set(["Provence-Alpes-Côte-d'Azur", 'Corse', 'Auvergne-Rhône-Alpes']);

/** Area di lavoro della prima fase: Italia e vicinanze. */
export function inZone(p) {
  if (['ITA', 'SMR', 'SWI', 'MCO', 'LIE'].includes(p.owner)) return true;
  if (p.owner === 'GBR' && p.modern === 'MLT') return true;
  if (p.owner === 'FRA') return FRA_ZONE.has(p.nreg) || p.modern === 'MCO';
  if (p.owner === 'AUH') return p.modern === 'BIH' || AUH_ZONE.has(String(p.reg || '').replace(/^H:/, ''));
  return false;
}

export function prepareBasins8({ ms, RAW, TMP }) {
  const out = path.join(TMP, 'basins8_zone.geojson');
  if (fs.existsSync(out)) return out;
  const dir = path.join(RAW, 'hydro');
  if (!fs.existsSync(path.join(dir, 'hybas_eu_lev08_v1c.shp'))) return null;
  ms('-i', path.join(dir, 'hybas_eu_lev08_v1c.shp'), path.join(dir, 'hybas_af_lev08_v1c.shp'), 'combine-files', '-merge-layers', 'force',
    '-clip', `bbox=${ZONE_BBOX}`, '-each', 'b8=HYBAS_ID', '-filter-fields', 'b8', '-simplify', 'interval=500', 'keep-shapes', '-o', out);
  return out;
}

/**
 * Taglia le province della zona sui bacini di livello 8. pid degli atomi: `${pid}~a${k}`.
 */
export function atomize(fc, { ms, TMP, basinsPath, log }) {
  const inBox = (f) => { const [x, y] = turf.centroid(f).geometry.coordinates; return x > ZONE_BBOX[0] && x < ZONE_BBOX[2] && y > ZONE_BBOX[1] && y < ZONE_BBOX[3]; };
  const zone = [], rest = [];
  for (const f of fc.features) (inBox(f) ? zone : rest).push(f);
  const zp = path.join(TMP, 'atom_src.geojson');
  fs.writeFileSync(zp, JSON.stringify(turf.featureCollection(zone.map((f, i) => ({ ...f, properties: { ...f.properties, zi: i } })))));
  const outp = path.join(TMP, 'atoms.geojson');
  ms('-i', zp, basinsPath, 'combine-files', 'snap', '-union', 'target=atom_src,basins8_zone', '-filter', 'zi != null', 'remove-empty', '-explode', '-o', outp);
  const atoms = JSON.parse(fs.readFileSync(outp, 'utf8')).features;
  const count = new Map();
  const out = [...rest];
  for (const a of atoms) {
    const base = zone[a.properties.zi].properties;
    const k = (count.get(base.pid) || 0) + 1;
    count.set(base.pid, k);
    const { zi, b8, ...props } = a.properties;
    out.push({ type: 'Feature', geometry: a.geometry, properties: { ...base, ...props, pid: `${base.pid}~a${k}` } });
  }
  log(`${zone.length} province della zona italiana tagliate in ${atoms.length} atomi (bacini HydroBASINS liv. 8)`);
  return turf.featureCollection(out);
}

/** Perimetri e confini condivisi (km) dei pezzi di una topologia. */
export function topoMetrics(topo, geoms) {
  const tf = topo.transform;
  const len = topo.arcs.map((arc) => {
    let x = 0, y = 0, prev = null, L = 0;
    for (const [dx, dy] of arc) {
      x += dx; y += dy;
      const pt = tf ? [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]] : [dx, dy];
      if (prev) L += turf.distance(prev, pt);
      prev = pt;
    }
    return L;
  });
  const use = topo.arcs.map(() => []);
  geoms.forEach((g, k) => { const rec = (a) => (typeof a === 'number' ? use[a < 0 ? ~a : a].push(k) : a.forEach(rec)); rec(g.arcs); });
  const perim = new Float64Array(geoms.length);
  const shared = geoms.map(() => new Map());
  use.forEach((u, ai) => {
    for (const k of u) perim[k] += len[ai];
    if (u.length === 2 && u[0] !== u[1]) {
      shared[u[0]].set(u[1], (shared[u[0]].get(u[1]) || 0) + len[ai]);
      shared[u[1]].set(u[0], (shared[u[1]].get(u[0]) || 0) + len[ai]);
    }
  });
  return { perim, shared };
}

/**
 * Raggruppa gli atomi della zona in province compatte.
 * @param atoms indici dei pezzi della zona
 * @param P pezzi ({area, owner, …}); key(p) vincolo rigido; soft(p) regione (vincolo morbido)
 * @returns array di gruppi (array di indici di pezzi)
 */
export function compactClusters(atoms, P, metrics, { key, soft, min, target, max, maxSpan = 190, log }) {
  const { perim, shared } = metrics;
  const inSet = new Set(atoms);
  const cl = new Map(); // id -> {ids:Set, A, Pm, nb: Map<clusterId, len>, key}
  const of = new Map();
  for (const i of atoms) {
    const nb = new Map();
    for (const [j, l] of shared[i]) if (inSet.has(j)) nb.set(j, l);
    cl.set(i, { ids: new Set([i]), A: P[i].area, Pm: perim[i], nb, key: key(P[i]), soft: new Map([[soft(P[i]), P[i].area]]), bb: turf.bbox(P[i].feat) });
    of.set(i, i);
  }
  const pp = (A, Pm) => (Pm > 0 ? (4 * Math.PI * A) / (Pm * Pm) : 0);
  // estensione massima: niente strisce lunghe anche dove la geografia le favorisce (coste, valli)
  const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  const span = (bb) => turf.distance([bb[0], bb[1]], [bb[2], bb[3]]);
  const softOf = (c) => [...c.soft.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const mergeInto = (a, b) => { // b dentro a
    const A = cl.get(a), B = cl.get(b);
    const bl = A.nb.get(b) || 0;
    A.Pm = A.Pm + B.Pm - 2 * bl;
    A.A += B.A;
    A.bb = union(A.bb, B.bb);
    for (const i of B.ids) { A.ids.add(i); of.set(i, a); }
    for (const [s, v] of B.soft) A.soft.set(s, (A.soft.get(s) || 0) + v);
    A.nb.delete(b);
    for (const [c, l] of B.nb) {
      if (c === a) continue;
      A.nb.set(c, (A.nb.get(c) || 0) + l);
      const C = cl.get(c);
      C.nb.set(a, (C.nb.get(a) || 0) + l);
      C.nb.delete(b);
    }
    cl.delete(b);
  };

  // fase 1: accorpamento dal più piccolo, verso la forma più compatta
  for (let guard = 0; guard < 100000; guard++) {
    let small = null;
    for (const [id, c] of cl) if (c.A < min && !c.stuck && (!small || c.A < cl.get(small).A)) small = id;
    if (small === null) break;
    const S = cl.get(small);
    let best = null, bs = -1;
    for (const [o, l] of S.nb) {
      const O = cl.get(o);
      if (O.key !== S.key || O.A + S.A > max || span(union(O.bb, S.bb)) > maxSpan) continue;
      const A = O.A + S.A, Pm = O.Pm + S.Pm - 2 * l;
      let sc = pp(A, Pm);
      if (softOf(O) !== softOf(S)) sc *= 0.55;
      // a parità di forma, meglio completare una provincia ancora piccola
      sc *= 1 + 0.25 * Math.max(0, 1 - O.A / target);
      if (sc > bs) { bs = sc; best = o; }
    }
    if (best === null) { S.stuck = true; continue; }
    mergeInto(best, small);
  }

  // fase 2: atomi di bordo spostati verso la provincia vicina se le forme migliorano
  const borderLen = (i, cid) => { let L = 0; for (const [j, l] of shared[i]) if (of.get(j) === cid) L += l; return L; };
  const connectedWithout = (c, skip) => {
    const ids = [...c.ids].filter((x) => x !== skip);
    if (!ids.length) return false;
    const seen = new Set([ids[0]]);
    const st = [ids[0]];
    while (st.length) { const x = st.pop(); for (const [j] of shared[x]) if (j !== skip && c.ids.has(j) && !seen.has(j)) { seen.add(j); st.push(j); } }
    return seen.size === ids.length;
  };
  let moves = 0;
  for (let pass = 0; pass < 8; pass++) {
    let moved = 0;
    for (const i of atoms) {
      const x = of.get(i), X = cl.get(x);
      if (X.ids.size < 2) continue;
      const toX = borderLen(i, x);
      const cands = new Set();
      for (const [j] of shared[i]) { const y = of.get(j); if (y !== undefined && y !== x) cands.add(y); }
      let best = null, gain = 0.004;
      for (const y of cands) {
        const Y = cl.get(y);
        if (Y.key !== X.key || Y.A + P[i].area > max || X.A - P[i].area < min * 0.8 || span(union(Y.bb, turf.bbox(P[i].feat))) > maxSpan) continue;
        const toY = borderLen(i, y);
        const PmX = X.Pm - perim[i] + 2 * toX, PmY = Y.Pm + perim[i] - 2 * toY;
        const before = pp(X.A, X.Pm) + pp(Y.A, Y.Pm);
        const after = pp(X.A - P[i].area, PmX) + pp(Y.A + P[i].area, PmY);
        if (after - before > gain) { gain = after - before; best = { y, PmX, PmY }; }
      }
      if (!best || !connectedWithout(X, i)) continue;
      const Y = cl.get(best.y);
      X.ids.delete(i); X.A -= P[i].area; X.Pm = best.PmX;
      Y.ids.add(i); Y.A += P[i].area; Y.Pm = best.PmY; Y.bb = union(Y.bb, turf.bbox(P[i].feat));
      of.set(i, best.y);
      moved++;
    }
    moves += moved;
    if (!moved) break;
  }
  const groups = [...cl.values()].map((c) => [...c.ids]);
  const ppv = [...cl.values()].filter((c) => c.ids.size).map((c) => pp(c.A, c.Pm)).sort((a, b) => a - b);
  log(`zona italiana: ${atoms.length} atomi -> ${groups.length} province compatte (${moves} spostamenti di bordo; compattezza mediana ${ppv[ppv.length >> 1]?.toFixed(2)}, peggiore ${ppv[0]?.toFixed(2)})`);
  return groups;
}
