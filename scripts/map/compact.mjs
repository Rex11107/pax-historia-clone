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

const SPLIT_BIG = new Set(['GBR', 'IRL', 'IMN', 'DEU', 'DNK', 'NLD', 'ESP', 'PRT', 'SRB', 'MNE', 'BGR', 'ROU', 'GRC', 'ALB', 'MKD', 'KOS', 'TUR',
  'MAR', 'DZA', 'TUN', 'LBY', 'EGY', 'SAH', 'MRT']);
export const ZONE_BBOX = [-11.0, 34.5, 30.5, 61.0];
// Nord Africa (sesta fase): la fascia a sud della zona europea, fino al Sinai
const AFRICA_BBOX = [-11.0, 27.0, 35.2, 34.5];
const ZONE_BOXES = [ZONE_BBOX, [-11.0, 27.0, 35.2, 37.6]];
export const AFRICA_MODERN = new Set(['MAR', 'DZA', 'TUN', 'LBY', 'EGY', 'SAH', 'MRT']);
const AUH_ZONE = new Set(['Gefürstete Grafschaft Tirol', 'Trentino', 'Land Vorarlberg', 'Herzogtum Kärnten', 'Herzogtum Steiermark', 'Herzogtum Krain',
  'Triest mit Gebiet', 'Gefürstete Grafschaft Görz und Gradisca', 'Markgrafschaft Istrien', 'Königreich Dalmatien', 'Herzogtum Salzburg',
  'Croazia-Slavonia', 'Confine militare', 'Fiume']);
const FRA_ZONE = new Set(["Provence-Alpes-Côte-d'Azur", 'Corse', 'Auvergne-Rhône-Alpes']);

/** Area di lavoro: Italia e vicinanze, poi tutta l'Austria-Ungheria. */
export function inZone(p) {
  if (['ITA', 'SMR', 'SWI', 'MCO', 'LIE'].includes(p.owner)) return true;
  if (p.owner === 'GBR' && p.modern === 'MLT') return true;
  if (p.owner === 'FRA') return FRA_ZONE.has(p.nreg) || p.modern === 'MCO' || p.modern === 'DZA'; // sesta fase: Algeria
  if (p.owner === 'AUH') return true; // seconda fase: tutta l'Austria-Ungheria
  if (['GER', 'DEN', 'NED', 'LUX'].includes(p.owner)) return true; // terza fase: Germania, Danimarca, Paesi Bassi
  if (p.owner === 'GBR' && ['GBR', 'IRL', 'IMN', 'JEY', 'GGY', 'ALD'].includes(p.modern)) return true; // quarta fase: isole britanniche
  // quinta fase: Spagna e Balcani (con la Rumelia ottomana: Albania, Macedonia, Tracia, Kosovo, Tessaglia, Epiro, Creta)
  if (['SPA', 'AND', 'SER', 'MNE', 'BUL', 'ROM', 'GRE', 'POR'].includes(p.owner)) return true;
  // nona fase: l'Impero russo (con Polonia, Finlandia, Baltico, Ucraina, Bielorussia, Bessarabia, Caucaso)
  if (p.owner === 'RUS') return true;
  // sesta fase: Nord Africa (Marocco, Algeria francese, Tunisia, Tripolitania ottomana, Egitto)
  if (['MOR', 'TUN', 'EGY'].includes(p.owner)) return true;
  if (p.owner === 'FRA' && p.modern === 'DZA') return true;
  if (p.owner === 'TUR' && ['LBY', 'DZA'].includes(p.modern)) return true;
  if (p.owner === 'TUR') {
    if (['GRC', 'ALB', 'MKD', 'KOS', 'BGR', 'SRB', 'MNE', 'BIH'].includes(p.modern)) return true;
    if (p.modern === 'TUR') { const [x, y] = turf.centroid(p.feat).geometry.coordinates; return x < 29.3 && y > 40.05; } // Tracia orientale
  }
  return false;
}

