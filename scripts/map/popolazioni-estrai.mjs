// Salva in scripts/map/ritocchi.geojson (chiave `popolazioni`) le popolazioni della mappa pubblicata che il
// generatore non riproduce: dopo un ritocco a mano le popolazioni di un paese si ripartiscono diversamente, e
// quelle sistemate a mano (oasi unite, deserti) tornerebbero ai valori del generatore.
//
//   node scripts/map/popolazioni-estrai.mjs <generata.json> <pubblicata.json> [soglia=0.01] [paesi-esclusi, es. AUS,CAN]
//
// <generata> è l'uscita di `npm run map` senza la tabella (si ottiene togliendo `popolazioni` dal file),
// <pubblicata> la mappa ritoccata. Entrano le province con lo stesso nome e la stessa area (entro il 2%) la cui
// popolazione differisce più della soglia, esclusi i paesi indicati.
import fs from 'node:fs';

const [fa, fb, soglia = '0.01', esclusi = ''] = process.argv.slice(2);
const no = new Set(esclusi.split(',').filter(Boolean)); // paesi che hanno appena cambiato di proposito (il loro totale si ripartisce da sé)
const A = JSON.parse(fs.readFileSync(fa, 'utf8')), B = JSON.parse(fs.readFileSync(fb, 'utf8'));
const byA = new Map(A.provinces.map((p) => [p.name, p]));
const tab = {};
for (const p of B.provinces) {
  const q = byA.get(p.name);
  if (!q || no.has(p.modern) || Math.abs(q.area - p.area) > 0.02 * Math.max(q.area, 1)) continue;
  if (Math.abs(q.pop - p.pop) > Number(soglia) * Math.max(q.pop, 1)) tab[p.name] = p.pop;
}
const f = 'scripts/map/ritocchi.geojson';
const fc = JSON.parse(fs.readFileSync(f, 'utf8'));
fc.popolazioni = tab;
const { features, ...resto } = fc;
fs.writeFileSync(f, JSON.stringify({ ...resto, features }).replace(/\},\{"type":"Feature"/g, '},\n{"type":"Feature"') + '\n');
console.log(`${Object.keys(tab).length} popolazioni fissate`);
