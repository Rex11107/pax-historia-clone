// Sonda 1 della giuria, corte 07 (pace): riverifica dei capi 3, 4, 5, 6 e due controlli del cartografo.
// Uso: npx tsx docs/corti/07-pace/sonde/giuria1-verifiche.mts
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import * as P from '../../../../src/engine/peace';
import { declareWar } from '../../../../src/engine/diplomacy';
import { ETHNICITIES } from '../../../../src/engine/ethnic';

const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const EU = M.euCount ?? 1375;
const fresh = () => newGame(M, 'SMR', 'giuria07');
const r1 = (v: number) => Math.round(v * 10) / 10;

// capo 3: chi entra in guerra col Regno Unito, e il punteggio contro il solo Regno Unito
{
  const w = fresh(); const s = w.state;
  declareWar(w, 'FRA', 'GBR', 'giuria');
  const war = s.wars.at(-1)!;
  for (const p of w.map.provinces) if (s.owner[p.id] === 'GBR' && p.id < EU) s.controller[p.id] = 'FRA';
  const full = P.warScore(w, war);
  const defs = [...war.defenders];
  war.defenders = ['GBR'];
  const alone = P.warScore(w, war);
  console.log(`capo 3: difensori ${defs.join(',')}; punteggio con loro ${full.att}-${full.def}; contro il solo GBR ${alone.att}-${alone.def}`);
}

// capo 4: una scaramuccia
{
  const w = fresh(); const s = w.state;
  declareWar(w, 'ITA', 'AUH', 'giuria');
  const war = s.wars.at(-1)!;
  war.casualties.AUH = 1000; war.casualties.ITA = 0;
  const a = P.warScore(w, war);
  war.casualties.AUH = 300000; war.casualties.ITA = 0;
  const b = P.warScore(w, war);
  console.log(`capo 4: 1000 perdite austriache contro 0 → ${a.att}-${a.def}; 300.000 contro 0 → ${b.att}-${b.def}; difensori ${war.defenders.join(',')}`);
}

// capo 5: la Cina e altri grandi Stati non 'major'
{
  const w = fresh();
  for (const [from, to] of [['CHI', 'JAP'], ['CHI', 'RUS'], ['CHI', 'GBR'], ['JAP', 'RUS'], ['NED', 'GER'], ['SPA', 'POR']]) {
    const d = P.demandCost(w, { type: 'vassal', from, to, level: 'protettorato' });
    console.log(`capo 5: ${from} protettorato di ${to}: costo ${d.cost}, rifiuto ${d.refusal ?? 'nessuno'}`);
  }
}

// capo 6 + cartografo: liberazioni in cui la conferenza mostra un destinatario e l'applicazione ne usa un altro,
// confine fra province liberate e destinatario applicato, pezzi del perdente staccati dalla capitale, pezzi del nuovo Stato
{
  const w = fresh(); const s = w.state;
  let meaningful = 0, noBorder = 0;
  const lines: string[] = [];
  const comps = (ids: number[]) => { const set = new Set(ids), seen = new Set<number>(); let n = 0; for (const p of ids) { if (seen.has(p)) continue; n++; const q = [p]; seen.add(p); while (q.length) { const u = q.pop()!; for (const e of w.map.adj[u]) if (set.has(e.to) && !seen.has(e.to)) { seen.add(e.to); q.push(e.to); } } } return n; };
  const reach = (tag: string, removed: Set<number>) => { const cap = s.nations[tag].capital; const out = new Set([cap]); const q = [cap]; while (q.length) { const u = q.pop()!; for (const e of w.map.adj[u]) if (!out.has(e.to) && !removed.has(e.to) && s.owner[e.to] === tag) { out.add(e.to); q.push(e.to); } } return out; };
  const geo: string[] = [];
  for (const from of Object.keys(s.nations).filter((t) => s.nations[t].alive)) {
    for (const eth of Object.keys(ETHNICITIES)) {
      const ids = P.provincesOfPeople(w, from, eth);
      if (!ids.length) continue;
      const shown = P.liberationTarget(w, eth, from, ids);
      if (!shown || shown === from) continue;
      const applied = P.liberationTarget(w, eth, from);
      if (applied !== shown) {
        meaningful++;
        const touches = applied && ids.some((p) => w.map.adj[p].some((e) => s.owner[e.to] === applied));
        if (!touches) noBorder++;
        lines.push(`${eth} di ${from}: mostrato ${shown}, applicato ${applied}${touches ? '' : ' (nessun confine)'}`);
      }
      if (['AUH', 'TUR', 'RUS', 'GER', 'GBR'].includes(from)) {
        const removed = new Set(ids);
        const before = reach(from, new Set()), after = reach(from, removed);
        const cut = [...before].filter((p) => !after.has(p) && !removed.has(p));
        const c = comps(ids);
        if (cut.length || c > 1) geo.push(`${eth} di ${from} → ${shown}: ${ids.length} province in ${c} pezzi; il perdente perde il collegamento con ${cut.length} province${cut.length ? ` (${cut.slice(0, 3).map((p) => w.map.provinces[p].name).join(', ')}…)` : ''}; costo se tutte occupate ${P.demandCost(w, { type: 'liberate', from, eth, provinces: ids, to: shown }).cost}`);
      }
    }
  }
  console.log(`capo 6: casi in cui la conferenza mostra un destinatario valido e l'applicazione ne usa un altro: ${meaningful}, di cui senza confine con le province: ${noBorder}`);
  for (const l of lines) console.log('   ' + l);
  console.log(`cartografo: liberazioni da grandi imperi che spezzano il perdente o nascono a pezzi: ${geo.length}`);
  for (const l of geo.slice(0, 14)) console.log('   ' + l);
}