export function prepareBasins8({ ms, RAW, TMP }) {
  const out = path.join(TMP, 'basins8_zone.geojson');
  if (fs.existsSync(out)) return out;
  const dir = path.join(RAW, 'hydro');
  if (!fs.existsSync(path.join(dir, 'hybas_eu_lev08_v1c.shp'))) return null;
  const parts = [ZONE_BBOX, AFRICA_BBOX].map((bb, k) => {
    const o = path.join(TMP, `basins8_part${k}.geojson`);
    ms('-i', path.join(dir, 'hybas_eu_lev08_v1c.shp'), path.join(dir, 'hybas_af_lev08_v1c.shp'), 'combine-files', '-merge-layers', 'force',
      '-clip', `bbox=${bb}`, '-each', 'b8=HYBAS_ID', '-filter-fields', 'b8', '-simplify', 'interval=500', 'keep-shapes', '-o', o);
    return JSON.parse(fs.readFileSync(o, 'utf8')).features;
  });
  fs.writeFileSync(out, JSON.stringify(turf.featureCollection(parts.flat())));
  return out;
}


/** Divide un poligono grande in ~A/piece pezzi compatti (k-means di punti interni + celle di Voronoi). */
function splitKMeans(a, A, piece) {
  const k = Math.ceil(A / piece);
  const bb = turf.bbox(a);
  const pts = [];
  const step = Math.sqrt(((bb[2] - bb[0]) * (bb[3] - bb[1])) / 600);
  for (let x = bb[0] + step / 2; x < bb[2]; x += step) for (let y = bb[1] + step / 2; y < bb[3]; y += step) if (turf.booleanPointInPolygon([x, y], a)) pts.push([x, y]);
  if (pts.length < k * 3) return null;
  let cs = pts.filter((_, i) => i % Math.floor(pts.length / k) === 0).slice(0, k);
  for (let it = 0; it < 15; it++) {
    const sum = cs.map(() => [0, 0, 0]);
    for (const q of pts) { let bi = 0, bd = Infinity; cs.forEach((c, i) => { const d = (c[0] - q[0]) ** 2 * Math.cos((q[1] * Math.PI) / 180) ** 2 + (c[1] - q[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); sum[bi][0] += q[0]; sum[bi][1] += q[1]; sum[bi][2]++; }
    cs = cs.map((c, i) => (sum[i][2] ? [sum[i][0] / sum[i][2], sum[i][1] / sum[i][2]] : c));
  }
  const vor = turf.voronoi(turf.featureCollection(cs.map((c) => turf.point(c))), { bbox: [bb[0] - 1, bb[1] - 1, bb[2] + 1, bb[3] + 1] });
  let ok = 0;
  const out = [];
  for (const cell of vor.features) {
    if (!cell) continue;
    const part = turf.intersect(turf.featureCollection([a, cell]));
    if (!part) continue;
    for (const g of part.geometry.type === 'MultiPolygon' ? part.geometry.coordinates.map((c) => turf.polygon(c)) : [part]) { out.push({ type: 'Feature', geometry: g.geometry, properties: a.properties }); ok++; }
  }
  return ok ? out : null;
}

/**
 * Taglia le province della zona sui bacini di livello 8. pid degli atomi: `${pid}~a${k}`.
 */
export function atomize(fc, { ms, TMP, basinsPath, log, modernLayer, cutPath, riverPath, riverModern }) {
  // anche gli uezd russi enormi fuori dai riquadri (Kola, Arcangelo, steppa dei Kirghisi): si dividono in pezzi
  const bigEast = (f) => ['RUS', 'KAZ'].includes(f.properties.modern) && turf.area(f) / 1e6 > 40000;
  const inBox = (f) => { const [x, y] = turf.centroid(f).geometry.coordinates; return ZONE_BOXES.some((b) => x > b[0] && x < b[2] && y > b[1] && y < b[3]); };
  const zone = [], rest = [];
  for (const f of fc.features) (inBox(f) ? zone : rest).push(f);
  const zp = path.join(TMP, 'atom_src.geojson');
  fs.writeFileSync(zp, JSON.stringify(turf.featureCollection(zone.map((f, i) => ({ ...f, properties: { ...f.properties, zi: i } })))));
  const outp = path.join(TMP, 'atoms.geojson');
  // linee di taglio aggiuntive (il Reno): gli atomi non le scavalcano
  const layers = cutPath ? [zp, basinsPath, cutPath] : [zp, basinsPath];
  const names = cutPath ? 'atom_src,basins8_zone,cut' : 'atom_src,basins8_zone';
  ms('-i', ...layers, 'combine-files', 'snap', '-union', `target=${names}`, '-filter', 'zi != null', 'remove-empty', '-explode', '-o', outp);
  const atoms0 = JSON.parse(fs.readFileSync(outp, 'utf8')).features;
  // atomi enormi (i bacini "costieri" di HydroBASINS raggruppano decine di piccoli torrenti lungo la costa):
  // si dividono in pezzi di ~2.000 km² con un k-means di punti interni e celle di Voronoi
  const atoms = [];
  let cut = 0;
  for (const a of atoms0) {
    const A = turf.area(a) / 1e6;
    // solo nei paesi rifatti da questa fase in poi: le province già approvate non cambiano
    if (A < 3500 || !SPLIT_BIG.has(a.properties.modern)) { atoms.push(a); continue; }
    // nel deserto bastano pezzi grandi: le province lì saranno enormi
    const piece = AFRICA_MODERN.has(a.properties.modern) && turf.centroid(a).geometry.coordinates[1] < 31.5 ? 12000 : 2000;
    if (A < piece * 1.75) { atoms.push(a); continue; }
    const parts = splitKMeans(a, A, piece);
    if (!parts) { atoms.push(a); continue; }
    atoms.push(...parts);
    cut++;
  }
  if (cut) log(`${cut} atomi troppo grandi divisi in pezzi compatti`);
  // fiumi maggiori come linee di taglio (Balcani, Portogallo): una fascia sottile lungo il fiume separa le due rive
  if (riverPath) {
    const sel = [], keep = [];
    for (const a of atoms) (riverModern.has(a.properties.modern) && !String(a.properties.reg || '').startsWith('H:') ? sel : keep).push(a);
    const sp = path.join(TMP, 'riv_src.geojson');
    fs.writeFileSync(sp, JSON.stringify(turf.featureCollection(sel.map((f, i) => ({ ...f, properties: { ...f.properties, ri: i } })))));
    const ro = path.join(TMP, 'riv_out.geojson');
    ms('-i', sp, riverPath, 'combine-files', 'snap', '-union', 'target=riv_src,strips', '-filter', 'ri != null', 'remove-empty', '-explode', '-o', ro);
    const parts = JSON.parse(fs.readFileSync(ro, 'utf8')).features.map((f) => { const { ri, riv, ...pr } = f.properties; return { type: 'Feature', geometry: f.geometry, properties: { ...sel[ri].properties, ...pr } }; });
    atoms.length = 0;
    atoms.push(...keep, ...parts);
    log(`fiumi maggiori: ${sel.length} atomi tagliati in ${parts.length} pezzi`);
  }
  const count = new Map();
  const out = [...rest];
  // uezd enormi fuori dai riquadri: il primo pezzo resta al suo posto, gli altri in coda (l'ordine degli altri atomi
  // non cambia, così il raggruppamento delle aree già approvate resta identico)
  const tail = [];
  let eastCut = 0;
  out.forEach((f, idx) => {
    if (!bigEast(f)) return;
    const parts = splitKMeans(f, turf.area(f) / 1e6, 15000);
    if (!parts) return;
    parts.forEach((g, k) => { const pr = { ...f.properties, pid: `${f.properties.pid}~e${k + 1}` }; if (k === 0) out[idx] = { ...g, properties: pr }; else tail.push({ ...g, properties: pr }); });
    eastCut++;
  });
  if (eastCut) log(`${eastCut} distretti russi enormi divisi in pezzi`);
  for (const a of atoms) {
    const base = zone[a.properties.zi].properties;
    const k = (count.get(base.pid) || 0) + 1;
    count.set(base.pid, k);
    const { zi, b8, cutSide, ...props } = a.properties;
    if (cutSide) props.rhineW = true;
    const np = { ...base, ...props, pid: `${base.pid}~a${k}` };
    // unità d'epoca: paese moderno e codice dell'atomo, non del capoluogo del distretto (Cattaro non è Bosnia)
    if (np.own && modernLayer) {
      let pt; try { pt = turf.pointOnFeature(a).geometry.coordinates; } catch { pt = null; }
      const m = pt && modernLayer.find((f) => { const bb = f.bb || (f.bb = turf.bbox(f)); return pt[0] >= bb[0] && pt[0] <= bb[2] && pt[1] >= bb[1] && pt[1] <= bb[3] && turf.booleanPointInPolygon(pt, f); });
      if (m) { np.modern = m.properties.modern; np.iso = m.properties.iso; np.nreg = m.properties.reg ?? null; }
    }
    out.push({ type: 'Feature', geometry: a.geometry, properties: np });
  }
  log(`${zone.length} province della zona italiana tagliate in ${atoms.length} atomi (bacini HydroBASINS liv. 8)`);
  out.push(...tail);
  return turf.featureCollection(out);
}

/** Distanza (km) dalla costa più vicina: archi della topologia usati da un solo pezzo. */
export function coastDistance(topo, geoms, bbox = ZONE_BBOX) {
  const tf = topo.transform;
  const use = new Uint16Array(topo.arcs.length);
  geoms.forEach((g) => { const rec = (a) => (typeof a === 'number' ? use[a < 0 ? ~a : a]++ : a.forEach(rec)); rec(g.arcs); });
  const CELL = 0.25, grid = new Map();
  topo.arcs.forEach((arc, ai) => {
    if (use[ai] !== 1) return;
    let x = 0, y = 0;
    for (const [dx, dy] of arc) {
      x += dx; y += dy;
      const pt = tf ? [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]] : [dx, dy];
      if (pt[0] < bbox[0] || pt[0] > bbox[2] || pt[1] < bbox[1] || pt[1] > bbox[3]) continue;
      if (Math.abs(pt[0] - bbox[0]) < 0.01 || Math.abs(pt[0] - bbox[2]) < 0.01 || Math.abs(pt[1] - bbox[1]) < 0.01 || Math.abs(pt[1] - bbox[3]) < 0.01) continue;
      const key = `${Math.floor(pt[0] / CELL)},${Math.floor(pt[1] / CELL)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(pt);
    }
  });
  return ([lon, lat]) => {
    const gx = Math.floor(lon / CELL), gy = Math.floor(lat / CELL);
    let best = Infinity;
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (const pt of grid.get(`${gx + dx},${gy + dy}`) || []) best = Math.min(best, turf.distance([lon, lat], pt));
    return best;
  };
}

/** Contea di Nizza (ceduta nel 1860): a est del Var. */
const VAR = [[43.66, 7.195], [43.75, 7.19], [43.85, 7.17], [43.9, 7.05], [43.93, 6.95], [43.96, 6.86], [44.05, 6.83], [44.2, 6.9], [44.5, 6.9]];
export function eastOfVar([lon, lat]) {
  for (let i = 1; i < VAR.length; i++) {
    const [la0, lo0] = VAR[i - 1], [la1, lo1] = VAR[i];
    if (lat <= la1 || i === VAR.length - 1) return lon > lo0 + ((Math.min(Math.max(lat, la0), la1) - la0) / (la1 - la0)) * (lo1 - lo0);
  }
  return false;
}

/** Perimetri e confini condivisi (km) dei pezzi di una topologia. */
export function topoMetrics(topo, geoms, riverNear = null) {
  const tf = topo.transform;
  const onRiver = topo.arcs.map(() => 0);
  const len = topo.arcs.map((arc, ai) => {
    let x = 0, y = 0, prev = null, L = 0, R = 0;
    for (const [dx, dy] of arc) {
      x += dx; y += dy;
      const pt = tf ? [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]] : [dx, dy];
      if (prev) { const d = turf.distance(prev, pt); L += d; if (riverNear && riverNear((prev[0] + pt[0]) / 2, (prev[1] + pt[1]) / 2)) R += d; }
      prev = pt;
    }
    onRiver[ai] = R;
    return L;
  });
  const use = topo.arcs.map(() => []);
  geoms.forEach((g, k) => { const rec = (a) => (typeof a === 'number' ? use[a < 0 ? ~a : a].push(k) : a.forEach(rec)); rec(g.arcs); });
  const perim = new Float64Array(geoms.length);
  const shared = geoms.map(() => new Map());
  const sharedRiver = geoms.map(() => new Map());
  use.forEach((u, ai) => {
    for (const k of u) perim[k] += len[ai];
    if (u.length === 2 && u[0] !== u[1]) {
      shared[u[0]].set(u[1], (shared[u[0]].get(u[1]) || 0) + len[ai]);
      shared[u[1]].set(u[0], (shared[u[1]].get(u[0]) || 0) + len[ai]);
      if (onRiver[ai]) {
        sharedRiver[u[0]].set(u[1], (sharedRiver[u[0]].get(u[1]) || 0) + onRiver[ai]);
        sharedRiver[u[1]].set(u[0], (sharedRiver[u[1]].get(u[0]) || 0) + onRiver[ai]);
      }
    }
  });
  return { perim, shared, sharedRiver };
}

/**
 * Raggruppa gli atomi della zona in province compatte.
 * @param atoms indici dei pezzi della zona
 * @param P pezzi ({area, owner, …}); key(p) vincolo rigido; soft(p) regione (vincolo morbido)
 * @returns array di gruppi (array di indici di pezzi)
 */
export function compactClusters(atoms, P, metrics, { key, soft, min, target, max, maxSpan = 190, tiny = 500, keepSmall = () => false, looseKey = (p) => p.owner, stripOwners = new Set(), sizeScale = () => 1, soft2 = () => '', softPenalty = () => 0.55, riverOwners = new Set(), aspectStrip = () => false, leftoverOwners = new Set(), log }) {
  const { perim, shared, sharedRiver } = metrics;
  const inSet = new Set(atoms);
  const cl = new Map(); // id -> {ids:Set, A, Pm, nb: Map<clusterId, len>, key}
  const of = new Map();
  for (const i of atoms) {
    const nb = new Map(), nbR = new Map();
    for (const [j, l] of shared[i]) if (inSet.has(j)) nb.set(j, l);
    for (const [j, l] of sharedRiver?.[i] ?? []) if (inSet.has(j)) nbR.set(j, l);
    cl.set(i, { ids: new Set([i]), A: P[i].area, Pm: perim[i], nb, nbR, key: key(P[i]), soft: new Map([[soft(P[i]), P[i].area]]), soft2: new Map([[soft2(P[i]), P[i].area]]), bb: turf.bbox(P[i].feat), f: sizeScale(P[i]) });
    of.set(i, i);
  }
  const pp = (A, Pm) => (Pm > 0 ? (4 * Math.PI * A) / (Pm * Pm) : 0);
  // estensione massima: niente strisce lunghe anche dove la geografia le favorisce (coste, valli)
  const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  const span = (bb) => turf.distance([bb[0], bb[1]], [bb[2], bb[3]]);
  const softOf = (c) => [...c.soft.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const soft2Of = (c) => [...c.soft2.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const mergeInto = (a, b) => { // b dentro a
    const A = cl.get(a), B = cl.get(b);
    const bl = A.nb.get(b) || 0;
    A.Pm = A.Pm + B.Pm - 2 * bl;
    A.A += B.A;
    A.bb = union(A.bb, B.bb);
    for (const i of B.ids) { A.ids.add(i); of.set(i, a); }
    for (const [s, v] of B.soft) A.soft.set(s, (A.soft.get(s) || 0) + v);
    for (const [s, v] of B.soft2) A.soft2.set(s, (A.soft2.get(s) || 0) + v);
    A.nb.delete(b);
    A.nbR.delete(b);
    for (const [c, l] of B.nbR) {
      if (c === a) continue;
      A.nbR.set(c, (A.nbR.get(c) || 0) + l);
      const C = cl.get(c);
      C.nbR.set(a, (C.nbR.get(a) || 0) + l);
      C.nbR.delete(b);
    }
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
    for (const [id, c] of cl) if (c.A < min * c.f && !c.stuck && (!small || c.A < cl.get(small).A)) small = id;
    if (small === null) break;
    const S = cl.get(small);
    let best = null, bs = -1;
    // limiti della più piccola delle due scale: un atomo del deserto non gonfia una provincia abitata (e viceversa);
    // se così non c'è nessun vicino possibile (un'oasi chiusa fra province desertiche), vale la scala più grande
    for (const relaxed of [false, true]) {
    if (best !== null) break;
    for (const [o, l] of S.nb) {
      const O = cl.get(o);
      if (relaxed && S.f === O.f) continue;
      const f = relaxed ? Math.max(S.f, O.f) : Math.min(S.f, O.f);
      if (O.key !== S.key || O.A + S.A > max * f || span(union(O.bb, S.bb)) > maxSpan * Math.sqrt(f)) continue;
      const A = O.A + S.A, Pm = O.Pm + S.Pm - 2 * l;
      let sc = pp(A, Pm);
      if (softOf(O) !== softOf(S)) sc *= softPenalty(P[small]);
      // seconda linea morbida (paese moderno, nei Balcani) e fiumi maggiori come confini naturali
      if (soft2Of(O) !== soft2Of(S)) sc *= 0.7;
      const rl = riverOwners.has(P[small].owner) ? S.nbR.get(o) || 0 : 0;
      if (rl) sc *= 1 - 0.75 * Math.min(1, rl / l);
      // dove non c'è già una mappa approvata, conta anche l'estensione: niente strisce lungo coste e valli
      if (stripOwners.has(P[small].owner)) { const bb = union(O.bb, S.bb); sc *= Math.min(1, A / Math.max(1, span(bb) ** 2) / 0.3); }
      // a parità di forma, meglio completare una provincia ancora piccola
      sc *= 1 + 0.25 * Math.max(0, 1 - O.A / (target * S.f));
      if (sc > bs) { bs = sc; best = o; }
    }
    }
    if (best === null) { S.stuck = true; continue; }
    mergeInto(best, small);
  }

  // frammenti rimasti minuscoli (schegge lungo confini moderni): al vicino dello stesso stato,
  // salvo i territori che devono restare a sé (Trieste, microstati)
  for (const [id, c] of [...cl]) {
    if (!cl.has(id) || c.A >= tiny || keepSmall(P[id])) continue;
    const lk = looseKey(P[id]);
    const best = [...c.nb.entries()].filter(([o]) => { const q = P[[...cl.get(o).ids][0]]; return looseKey(q) === lk && !keepSmall(q); }).sort((a, b) => b[1] - a[1])[0];
    if (best) mergeInto(best[0], id);
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
        if (Y.key !== X.key || Y.A + P[i].area > max * Y.f || X.A - P[i].area < min * 0.8 * X.f || span(union(Y.bb, turf.bbox(P[i].feat))) > maxSpan * Math.sqrt(Y.f)) continue;
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
  // fase 3: le province rimaste a striscia (compattezza < 0.16) si fondono col vicino che ne migliora la forma,
  // anche oltre il limite di dimensione (fino a +35%)
  const clusterNb = (cid) => { const m = new Map(); for (const i of cl.get(cid).ids) for (const [j, l] of shared[i]) { const o = of.get(j); if (o !== undefined && o !== cid) m.set(o, (m.get(o) || 0) + l); } return m; };
  let strips = 0;
  const ac = new Map();
  const acent = (i) => { if (!ac.has(i)) ac.set(i, turf.centroid(P[i].feat).geometry.coordinates); return ac.get(i); };
  const connected = (ids) => {
    const set = new Set(ids); const seen = new Set([ids[0]]); const st = [ids[0]];
    while (st.length) { const x = st.pop(); for (const [j] of shared[x]) if (set.has(j) && !seen.has(j)) { seen.add(j); st.push(j); } }
    return seen.size === set.size;
  };
  const stats = (ids) => {
    let A = 0, Pm = 0, bb = null; const set = new Set(ids);
    for (const i of ids) { A += P[i].area; Pm += perim[i]; for (const [j, l] of shared[i]) if (set.has(j)) Pm -= l; const b = turf.bbox(P[i].feat); bb = bb ? union(bb, b) : b; }
    return { A, Pm, bb };
  };
  // riempimento: area / diagonale² (le coste frastagliate non contano); dove le province sono enormi (deserto)
  // conta il lato più lungo, così anche un rettangolo 1:4 è una striscia
  const maxSide = (bb) => Math.max(turf.distance([bb[0], (bb[1] + bb[3]) / 2], [bb[2], (bb[1] + bb[3]) / 2]), turf.distance([(bb[0] + bb[2]) / 2, bb[1]], [(bb[0] + bb[2]) / 2, bb[3]]));
  const strictOf = (c) => aspectStrip(P[[...c.ids][0]]);
  const fillv = (A, bb, strict) => (strict ? A / Math.max(1, maxSide(bb) ** 2) : A / Math.max(1, span(bb) ** 2));
  const limit = (strict) => (strict ? 0.3 : 0.12);
  // striscia + vicino: atomi proiettati sull'asse dei due atomi più lontani, taglio alla mediana dell'area
  const resplit = (id, nbm) => {
    const c = cl.get(id);
    const st = strictOf(c);
    for (const [o] of [...nbm.entries()].sort((a, b) => b[1] - a[1])) {
      const O = cl.get(o);
      if (O.key !== c.key || keepSmall(P[[...O.ids][0]])) continue;
      const U = [...c.ids, ...O.ids];
      let a = U[0], b = U[0], bd = -1;
      for (const i of U) { const d = turf.distance(acent(U[0]), acent(i)); if (d > bd) { bd = d; a = i; } }
      bd = -1;
      for (const i of U) { const d = turf.distance(acent(a), acent(i)); if (d > bd) { bd = d; b = i; } }
      const [ax, ay] = acent(a), [bx, by] = acent(b);
      const proj = (i) => { const [x, y] = acent(i); return (x - ax) * (bx - ax) + (y - ay) * (by - ay); };
      const sorted = U.slice().sort((p1, p2) => proj(p1) - proj(p2));
      const total = U.reduce((t, i) => t + P[i].area, 0);
      let acc = 0, k = 0;
      while (k < sorted.length && acc + P[sorted[k]].area <= total / 2) acc += P[sorted[k++]].area;
      const g1 = sorted.slice(0, Math.max(1, k)), g2 = sorted.slice(Math.max(1, k));
      if (!g2.length || !connected(g1) || !connected(g2)) continue;
      const s1 = stats(g1), s2 = stats(g2);
      if (s1.A < min * 0.8 * c.f || s2.A < min * 0.8 * c.f) continue;
      const f1 = fillv(s1.A, s1.bb, st), f2 = fillv(s2.A, s2.bb, st);
      const before = Math.min(fillv(c.A, c.bb, st), fillv(O.A, O.bb, st));
      if (Math.min(f1, f2) <= before + 0.03) continue;
      c.ids = new Set(g1); c.A = s1.A; c.Pm = s1.Pm; c.bb = s1.bb;
      O.ids = new Set(g2); O.A = s2.A; O.Pm = s2.Pm; O.bb = s2.bb;
      for (const i of g1) of.set(i, id);
      for (const i of g2) of.set(i, o);
      return true;
    }
    return false;
  };
  for (let pass = 0; pass < 3; pass++) {
    const fill = (c) => fillv(c.A, c.bb, strictOf(c));
    const bad = [...cl.entries()].filter(([, c]) => c.ids.size && fill(c) < limit(strictOf(c))).sort((a, b) => fill(a[1]) - fill(b[1]));
    for (const [id] of bad) {
      if (!cl.has(id)) continue;
      const c = cl.get(id);
      if (keepSmall(P[[...c.ids][0]])) continue;
      const nbm = clusterNb(id);
      // prima prova: ridividere la striscia e il vicino in due province tagliate di traverso
      if (resplit(id, nbm)) { strips++; continue; }
      let best = null, bs = fill(c);
      for (const [o, l] of nbm) {
        const O = cl.get(o);
        if (O.key !== c.key || O.A + c.A > max * 1.35 * O.f) continue;
        const f2 = fillv(O.A + c.A, union(O.bb, c.bb), strictOf(c));
        if (f2 > bs && f2 >= fill(O) * 0.7 && l > 5) { bs = f2; best = o; }
      }
      if (best === null) continue;
      const O = cl.get(best);
      O.Pm = O.Pm + c.Pm - 2 * nbm.get(best); O.A += c.A; O.bb = union(O.bb, c.bb);
      for (const i of c.ids) { O.ids.add(i); of.set(i, best); }
      cl.delete(id);
      strips++;
    }
  }
  if (strips) log(`${strips} province a striscia fuse col vicino`);
  // avanzi piccoli (un terzo del minimo) rimasti soli perché il vicino era già al massimo: al vicino dello stesso
  // gruppo con il confine più lungo, oltre il limite (strisce di costa di un distretto enorme, come a Kola)
  let left = 0;
  for (const [id, c] of [...cl]) {
    if (!cl.has(id) || c.A >= min * c.f * 0.35 || keepSmall(P[[...c.ids][0]]) || !leftoverOwners.has(P[[...c.ids][0]].owner)) continue;
    const best = [...clusterNb(id).entries()].filter(([o]) => cl.get(o).key === c.key).sort((a, b) => b[1] - a[1])[0];
    if (!best) continue;
    const O = cl.get(best[0]);
    O.Pm = O.Pm + c.Pm - 2 * best[1]; O.A += c.A; O.bb = union(O.bb, c.bb);
    for (const i of c.ids) { O.ids.add(i); of.set(i, best[0]); }
    cl.delete(id);
    left++;
  }
  if (left) log(`${left} avanzi piccoli uniti al vicino`);
  // enclavi: una provincia chiusa dentro un'altra dello stesso gruppo (nessuna costa, un solo vicino) le si unisce
  let encl = 0;
  for (const [id, c] of [...cl]) {
    if (!cl.has(id) || keepSmall(P[[...c.ids][0]])) continue;
    const nbm = clusterNb(id);
    if (nbm.size !== 1) continue;
    const [[o, l]] = [...nbm];
    const O = cl.get(o);
    if (O.key !== c.key || l < 0.9 * c.Pm) continue;
    O.Pm = O.Pm + c.Pm - 2 * l; O.A += c.A; O.bb = union(O.bb, c.bb);
    for (const i of c.ids) { O.ids.add(i); of.set(i, o); }
    cl.delete(id);
    encl++;
  }
  if (encl) log(`${encl} enclavi unite alla provincia che le circonda`);

  const groups = [...cl.values()].map((c) => [...c.ids]);
  const ppv = [...cl.values()].filter((c) => c.ids.size).map((c) => pp(c.A, c.Pm)).sort((a, b) => a - b);
  log(`zona italiana: ${atoms.length} atomi -> ${groups.length} province compatte (${moves} spostamenti di bordo; compattezza mediana ${ppv[ppv.length >> 1]?.toFixed(2)}, peggiore ${ppv[0]?.toFixed(2)})`);
  return groups;
}
