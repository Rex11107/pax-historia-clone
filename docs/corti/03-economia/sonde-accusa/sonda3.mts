// Sonda 3: occupare contro possedere fuori d'Europa (Giappone e Impero Qing); bilancio di partenza della Cina
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { budget } from '/home/claude/pax-historia-clone/src/engine/economy';
import { declareWar } from '/home/claude/pax-historia-clone/src/engine/diplomacy';

const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR');
const s = w.state;
console.log('CHI partenza', JSON.stringify(budget(w, 'CHI')), 'debito', s.nations.CHI.debt, 'casse', s.nations.CHI.treasury);
const ps = w.map.provinces.filter((x) => s.owner[x.id] === 'CHI' && !x.impassable).sort((a, b) => b.pop - a.pop).slice(0, 3);
const base = budget(w, 'JAP').income;
declareWar(w, 'JAP', 'CHI', '');
for (const p of ps) s.controller[p.id] = 'JAP';
const occ = budget(w, 'JAP').income;
for (const p of ps) s.owner[p.id] = 'JAP';
const own = budget(w, 'JAP').income;
console.log(`D. ${ps.map((p) => `${p.name} ${(p.pop / 1e6).toFixed(1)}M`).join(', ')}: entrate giapponesi base ${base}, occupate ${occ} (+${(occ - base).toFixed(2)}), annesse ${own} (+${(own - base).toFixed(2)})`);
