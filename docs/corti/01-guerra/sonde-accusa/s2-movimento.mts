// Sonda 2: rifornimenti lontani, tempi di marcia, sbarchi senza flotte, leve, terra di nessuno
import fs from 'node:fs';
const R = '/home/claude/pax-historia-clone/src/engine/';
const { newGame } = await import(R + 'setup.ts');
const { declareWar } = await import(R + 'diplomacy.ts');
const { supplyMap, updateSupply } = await import(R + 'supply.ts');
const { planPath, seaDays } = await import(R + 'orders.ts');
const { seaRoute, seaPassages } = await import(R + 'sea.ts');
const { recruit } = await import(R + 'economy.ts');
const { invalidatePresence, NOBODY } = await import(R + 'world.ts');
const MAP = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const P = MAP.provinces;
const look = (re: RegExp, owner?: string, coast = false) => P.find((p: any) => re.test(p.name) && (!owner || p.owner === owner) && (!coast || p.coast));
const nm = (w: any, id: number) => `${w.map.provinces[id].name}[${w.state.controller[id]}|${w.map.provinces[id].terrain}]`;

console.log('province senza padrone (NOBODY) all\'inizio:', newGame(MAP).state.controller.filter((c: string) => c === NOBODY).length);

// 1. rifornimento nel proprio territorio remoto, in guerra
{
  const w = newGame(MAP);
  declareWar(w, 'RUS', 'CHI', 'sonda'); declareWar(w, 'TUR', 'ITA', 'sonda'); declareWar(w, 'GBR', 'MAH', 'sonda');
  for (const [tag, re] of [['RUS', /^Vladivostok/], ['RUS', /^Jakut/], ['RUS', /^Kamc|^Kamch|^Petropavl/], ['RUS', /^Anadyr|^Ochotsk|^Okhotsk/], ['TUR', /^Murzuk|^Cufra|^Kufra|^Gat|^Ghat/], ['FRA', /^Timbuct|^Tombouctou|^Saint-Louis|^Bamako|^Medina/], ['GBR', /^Lagos|^Accra/], ['EGY', /^Kart|^Khartum|^Dongola/], ['TUR', /^Bassora|^Baghdad|^Bagdad/]] as [string, RegExp][]) {
    const p = P.filter((x: any) => re.test(x.name));
    const m = supplyMap(w, tag);
    console.log('rifornimento', tag, p.slice(0, 3).map((x: any) => `${nm(w, x.id)}=${m[x.id].toFixed(2)}`).join('  '));
  }
}

