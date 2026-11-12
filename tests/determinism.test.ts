import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { newGame } from '../src/engine/setup';
import { runTurn } from '../src/engine/turn';
import { declareWar } from '../src/engine/diplomacy';
import { GameMap } from '../src/engine/map';
import type { MapData } from '../src/engine/types';
import type { World } from '../src/engine/world';

const MAP: MapData = JSON.parse(fs.readFileSync('public/data/europe1881.json', 'utf8'));
const hash = (w: World) => crypto.createHash('sha1').update(JSON.stringify(w.state)).digest('hex');
/** Le stesse mosse in ogni partita: due grandi guerre dal primo turno, una terza dal quarto. */
const script = (w: World, i: number) => {
  if (i === 0) { declareWar(w, 'GER', 'FRA', ''); declareWar(w, 'RUS', 'TUR', ''); }
  if (i === 3) declareWar(w, 'ITA', 'AUH', '');
};
const reload = (w: World): World => ({ map: new GameMap(MAP), profiles: w.profiles, state: JSON.parse(JSON.stringify(w.state)) });
const TURNS = 8;

describe('determinismo (AGENTS.md, principio 2)', () => {
  it('stesso seme e stesse mosse: stessa partita, anche salvando e ricaricando a ogni turno con un\'altra partita in corso', () => {
    const solo = newGame(MAP, 'SMR', 'alfa');
    const hashes: string[] = [];
    for (let i = 0; i < TURNS; i++) { script(solo, i); runTurn(solo); hashes.push(hash(solo)); }
    expect(solo.state.events.some((e) => e.type === 'battle_started')).toBe(true); // la prova passa per le battaglie

    // la stessa partita, ricaricata da zero a ogni turno, mentre nello stesso processo ne gira un'altra con un
    // altro seme: le cache del motore non devono portare nulla da un turno o da una partita all'altra
    let again = newGame(MAP, 'SMR', 'alfa');
    const other = newGame(MAP, 'SMR', 'beta');
    for (let i = 0; i < TURNS; i++) {
      script(other, i); runTurn(other);
      script(again, i); runTurn(again);
      expect(hash(again), `turno ${i + 1}`).toBe(hashes[i]);
      again = reload(again);
    }
    // un altro seme dà un'altra partita: il caso c'è, ma viene solo dal seme
    expect(hash(other)).not.toBe(hashes[TURNS - 1]);
  }, 120000);

  it('nel motore non ci sono orologi né numeri casuali di sistema', () => {
    const bad = /Math\.random|Date\.now|new Date\(\s*\)|performance\.now|crypto\.getRandomValues/;
    const found: string[] = [];
    for (const f of fs.readdirSync('src/engine')) {
      fs.readFileSync(`src/engine/${f}`, 'utf8').split('\n').forEach((line, i) => { if (bad.test(line) && !line.trim().startsWith('//')) found.push(`${f}:${i + 1}`); });
    }
    expect(found).toEqual([]);
  });
});
