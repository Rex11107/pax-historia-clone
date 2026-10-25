// Sessione di gioco: collega motore, AI e salvataggi. L'interfaccia parla solo con questa classe.

import { GameMap } from './engine/map';
import { newGame, profilesFor } from './engine/setup';
import { runTurn } from './engine/turn';
import type { GameEvent, GameState, MapData, Tag, TurnReport } from './engine/types';
import type { World } from './engine/world';
import type { LLMConfig } from './llm/client';
import { acceptOffer, talk, type TalkResult } from './llm/agents';
import { fallbackNarrative, memorySummaryFallback, narrate, recordMemory, translate } from './llm/gm';
import type { Proposal } from './engine/diplomacy';
import { saveGame } from './storage/storage';

export interface TurnOutcome {
  report: TurnReport;
  narrative: string;
  notes: string;
  applied: string[];
  errors: string[];
  aiError?: string;
  extraEvents: GameEvent[];
}

export type Phase = 'traduzione' | 'simulazione' | 'dispaccio' | 'salvataggio';

export class Game {
  world: World;
  config: LLMConfig;
  busy = false;
  lastOutcome: TurnOutcome | null = null;

  constructor(world: World, config: LLMConfig) {
    this.world = world;
    this.config = config;
  }

  static create(map: MapData, player: Tag, config: LLMConfig, seed = String(Date.now())): Game {
    return new Game(newGame(map, player, seed), config);
  }

  static fromState(map: MapData, state: GameState, config: LLMConfig): Game {
    return new Game({ map: new GameMap(map), profiles: profilesFor(), state }, config);
  }

  get state() { return this.world.state; }
  get hasKey() { return !!this.config.apiKey; }

  async playTurn(directive: string, onPhase: (p: Phase) => void = () => {}): Promise<TurnOutcome> {
    if (this.busy) throw new Error('turno già in corso');
    this.busy = true;
    const w = this.world;
    const pre: GameEvent[] = [];
    const out: TurnOutcome = { report: null as unknown as TurnReport, narrative: '', notes: '', applied: [], errors: [], extraEvents: pre };
    try {
      if (directive.trim()) {
        if (!this.hasKey) out.errors.push('Le direttive scritte richiedono la chiave API (Impostazioni). Gli ordini dati dalla mappa valgono comunque.');
        else {
          onPhase('traduzione');
          try {
            const t = await translate(this.config, w, directive, pre);
            out.applied.push(...t.applied); out.errors.push(...t.errors); out.notes = t.notes;
          } catch (e) { out.aiError = (e as Error).message; }
        }
      }
      onPhase('simulazione');
      await new Promise((r) => setTimeout(r, 30));
      const report = runTurn(w);
      report.events.unshift(...pre);
      out.report = report;
      onPhase('dispaccio');
      let summary = '';
      if (this.hasKey && !out.aiError) {
        try {
          const n = await narrate(this.config, w, report, report.events);
          out.narrative = n.narrative; summary = n.summary;
          if (n.worldApplied.length) out.applied.push(...n.worldApplied.map((x) => `mondo: ${x}`));
        } catch (e) { out.aiError = (e as Error).message; }
      }
      if (!out.narrative) out.narrative = fallbackNarrative(w, report);
      recordMemory(w, report.turn, summary || memorySummaryFallback(w, report));
      onPhase('salvataggio');
      await this.save('auto');
      this.lastOutcome = out;
      return out;
    } finally {
      this.busy = false;
    }
  }

  async talk(tag: Tag, text: string, offer: Proposal | null): Promise<TalkResult & { events: GameEvent[] }> {
    const events: GameEvent[] = [];
    const r = await talk(this.config, this.world, tag, text, offer, events);
    await this.save('auto');
    return { ...r, events };
  }

  acceptOffer(tag: Tag, p: Proposal): string | null {
    const err = acceptOffer(this.world, tag, p, []);
    void this.save('auto');
    return err;
  }

  async save(slot: string, label?: string) {
    const s = this.state;
    await saveGame(slot, s, label ?? `${this.world.profiles[s.player].name} — turno ${s.turn}`);
  }
}
