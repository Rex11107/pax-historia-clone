// Lavagna della ricerca: categorie, lavagna scorrevole con l'asse del tempo, pannello dei dettagli.

import { BUILDINGS } from '../engine/construction';
import { CATEGORIES, cancelResearch, collabScore, describeTech, knows, missingInputs, projectsOf, proposeCollab, research, researchCost, researchRefusal, researchSlots, scientist, scientistsFor, speedOf, startResearch, tech, TECHS, weeklyCost, weeksFor, yearsAhead, type Category, type Tech } from '../engine/research';
import { RESOURCES } from '../engine/resources';
import type { Tag } from '../engine/types';
import { dateOf, nationName, type World } from '../engine/world';
import { h } from './dom';

interface Host {
  world: World;
  toast(msg: string): void;
  changed(): void;
  rerender(): void;
}

const PRE = 1876; // le innovazioni più vecchie stanno in una colonna "prima del 1876"
const PX = 46, NODE = 88, GAP = 8, ROW = 72, LABEL = 82, RULER = 26, PRE_W = 2 * (NODE + GAP) + 8, END = 1913;
const xOfYear = (y: number) => (y < PRE ? 0 : PRE_W + (y - PRE) * PX);

export class ResearchView {
  cat: Category = 'industria';
  sel: string | null = null;
  query = '';
  partner: Tag | '' = '';
  mySci = '';
  private scroll: { left: number; top: number } | null = null;
  private wantToday = true;

  constructor(private host: Host) {}

  /** Posizioni dei nodi di una categoria: per riga, in ordine di data, senza sovrapposizioni. */
  private layout(cat: Category) {
    const c = CATEGORIES.find((x) => x.id === cat)!;
    const pos = new Map<string, { x: number; y: number; row: number }>();
    c.lines.forEach(([line], row) => {
      let last = -Infinity;
      for (const x of TECHS.filter((t) => t.cat === cat && t.line === line).sort((a, b) => a.year - b.year)) {
        const px = Math.max(xOfYear(x.year) + (x.year < PRE ? 4 : -NODE / 2 + 8), last + NODE + GAP);
        pos.set(x.id, { x: px, y: row * ROW + 10, row });
        last = px;
      }
    });
    return { pos, rows: c.lines.length, lines: c.lines };
  }

  private state(w: World, me: Tag, x: Tech): 'done' | 'run' | 'avail' | 'lock' {
    if (knows(w, me, x.id)) return 'done';
    if (projectsOf(w, me).some((p) => p.tech === x.id)) return 'run';
    return researchRefusal(w, me, x.id, true) ? 'lock' : 'avail';
  }

  view(): Node {
    const w = this.host.world, s = w.state, me = s.player;
    const mine = projectsOf(w, me);
    const now = dateOf(s.day).getUTCFullYear() + dateOf(s.day).getUTCMonth() / 12;
    const running = h('div', { class: 'run-card' },
      ...mine.map((p) => {
        const x = tech(p.tech)!;
        const sp = speedOf(w, p);
        const left = Math.max(0, Math.ceil((p.total - p.progress) / Math.max(0.05, sp)));
        const other = p.nations.find((t) => t !== me);
        const sci = Object.entries(p.scientists).map(([, id]) => scientist(id)?.name).filter(Boolean).join(' e ');
        return h('div', { class: 'rc', onclick: () => { this.cat = x.cat; this.sel = x.id; this.wantFocus = x.id; this.host.rerender(); } },
          h('div', { class: 'row' }, h('span', null, `${CATEGORIES.find((c) => c.id === x.cat)!.icon} ${x.name}`, h('small', null, `${sci ? ` · con ${sci}` : ''}${other ? ` · insieme a ${nationName(w, other)}` : ''}${yearsAhead(w, x) ? ` · in anticipo` : ''}`)), h('small', null, `${left} sett.`)),
          h('div', { class: 'meter' }, h('i', { style: `width:${Math.round((p.progress / p.total) * 100)}%` })));
      }),
      h('small', { class: 'sub' }, `${mine.length} ricerche su ${researchSlots(w, me)} · ${researchCost(w, me).toFixed(1).replace('.', ',')} M/sett.${mine.length ? '' : ' · nessuna in corso: scegli una casella e premi Avvia'}`));
    const cats = h('div', { class: 'rcats' },
      ...CATEGORIES.map((c) => h('button', { class: c.id === this.cat && !this.query ? 'on' : '', onclick: () => { this.cat = c.id; this.query = ''; this.sel = null; this.wantToday = true; this.host.rerender(); } }, `${c.icon} ${c.label}`)),
    );
    const search = h('input', { type: 'search', placeholder: '🔍 cerca una ricerca (es. Maxim, acciaio)', value: this.query, oninput: (e: Event) => { this.query = (e.target as HTMLInputElement).value; this.rerenderKeepFocus(); } }) as HTMLInputElement;
    const body = this.query.trim() ? this.results(w, me) : this.board(w, me, now);
    return h('div', { class: 'research' }, running, cats, search, body, this.sel ? this.details(w, me, tech(this.sel)!) : h('p', { class: 'muted' }, 'Scorri la lavagna col dito o con le barre; la linea rossa è la data di oggi: ciò che sta alla sua destra si può ricercare solo in anticipo, a costo maggiore. Tocca una casella per i dettagli.'));
  }

