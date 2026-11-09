// Ritocchi a mano sopravvissuti alla rigenerazione della mappa.
//
// Le correzioni fatte direttamente su public/data/europe1881.json (oasi assorbite, confini ridisegnati,
// deserti dichiarati) andrebbero perse al primo `npm run map`. ritocchi-estrai.mjs le salva in
// scripts/map/ritocchi.geojson confrontando la mappa ritoccata con quella generata; qui build-map le
// riapplica prima del dissolve finale:
//
//   - un poligono assegna alla provincia che porta quel nome tutta la terra che copre: ogni pezzo delle
//     province generate viene tagliato sul poligono, e la parte dentro passa a lei (il mare resta mare,
//     perché si tagliano solo le terre già esistenti);
//   - la provincia di destinazione è il gruppo generato che il poligono copre di più; se due poligoni
//     vogliono lo stesso gruppo (una provincia divisa in due a mano) il secondo ne diventa una copia;
//   - una provincia generata ridotta a meno del 20% della sua terra (assorbita a mano, come il Tafilalt
//     nel Ksar es-Souk) sparisce: i ritagli rimasti vanno alla provincia ritoccata più vicina;
//   - un punto applica solo le proprietà (deserto, padrone, oasi) alla provincia che lo contiene;
//   - il nome del ritocco è definitivo (come quello delle province della mappa bloccata).
import fs from 'node:fs';
import * as turf from '@turf/turf';

const km2 = (f) => (f && f.geometry ? turf.area(f) / 1e6 : 0);
const boxHit = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const pieno = (f) => f && f.geometry && km2(f) > 0.01;

