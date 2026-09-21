/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — ScoreManager (Part 017)
 * ============================================================
 * Per-entity score tracking + rankings. addPoints() routes
 * through GameRules.calcScore (streak multipliers included).
 */
import { GameRules } from '../data/GameRules.js';

export class ScoreManager {
  constructor() {
    /** @type {Map<string, {points:number, correct:number, wrong:number, streak:number}>} */
    this.scores = new Map();
  }

  #entry(id) {
    if (!this.scores.has(id)) this.scores.set(id, { points: 0, correct: 0, wrong: 0, streak: 0 });
    return this.scores.get(id);
  }

  /**
   * Rules-aware scoring: 'correct' | 'wrong' | 'firstFinish'
   * | 'survival' | 'elimination'.
   * @param {string} id
   * @param {string} event
   * @param {{seconds?: number}} [ctx]
   * @returns {number} points actually added
   */
  addPoints(id, event, ctx = {}) {
    const e = this.#entry(id);
    if (event === 'correct') { e.streak += 1; e.correct += 1; }
    if (event === 'wrong') { e.streak = 0; e.wrong += 1; }
    const pts = GameRules.calcScore(event, { streak: e.streak, ...ctx });
    e.points += pts;
    return pts;
  }

  /** Raw add for per-second survival ticks (already computed). */
  add(id, pts) { this.#entry(id).points += pts; }

  getEntry(id) { return this.#entry(id); }

  reset() { this.scores.clear(); }

  /** Sorted best-first: [{id, points, correct, wrong, streak}] */
  getRankings() {
    return [...this.scores.entries()]
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => b.points - a.points);
  }

  /** 1-based rank of an id. */
  getPlayerRank(id = 'player') {
    return this.getRankings().findIndex((r) => r.id === id) + 1;
  }
}
