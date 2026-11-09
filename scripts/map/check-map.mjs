// Controllo automatico della mappa finale (public/data/europe1881.json): trova gli errori ricorrenti prima che
// arrivino al giocatore.
//
//   node scripts/map/check-map.mjs [--from=ID] [--png=file.png] [--box=lon0,lat0,lon1,lat1] [--strict]
//
// Controlli:
//   exclave   una provincia con un pezzo di terraferma staccato che tocca altre province (non un'isola)
//   enclave   una provincia chiusa dentro una sola altra provincia, senza costa
//   dentro    una provincia transitabile circondata solo da province di un altro padrone (non di nessuno), senza costa
//   forma     una provincia molto irregolare (area / inviluppo convesso < 0,38) o sfilacciata
//   deserto   un deserto intransitabile con molta costa (le coste del deserto di solito si percorrono)
//   nome      due province con lo stesso nome
// Le eccezioni accettate stanno in scripts/map/check-allow.json ({ "categoria": ["nome provincia", …] }).
// Con --strict esce con errore se ci sono exclavi o enclavi non accettate.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { checkOasi } from './check-oasi.mjs';
import { checkRiferimenti } from './check-riferimenti.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/europe1881.json'), 'utf8'));
const allow = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/map/check-allow.json'), 'utf8')); } catch { return {}; } })();
// --from=eu: dalla prima provincia fuori dal rettangolo europeo
const FROM = args.from === 'eu' ? (M.euCount ?? 1375) : +(args.from ?? 0);

// archi in km (y verso l'alto)
const arcs = M.arcs.map((flat) => { const out = []; let x = 0, y = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; out.push([x / 10, y / 10]); } return out; });
const ringPts = (ring) => { const pts = []; for (const a of ring) { const arc = arcs[a < 0 ? ~a : a]; const seq = a < 0 ? [...arc].reverse() : arc; for (let i = 0; i < seq.length; i++) if (!(pts.length && i === 0)) pts.push(seq[i]); } return pts; };
const polysOf = (p) => (!p.arcs.length ? [] : typeof p.arcs[0][0] === 'number' ? [p.arcs] : p.arcs);
const area = (pts) => { let s = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return Math.abs(s / 2); };
const hull = (pts) => {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
const len = (a) => { let s = 0; const c = arcs[a < 0 ? ~a : a]; for (let i = 1; i < c.length; i++) s += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]); return s; };
const side = (a) => M.arcSides[a < 0 ? ~a : a];
const other = (a, id) => { const [x, y] = side(a); return x === id ? y : x; };

const P = M.provinces;
const okList = (cat, p) => (allow[cat] ?? []).includes(p.name);
const issues = [];
const add = (cat, p, text, ids = [p.id]) => { if (!okList(cat, p)) issues.push({ cat, id: p.id, name: p.name, owner: p.owner, text, ids }); };

for (const p of P) {
  if (p.id < FROM || p.tiny || !p.arcs.length) continue;
  const polys = polysOf(p);
  const parts = polys.map((poly) => {
    const outer = poly[0];
    const nb = new Set();
    let coast = 0, land = 0;
    for (const a of outer) { const o = other(a, p.id); if (o >= 0) { nb.add(o); land += len(a); } else coast += len(a); }
    return { pts: ringPts(outer), area: area(ringPts(outer)), nb, coast, land };
  });
  parts.sort((a, b) => b.area - a.area);
  const total = parts.reduce((s, x) => s + x.area, 0) || 1;
  // exclavi: pezzi non principali che toccano altre province
  for (const x of parts.slice(1)) {
    if (!x.nb.size) continue;
    const share = x.area / total;
    add('exclave', p, `pezzo staccato di ${Math.round(x.area)} km² (${(share * 100).toFixed(1)}%) che tocca ${[...x.nb].map((i) => P[i].name).join(', ')}`, [p.id, ...x.nb]);
  }
  const main = parts[0];
  if (!main) continue;
  // enclavi: una sola provincia attorno, nessuna costa
  const allNb = new Set(parts.flatMap((x) => [...x.nb]));
  const coast = parts.reduce((s, x) => s + x.coast, 0);
  // un'oasi chiusa nel deserto è voluta
  if (allNb.size === 1 && coast < 1 && !P[[...allNb][0]].impassable) add('enclave', p, `chiusa dentro ${P[[...allNb][0]].name}`, [p.id, ...allNb]);
  else if (allNb.size >= 1 && coast < 1) {
    const owners = new Set([...allNb].map((i) => P[i].owner));
    // un regno fra terre di nessuno, o un deserto fra province di un solo padrone (il gioco glielo assegna), non sono errori
    if (owners.size === 1 && !owners.has(p.owner) && !owners.has('') && !p.impassable && ![...allNb].every((i) => P[i].impassable)) add('dentro', p, `circondata solo da ${[...owners][0] || 'terra di nessuno'} (padrone ${p.owner || 'nessuno'})`, [p.id]);
  }
  // forma: area rispetto all'inviluppo convesso del pezzo principale
  if (main.area > 3000) {
    const h = area(hull(main.pts));
    const r = main.area / (h || 1);
    if (r < 0.38) add('forma', p, `forma molto irregolare (riempie il ${Math.round(r * 100)}% del suo inviluppo)`);
  }
  // deserti costieri intransitabili
  if (p.impassable && coast > 250) add('deserto', p, `deserto intransitabile con ${Math.round(coast)} km di costa`);
}
// nomi doppi
const byName = new Map();
for (const p of P) if (p.id >= FROM) byName.set(p.name, [...(byName.get(p.name) ?? []), p]);
for (const [n, list] of byName) if (list.length > 1) add('nome', list[0], `${list.length} province si chiamano «${n}»`, list.map((x) => x.id));

