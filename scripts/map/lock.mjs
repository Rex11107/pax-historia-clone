// Province "bloccate": le aree già approvate dall'utente ripetono esattamente la divisione di una
// mappa precedente. Il raggruppamento compatto è sensibile all'ordine degli atomi, quindi un ritocco
// ai Balcani o al Portogallo rimescolerebbe anche Spagna, Germania o Italia; con il blocco gli atomi
// delle nazioni approvate vanno alla provincia della mappa di riferimento che li contiene.
import fs from 'node:fs';

const LAT0 = (52 * Math.PI) / 180, LON0 = (10 * Math.PI) / 180, R = 6371;
function laea(lon, lat) {
  const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l - LON0)));
  return [R * k * Math.cos(p) * Math.sin(l - LON0), R * k * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l - LON0))];
}

export function loadLock(file) {
  if (!fs.existsSync(file)) return null;
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  const arcs = m.arcs.map((flat) => { const out = []; let x = 0, y = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; out.push([x / 10, y / 10]); } return out; });
  const provs = m.provinces.filter((p) => p.arcs.length).map((p) => {
    const polys = typeof p.arcs[0][0] === 'number' ? [p.arcs] : p.arcs;
    const rings = [];
    for (const poly of polys) for (const ring of poly) {
      const pts = [];
      for (const a of ring) { const arc = arcs[a < 0 ? ~a : a]; const seq = a < 0 ? [...arc].reverse() : arc; for (let i = pts.length ? 1 : 0; i < seq.length; i++) pts.push(seq[i]); }
      rings.push(pts);
    }
    const xs = rings.flat().map((q) => q[0]), ys = rings.flat().map((q) => q[1]);
    return { id: p.id, name: p.name, owner: p.owner, rings, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
  });
  const inside = (pr, x, y) => {
    let c = false;
    for (const ring of pr.rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const byId = new Map(provs.map((p) => [p.id, p]));
  return {
    byId,
    // provincia della mappa di riferimento che contiene il punto (lon, lat); null se nessuna
    locate([lon, lat], owner) {
      const [x, y] = laea(lon, lat);
      for (const pr of provs) {
        if (owner && pr.owner !== owner) continue;
        if (x < pr.bb[0] || x > pr.bb[2] || y < pr.bb[1] || y > pr.bb[3]) continue;
        if (inside(pr, x, y)) return pr;
      }
      return null;
    },
  };
}
