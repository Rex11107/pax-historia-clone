// Traguardi storici su più semi (corte 00, passo 0 del piano): per ogni seme fa girare il mondo dal 1881 al 1899,
// solo nazioni non giocanti, e scrive quando avvengono le ancore storiche e alcuni segni di salute delle guerre
// coloniali. Serve a misurare il blocco B4 prima e dopo. Circa 3 minuti a seme.
// Uso: npx tsx scripts/sim/traguardi.mts [semi separati da virgola] [--intestazione]
import fs from 'node:fs';
import { newGame } from '../../src/engine/setup';
import { runTurn } from '../../src/engine/turn';
import { subjectOf } from '../../src/engine/vassals';
import { colonial } from '../../src/engine/colonial';
import { formatDate } from '../../src/engine/world';
import { LOCAL_STANCE } from '../../src/scenario/colonial1881';
import type { GameEvent } from '../../src/engine/types';

const seeds = (process.argv[2] ?? 'regnum,a,b,c').split(',');
const M = JSON.parse(fs.readFileSync(new URL('../../public/data/europe1881.json', import.meta.url), 'utf8'));
const END = 6939; // 31 dicembre 1899
const short = (d: number | undefined) => (d === undefined ? 'mai' : formatDate(d).replace(/^\d+ /, ''));

// ancore della corte 00 (principio 3) che il motore rappresenta, con la data storica
const ANCHORS = ['Tunisi (1881)', 'Tel el-Kebir (1882)', 'Khartum (1885)', 'Ancón (1883)', 'Congo (1885)', 'Sudan (1898)', 'Samori (1898)'];
if (process.argv.includes('--intestazione')) {
  console.log(`| seme | ${ANCHORS.join(' | ')} | Tunisi: chi e come | guerre coloniali | stessa coppia entro 3 anni | senza condizioni | protettorati impossibili | anni senza eventi coloniali (max) |`);
  console.log(`|${'---|'.repeat(ANCHORS.length + 7)}`);
}

for (const seed of seeds) {
  const w = newGame(M, 'SMR', seed);
  const s = w.state;
  const at: Record<string, number> = {};
  let tunisHow = '—';
  const colonialDays: number[] = [];
  const colonialWars: { pair: string; day: number }[] = [];
  let unconditional = 0;
  const impossible: string[] = [];
  const pacific = s.wars.find((x) => x.attackers.includes('CHL'));
  const isColonial = (e: GameEvent) => /impresa coloniale/.test(e.text);
  while (s.day < END) {
    const events = runTurn(w).events;
    for (const e of events) {
      if (e.type === 'colonial' || e.type === 'expedition' || isColonial(e)) colonialDays.push(s.day);
      if (e.type === 'war_declared' && isColonial(e)) colonialWars.push({ pair: [...e.nations].slice(0, 2).sort().join('-'), day: s.day });
      if (e.type === 'peace' && /senza condizioni/.test(e.text) && e.nations.some((t) => ['FRA', 'GBR', 'ITA', 'GER', 'POR', 'BEL', 'SPA'].includes(t))) unconditional++;
      if (/Tel el-Kebir/.test(e.text)) at['Tel el-Kebir (1882)'] ??= s.day;
      if (/Cade Khartum/.test(e.text)) at['Khartum (1885)'] ??= s.day;
    }
    const lord = subjectOf(w, 'TUN')?.overlord;
    if (at['Tunisi (1881)'] === undefined && (lord === 'FRA' || lord === 'ITA')) {
      at['Tunisi (1881)'] = s.day;
      tunisHow = `${lord}, ${events.some((e) => e.type === 'colonial' && /Trattato di protettorato/.test(e.text)) ? 'trattato' : events.some((e) => e.type === 'peace') ? 'guerra' : 'altro'}`;
    }
    if (pacific && at['Ancón (1883)'] === undefined && !s.wars.includes(pacific)) at['Ancón (1883)'] = s.day;
    const c = colonial(w);
    if (at['Congo (1885)'] === undefined && c.done['bel-congo'] !== undefined) at['Congo (1885)'] = s.day;
    if (at['Sudan (1898)'] === undefined && (c.done['gbr-sudan'] !== undefined || (s.nations.MAH && !s.nations.MAH.alive && c.egypt.stage >= 3))) at['Sudan (1898)'] = s.day;
    if (at['Samori (1898)'] === undefined && (!s.nations.WAS?.alive || subjectOf(w, 'WAS'))) at['Samori (1898)'] = s.day;
    // protettorati che la storia esclude (corte 00, principio 8)
    for (const [t, st] of Object.entries(LOCAL_STANCE)) {
      const x = subjectOf(w, t), o = x?.overlord;
      if (o && x.level === 'protettorato' && (st.hostile === '*' || st.hostile?.includes(o) || (st.toward && st.toward !== o)) && !impossible.includes(t)) impossible.push(t);
    }
  }
  const repeats = colonialWars.filter((x, i) => colonialWars.some((y, j) => j < i && y.pair === x.pair && x.day - y.day < 3 * 365)).length;
  const days = [0, ...colonialDays, END].sort((a, b) => a - b);
  const gap = Math.max(...days.slice(1).map((d, i) => d - days[i])) / 365;
  console.log(`| ${seed} | ${ANCHORS.map((k) => short(at[k])).join(' | ')} | ${tunisHow} | ${colonialWars.length} | ${repeats} | ${unconditional} | ${impossible.join(', ') || '0'} | ${gap.toFixed(1)} |`);
}