// 2. tempi di marcia
{
  const w = newGame(MAP);
  const s = w.state;
  const unitAt = (tag: string, p: number) => { const u = { ...s.units.find((x: any) => x.nation === tag && x.type === 'infantry'), location: p, move: null, orders: [], supply: 1, morale: 0.8 }; return u; };
  const trip = (tag: string, a: any, b: any, label: string) => {
    if (!a || !b) { console.log(label, 'province non trovate', !!a, !!b); return; }
    const u = unitAt(tag, a.id);
    const r = planPath(w, u, b.id, false);
    const km = Math.round(Math.hypot(1, 1) && 0);
    console.log(`marcia ${label}: ${r ? r.days.toFixed(1) + ' giorni, ' + r.path.length + ' tappe' + (r.sea ? `, MARE da ${w.map.provinces[r.sea.from].name} a ${w.map.provinces[r.sea.to].name} ${r.sea.days} g ${r.sea.via ?? ''}` : '') : 'impossibile'}`);
  };
  trip('RUS', look(/^Mosca/, 'RUS'), look(/^Vladivostok/, 'RUS'), 'Mosca→Vladivostok');
  trip('RUS', look(/^Mosca/, 'RUS'), look(/^Varsavia/, 'RUS'), 'Mosca→Varsavia');
  trip('GER', look(/^Berlino/, 'GER'), look(/^Metz/, 'GER'), 'Berlino→Metz');
  trip('FRA', look(/^Parigi/, 'FRA'), look(/^Nancy/, 'FRA'), 'Parigi→Nancy');
  trip('GBR', look(/^Londra/, 'GBR'), look(/^Edimburgo/, 'GBR'), 'Londra→Edimburgo');
  // sbarchi in guerra, senza flotte: chi ferma chi?
  declareWar(w, 'ITA', 'GBR', 'sonda');
  trip('ITA', look(/^Napoli/, 'ITA'), look(/^Londra/, 'GBR'), 'Napoli→Londra (ITA in guerra con GBR)');
  trip('ITA', look(/^Napoli/, 'ITA'), look(/^Malta|^La Valletta/), 'Napoli→Malta (ITA in guerra con GBR)');
  declareWar(w, 'RUS', 'TUR', 'sonda');
  const od = look(/^Odessa/, 'RUS', true), na = look(/^Napoli/, undefined, true);
  const sr = seaRoute(w, 'RUS', od.id, na.id);
  console.log('RUS in guerra con TUR: rotta Odessa→Napoli', sr ? `${sr.km} km via ${seaPassages(w, sr.zones).join(',') || 'Bosforo/Dardanelli (stretti non controllati)'}` : 'chiusa');
  trip('RUS', look(/^Odessa/, 'RUS'), look(/^Costantinopoli|^Istanbul/), 'Odessa→Costantinopoli (sbarco)');
  trip('RUS', look(/^Odessa/, 'RUS'), look(/^Smirne/), 'Odessa→Smirne (sbarco oltre gli Stretti)');
  declareWar(w, 'JAP', 'CHI', 'sonda');
  trip('JAP', look(/^Tokyo|^Tokio|^Edo/, 'JAP'), look(/^Pechino/), 'Tokyo→Pechino (sbarco)');
  declareWar(w, 'USA', 'SPA', 'sonda');
  trip('USA', look(/^New York/, 'USA'), look(/^Avana|^L'Avana|^La Habana/), 'New York→Avana');
  trip('SPA', look(/^Cadice|^Madrid/, 'SPA'), look(/^New York/, 'USA'), 'Spagna→New York (sbarco spagnolo negli USA)');
}

// 3. leva: quanti giorni per completare un corpo, quanti corpi in 8 settimane
{
  const w = newGame(MAP);
  const s = w.state;
  declareWar(w, 'GER', 'FRA', 'sonda');
  s.nations.GER.policies.mobilization = 'full';
  const t0 = s.units.length;
  let raised = 0;
  const cap = s.nations.GER.capital;
  while (!recruit(w, 'GER', 'infantry', cap)) raised++;
  const tre = Math.round(s.nations.GER.treasury);
  const levy = s.units.filter((u: any, i: number) => i >= t0);
  let full = -1;
  for (let d = 1; d <= 120; d++) { s.day++; invalidatePresence(w); updateSupply(w, []); if (full < 0 && levy.every((u: any) => u.strength >= u.maxStrength)) full = d; }
  console.log(`GER in guerra: corpi arruolati subito ${raised} (si ferma per ${tre < 12 ? 'cassa' : 'riserva'}: tesoro ${tre}, riserva ${s.nations.GER.manpower}), forza dopo 120 giorni ${levy.map((u: any) => u.strength).join('/')}, completi al giorno ${full}`);
  const one = newGame(MAP); const s1 = one.state; declareWar(one, 'GER', 'FRA', 'sonda');
  recruit(one, 'GER', 'infantry', s1.nations.GER.capital);
  const u = s1.units[s1.units.length - 1];
  let d = 0; for (; d < 200 && u.strength < u.maxStrength; d++) { s1.day++; invalidatePresence(one); updateSupply(one, []); }
  console.log(`un solo corpo nuovo: da ${Math.round(u.maxStrength * 0.25)} a ${u.maxStrength} uomini in ${d} giorni`);
}
