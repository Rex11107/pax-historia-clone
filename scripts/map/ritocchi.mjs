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
//   - la terra di quel gruppo rimasta fuori dal poligono, se è un pezzo grande (più di 300 km², o di `minResto`
//     del poligono), resta una provincia generata; i pezzi più piccoli restano alla provincia ritoccata;
//   - un punto applica solo le proprietà (deserto, padrone, oasi) alla provincia che lo contiene; con `soloNome`
//     la rinomina soltanto (serve a dare un nome al resto di una provincia da cui un deserto ha preso la terra);
//   - il nome di un poligono è definitivo (come quello delle province della mappa bloccata).
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
  const target = new Set(formeBB.map((r) => r.g).filter((g) => g != null));
  for (const r of formeBB) {
    if (r.g == null) continue;
    const next = [];
    for (const x of list) {
      // i microterritori (Melilla, Ceuta) non si tagliano: il poligono semplificato del vicino li sfiora
      if (x.inR || !boxHit(x.bb, r.bb) || (gInfo[x.f.properties.g]?.prot && x.f.properties.g !== r.g)) { next.push(x); continue; }
      const dentro = turf.intersect(turf.featureCollection([x.f, r.f]));
      if (!pieno(dentro)) { next.push(x); continue; }
      const fuori = turf.difference(turf.featureCollection([x.f, r.f]));
      const from = x.f.properties.g;
      if (from !== r.g) { if (!spostata.has(from)) spostata.set(from, []); spostata.get(from).push([r.g, km2(dentro)]); }
      next.push({ f: { type: 'Feature', geometry: dentro.geometry, properties: { ...x.f.properties, g: r.g } }, bb: turf.bbox(dentro), inR: true });
      if (!pieno(fuori)) continue;
      if (!r.f.properties.minResto) { next.push({ f: { type: 'Feature', geometry: fuori.geometry, properties: { ...x.f.properties } }, bb: turf.bbox(fuori) }); continue; }
      // un atomo grande tagliato da un deserto lascia più pezzi: ognuno viaggia per conto suo, e i frammenti
      // minuscoli (meno di 3000 km²) tra il deserto e il resto passano al deserto
      for (const c of fuori.geometry.type === 'Polygon' ? [fuori.geometry.coordinates] : fuori.geometry.coordinates) {
        const parte = turf.polygon(c);
        const piccolo = km2(parte) < 3000;
        next.push({ f: { type: 'Feature', geometry: parte.geometry, properties: { ...x.f.properties, ...(piccolo ? { g: r.g } : {}) } }, bb: turf.bbox(parte), inR: piccolo });
        if (piccolo && from !== r.g) { if (!spostata.has(from)) spostata.set(from, []); spostata.get(from).push([r.g, km2(parte)]); }
      }
    }
    list = next;
  }
  // la terra di un gruppo di destinazione rimasta fuori dal suo poligono non è della provincia ritoccata:
  // i pezzi grandi diventano una provincia generata a sé, i ritagli lungo il bordo restano dove sono
  for (const g of [...target]) {
    const resto = list.filter((x) => !x.inR && x.f.properties.g === g);
    if (!resto.length) continue;
    const u = resto.length === 1 ? resto[0].f : turf.union(turf.featureCollection(resto.map((x) => x.f)));
    if (!u) continue;
    // soglia sotto la quale il resto resta al deserto: 300 km² (default) o `minResto` del poligono
    const minResto = Math.max(300, ...formeBB.filter((r) => r.g === g).map((r) => r.f.properties.minResto || 0));
    const comps = (u.geometry.type === 'Polygon' ? [u.geometry.coordinates] : u.geometry.coordinates).map((c) => turf.polygon(c)).filter((c) => km2(c) > minResto);
    if (!comps.length) continue;
    const ng = gInfo.length;
    gInfo.push({ ...gInfo[g], lockName: undefined, byNameList: gInfo[g].byNameList, gsum: 0 });
    let moved = 0;
    for (const x of resto) {
      const c = turf.pointOnFeature(x.f);
      if (comps.some((k) => turf.booleanPointInPolygon(c, k))) { x.f.properties.g = ng; moved += km2(x.f); }
    }
    if (!spostata.has(g)) spostata.set(g, []);
    spostata.get(g).push([ng, moved]);
    target.add(ng);
    log(`ritocchi: ${Math.round(moved)} km² di ${gInfo[g].name} fuori dal ritocco restano provincia generata`);
  }

  // province generate assorbite: i ritagli vanno al ritocco più vicino
  const areaDopo = new Map();
  for (const x of list) { const g = x.f.properties.g; if (areaPrima.has(g)) areaDopo.set(g, (areaDopo.get(g) || 0) + km2(x.f)); }
  const ritoccati = target;
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

  // pezzi staccati: un deserto grande (con `minResto`) può spezzare in due una provincia vicina, o lasciare al
  // deserto un ritaglio lontano dal deserto stesso. Per ogni provincia tagliata da questi deserti (comprese quelle
  // nate dai resti) il pezzo più grande resta suo; degli altri, quelli che toccano terra altrui (le isole no):
  // i grandi (più di `minResto`) diventano province generate a sé, i piccoli passano al vicino che toccano di più.
  const forzati = new Set();
  const grandi = formeBB.filter((r) => r.g != null && r.f.properties.minResto);
  if (grandi.length) {
    const soglia = Math.max(...grandi.map((r) => r.f.properties.minResto));
    const zona = grandi.map((r) => [r.bb[0] - 3, r.bb[1] - 3, r.bb[2] + 3, r.bb[3] + 3]);
    const inZona = (x) => zona.some((b) => boxHit(x.bb, b));
    const tagliati = new Set([...spostata.keys(), ...grandi.map((r) => r.g), ...target].filter((g) => list.some((x) => x.f.properties.g === g && inZona(x))));
    // il deserto si legge dai poligoni: le proprietà dei gruppi si impostano più avanti
    const deserto = (g) => !!gInfo[g]?.desert || formeBB.some((r) => r.g === g && r.f.properties.deserto);
    // polyclip a volte fallisce su vertici quasi coincidenti: si riprova a coppie, poi con le coordinate arrotondate
    const tondo = (f) => JSON.parse(JSON.stringify(f, (k, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)));
    const unione = (xs) => {
      if (xs.length === 1) return xs[0].f;
      try { return turf.union(turf.featureCollection(xs.map((x) => x.f))); } catch { /* sotto */ }
      try { return xs.slice(1).reduce((u, x) => turf.union(turf.featureCollection([u, x.f])) ?? u, xs[0].f); } catch { /* sotto */ }
      try { return turf.union(turf.featureCollection(xs.map((x) => tondo(x.f)))); } catch { return null; }
    };
    const sposta = (from, to, a) => { if (!spostata.has(from)) spostata.set(from, []); spostata.get(from).push([to, a]); forzati.add(from); forzati.add(to); };
    // i pezzi multipli (terraferma più isole nello stesso atomo) si separano, così ogni parte può cambiare provincia
    list = list.flatMap((x) => (tagliati.has(x.f.properties.g) && x.f.geometry.type === 'MultiPolygon'
      ? x.f.geometry.coordinates.map((c) => { const f = { type: 'Feature', geometry: { type: 'Polygon', coordinates: c }, properties: { ...x.f.properties } }; return { ...x, f, bb: turf.bbox(f) }; })
      : [x]));
    for (const g of tagliati) {
      const mie = list.filter((x) => x.f.properties.g === g);
      const u = mie.length && unione(mie);
      if (u === null) log(`ritocchi: pezzi staccati di ${gInfo[g].lockName || gInfo[g].name} non verificati (unione fallita)`);
      if (!u || u.geometry.type !== 'MultiPolygon') continue;
      const comps = u.geometry.coordinates.map((c) => turf.polygon(c)).sort((a, b) => km2(b) - km2(a));
      for (const c of comps.slice(1)) {
        const bb = turf.bbox(c), bbL = [bb[0] - 0.05, bb[1] - 0.05, bb[2] + 0.05, bb[3] + 0.05];
        const dentro = mie.filter((x) => boxHit(x.bb, bb) && turf.booleanPointInPolygon(turf.pointOnFeature(x.f), c));
        const contatti = (km, d) => {
          const alone = turf.buffer(c, km, { units: 'kilometers', steps: 2 }), m = new Map();
          for (const y of list) {
            const h = y.f.properties.g;
            if (h === g || !boxHit(y.bb, [bbL[0] - d, bbL[1] - d, bbL[2] + d, bbL[3] + d]) || (km > 2 && deserto(h))) continue;
            const i = turf.intersect(turf.featureCollection([y.f, alone]));
            if (pieno(i)) m.set(h, (m.get(h) || 0) + km2(i));
          }
          return m;
        };
        let contatto = contatti(2, 0);
        // un'isola resta della sua provincia, ma non di un deserto: passa alla terra non desertica più vicina
        if (!contatto.size && deserto(g)) contatto = contatti(80, 1);
        if (!contatto.size) continue;
        const a = km2(c);
        let to;
        const mostra = a >= 1; // le schegge sotto 1 km² passano al vicino senza rumore nel log
        if (a >= soglia && !deserto(g)) {
          to = gInfo.length;
          gInfo.push({ ...gInfo[g], lockName: undefined, gsum: 0 });
          target.add(to);
          log(`ritocchi: pezzo staccato di ${gInfo[g].lockName || gInfo[g].name} (${Math.round(a)} km²) diventa provincia generata`);
        } else {
          to = [...contatto.entries()].sort((p, q) => q[1] - p[1])[0][0];
          if (mostra) log(`ritocchi: pezzo staccato di ${gInfo[g].lockName || gInfo[g].name} (${Math.round(a)} km²) passa a ${gInfo[to].lockName || gInfo[to].name}`);
        }
        for (const x of dentro) x.f.properties.g = to;
        sposta(g, to, a);
      }
    }
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
  const imposta = (info, pr, nome = true) => {
    if (nome) info.lockName = pr.name;
    info.owner = pr.owner ?? info.owner;
    info.desert = pr.deserto || null;
    info.oasis = pr.oasi ? info.oasis || pr.name : null;
  };
  for (const r of formeBB) if (r.g != null) imposta(gInfo[r.g], r.f.properties);
  for (const pt of punti) {
    const x = list.find((y) => boxHit(y.bb, [...pt.geometry.coordinates, ...pt.geometry.coordinates]) && turf.booleanPointInPolygon(pt, y.f));
    if (x && pt.properties.soloNome) gInfo[x.f.properties.g].lockName = pt.properties.name; // rinomina senza toccare le proprietà
    else if (x) imposta(gInfo[x.f.properties.g], pt.properties, false);
    else log(`ritocco ${pt.properties.name}: punto fuori dalle terre, saltato`);
  }
  // area delle province toccate, dalla terra dopo il taglio
  // (le province fissate solo perché stanno attorno ai ritocchi tengono l'area calcolata dal generatore)
  const nuova = new Map();
  const fisse = new Set(formeBB.filter((r) => r.f.properties.zona && r.g != null).map((r) => r.g));
  const cambiata = (g) => areaPrima.has(g) && Math.abs((areaDopo.get(g) || 0) - areaPrima.get(g)) > 0.05 * areaPrima.get(g);
  const toccati = new Set([...areaPrima.keys(), ...ritoccati, ...forzati].filter((g) => (ritoccati.has(g) && !fisse.has(g)) || cambiata(g) || forzati.has(g)));
  for (const x of list) { const g = x.f.properties.g; if (toccati.has(g)) nuova.set(g, (nuova.get(g) || 0) + km2(x.f)); }
  for (const [g, a] of nuova) gInfo[g].area = a;
  log(`ritocchi: ${formeBB.length} forme e ${punti.length} proprietà applicate, ${sparite.length} province assorbite`);
  return list.map((x) => x.f);
}
