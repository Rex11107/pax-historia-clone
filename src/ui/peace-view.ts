// Conferenza di pace: punteggi, richieste con il loro costo, scelta delle province toccando la mappa.

import { buildings } from '../engine/construction';
import { composition, ETHNICITIES } from '../engine/ethnic';
import { budgetOf, concludePeace, DEMAND_LABEL, demandCost, engineTerms, liberationTarget, peaceAnswer, provincesOfPeople, suggestDemands, totalCost, warScore, type Demand, type PeaceMode } from '../engine/peace';
import { RESOURCES, type ResourceId } from '../engine/resources';
import type { Tag, War } from '../engine/types';
import type { SubjectLevel } from '../engine/vassals';
import { nationName, type World } from '../engine/world';
import { h } from './dom';

interface Host {
  world: World;
  mode(): PeaceMode;
  antiGore(): boolean;
  toast(m: string): void;
  changed(): void;
  rerender(): void;
  highlight(ids: Set<number> | null): void;
  center(p: number): void;
  close(): void;
}

const fmt = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

export class PeaceView {
  warId: string | null = null;
  acting: Tag | null = null;
  loser: Tag | null = null;
  single = false;
  /** richieste per vincitore */
  terms = new Map<Tag, Demand[]>();
  addType: Demand['type'] = 'indemnity';
  constructor(private host: Host) {}

  open(warId: string) {
    this.warId = warId; this.acting = null; this.loser = null; this.terms.clear(); this.centered = false;
  }
  private centered = false;

  war(): War | null { return this.host.world.state.wars.find((x) => x.id === this.warId) ?? null; }

  /** Tocco sulla mappa durante la conferenza: aggiunge o toglie un blocco coerente di province del perdente. */
  handleProvince(p: number): boolean {
    const w = this.host.world, s = w.state;
    const war = this.war();
    if (!war || !this.acting || !this.loser) return false;
    if (s.owner[p] !== this.loser) { this.host.toast(`${w.map.provinces[p].name} non è ${nationName(w, this.loser)}: scegli il perdente sopra.`); return true; }
    const list = this.terms.get(this.acting) ?? [];
    let cede = list.find((d) => d.type === 'cede' && d.from === this.loser) as Extract<Demand, { type: 'cede' }> | undefined;
    const block = this.single ? [p] : this.blockOf(this.loser, p);
    if (cede && cede.provinces.includes(p)) cede.provinces = cede.provinces.filter((x) => !block.includes(x));
    else {
      if (!cede) { cede = { type: 'cede', from: this.loser, to: this.acting, provinces: [] }; list.push(cede); }
      cede.provinces = [...new Set([...cede.provinces, ...block])];
    }
    this.terms.set(this.acting, list.filter((d) => d.type !== 'cede' || d.provinces.length));
    this.host.rerender();
    return true;
  }

  /** Blocco: province contigue del perdente con la stessa regione storica e la stessa maggioranza. */
  private blockOf(from: Tag, p: number): number[] {
    const w = this.host.world, s = w.state;
    const key = (q: number) => { const pv = w.map.provinces[q]; const top = composition(w, q).reduce((a, b) => (b.share > a.share ? b : a)).eth; return `${pv.hist ?? pv.hreg ?? ''}|${top}`; };
    const k = key(p);
    const out = new Set([p]);
    const q = [p];
    while (q.length) { const u = q.pop()!; for (const e of w.map.adj[u]) if (!out.has(e.to) && s.owner[e.to] === from && !w.map.provinces[e.to].impassable && key(e.to) === k && e.to !== s.nations[from].capital) { out.add(e.to); q.push(e.to); } }
    return [...out];
  }

