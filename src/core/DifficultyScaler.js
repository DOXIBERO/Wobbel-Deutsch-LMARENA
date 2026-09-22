/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — DifficultyScaler (Part 068)
 * ============================================================
 * Adaptive difficulty from the last rounds: >80% accuracy ramps
 * up, <40% eases off, between = hold. Gradual (±1 step), clamped
 * to [1,3]. Bot count follows: easy 3, medium 5, hard 7.
 */
import { Logger } from './Logger.js';

export const BOT_COUNT = { 1: 10, 2: 12, 3: 14 };

export class DifficultyScaler {
  constructor() {
    this.history = [];        // last rounds' {correct, total, avgResponse}
    this.difficulty = 1;
  }

  /** Feed one round result. */
  push(stats) {
    this.history.push(stats);
    if (this.history.length > 3) this.history.shift();
  }

  /**
   * @param {{correct:number, total:number}} lastRound
   * @returns {{difficulty:number, botCount:number, timerScale:number}} next-round config
   */
  adjust(lastRound) {
    if (lastRound && lastRound.total > 0) this.push(lastRound);
    const last3 = this.history.slice(-3);
    const acc = last3.length
      ? last3.reduce((a, r) => a + r.correct / Math.max(1, r.total), 0) / last3.length
      : 0.5;
    const prev = this.difficulty;
    if (acc > 0.8) this.difficulty = Math.min(3, this.difficulty + 1);
    else if (acc < 0.4) this.difficulty = Math.max(1, this.difficulty - 1);
    // 40–80 % → maintain; max ±1 per round guaranteed by clamp step
    const changed = this.difficulty !== prev;
    Logger.game(`DifficultyScaler: acc=${(acc * 100).toFixed(0)}% → difficulty ${prev}→${this.difficulty}`);
    return {
      difficulty: this.difficulty,
      botCount: BOT_COUNT[this.difficulty],
      timerScale: this.difficulty === 1 ? 1.15 : this.difficulty === 3 ? 0.9 : 1,
      changed,
    };
  }
}
