import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { planPath } from '../src/engine/orders';
import { subjectOf } from '../src/engine/vassals';
import { MAP, EU, find } from './helpers';

describe('mappa', () => {
  it('ha centinaia di province e le nazioni principali', () => {
    expect(MAP.provinces.length).toBeGreaterThan(800);
    const owners = new Set(MAP.provinces.map((p) => p.owner));
    for (const t of ['ITA', 'FRA', 'GER', 'AUH', 'GBR', 'RUS', 'TUR']) expect(owners.has(t)).toBe(true);
  });
  it('confini storici 1881: Trento e Trieste austriache, Nizza francese, Alsazia tedesca', () => {
    const w = newGame(MAP);
    expect(w.map.provinces[find(w, 'Trento')].owner).toBe('AUH');
    expect(w.map.provinces[find(w, 'Trieste')].owner).toBe('AUH');
    expect(w.map.provinces[find(w, 'Nizza')].owner).toBe('FRA');
    expect(w.map.provinces[find(w, 'Strasburgo')].owner).toBe('GER');
  });
  it('Sicilia e Sardegna sono raggiungibili via stretto', () => {
    const w = newGame(MAP);
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    expect(planPath(w, u, find(w, 'Palermo'), false)).not.toBeNull();
  });
});

describe('Africa e Arabia', () => {
  const byName = (n: string) => MAP.provinces.find((p) => p.name === n)!;
  it('stati e colonie del 1881 al loro posto', () => {
    const exp: [string, string][] = [['Città del Capo', 'GBR'], ['Khartum', 'EGY'], ['La Mecca', 'TUR'], ['Medina', 'TUR'], ['Zanzibar', 'ZAN'], ['Kumasi', 'ASA'], ['Sokoto', 'SOK'],
      ['Tananarive', 'MAD'], ['Pretoria', 'TRA'], ['Aden', 'GBR'], ['Mascate', 'OMA'], ['Saint-Louis', 'FRA'], ['Luanda', 'POR'], ['Monrovia', 'LIB'], ['Debre Tabor', 'ETH']];
    for (const [n, o] of exp) expect(byName(n)?.owner, n).toBe(o);
  });
  it('niente province europee sul vecchio bordo del 27° parallelo: sono rifatte con le terre esterne', () => {
    const eu = MAP.provinces.slice(0, EU).filter((p) => p.lonlat[1] < 27.3 && p.lonlat[0] > -11 && p.lonlat[0] < 50);
    expect(eu.map((p) => p.name)).toEqual([]);
    for (const n of ['Tidikelt', 'Gilan', 'Kazan', 'Baku']) expect(MAP.provinces.find((p) => p.name === n)!.id, n).toBeGreaterThanOrEqual(EU);
  });
  it('fase 2a: Egitto-Sudan e Corno d\'Africa per regioni storiche', () => {
    const exp: [string, string][] = [['Assab', 'ITA'], ['Massaua', 'EGY'], ['Hamasien', 'ETH'], ['Harar', 'EGY'], ['Berbera', 'EGY'], ['Benadir', 'ZAN'], ['Scioa', 'ETH'], ['Gojjam (nord)', 'ETH'], ['Ogaden', ''], ['Nogal', '']];
    for (const [n, o] of exp) expect(byName(n)?.owner, n).toBe(o);
    const zone = MAP.provinces.filter((p) => p.id >= EU && ['EGY', 'SDN', 'SDS', 'ERI', 'ETH', 'DJI', 'SOL', 'SOM'].includes(p.modern));
    expect(zone.length).toBeGreaterThan(140);
    expect(zone.length).toBeLessThan(210);
  });
  it('sultanati del Corno come stati, Eritrea senza exclavi', () => {
    const exp: [string, string][] = [['Aussa', 'AUS'], ['Migiurtinia', 'MIG'], ['Obbia', 'OBB'], ['Uarsangheli', 'WSG'], ['Raheita', 'RAH'], ['Obock e Tagiura', 'TAG']];
    for (const [n, o] of exp) expect(byName(n)?.owner, n).toBe(o);
    const w = newGame(MAP, 'ITA', 'sultanati');
    for (const [, t] of exp) { expect(w.profiles[t], t).toBeTruthy(); expect(w.state.units.some((u) => u.nation === t), t).toBe(true); }
    // ogni regione eritrea è una provincia sola (niente "Bogos (nord)", "Zula (est)"…), con il padrone del 1881
    const eri = MAP.provinces.filter((p) => p.modern === 'ERI' && !p.impassable);
    const own: Record<string, string> = { Massaua: 'EGY', Zula: 'EGY', Bogos: 'EGY', Sahel: 'EGY', Barca: 'EGY', Hamasien: 'ETH', 'Seraè': 'ETH', 'Acchelè Guzai': 'ETH', 'Dancalia settentrionale': '', Beilul: '', Assab: 'ITA' };
    for (const [n, o] of Object.entries(own)) { const list = eri.filter((p) => p.name === n); expect(list.length, n).toBe(1); expect(list[0].owner, n).toBe(o); }
    for (const p of eri) expect(p.name, p.name).not.toMatch(/\(/);
    const assab = byName('Assab');
    expect(assab.area).toBeGreaterThan(300);
    expect(assab.area).toBeLessThan(1500);
  });
  it('ogni nazione presente ha un profilo e un esercito', () => {
    const w = newGame(MAP, 'ITA', 'af');
    for (const t of ['ETH', 'SOK', 'TRA', 'MAD', 'ZAN']) expect(w.state.units.some((u) => u.nation === t), t).toBe(true);
  });
  it('sbarco: l\'Italia porta un corpo d\'armata su una costa di nessuno in Somalia e la annette', () => {
    const w = newGame(MAP, 'ITA', 'sbarco');
    const target = w.map.provinces.find((p) => p.coast && !p.impassable && w.state.owner[p.id] === '' && p.lonlat[0] > 44 && p.lonlat[1] > 3 && p.lonlat[1] < 12)!;
    expect(target).toBeTruthy();
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    const plan = planPath(w, u, target.id, false)!;
    expect(plan.sea).toBeTruthy();
    expect(plan.days).toBeLessThan(40);
    u.orders = [{ type: 'move', target: target.id, status: 'pending' }];
    for (let i = 0; i < 8 && w.state.owner[target.id] !== 'ITA'; i++) runTurn(w);
    expect(w.state.owner[target.id]).toBe('ITA');
  });
  it('senza marina non si sbarca', () => {
    const w = newGame(MAP, 'ETH', 'nomar');
    const u = w.state.units.find((x) => x.nation === 'ETH')!;
    const far = w.map.provinces.find((p) => p.name === 'Città del Capo')!;
    expect(planPath(w, u, far.id, false)?.sea).toBeFalsy();
  });
  it('le potenze coloniali si espandono nelle terre di nessuno, con ritmo', () => {
    const w = newGame(MAP, 'SWI', 'colonie');
    const free = () => w.map.provinces.filter((p) => !p.impassable && w.state.owner[p.id] === '').length;
    const f0 = free();
    for (let i = 0; i < 52; i++) runTurn(w);
    const taken = f0 - free();
    expect(taken).toBeGreaterThan(5);
    expect(taken).toBeLessThan(60);
  }, 60000);
});

describe('Arabia, Persia e Asia centrale', () => {
  const byName = (n: string) => MAP.provinces.find((p) => p.name === n)!;
  it('padroni del 1881: Turkestan russo, Bukhara e Khiva protettorati, Afghanistan, Persia orientale, Arabia', () => {
    const exp: [string, string][] = [['Teheran', 'PER'], ['Isfahan', 'PER'], ['Mashhad', 'PER'], ['Kabul', 'AFG'], ['Herat', 'AFG'], ['Bukhara', 'BUK'], ['Khiva', 'KHI'],
      ['Tashkent', 'RUS'], ['Samarcanda', 'RUS'], ['Verny', 'RUS'], ['Merv', ''], ['Kafiristan', ''], ['La Mecca', 'TUR'], ['Riad', 'NJD'], ["Ha'il", 'ARA'], ['Hofuf', 'TUR'], ['Qatar', 'QAT'], ['Midian', 'EGY'], ['Bahrein', 'BHR'], ['Mascate', 'OMA'], ['Aden', 'GBR']];
    for (const [n, o] of exp) expect(byName(n)?.owner, n).toBe(o);
    const w = newGame(MAP, 'ITA', 'asia');
    expect(subjectOf(w, 'BUK')?.overlord).toBe('RUS');
    expect(subjectOf(w, 'KHI')?.overlord).toBe('RUS');
    for (const t of ['AFG', 'BUK', 'KHI']) expect(w.state.units.some((u) => u.nation === t), t).toBe(true);
    // la capitale persiana è Teheran, ora in mappa
    expect(w.map.provinces[w.state.nations.PER.capital].name).toBe('Teheran');
  });
  it('cucitura sul 50° meridiano: la Persia occidentale confina con quella orientale', () => {
    // le province persiane sul 50° meridiano sono rifatte fuori, con confini naturali; quelle europee confinanti toccano la Persia esterna
    for (const n of ['Esfahan', 'Gilan', 'Khūzestān']) expect(MAP.provinces.filter((p) => p.name.startsWith(n) && p.id >= EU && p.owner === 'PER').length, n).toBeGreaterThan(0);
    const west = MAP.provinces.slice(0, EU).filter((p) => p.owner === 'PER' && p.lonlat[0] > 48);
    expect(west.length).toBeGreaterThan(0);
    for (const p of west) expect(p.n.some((j) => j >= EU && MAP.provinces[j].owner === 'PER'), p.name).toBe(true);
  });
  it('deserti dell\'Asia centrale intransitabili, frontiere provvisorie non sono coste', () => {
    expect(MAP.provinces.some((p) => p.impassable && /Karakum/.test(p.name))).toBe(true);
    expect(MAP.provinces.some((p) => p.impassable && /Kyzylkum/.test(p.name))).toBe(true);
    for (const n of ['Kabul', 'Herat', 'Kandahar', 'Pavlodar']) expect(byName(n)?.coast, n).toBe(false);
  });
});
