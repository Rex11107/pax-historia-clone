// Divisione delle province troppo grandi lungo i bacini idrografici di HydroBASINS (HydroSHEDS, WWF).
//
// Ogni provincia grande viene sovrapposta ai bacini di livello 7. I bacini hanno un codice Pfafstetter
// gerarchico: le prime cifre identificano il bacino "padre". Si sceglie il livello più grossolano che
// dà almeno il numero di pezzi voluto, si separano le parti non contigue, poi i pezzi troppo piccoli
// si uniscono al vicino con cui condividono il confine più lungo. I confini interni che ne escono
// corrono sugli spartiacque: creste, alture, displuvi. Nessun taglio geometrico.

import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';
import * as topojson from 'topojson-client';

export function prepareBasins({ ms, RAW, TMP, BBOX }) {
  const out = path.join(TMP, 'basins7.geojson');
  if (fs.existsSync(out)) return out;
  const dir = path.join(RAW, 'hydro');
  ms('-i', path.join(dir, 'hybas_eu_lev07_v1c.shp'), path.join(dir, 'hybas_af_lev07_v1c.shp'), 'combine-files', '-merge-layers', 'force',
    '-clip', `bbox=${BBOX}`, '-each', 'pfaf=String(PFAF_ID)', '-filter-fields', 'pfaf', '-simplify', 'interval=600', 'keep-shapes', '-o', out);
  return out;
}

/**
 * @returns {GeoJSON.FeatureCollection} province con le grandi suddivise; properties.pid diventa `${pid}~k`
 */
