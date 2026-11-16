// Sonda 2: exploit e composizione delle entrate
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { runTurn } from '/home/claude/pax-historia-clone/src/engine/turn';
import { budget, setPolicy } from '/home/claude/pax-historia-clone/src/engine/economy';
import { startProject, buildingIncome, industryOf } from '/home/claude/pax-historia-clone/src/engine/construction';
import { declareWar } from '/home/claude/pax-historia-clone/src/engine/diplomacy';
import { nationResources } from '/home/claude/pax-historia-clone/src/engine/resources';
import { quote } from '/home/claude/pax-historia-clone/src/engine/trade';

const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));

// A. risorse del Regno Unito: Europa contro resto del mondo
{
  const w = newGame(M, 'SMR');
  const s = w.state; const eu = w.map.data.euCount ?? Infinity;
  const ind = industryOf(w, 'GBR');
  const all = nationResources(w.map, w.map.resources, s.controller, s.owner, 'GBR', ind);
  const ctrlEU = s.controller.map((c, i) => (i < eu ? c : ''));
  const euOnly = nationResources(w.map, w.map.resources, ctrlEU, s.owner, 'GBR', ind);
  console.log('A. GBR risorse totali', all.income, 'di cui Europa', euOnly.income, 'euCount', eu);
}

// B. rendimento delle opere: Italia giocatore, campi e tessile nella provincia più popolosa
{
  const w = newGame(M, 'ITA');
  const s = w.state;
  const own = w.map.provinces.filter((p) => s.owner[p.id] === 'ITA' && !p.impassable).sort((a, b) => b.pop - a.pop);
  const out: string[] = [];
  for (const k of ['agricoltura', 'tessile', 'siderurgia', 'chimica'] as const) {
    for (const p of own.slice(0, 6)) {
      const w2 = newGame(M, 'ITA');
      w2.state.nations.ITA.treasury = 1000;
      const before = buildingIncome(w2, 'ITA');
      const t0 = w2.state.nations.ITA.treasury;
      if (startProject(w2, 'ITA', p.id, k) !== null) continue;
      const cost = t0 - w2.state.nations.ITA.treasury;
      // completa subito il cantiere
      const pr = (w2.state as any).projects ?? (w2.state as any).construction;
      for (let i = 0; i < 30; i++) { runTurn(w2); if (buildingIncome(w2, 'ITA') > before + 0.001) break; }
      const gain = buildingIncome(w2, 'ITA') - before;
      out.push(`${k} a ${p.name} (${(p.pop / 1e6).toFixed(2)} M ab.): costo ${cost.toFixed(1)} M, +${gain.toFixed(3)} M/sett. = ${(gain * 52 / cost * 100).toFixed(0)}% l'anno`);
      break;
    }
  }
  console.log('B.', out.join('\n   '));
}

// C. debito senza fondo: Italia giocatore, mobilitazione generale e imposte basse per 2 anni
{
  const w = newGame(M, 'ITA');
  const s = w.state;
  setPolicy(w, 'ITA', 'mobilization', 'full'); setPolicy(w, 'ITA', 'tax', 'low'); setPolicy(w, 'ITA', 'infrastructure', 'heavy');
  const t0 = performance.now();
  for (let i = 0; i < 104; i++) {
    runTurn(w);
    if (i % 26 === 25) { const n = s.nations.ITA; console.log(`C. sett. ${i + 1}: casse ${n.treasury.toFixed(0)} debito ${n.debt.toFixed(0)} interessi/sett ${n.lastBudget!.interest} saldo ${n.lastBudget!.net} stabilità ${n.stability.toFixed(1)} rete ${n.rail.toFixed(1)}`); }
    if (performance.now() - t0 > 60000) break;
  }
}

// D. occupare contro possedere fuori d'Europa: Giappone e una provincia cinese popolosa
{
  const w = newGame(M, 'SMR');
  const s = w.state;
  const p = w.map.provinces.filter((x) => s.owner[x.id] === 'CHN' && !x.impassable).sort((a, b) => b.pop - a.pop)[0];
  const base = budget(w, 'JAP').income;
  declareWar(w, 'JAP', 'CHN', '');
  s.controller[p.id] = 'JAP';
  const occ = budget(w, 'JAP').income;
  s.owner[p.id] = 'JAP';
  const own = budget(w, 'JAP').income;
  console.log(`D. ${p.name} (${(p.pop / 1e6).toFixed(1)} M ab.): entrate giapponesi base ${base}, occupata ${occ} (+${(occ - base).toFixed(2)}), annessa ${own} (+${(own - base).toFixed(2)})`);
}

// E. commercio: valore per il compratore di 5 lotti di carbone a un paese che non ne ha
{
  const w = newGame(M, 'SMR');
  const q = quote(w, 'GBR', 'ITA', 'carbone', 5);
  const q1 = quote(w, 'GBR', 'ITA', 'carbone', 1);
  console.log('E. carbone GBR->ITA 1 lotto: prezzo', q1.total, 'valore', q1.buyerValue, '| 5 lotti: prezzo', q.total, 'valore', q.buyerValue, 'rifiuto', q.refusal);
}
