// Blocco della mappa in tutto il mondo (regola 6 di AGENTS.md).
//
// Il blocco di lock.mjs vale solo nel generatore europeo: rifà le province delle nazioni approvate da una mappa
// di riferimento. Fuori dall'Europa le province nascono da africa.mjs e dai ritocchi, e una rigenerazione può
// spostare forme o padroni lontano dalla zona che si sta toccando senza che nessuno se ne accorga (è successo:
// il Tarim yemenita rinominato da una provincia cinese nuova). Questo controllo confronta la mappa con un
// riferimento compatto di tutte le province (`lock/mondo.json`: nome → area, padrone, deserto, posizione):
//   - fuori dalle zone aperte (`lock/aperte.json`) ogni provincia del riferimento deve esserci, con lo stesso
//     padrone, lo stesso stato di deserto e la stessa area (±1% o ±30 km²);
//   - una provincia nuova fuori dalle zone aperte è un errore;
//   - dentro le zone aperte tutto può cambiare: è il lavoro della pull request.
// Quando la modifica è approvata: `node scripts/map/check-blocco.mjs --aggiorna` riscrive il riferimento dalla mappa
// attuale e svuota le zone aperte.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RIF = path.join(ROOT, 'scripts/map/lock/mondo.json');
const APERTE = path.join(ROOT, 'scripts/map/lock/aperte.json');

const dentro = (zone, [lon, lat]) => zone.find((z) => lon >= z.box[0] && lon <= z.box[2] && lat >= z.box[1] && lat <= z.box[3]);

/** Riferimento compatto della mappa: nome → [area, padrone, deserto (0/1), lon, lat]. */
export function riferimento(M) {
  const province = {};
  for (const p of M.provinces) province[p.name] = [p.area, p.owner, p.impassable ? 1 : 0, p.lonlat[0], p.lonlat[1]];
  return { nota: 'riferimento del blocco mondiale (scripts/map/check-blocco.mjs): non modificare a mano', province };
}

export function checkBlocco(M) {
  if (!fs.existsSync(RIF)) return { issues: [], zone: [], assente: true };
  const rif = JSON.parse(fs.readFileSync(RIF, 'utf8')).province;
  const zone = fs.existsSync(APERTE) ? JSON.parse(fs.readFileSync(APERTE, 'utf8')) : [];
  const issues = [];
  const byName = new Map(M.provinces.map((p) => [p.name, p]));
  for (const [nome, [area, owner, des, lon, lat]] of Object.entries(rif)) {
    if (dentro(zone, [lon, lat])) continue;
    const p = byName.get(nome);
    if (!p) { issues.push({ id: 0, text: `«${nome}» (${lon.toFixed(1)}, ${lat.toFixed(1)}) non c'è più, fuori dalle zone aperte`, ids: [] }); continue; }
    if (dentro(zone, p.lonlat)) continue;
    const diff = [];
    if (p.owner !== owner) diff.push(`padrone ${owner || '-'} → ${p.owner || '-'}`);
    if ((p.impassable ? 1 : 0) !== des) diff.push(des ? 'non è più deserto' : 'è diventata deserto');
    if (Math.abs(p.area - area) > Math.max(30, area * 0.01)) diff.push(`area ${area} → ${p.area} km²`);
    if (diff.length) issues.push({ id: p.id, text: `cambiata fuori dalle zone aperte: ${diff.join(', ')}`, ids: [p.id] });
  }
  for (const p of M.provinces) if (!(p.name in rif) && !dentro(zone, p.lonlat)) issues.push({ id: p.id, text: 'provincia nuova fuori dalle zone aperte', ids: [p.id] });
  return { issues, zone };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/europe1881.json'), 'utf8'));
  if (process.argv.includes('--aggiorna')) {
    fs.writeFileSync(RIF, JSON.stringify(riferimento(M)).replace(/\],"/g, '],\n"'));
    fs.writeFileSync(APERTE, '[]\n');
    console.log(`[blocco] riferimento aggiornato: ${M.provinces.length} province; zone aperte svuotate`);
  } else {
    const r = checkBlocco(M);
    if (r.assente) console.log('[blocco] manca lock/mondo.json');
    console.log(`[blocco] ${r.issues.length} differenze fuori da ${r.zone.length} zone aperte`);
    for (const x of r.issues) console.log(`  ${x.text}${x.ids.length ? ` [${M.provinces[x.ids[0]].name}]` : ''}`);
  }
}
