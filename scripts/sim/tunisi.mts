// Misura del passo 1 della corte 00: Tunisi (e Tel el-Kebir) entro la fine del 1882, su venti semi.
// Uso: npx tsx scripts/sim/tunisi.mts [numero di semi] [primo seme]
import fs from 'node:fs';
import { newGame } from '../../src/engine/setup';
import { runTurn } from '../../src/engine/turn';
import { subjectOf } from '../../src/engine/vassals';
import { colonial } from '../../src/engine/colonial';
import { formatDate } from '../../src/engine/world';

const M = JSON.parse(fs.readFileSync(new URL('../../public/data/europe1881.json', import.meta.url), 'utf8'));
const n = Number(process.argv[2] ?? 20);
let tun = 0, egy = 0;
for (let i = 0; i < n; i++) {
  const w = newGame(M, 'SMR', `tunisi-${i + (Number(process.argv[3] ?? 0))}`);
  let t = '', e = '';
  while (w.state.day < 730) {
    runTurn(w);
    const c = colonial(w);
    if (!t && (c.done['fra-tunisia'] !== undefined || c.done['ita-tunisia'] !== undefined || ['FRA', 'ITA'].includes(subjectOf(w, 'TUN')?.overlord ?? ''))) t = `${subjectOf(w, 'TUN')?.overlord ?? (c.done['ita-tunisia'] !== undefined ? 'ITA' : 'FRA')} ${formatDate(w.state.day)}`;
    if (!e && subjectOf(w, 'EGY')?.overlord === 'GBR') e = formatDate(w.state.day);
  }
  if (t) tun++;
  if (e) egy++;
  console.log(`tunisi-${i + Number(process.argv[3] ?? 0)}: Tunisi ${t || 'no'} · Egitto ${e || 'no'}`);
}
console.log(`Tunisi entro il 1882: ${tun}/${n}; Tel el-Kebir entro il 1882: ${egy}/${n}`);
