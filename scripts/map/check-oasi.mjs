// Regole delle oasi: le tre regole di Ivan sul rapporto tra oasi, deserto e
// terra di nessuno. Sono relazioni tra province, non vincoli di campo, quindi non
// si possono esprimere con uno schema JSON: servono i poligoni e l'elenco `routes`.
//
//   R-a  un collegamento non puo' attraversare una provincia terra di nessuno
//        senza collegarsi a essa (deve agganciarsi alla piu' vicina)
//   R-b  un'oasi ha al massimo 2 collegamenti verso province che non sono oasi
//   R-c  un'oasi dovrebbe stare dentro il deserto: se ha vicini non deserti va
//        assorbita o allargata a provincia normale con confini naturali.
//        R-c e' un giudizio, quindi resta informativa: non fa fallire il controllo.
//
// Importata da check-map.mjs, cosi' gira con `npm run map:check` e nel workflow Build.

const liberi = (p) => !p.impassable && !p.oasis && !p.owner;

function dentro(pt, anelli) {
  // ray casting sul primo anello, sottraendo i buchi
  if (!anelli.length) return false;
  const test = (poly) => {
    let dentro_ = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > pt[1] !== yj > pt[1]) {
        const xint = ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
        if (pt[0] < xint) dentro_ = !dentro_;
      }
    }
    return dentro_;
  };
  if (!test(anelli[0])) return false;
  for (let k = 1; k < anelli.length; k++) if (test(anelli[k])) return false;
  return true;
}

export function checkOasi(M, arcs, ringPts, polysOf) {
  const P = M.provinces;
  const issues = [];
  const info = [];

  // bbox e anelli per provincia
  const anelli = new Map();
  const box = new Map();
  for (const p of P) {
    if (!p.arcs || !p.arcs.length) continue;
    const rings = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const poly of polysOf(p)) {
      for (const ring of poly) {
        const pts = ringPts(ring);
        if (pts.length < 3) continue;
        rings.push(pts);
        for (const [x, y] of pts) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
    if (rings.length) {
      anelli.set(p.id, rings);
      box.set(p.id, [x0, y0, x1, y1]);
    }
  }

  const chiContiene = (pt) => {
    const out = [];
    for (const [id, b] of box) {
      if (pt[0] < b[0] || pt[0] > b[2] || pt[1] < b[1] || pt[1] > b[3]) continue;
      if (dentro(pt, anelli.get(id))) out.push(id);
    }
    return out;
  };

  // --- R-a: nessun collegamento salta una terra di nessuno ---
  for (const r of M.routes) {
    const pts = [];
    let x = 0, y = 0;
    for (let i = 0; i < r.pts.length; i += 2) {
      x += r.pts[i];
      y += r.pts[i + 1];
      pts.push([x / 10, y / 10]);
    }
    const estremi = new Set([r.a, r.b]);
    const attraversate = new Set();
    for (let k = 0; k < pts.length - 1; k++) {
      for (const t of [0.25, 0.5, 0.75]) {
        const q = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t];
        for (const id of chiContiene(q)) attraversate.add(id);
      }
    }
    const salta = [...attraversate].filter((id) => !estremi.has(id) && liberi(P[id]));
    if (salta.length) {
      issues.push({
        cat: 'oasi', id: r.a,
        text: `collegamento «${r.name}» attraversa ${salta.map((id) => P[id].name).join(', ')} senza agganciarsi`,
        ids: [r.a, r.b, ...salta],
      });
    }
  }

  // --- R-b: massimo 2 collegamenti non-oasi per oasi ---
  const conta = new Map();
  for (const r of M.routes) {
    for (const [a, b] of [[r.a, r.b], [r.b, r.a]]) {
      if (!P[a] || !P[b] || !P[a].oasis || P[b].oasis) continue;
      if (!conta.has(a)) conta.set(a, []);
      conta.get(a).push(b);
    }
  }
  for (const [id, altri] of conta) {
    if (altri.length > 2) {
      issues.push({
        cat: 'oasi', id,
        text: `${altri.length} collegamenti con province non-oasi (max 2): ${altri.map((o) => P[o].name).join(', ')}`,
        ids: [id, ...altri],
      });
    }
  }

  // --- R-c: informativa, oasi senza deserto attorno ---
  for (const p of P) {
    if (!p.oasis || !p.n) continue;
    const fuori = p.n.filter((id) => P[id] && !P[id].impassable);
    if (fuori.length) info.push(`${p.name} (${p.id}): vicini non deserto ${fuori.map((id) => P[id].name).join(', ')}`);
  }

  return { issues, info };
}
