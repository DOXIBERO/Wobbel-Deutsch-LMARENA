/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — RoundManager (Parts 066 + 067)
 * ============================================================
 * Owns a multi-round session: round plan (classic → templates →
 * generated seeds), word selection per round (SRS-weighted via
 * WordSelector), difficulty scaling between rounds and the
 * legacy `game.session` shape still read by old states.
 */
import { LevelTemplates } from '../data/LevelTemplates.js';
import { LevelGenerator } from '../levels/LevelGenerator.js';
import { DifficultyScaler, BOT_COUNT } from './DifficultyScaler.js';
import { eventBus } from './EventBus.js';
import { Logger } from './Logger.js';

export class RoundManager {
  /** @param {import('./Game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.plan = [];
    this.index = 0;
    this.active = false;
    this.scaler = new DifficultyScaler();
    this.history = [];        // per-round stats for ResultsState
  }

  /**
   * Build the session plan. R1 = classic batch-2 course (difficulty 1),
   * then alternating designed templates and seeded generated courses.
   * @param {{rounds?:number}} [opts]
   */
  startSession(opts = {}) {
    const rounds = Math.min(5, Math.max(3, opts.rounds ?? 5));
    this.plan = [];
    this.index = 0;
    this.active = true;
    this.scaler = new DifficultyScaler();
    this.history = [];
    let difficulty = 1;
    for (let i = 0; i < rounds; i++) {
      this.plan.push(this.#makeRound(i, difficulty));
      difficulty = Math.min(3, 1 + Math.floor(i / 2));   // gentle ramp R1..R5
    }
    this.#syncLegacy();
    Logger.game(`RoundManager: session of ${rounds} rounds — ${this.plan.map((r) => r.template.id).join(', ')}`);
    eventBus.emit('session:started', { rounds: this.plan.length });
  }

  #makeRound(i, difficulty, usedIds = new Set()) {
    if (i === 0) {
      return { template: structuredClone(LevelTemplates.getTemplate('classic-60')), difficulty: 1, botCount: BOT_COUNT[1], seed: null };
    }
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const d = Math.min(3, difficulty);
    let template;
    if (i % 2 === 1) {
      // designed template, never repeating within a session
      const pool = LevelTemplates.all.filter((t) => !t.classic && t.difficulty === d && !usedIds.has(t.id));
      const pick = (pool.length ? pool : LevelTemplates.all.filter((t) => !t.classic && !usedIds.has(t.id)))[0]
        ?? LevelTemplates.getRandom(d);
      usedIds.add(pick.id);
      template = structuredClone(pick);
    } else {
      template = LevelGenerator.generateFromSeed(seed);
    }
    return {
      template,
      difficulty: template.difficulty ?? d,
      botCount: BOT_COUNT[Math.min(3, template.difficulty ?? d)],
      seed: template.generated ? seed : null,
    };
  }

  /** The active round plan (null outside sessions). */
  get current() { return this.active ? this.plan[this.index] ?? null : null; }
  currentRound() { return this.current; }
  get total() { return this.plan.length; }

  /** Pick this round's gate words (SRS-weighted) into game.roundWords. */
  prepareRound() {
    const g = this.game;
    const cur = this.current;
    const preset = { categories: cur.template.categories ?? 'ALL' };
    g.wordSelector.startRound();
    const gateCount = Math.max(3, cur.template.gateCount ?? 3);
    g.roundWords = Array.from({ length: gateCount }, (_, gi) =>
      g.wordSelector.selectForGate(gi, preset, g.srs, gi + 1));
    g.currentRound = { id: `${cur.template.id}#r${this.index + 1}`, categories: preset.categories };
    return g.roundWords;
  }

  /** Feed last round's stats to the scaler (RoundEndState). */
  applyAdjustment(stats) {
    const cfg = this.scaler.adjust(stats);
    const next = this.plan[this.index + 1];
    if (next) {
      next.difficulty = cfg.difficulty;
      next.botCount = cfg.botCount;
    }
    return cfg;
  }

  /** Next round or null when the session is over. */
  advanceRound() {
    this.index += 1;
    this.#syncLegacy();
    if (!this.current) { this.active = false; return null; }
    return this.current;
  }

  /** Keep the legacy game.session shape alive for old states. */
  #syncLegacy() {
    const g = this.game;
    g.session = {
      presets: this.plan.map((r) => ({ id: r.template.id, categories: r.template.categories ?? 'ALL' })),
      index: this.index,
    };
  }
}
