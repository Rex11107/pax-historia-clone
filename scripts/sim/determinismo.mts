// Prova lunga del determinismo: tre copie della stessa partita di sole nazioni non giocanti (una ricaricata da
// zero a ogni turno) devono restare identiche. tests/determinism.test.ts fa lo stesso su pochi turni con le guerre.
// Uso: npx tsx scripts/sim/determinismo.mts [turni=260] [seme=regnum]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { newGame } from '../../src/engine/setup';
import { runTurn } from '../../src/engine/turn';
import { GameMap } from '../../src/engine/map';

const turns = Number(process.argv[2] ?? 260), seed = process.argv[3] ?? 'regnum';
const M = JSON.parse(fs.readFileSync(new URL('../../public/data/europe1881.json', import.meta.url), 'utf8'));
const hash = (s: unknown) => crypto.createHash('sha1').update(JSON.stringify(s)).digest('hex').slice(0, 12);
const a = newGame(M, 'SMR', seed), b = newGame(M, 'SMR', seed);
let c = newGame(M, 'SMR', seed);
for (let i = 0; i < turns; i++) {
  runTurn(a); runTurn(b); runTurn(c);
  c = { map: new GameMap(M), profiles: c.profiles, state: JSON.parse(JSON.stringify(c.state)) };
  const ha = hash(a.state);
  if (ha !== hash(b.state)) { console.log(`turno ${i + 1}: due partite uguali divergono`); process.exit(1); }
  if (ha !== hash(c.state)) {
    console.log(`turno ${i + 1}: salvare e ricaricare cambia la partita; parti diverse:`);
    for (const k of Object.keys(a.state) as (keyof typeof a.state)[]) if (JSON.stringify(a.state[k]) !== JSON.stringify(c.state[k])) console.log('  ', k);
    process.exit(1);
  }
}
console.log(`${turns} turni identici (rigiocata e ricaricata a ogni turno), impronta finale ${hash(a.state)}`);