  private wantFocus: string | null = null;
  private rerenderKeepFocus() {
    this.host.rerender();
    const el = document.querySelector<HTMLInputElement>('.research input[type=search]');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }

  private results(w: World, me: Tag): Node {
    const q = this.query.toLowerCase();
    const list = TECHS.filter((x) => x.name.toLowerCase().includes(q) || x.desc.toLowerCase().includes(q)).slice(0, 20);
    return h('ul', { class: 'list' }, ...list.map((x) => h('li', { onclick: () => { this.query = ''; this.cat = x.cat; this.sel = x.id; this.wantFocus = x.id; this.host.rerender(); } },
      h('div', { class: 'row' }, h('b', null, x.name), h('span', { class: 'sub' }, `${x.year} · ${CATEGORIES.find((c) => c.id === x.cat)!.label}`)),
      h('div', { class: 'sub' }, { done: 'conosciuta', run: 'in corso', avail: 'disponibile', lock: 'bloccata' }[this.state(w, me, x)]))));
  }

  private board(w: World, me: Tag, now: number): Node {
    const { pos, rows, lines } = this.layout(this.cat);
    const width = Math.max(...[...pos.values()].map((p) => p.x + NODE + 30), xOfYear(END));
    const height = rows * ROW + 10;
    const todayX = xOfYear(now);
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height)); svg.setAttribute('class', 'rlinks');
    const ext: Node[] = [];
    for (const x of TECHS.filter((t) => t.cat === this.cat)) {
      const b = pos.get(x.id)!;
      for (const pid of x.prereq) {
        const a = pos.get(pid);
        if (!a) { // prerequisito di un'altra categoria
          const pt = tech(pid)!;
          ext.push(h('span', { class: `rext ${knows(w, me, pid) ? 'ok' : ''}`, style: `left:${b.x + 4}px;top:${b.y - 9}px` }, `↗ ${pt.name}`));
          continue;
        }
        const x1 = a.x + NODE, y1 = a.y + 25, x2 = b.x, y2 = b.y + 25, mx = (x1 + x2) / 2;
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2 - 6} ${y2}`);
        path.setAttribute('class', knows(w, me, pid) ? 'ok' : '');
        svg.appendChild(path);
        const head = document.createElementNS(svgNS, 'path');
        head.setAttribute('d', `M${x2 - 7} ${y2 - 4} L${x2} ${y2} L${x2 - 7} ${y2 + 4} Z`);
        svg.appendChild(head);
      }
    }
    const ruler = h('div', { class: 'rruler', style: `width:${width + LABEL}px` },
      h('span', { class: 'rcorner' }),
      h('span', { class: 'ry pre', style: `left:${LABEL + 4}px` }, 'prima del 1876'),
      ...Array.from({ length: END - PRE + 1 }, (_, i) => PRE + i).map((y) => h('span', { class: 'ry', style: `left:${LABEL + xOfYear(y)}px` }, String(y))),
      h('em', { class: 'rtoday-tag', style: `left:${LABEL + todayX}px` }, 'oggi'));
    const nodes = [...pos.entries()].map(([id, p]) => {
      const x = tech(id)!;
      const st = this.state(w, me, x);
      const pr = projectsOf(w, me).find((q) => q.tech === id);
      return h('div', { class: `rnode ${st}${this.sel === id ? ' sel' : ''}`, 'data-id': id, style: `left:${p.x}px;top:${p.y}px`, onclick: () => { this.sel = id; this.host.rerender(); } },
        h('b', null, x.name), h('small', null, `${x.year}${st === 'run' ? ' · in corso' : ''}${st === 'avail' && x.year > now ? ' · in anticipo' : ''}`),
        pr ? h('div', { class: 'pb' }, h('i', { style: `width:${Math.round((pr.progress / pr.total) * 100)}%` })) : null);
    });
    const canvas = h('div', { class: 'rcanvas', style: `width:${width}px;height:${height}px` },
      h('div', { class: 'rfuture', style: `left:${todayX}px` }),
      ...Array.from({ length: rows - 1 }, (_, i) => h('div', { class: 'rrow', style: `top:${(i + 1) * ROW}px` })),
      h('div', { class: 'rtoday', style: `left:${todayX}px` }),
      svg, ...nodes, ...ext);
    const labels = h('div', { class: 'rlabels' }, ...lines.map(([, label]) => h('div', { style: `height:${ROW}px` }, label)));
    const scroller = h('div', { class: 'rboard', onscroll: (e: Event) => { const t = e.target as HTMLElement; this.scroll = { left: t.scrollLeft, top: t.scrollTop }; } },
      ruler, h('div', { class: 'rbody', style: `width:${width + LABEL}px` }, labels, canvas));
    const toToday = () => { scroller.scrollLeft = Math.max(0, todayX - 60); };
    const wrap = h('div', { class: 'rwrap' }, scroller, h('button', { class: 'roggi', onclick: toToday }, '◎ Oggi'));
    // posizione: dopo il montaggio (oggi, la casella cercata o dove si era)
    requestAnimationFrame(() => {
      if (this.wantFocus && pos.get(this.wantFocus)) { const p = pos.get(this.wantFocus)!; scroller.scrollLeft = Math.max(0, p.x - 40); scroller.scrollTop = Math.max(0, p.y - 20); this.wantFocus = null; this.wantToday = false; }
      else if (this.wantToday) { toToday(); this.wantToday = false; }
      else if (this.scroll) { scroller.scrollLeft = this.scroll.left; scroller.scrollTop = this.scroll.top; }
    });
    void RULER;
    return wrap;
  }

  private details(w: World, me: Tag, x: Tech): Node {
    const s = w.state;
    const st = this.state(w, me, x);
    const ahead = yearsAhead(w, x);
    const weeks = weeksFor(w, x);
    const err = researchRefusal(w, me, x.id);
    const miss = missingInputs(w, [me], x);
    const scis = scientistsFor(w, me, x);
    if (this.mySci && !scis.some((c) => c.id === this.mySci)) this.mySci = '';
    const cost = weeklyCost(w, me, x, scientist(this.mySci));
    const pre = x.prereq.map((p) => `${knows(w, me, p) ? '✓' : '✗'} ${tech(p)!.name}`).join(' · ');
    const sciSel = scis.length ? h('select', { onchange: (e: Event) => { this.mySci = (e.target as HTMLSelectElement).value; this.host.rerender(); } },
      h('option', { value: '' }, 'nessuno scienziato'),
      ...scis.map((c) => h('option', { value: c.id, selected: c.id === this.mySci }, `${c.name}: +${Math.round(c.speed * 100)}% velocità${c.cost ? `, +${Math.round(c.cost * 100)}% costo` : ''}`))) : h('span', { class: 'sub' }, 'nessuno scienziato del nostro paese lavora in questo campo');
    const proj = projectsOf(w, me).find((p) => p.tech === x.id);
    // collaborazione: le nazioni ordinate per disponibilità
    let collab: Node | null = null;
    if (st === 'avail') {
      const others = Object.keys(s.nations).filter((t) => t !== me && s.nations[t].alive && !w.profiles[t]?.micro && t !== 'NUL');
      const scored = others.map((t) => ({ t, ev: collabScore(w, me, t, x.id) })).filter((o) => o.ev.score > -900).sort((a, b) => b.ev.score - a.ev.score).slice(0, 12);
      if (this.partner && !scored.some((o) => o.t === this.partner)) this.partner = '';
      const cur = scored.find((o) => o.t === this.partner);
      collab = h('div', { class: 'collab' }, h('h4', null, 'Collaborazione scientifica'),
        scored.length ? h('select', { onchange: (e: Event) => { this.partner = (e.target as HTMLSelectElement).value as Tag; this.host.rerender(); } },
          h('option', { value: '' }, 'scegli un paese…'),
          ...scored.map((o) => h('option', { value: o.t, selected: o.t === this.partner }, `${nationName(w, o.t)} — ${o.ev.refusal ? 'rifiuterebbe' : 'accetterebbe'} (${o.ev.score})`))) : h('p', { class: 'sub' }, 'Nessun paese può collaborare su questa ricerca (la conoscono già o non hanno ricerche libere).'),
        cur ? h('p', { class: 'sub' }, `${cur.ev.reasons.join(', ')}. ${scientistsFor(w, cur.t, x)[0] ? `Metterebbe a disposizione ${scientistsFor(w, cur.t, x)[0].name}.` : 'Non ha scienziati in questo campo.'} Costi divisi in proporzione alle entrate, ognuno fornisce le risorse che ha; entrambi ottengono il risultato.`) : null,
        cur ? h('button', { disabled: !!cur.ev.refusal || !!err, onclick: () => { const e = proposeCollab(w, me, cur.t, x.id, this.mySci || undefined); this.host.toast(e ?? `Patto firmato con ${nationName(w, cur.t)}.`); this.partner = ''; this.host.changed(); } }, 'Proponi il patto') : null);
    }
    return h('div', { class: 'rdetail card' },
      h('h3', null, x.name),
      h('p', { class: 'sub' }, `${CATEGORIES.find((c) => c.id === x.cat)!.label} · data storica ${x.year} · ${x.desc}`),
      h('dl', { class: 'facts' },
        h('dt', null, 'Effetto'), h('dd', null, describeTech(x).replace(/sblocca (\w+) livello/g, (_m, b) => `sblocca ${BUILDINGS[b as keyof typeof BUILDINGS]?.label ?? b} livello`)),
        h('dt', null, 'Richiede'), h('dd', null, `${pre || 'nulla'}${x.minIndustry ? ` · industria ≥ ${x.minIndustry}` : ''}`),
        st === 'done' ? null : h('dt', null, 'Durata'), st === 'done' ? null : h('dd', null, `${weeks} settimane di lavoro${ahead ? ` (in anticipo di ${ahead} ${ahead === 1 ? 'anno' : 'anni'}: +${ahead * 30}%)` : ''}`),
        st === 'done' ? null : h('dt', null, 'Costo'), st === 'done' ? null : h('dd', null, `${cost.toFixed(2).replace('.', ',')} M a settimana`),
        x.consumes?.length ? h('dt', null, 'Consuma') : null, x.consumes?.length ? h('dd', null, x.consumes.map((r) => `${RESOURCES[r].icon} ${RESOURCES[r].label}${miss.includes(r) ? ' (manca: metà velocità)' : ''}`).join(', ')) : null,
        st === 'avail' ? h('dt', null, 'Scienziato') : null, st === 'avail' ? h('dd', null, sciSel) : null),
      st === 'done' ? h('p', { class: 'pos' }, '✓ Conosciuta.') : null,
      proj ? h('div', { class: 'buttons' }, h('button', { class: 'quiet', onclick: () => { cancelResearch(w, proj.id, me); this.host.toast('Ricerca interrotta: i fondi spesi sono persi.'); this.host.changed(); } }, 'Interrompi')) : null,
      st === 'avail' ? h('div', { class: 'buttons' }, h('button', { class: 'primary', disabled: !!err, title: err ?? '', onclick: () => { const e = startResearch(w, me, x.id, this.mySci || undefined); this.host.toast(e ?? `Ricerca avviata: ${x.name}.`); this.mySci = ''; this.host.changed(); } }, 'Avvia'), err ? h('span', { class: 'sub' }, err) : null) : null,
      st === 'lock' ? h('p', { class: 'sub' }, researchRefusal(w, me, x.id, true)) : null,
      collab);
  }
}

void research;