  private describe(d: Demand): string {
    const w = this.host.world;
    const n = (t: Tag) => nationName(w, t);
    switch (d.type) {
      case 'cede': return `${n(d.from)} cede ${d.provinces.length === 1 ? w.map.provinces[d.provinces[0]].name : `${d.provinces.length} province: ${d.provinces.slice(0, 4).map((p) => w.map.provinces[p].name).join(', ')}${d.provinces.length > 4 ? '…' : ''}`}`;
      case 'liberate': return `liberare i ${ETHNICITIES[d.eth]?.label ?? d.eth} di ${n(d.from)} (${d.provinces.length} province) → ${n(liberationTarget(w, d.eth, d.from, d.provinces) ?? d.from)}`;
      case 'vassal': return `${n(d.from)} diventa ${d.level}`;
      case 'annex': return `annessione di ${n(d.from)}`;
      case 'indemnity': return `indennità di ${Math.round(d.amount)} M da ${n(d.from)} (un quarto subito, il resto in un anno)`;
      case 'trade': return `${n(d.from)} consegna gratis ${d.lots} lotti di ${RESOURCES[d.res].label} a settimana per cinque anni`;
      case 'dismantle': return `${n(d.from)} smonta ${d.levels} livelli di industria pesante (i macchinari a noi)`;
      case 'demilitarize': return `${n(d.from)} smantella le fortezze di confine per dieci anni`;
      case 'alliances': return `${n(d.from)} rompe le sue alleanze`;
    }
  }

