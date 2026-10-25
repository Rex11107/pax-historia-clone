import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { declareWar } from '../src/engine/diplomacy';
import { atWar, treatyBetween } from '../src/engine/world';
import { chatJSON, parseJSON, setTransport, type LLMConfig } from '../src/llm/client';
import { applyTranslation, applyWorldActions, narrate, translate } from '../src/llm/gm';
import { behavioralRules, talk } from '../src/llm/agents';
import { resolveProvince, worldDigest } from '../src/llm/context';
import type { MapData } from '../src/engine/types';

const MAP: MapData = JSON.parse(fs.readFileSync('public/data/europe1881.json', 'utf8'));
const cfg: LLMConfig = { apiKey: 'test', baseUrl: 'https://api.example.com', model: 'm' };
const id = (w: ReturnType<typeof newGame>, n: string) => w.map.provinces.find((p) => p.name === n)!.id;

let replies: unknown[] = [];
let requests: { url: string; body: any }[] = [];
beforeEach(() => {
  replies = []; requests = [];
  setTransport(async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    const r = replies.shift();
    const content = typeof r === 'string' ? r : JSON.stringify(r);
    return { status: 200, text: async () => JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 20 } }) };
  });
});

describe('client', () => {
  it('ripara JSON con blocchi di codice e virgole finali', () => {
    expect(parseJSON('```json\n{"a": [1,2,],}\n```')).toEqual({ a: [1, 2] });
  });
  it('ritenta se il modello risponde testo non JSON', async () => {
    replies = ['ecco la risposta: niente json', { ok: true }];
    expect(await chatJSON(cfg, [{ role: 'user', content: 'x' }])).toEqual({ ok: true });
    expect(requests.length).toBe(2);
    expect(requests[0].url).toBe('https://api.example.com/chat/completions');
    expect(requests[0].body.response_format).toEqual({ type: 'json_object' });
  });
  it('senza chiave non chiama la rete', async () => {
    await expect(chatJSON({ ...cfg, apiKey: '' }, [])).rejects.toThrow(/Chiave/);
  });
});

describe('Game Master', () => {
  it('traduce ordini con nomi di provincia e scarta le allucinazioni', async () => {
    const w = newGame(MAP);
    const u = w.state.units.find((x) => x.nation === 'ITA')!;
    replies = [{
      orders: [
        { unit: u.id, mode: 'replace', orders: [{ type: 'move', target: 'Milano' }, { type: 'entrench', until: { type: 'day_gte', value: 5 } }] },
        { unit: 'ITA-999', orders: [{ type: 'move', target: 'Roma' }] },
        { unit: 'FRA-1', orders: [{ type: 'move', target: 'Roma' }] },
      ],
      policies: { tax: 'high', press: 'ottima' },
      notes: 'ok',
    }];
    const r = await translate(cfg, w, 'concentra il primo corpo a Milano', []);
    expect(u.orders.length).toBe(2);
    expect(u.orders[0].target).toBe(id(w, 'Milano'));
    expect(r.errors.length).toBe(3); // unità inesistente, unità straniera, politica non valida
    expect(w.state.nations.ITA.policies.tax).toBe('high');
    // il prompt contiene lo stato e gli id delle unità
    expect(requests[0].body.messages.at(-1).content).toContain(u.id);
  });

  it('non dichiara guerra senza richiesta esplicita nel JSON e valida il bersaglio', () => {
    const w = newGame(MAP);
    const r = applyTranslation(w, { declare_war: [{ target: 'Atlantide' }] }, []);
    expect(r.errors[0]).toMatch(/sconosciuta/);
  });

  it('azioni del mondo: rifiuta guerre senza motivo, accetta quelle plausibili', () => {
    const w = newGame(MAP);
    const res = applyWorldActions(w, { world: [
      { type: 'declare_war', a: 'SWI', b: 'NED', reason: 'capriccio' },
      { type: 'declare_war', a: 'FRA', b: 'TUN', reason: 'incursioni dei Krumiri' },
      { type: 'declare_war', a: 'ITA', b: 'AUH' },
    ] }, []);
    expect(atWar(w.state, 'SWI', 'NED')).toBe(false);
    expect(atWar(w.state, 'FRA', 'TUN')).toBe(true);
    expect(atWar(w.state, 'ITA', 'AUH')).toBe(false);
    expect(res.rejected.length).toBe(2);
  });

  it('narrazione: usa gli eventi del motore e salva la cronaca', async () => {
    const w = newGame(MAP);
    const rep = runTurn(w);
    replies = [{ narrative: 'Settimana di attesa.', summary: 'nulla', world: [], chronicle: 'Inizio.' }];
    const n = await narrate(cfg, w, rep, rep.events);
    expect(n.narrative).toBe('Settimana di attesa.');
    expect(w.state.chronicle).toBe('Inizio.');
  });

  it('il contesto è compatto', () => {
    const w = newGame(MAP);
    expect(worldDigest(w).length).toBeLessThan(9000);
    expect(resolveProvince(w, 'milano')).toBe(id(w, 'Milano'));
    expect(resolveProvince(w, 'Trento (42)')).toBe(42);
  });
});

describe('agenti-nazione', () => {
  it('regole di comportamento derivate dai numeri', () => {
    const w = newGame(MAP);
    expect(behavioralRules(w, 'TUR').join(' ')).toMatch(/BANCAROTTA/);
    expect(behavioralRules(w, 'AUH').join(' ')).toMatch(/fragile/);
  });

  it('un accordo accettato dal modello passa dal codice', async () => {
    const w = newGame(MAP);
    replies = [{ reply: 'Accettiamo volentieri.', intent: 'accept', proposal: { type: 'non_aggression', years: 10 }, opinion_delta: 3 }];
    const r = await talk(cfg, w, 'GBR', 'Proponiamo un patto di non aggressione', { type: 'non_aggression', years: 10 }, []);
    expect(r.applied).toBeTruthy();
    expect(treatyBetween(w.state, 'ITA', 'GBR', 'non_aggression')).toBeTruthy();
    expect(w.state.chats.GBR.length).toBe(2);
  });

  it('il codice blocca un "sì" impossibile (cessione senza occupazione)', async () => {
    const w = newGame(MAP);
    declareWar(w, 'ITA', 'AUH', '');
    replies = [{ reply: 'Va bene, vi cediamo Trento.', intent: 'accept', proposal: { type: 'peace', giver: 'AUH', provinces: ['Trento'] } }];
    const r = await talk(cfg, w, 'AUH', 'Pace in cambio di Trento', null, []);
    expect(r.veto).toMatch(/non cede/);
    expect(w.state.owner[id(w, 'Trento')]).toBe('AUH');
    expect(atWar(w.state, 'ITA', 'AUH')).toBe(true);
  });

  it('alleanza con chi ci detesta: veto di plausibilità', async () => {
    const w = newGame(MAP);
    w.state.nations.FRA.opinion.ITA = -60;
    replies = [{ reply: 'Sì!', intent: 'accept', proposal: { type: 'alliance' } }];
    const r = await talk(cfg, w, 'FRA', 'Alleanza?', { type: 'alliance' }, []);
    expect(r.veto).toBeTruthy();
    expect(treatyBetween(w.state, 'ITA', 'FRA', 'alliance')).toBeFalsy();
  });
});