export function splitByBasins(fc, { ms, TMP, basinsPath, places, splitArea, target, minPiece, exo, log }) {
  const km2 = (f) => turf.area(f) / 1e6;
  const big = [], keep = [];
  for (const f of fc.features) {
    const c = turf.centroid(f).geometry.coordinates;
    const sparse = (c[1] < 31.5 && c[0] > -12) || c[1] > 61; // deserti e grande Nord restano interi
    (km2(f) > splitArea && !sparse ? big : keep).push(f);
  }
  const bigPath = path.join(TMP, 'big.geojson');
  fs.writeFileSync(bigPath, JSON.stringify(turf.featureCollection(big.map((f, i) => ({ ...f, properties: { ...f.properties, bi: i } })))));
  const facesPath = path.join(TMP, 'basin_faces.topo.json');
  ms('-i', bigPath, basinsPath, 'combine-files', 'snap', '-union', 'target=big,basins7', '-filter', 'bi != null', 'remove-empty',
    '-o', 'format=topojson', facesPath);
  const topo = JSON.parse(fs.readFileSync(facesPath, 'utf8'));
  const geoms = topo.objects[Object.keys(topo.objects)[0]].geometries.filter((g) => g.type && g.arcs?.length);
  const feats = geoms.map((g) => topojson.feature(topo, g));
  const area = feats.map(km2);
  const bi = geoms.map((g) => g.properties.bi);
  const pfaf = geoms.map((g) => (g.properties.pfaf ? String(g.properties.pfaf) : null));
  // lunghezza dei confini condivisi fra facce della stessa provincia
  const tf = topo.transform;
  const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return tf ? [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]] : [dx, dy]; }); });
  const arcFaces = arcs.map(() => []);
  geoms.forEach((g, k) => { const rec = (a) => (typeof a === 'number' ? arcFaces[a < 0 ? ~a : a].push(k) : a.forEach(rec)); rec(g.arcs); });
  const shared = new Map();
  arcFaces.forEach((fs2, ai) => {
    if (fs2.length !== 2 || bi[fs2[0]] !== bi[fs2[1]]) return;
    const a = arcs[ai];
    const len = a.length > 1 ? turf.length(turf.lineString(a)) : 0;
    const key = fs2[0] < fs2[1] ? `${fs2[0]},${fs2[1]}` : `${fs2[1]},${fs2[0]}`;
    shared.set(key, (shared.get(key) || 0) + len);
  });
  const nb = feats.map(() => new Map());
  for (const [key, len] of shared) { const [i, j] = key.split(',').map(Number); nb[i].set(j, (nb[i].get(j) || 0) + len); nb[j].set(i, (nb[j].get(i) || 0) + len); }

  const out = [...keep];
  let made = 0;
  for (let p = 0; p < big.length; p++) {
    const mem = feats.map((_, i) => i).filter((i) => bi[i] === p);
    if (!mem.length) { out.push(big[p]); continue; }
    const total = mem.reduce((s, i) => s + area[i], 0);
    const want = Math.max(2, Math.round(total / target));
    // livello Pfafstetter: il più grossolano che dà almeno `want` bacini distinti
    let L = 7;
    for (let l = 2; l <= 7; l++) {
      const keys = new Set(mem.map((i) => pfaf[i]?.slice(0, l)).filter(Boolean));
      if (keys.size >= want) { L = l; break; }
    }
    // gruppi = (prefisso, componente connessa); i gruppi troppo grandi scendono di livello Pfafstetter
    const lev = new Map(mem.map((i) => [i, L]));
    let parent, gArea, find, join;
    for (let pass = 0; pass < 6; pass++) {
      parent = new Map(mem.map((i) => [i, i]));
      find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
      gArea = new Map(mem.map((i) => [i, area[i]]));
      join = (a, b) => { a = find(a); b = find(b); if (a === b) return a; parent.set(b, a); gArea.set(a, gArea.get(a) + gArea.get(b)); return a; };
      for (const i of mem) for (const [j] of nb[i]) {
        if (!pfaf[i] || !pfaf[j]) continue;
        const l = Math.min(lev.get(i), lev.get(j));
        if (lev.get(i) === lev.get(j) && pfaf[i].slice(0, l) === pfaf[j].slice(0, l)) join(i, j);
      }
      let refined = false;
      for (const r of new Set(mem.map(find))) {
        if (gArea.get(r) <= target * 1.7) continue;
        for (const i of mem) if (find(i) === r && pfaf[i] && lev.get(i) < 7) { lev.set(i, lev.get(i) + 1); refined = true; }
      }
      if (!refined) break;
    }
    for (const i of mem) if (!pfaf[i]) { const best = [...nb[i].entries()].sort((a, b) => b[1] - a[1])[0]; if (best) join(best[0], i); }
    // fusione dei gruppi piccoli (o in eccesso) col vicino di confine più lungo
    for (let guard = 0; guard < 500; guard++) {
      const roots = [...new Set(mem.map(find))].sort((a, b) => gArea.get(a) - gArea.get(b));
      if (roots.length <= 1) break;
      const small = roots[0];
      if (gArea.get(small) >= minPiece) break;
      const border = new Map();
      for (const i of mem) if (find(i) === small) for (const [j, len] of nb[i]) { const r = find(j); if (r !== small) border.set(r, (border.get(r) || 0) + len); }
      // a parità, meglio non creare pezzi enormi
      const cand = [...border.entries()].map(([r, len]) => [r, len / (1 + Math.max(0, gArea.get(r) + gArea.get(small) - target * 1.8) / target)]).sort((a, b) => b[1] - a[1])[0];
      if (!cand) { const other = roots[roots.length - 1]; if (other === small) break; join(other, small); continue; }
      join(cand[0], small);
    }
    const groups = new Map();
    for (const i of mem) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); }
    if (groups.size <= 1) { out.push(big[p]); continue; }
    const base = big[p].properties;
    const pc = turf.centroid(big[p]).geometry.coordinates;
    let k = 0;
    for (const ids of groups.values()) {
      const f = turf.feature(topojson.merge(topo, ids.map((i) => geoms[i])), {});
      let town = null, tp = -1;
      const bb = turf.bbox(f);
      for (const pl of places) {
        const [x, y] = pl.geometry.coordinates;
        if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
        const pop = pl.properties.pop_max || 0;
        if (pop > tp && turf.booleanPointInPolygon([x, y], f)) { tp = pop; town = pl.properties.name; }
      }
      const c = turf.centroid(f).geometry.coordinates;
      const dir = Math.abs(c[1] - pc[1]) > Math.abs(c[0] - pc[0]) * Math.cos((pc[1] * Math.PI) / 180) ? (c[1] > pc[1] ? 'nord' : 'sud') : c[0] > pc[0] ? 'est' : 'ovest';
      f.properties = { ...base, pid: `${base.pid}~${++k}`, pname: town && tp > 15000 ? exo(town) : `${base.pname} (${dir})` };
      out.push(f);
      made++;
    }
  }
  log(`${big.length} province grandi divise lungo gli spartiacque di HydroBASINS in ${made} parti`);
  return turf.featureCollection(out);
}