// regole delle oasi (scripts/map/check-oasi.mjs): non filtrate da --from, i collegamenti
// sono globali e una tratta che salta una terra di nessuno resta sbagliata comunque
const oasi = checkOasi(M, arcs, ringPts, polysOf);
for (const x of oasi.issues) add('oasi', P[x.id], x.text, x.ids);

// riferimenti tra province (scripts/map/check-riferimenti.mjs): vicini, stretti e piste
for (const x of checkRiferimenti(M, allow.piste ?? [])) add('rif', P[x.id], x.text, x.ids);

const order = ['exclave', 'enclave', 'deserto', 'forma', 'dentro', 'nome', 'oasi', 'rif'];
const counts = Object.fromEntries(order.map((c) => [c, issues.filter((x) => x.cat === c).length]));
console.log(`[controllo] province da ${FROM}: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
for (const c of order) for (const x of issues.filter((y) => y.cat === c)) console.log(`  ${c.padEnd(8)} ${String(x.id).padStart(5)} ${x.name} [${x.owner || '-'}]: ${x.text}`);
// R-c e' un giudizio ("confini naturali"): la stampo ma non entra nei conteggi
if (oasi.info.length) {
  console.log(`[oasi] ${oasi.info.length} oasi con vicini non deserti (informativo, R-c):`);
  for (const s of oasi.info) console.log(`  ${s}`);
}
// la cartella di lavoro non esiste su un clone pulito: senza questo, map:check si ferma con ENOENT
const reportDir = path.join(ROOT, 'data-raw/tmp');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'check-map.json'), JSON.stringify(issues, null, 1));

// immagine: province segnalate in colore, con il numero
if (args.png) {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const LAT0 = (52 * Math.PI) / 180, LON0 = (10 * Math.PI) / 180, R = 6371;
  const proj = (lon0, lat) => { const lon = lon0 < -168 ? lon0 + 360 : lon0; const q = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180; return [(6371 * lon * Math.PI) / 180, 6371 * 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * q))]; };
  const [lo0, la0, lo1, la1] = String(args.box ?? '-30,-36,62,40').split(',').map(Number);
  const corners = [proj(lo0, la0), proj(lo1, la0), proj(lo0, la1), proj(lo1, la1), proj((lo0 + lo1) / 2, la0), proj((lo0 + lo1) / 2, la1)];
  const x0 = Math.min(...corners.map((c) => c[0])), x1 = Math.max(...corners.map((c) => c[0])), y0 = Math.min(...corners.map((c) => c[1])), y1 = Math.max(...corners.map((c) => c[1]));
  const W = 1800, H = Math.round((W * (y1 - y0)) / (x1 - x0));
  const tx = ([x, y]) => [((x - x0) / (x1 - x0)) * W, ((y1 - y) / (y1 - y0)) * H];
  const col = { exclave: '#e0443c', enclave: '#c03ad0', deserto: '#e09a2c', forma: '#3c8ae0', dentro: '#9ab03c', nome: '#ffffff' };
  const flag = new Map();
  for (const x of issues) if (x.cat !== 'nome') for (const id of x.ids.slice(0, 1)) if (!flag.has(id)) flag.set(id, x.cat);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#9cc3dd">`;
  const labels = [];
  for (const p of P) {
    if (!p.arcs.length) continue;
    const d = polysOf(p).map((poly) => poly.map((ring) => 'M' + ringPts(ring).map((pt) => tx(pt).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('');
    const f = flag.get(p.id);
    svg += `<path d="${d}" fill="${f ? col[f] : p.impassable ? '#f1e6c4' : p.owner ? '#e4ddd0' : '#d0cabd'}" stroke="#666" stroke-width="0.5" fill-rule="evenodd"/>`;
    if (f) { const [lx, ly] = tx(p.c ?? [0, 0]); labels.push(`<text x="${lx.toFixed(0)}" y="${ly.toFixed(0)}" font-size="11" font-family="sans-serif" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${p.id} ${p.name.replace(/&/g, '&amp;')}</text>`); }
  }
  svg += labels.join('') + `<g font-family="sans-serif" font-size="14">${order.filter((c) => c !== 'nome').map((c, i) => `<rect x="10" y="${10 + i * 22}" width="16" height="16" fill="${col[c]}"/><text x="32" y="${23 + i * 22}">${c} (${counts[c]})</text>`).join('')}</g></svg>`;
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: W, height: H } });
  await pg.setContent(`<html><body style="margin:0">${svg}</body></html>`); await pg.screenshot({ path: args.png }); await b.close();
  console.log(`[controllo] immagine: ${args.png}`);
}
if (args.strict && (counts.exclave || counts.enclave)) { console.error('[controllo] exclavi o enclavi non accettate'); process.exit(1); }
// un riferimento sbagliato è sempre un errore (sposta eserciti e rotte sulla provincia sbagliata)
if (counts.rif) { console.error('[controllo] riferimenti tra province incoerenti'); process.exit(1); }