  view(): Node {
    const w = this.host.world, s = w.state, me = s.player;
    const war = this.war();
    if (!war) { this.host.highlight(null); return h('p', { class: 'muted' }, 'Questa guerra è finita.'); }
    const sc = warScore(w, war);
    const mode = this.host.mode(), gore = this.host.antiGore();
    const mine = [...war.attackers, ...war.defenders].includes(me);
    const mySide = war.attackers.includes(me) ? 'att' : war.defenders.includes(me) ? 'def' : null;
    const winners = sc.winner ? (sc.winner === 'att' ? war.attackers : war.defenders) : [];
    const losers = sc.winner ? (sc.winner === 'att' ? war.defenders : war.attackers) : [];
    const head = h('div', { class: 'peace-head' },
      h('div', { class: 'row' }, h('b', null, 'Attaccanti'), h('b', null, 'Difensori')),
      h('div', { class: 'row sub' }, h('span', null, war.attackers.map((t) => nationName(w, t)).join(', ')), h('span', null, war.defenders.map((t) => nationName(w, t)).join(', '))),
      h('div', { class: 'score' }, h('i', { class: 'a', style: `width:${sc.att / 2}%` }), h('i', { class: 'd', style: `width:${sc.def / 2}%` })),
      h('div', { class: 'row' }, h('span', { class: 'num' }, String(sc.att)), h('span', { class: 'num' }, String(sc.def))),
      h('p', { class: 'sub' }, sc.winner ? `Vince ${sc.winner === 'att' ? 'chi attacca' : 'chi si difende'}: ${sc.points} punti da spendere, divisi per contributo (${winners.map((t) => `${nationName(w, t)} ${Math.round((sc.share[t] ?? 0) * 100)}%`).join(', ')}). Il punteggio viene dalle province occupate (pesate per popolazione, risorse e opere; la capitale vale molto), dalle perdite inflitte e dalla stanchezza.` : 'Nessuno sta vincendo: è possibile solo una pace bianca.'));
    // il giocatore perde: le condizioni del nemico
    if (mine && sc.winner && mySide !== sc.winner) {
      const theirs = engineTerms(w, war);
      const onMe = theirs.filter((d) => d.from === me);
      return h('div', null, head,
        h('h3', null, 'Le condizioni del nemico'),
        onMe.length ? h('ul', { class: 'list plain' }, ...onMe.map((d) => h('li', null, this.describe(d), h('span', { class: 'sub' }, ` · ${fmt(demandCost(w, d).cost)} punti`)))) : h('p', null, 'Il nemico non chiede nulla a noi.'),
        h('div', { class: 'buttons' },
          h('button', { class: 'primary', onclick: () => { concludePeace(w, war, theirs); this.host.toast('Pace firmata.'); this.host.highlight(null); this.host.changed(); this.host.close(); } }, 'Accetta'),
          h('button', { onclick: () => { const a = peaceAnswer(w, war, me, [], 'engine'); if (a.ok) { concludePeace(w, war, []); this.host.toast('Pace bianca firmata.'); this.host.changed(); this.host.close(); } else this.host.toast(a.reason); } }, 'Chiedi la pace bianca'),
          h('button', { class: 'quiet', onclick: () => this.host.close() }, 'Continua la guerra')));
    }
    // il giocatore vince (o dirige una pace altrui): costruisce le richieste
    const canDirect = mine ? mySide === sc.winner : mode === 'all';
    if (!sc.winner || !canDirect) {
      return h('div', null, head, h('div', { class: 'buttons' },
        mine ? h('button', { class: 'primary', onclick: () => { const a = peaceAnswer(w, war, me, [], mode, gore); if (a.ok) { concludePeace(w, war, []); this.host.toast('Pace bianca firmata.'); this.host.changed(); this.host.close(); } else this.host.toast(a.reason); } }, 'Proponi la pace bianca') : null,
        h('button', { class: 'quiet', onclick: () => this.host.close() }, 'Chiudi')));
    }
    const actors = mine ? [me] : winners;
    if (!this.acting || !actors.includes(this.acting)) this.acting = actors[0];
    const alive = losers.filter((t) => s.nations[t]?.alive);
    if (!this.loser || !alive.includes(this.loser)) this.loser = alive[0];
    if (!this.terms.has(this.acting)) this.terms.set(this.acting, mine ? [] : suggestDemands(w, war, this.acting, budgetOf(w, war, this.acting)));
    const list = this.terms.get(this.acting)!;
    const budget = budgetOf(w, war, this.acting);
    // la mappa va sul fronte: la prima provincia del perdente occupata dal vincitore (o la sua capitale)
    if (!this.centered) { this.centered = true; const occ = w.map.provinces.find((p) => s.owner[p.id] === this.loser && s.controller[p.id] === this.acting); this.host.center(occ ? occ.id : s.nations[this.loser!].capital); }
    const tot = totalCost(w, list, gore);
    const sel = new Set<number>(list.flatMap((d) => (d.type === 'cede' || d.type === 'liberate' ? d.provinces : [])));
    this.host.highlight(sel);
    const loserSel = h('select', { onchange: (e: Event) => { this.loser = (e.target as HTMLSelectElement).value; this.host.rerender(); } }, ...alive.map((t) => h('option', { value: t, selected: t === this.loser }, nationName(w, t))));
    const actingSel = actors.length > 1 ? h('select', { onchange: (e: Event) => { this.acting = (e.target as HTMLSelectElement).value; this.host.rerender(); } }, ...actors.map((t) => h('option', { value: t, selected: t === this.acting }, `${nationName(w, t)} (${fmt(budgetOf(w, war, t))} punti)`))) : null;
    const over = tot.cost > budget;
    return h('div', { class: 'peace' }, head,
      actingSel ? h('label', { class: 'field' }, 'Detti le condizioni per', actingSel) : null,
      h('label', { class: 'field' }, 'Richieste a', loserSel),
      h('div', { class: 'meter' }, h('i', { style: `width:${Math.min(100, (tot.cost / Math.max(1, budget)) * 100)}%;${over ? 'background:var(--wax)' : ''}` })),
      h('p', { class: over ? 'neg' : 'sub' }, `Punti usati ${fmt(tot.cost)} su ${fmt(budget)}${over && mode === 'engine' ? ': il nemico rifiuterà' : ''}.`),
      h('p', { class: 'sub' }, 'Tocca le province del perdente sulla mappa per chiederle: si seleziona un blocco coerente (stessa regione storica e stessa maggioranza). ',
        h('label', null, h('input', { type: 'checkbox', checked: this.single, onchange: (e: Event) => { this.single = (e.target as HTMLInputElement).checked; } }), ' una provincia alla volta')),
      list.length ? h('ul', { class: 'list plain' }, ...list.map((d, i) => {
        const c = demandCost(w, d, gore);
        return h('li', null,
          h('div', { class: 'row' }, h('span', null, h('b', null, DEMAND_LABEL[d.type]), ': ', this.describe(d)), h('span', { class: 'num' }, c.refusal ? '—' : fmt(c.cost))),
          c.refusal ? h('div', { class: 'neg' }, c.refusal) : null,
          ...c.warnings.map((x) => h('div', { class: 'sub' }, x)),
          h('button', { class: 'link', onclick: () => { list.splice(i, 1); this.host.rerender(); } }, 'Togli'));
      })) : h('p', { class: 'muted' }, 'Nessuna richiesta.'),
      this.adder(war, list),
      h('div', { class: 'buttons' },
        h('button', { onclick: () => { this.terms.set(this.acting!, suggestDemands(w, war, this.acting!, budget)); this.host.rerender(); } }, 'Proposta del motore'),
        h('button', { class: 'primary', onclick: () => this.sign(war) }, mine ? 'Proponi la pace' : 'Firma la pace'),
        h('button', { class: 'quiet', onclick: () => { this.host.highlight(null); this.host.close(); } }, 'Più tardi')),
      h('p', { class: 'muted' }, mode === 'engine' ? 'Il nemico accetta se le richieste non superano i punti che vi spettano. I territori: solo raggiungibili (confinanti, o costieri con un porto e una marina), mai la capitale; chiedere ciò che non si è occupato costa il doppio; le rivendicazioni riducono il costo (nucleo −40%, storica −15%, pretesa +20%, nessuna +80%); i resti piccoli che resterebbero isolati entrano da soli, i corridoi sono vietati.' : 'Modalità "il giocatore dirige la pace": le condizioni si impongono anche oltre i punti; le regole sui confini restano se attive nelle impostazioni.'),
    );
  }