export function applicaRitocchi(feats, gInfo, file, log = () => {}) {
  if (!fs.existsSync(file)) return feats;
  const fc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const forme = fc.features.filter((f) => f.geometry && f.geometry.type !== 'Point');
  const punti = fc.features.filter((f) => f.geometry && f.geometry.type === 'Point');
  let list = feats.map((f) => ({ f, bb: turf.bbox(f) }));

  // terra iniziale di ogni gruppo toccato
  const areaPrima = new Map();
  const tocca = (r) => list.filter((x) => boxHit(x.bb, r.bb));
  const formeBB = forme.map((f) => ({ f, bb: turf.bbox(f), name: f.properties.name }));
  for (const r of formeBB) for (const x of tocca(r)) { const g = x.f.properties.g; if (!areaPrima.has(g)) areaPrima.set(g, 0); }
  for (const x of list) if (areaPrima.has(x.f.properties.g)) areaPrima.set(x.f.properties.g, areaPrima.get(x.f.properties.g) + km2(x.f));

  // destinazione: il gruppo più coperto
  const sovr = formeBB.map((r) => {
    const m = new Map();
    for (const x of tocca(r)) { const i = turf.intersect(turf.featureCollection([x.f, r.f])); if (pieno(i)) m.set(x.f.properties.g, (m.get(x.f.properties.g) || 0) + km2(i)); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  });
  const presi = new Set();
  const ordine = formeBB.map((r, k) => k).sort((a, b) => (sovr[b][0]?.[1] || 0) - (sovr[a][0]?.[1] || 0));
  for (const k of ordine) {
    const r = formeBB[k], best = sovr[k][0];
    if (!best) { log(`ritocco ${r.name}: nessuna terra sotto il poligono, saltato`); r.g = null; continue; }
    if (!presi.has(best[0])) { r.g = best[0]; presi.add(best[0]); continue; }
    r.g = gInfo.length;
    gInfo.push({ ...gInfo[best[0]], byNameList: undefined, byTown: false });
  }

  // taglio: la terra dentro il poligono passa alla provincia ritoccata
  const spostata = new Map(); // gruppo di partenza -> [gruppo di arrivo, km²]
  for (const r of formeBB) {
    if (r.g == null) continue;
    const next = [];
    for (const x of list) {
      if (x.f.properties.g === r.g || !boxHit(x.bb, r.bb)) { next.push(x); continue; }
      const dentro = turf.intersect(turf.featureCollection([x.f, r.f]));
      if (!pieno(dentro)) { next.push(x); continue; }
      const fuori = turf.difference(turf.featureCollection([x.f, r.f]));
      const from = x.f.properties.g;
      if (!spostata.has(from)) spostata.set(from, []);
      spostata.get(from).push([r.g, km2(dentro)]);
      next.push({ f: { type: 'Feature', geometry: dentro.geometry, properties: { ...x.f.properties, g: r.g } }, bb: turf.bbox(dentro) });
      if (pieno(fuori)) next.push({ f: { type: 'Feature', geometry: fuori.geometry, properties: { ...x.f.properties } }, bb: turf.bbox(fuori) });
    }
    list = next;
  }

  // province generate assorbite: i ritagli vanno al ritocco più vicino
  const areaDopo = new Map();
  for (const x of list) { const g = x.f.properties.g; if (areaPrima.has(g)) areaDopo.set(g, (areaDopo.get(g) || 0) + km2(x.f)); }
  const ritoccati = new Set(formeBB.map((r) => r.g).filter((g) => g != null));
  const sparite = [...areaPrima.keys()].filter((g) => !ritoccati.has(g) && (areaDopo.get(g) || 0) < 0.2 * areaPrima.get(g));
  for (const g of sparite) {
    for (const x of list) {
      if (x.f.properties.g !== g) continue;
      const c = turf.pointOnFeature(x.f);
      let best = null, bd = Infinity;
      for (const r of formeBB) {
        if (r.g == null) continue;
        const polys = r.f.geometry.type === 'Polygon' ? [r.f.geometry.coordinates] : r.f.geometry.coordinates;
        for (const p of polys) { const d = turf.pointToPolygonDistance(c, turf.polygon(p), { units: 'kilometers' }); if (d < bd) { bd = d; best = r; } }
      }
      if (best) { if (!spostata.has(g)) spostata.set(g, []); spostata.get(g).push([best.g, km2(x.f)]); x.f.properties.g = best.g; }
    }
    log(`ritocchi: ${gInfo[g].lockName || gInfo[g].name} assorbita (${Math.round(areaDopo.get(g) || 0)} km² di ritagli su ${Math.round(areaPrima.get(g))})`);
  }

  // peso delle località (province africane): segue la terra spostata
  for (const [from, moves] of spostata) {
    const src = gInfo[from];
    if (!src || !src.gsum || !areaPrima.get(from)) continue;
    let tot = 0;
    for (const [to, a] of moves) { const w = (src.gsum * a) / areaPrima.get(from); gInfo[to].gsum = (gInfo[to].gsum || 0) + w; tot += w; }
    src.gsum = Math.max(0, src.gsum - tot);
  }

  // proprietà e nome definitivo
  const imposta = (info, pr) => {
    info.lockName = pr.name;
    info.owner = pr.owner ?? info.owner;
    info.desert = pr.deserto || null;
    info.oasis = pr.oasi ? info.oasis || pr.name : null;
  };
  for (const r of formeBB) if (r.g != null) imposta(gInfo[r.g], r.f.properties);
  for (const pt of punti) {
    const x = list.find((y) => boxHit(y.bb, [...pt.geometry.coordinates, ...pt.geometry.coordinates]) && turf.booleanPointInPolygon(pt, y.f));
    if (x) imposta(gInfo[x.f.properties.g], pt.properties);
    else log(`ritocco ${pt.properties.name}: punto fuori dalle terre, saltato`);
  }
  // area delle province toccate, dalla terra dopo il taglio
  const nuova = new Map();
  const toccati = new Set([...areaPrima.keys(), ...ritoccati]);
  for (const x of list) { const g = x.f.properties.g; if (toccati.has(g)) nuova.set(g, (nuova.get(g) || 0) + km2(x.f)); }
  for (const [g, a] of nuova) gInfo[g].area = a;
  log(`ritocchi: ${formeBB.length} forme e ${punti.length} proprietà applicate, ${sparite.length} province assorbite`);
  return list.map((x) => x.f);
}