  private adder(war: War, list: Demand[]): Node {
    const w = this.host.world, s = w.state;
    const from = this.loser!, to = this.acting!;
    const opts: [Demand['type'], string][] = [['indemnity', 'Indennità'], ['trade', 'Concessione commerciale'], ['dismantle', 'Riparazioni industriali'], ['demilitarize', 'Smilitarizzazione'], ['alliances', 'Rompere le alleanze'], ['vassal', 'Vassallaggio'], ['liberate', 'Liberazione di un popolo'], ['annex', 'Annessione']];
    const typeSel = h('select', { onchange: (e: Event) => { this.addType = (e.target as HTMLSelectElement).value as Demand['type']; this.host.rerender(); } }, ...opts.map(([v, l]) => h('option', { value: v, selected: v === this.addType }, l)));
    let param: HTMLSelectElement | null = null;
    const left = Math.max(0, budgetOf(w, war, to) - totalCost(w, list).cost);
    const inc = Math.max(1, s.nations[from]?.lastBudget?.income ?? 10);
    if (this.addType === 'indemnity') param = h('select', null, ...[0.25, 0.5, 0.75, 1].map((f) => { const m = Math.max(5, Math.round((left * f / 100) * inc * 40)); return h('option', { value: m }, `${m} M (${fmt(left * f)} punti)`); })) as HTMLSelectElement;
    if (this.addType === 'trade') {
      const res = [...new Set(w.map.provinces.filter((p) => s.owner[p.id] === from).flatMap((p) => w.map.resources[p.id]))].sort((a, b) => Number(RESOURCES[b].strategic) - Number(RESOURCES[a].strategic));
      param = h('select', null, ...res.flatMap((r) => [1, 2, 3].map((l) => h('option', { value: `${r}:${l}` }, `${RESOURCES[r].label} × ${l}`)))) as HTMLSelectElement;
    }
    if (this.addType === 'dismantle') param = h('select', null, ...[1, 2, 3].map((l) => h('option', { value: l }, `${l} livelli`))) as HTMLSelectElement;
    if (this.addType === 'vassal') param = h('select', null, ...(['tributario', 'vassallo', 'protettorato'] as SubjectLevel[]).map((l) => h('option', { value: l }, l))) as HTMLSelectElement;
    if (this.addType === 'liberate') {
      const peoples = new Set<string>();
      for (const p of w.map.provinces) if (s.owner[p.id] === from) for (const c of composition(w, p.id)) if (c.share >= 40) peoples.add(c.eth);
      const ok = [...peoples].map((eth) => ({ eth, ids: provincesOfPeople(w, from, eth) })).filter((x) => x.ids.length && liberationTarget(w, x.eth, from, x.ids) && liberationTarget(w, x.eth, from, x.ids) !== from);
      param = ok.length ? h('select', null, ...ok.map((x) => h('option', { value: x.eth }, `${ETHNICITIES[x.eth]?.label ?? x.eth} (${x.ids.length} province) → ${nationName(w, liberationTarget(w, x.eth, from, x.ids)!)}`))) as HTMLSelectElement : null;
    }
    const add = () => {
      let d: Demand | null = null;
      const v = param?.value ?? '';
      switch (this.addType) {
        case 'indemnity': d = { type: 'indemnity', from, to, amount: Number(v) }; break;
        case 'trade': { const [r, l] = v.split(':'); if (r) d = { type: 'trade', from, to, res: r as ResourceId, lots: Number(l) }; break; }
        case 'dismantle': d = { type: 'dismantle', from, to, levels: Number(v) }; break;
        case 'vassal': d = { type: 'vassal', from, to, level: v as SubjectLevel }; break;
        case 'liberate': if (v) d = { type: 'liberate', from, eth: v, provinces: provincesOfPeople(w, from, v), to }; break;
        case 'annex': d = { type: 'annex', from, to }; break;
        case 'demilitarize': d = { type: 'demilitarize', from, to }; break;
        case 'alliances': d = { type: 'alliances', from, to }; break;
      }
      if (!d) { this.host.toast('Nessuna scelta possibile.'); return; }
      list.push(d);
      this.host.rerender();
    };
    void buildings;
    return h('div', { class: 'peace-add' }, typeSel, param, h('button', { onclick: add }, 'Aggiungi'));
  }

  private sign(war: War) {
    const w = this.host.world, s = w.state, me = s.player;
    const mode = this.host.mode(), gore = this.host.antiGore();
    const mine = [...war.attackers, ...war.defenders].includes(me);
    const all: Demand[] = [];
    if (mine) {
      const list = this.terms.get(me) ?? [];
      const a = peaceAnswer(w, war, me, list, mode, gore);
      if (!a.ok) { this.host.toast(a.reason); return; }
      all.push(...list);
      // gli alleati vincitori prendono la loro parte secondo il motore
      const sc = warScore(w, war);
      const side = sc.winner === 'att' ? war.attackers : war.defenders;
      for (const t of side) if (t !== me) all.push(...suggestDemands(w, war, t, budgetOf(w, war, t)).filter((d) => d.type !== 'cede' || !d.provinces.some((p) => all.some((o) => o.type === 'cede' && o.provinces.includes(p)))));
    } else {
      for (const [, l] of this.terms) all.push(...l);
      const sc = warScore(w, war);
      for (const t of sc.winner === 'att' ? war.attackers : war.defenders) if (!this.terms.has(t)) all.push(...suggestDemands(w, war, t, budgetOf(w, war, t)));
    }
    concludePeace(w, war, all);
    s.pendingPeace = (s.pendingPeace ?? []).filter((x) => x.war !== war.id);
    this.host.toast('Pace firmata.');
    this.host.highlight(null);
    this.host.changed();
    this.host.close();
  }
}
