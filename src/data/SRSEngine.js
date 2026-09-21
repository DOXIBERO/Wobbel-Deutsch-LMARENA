/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — SRSEngine (Part 014)
 * ============================================================
 * Spaced repetition tuned for GAME ROUNDS (not days):
 *   correct (q>=3): reps++ ; interval = reps==1 ? 2 : reps==2 ? 5
 *                     : round(interval * ease)
 *   wrong  (q<3)  : reps = 0, interval = 1 (see it again next round)
 * Mastered = interval >= 20 rounds.
 */
export class SRSEngine {
  constructor() {
    /** @type {Map<string, {ease:number, interval:number, reps:number, nextReview:number}>} */
    this.words = new Map();
  }

  #state(id) {
    if (!this.words.has(id)) this.words.set(id, { ease: 2.5, interval: 0, reps: 0, nextReview: 0 });
    return this.words.get(id);
  }

  /**
   * @param {string} wordId
   * @param {0|1|2|3|4|5} quality
   * @param {number} currentRound round number (rounds are the time unit)
   */
  recordAnswer(wordId, quality, currentRound = 0) {
    const s = this.#state(wordId);
    if (quality >= 3) {
      s.reps += 1;
      s.interval = s.reps === 1 ? 2 : s.reps === 2 ? 5 : Math.round(s.interval * s.ease);
      s.ease = Math.max(1.3, s.ease + 0.1 - (5 - quality) * 0.08);
    } else {
      s.reps = 0;
      s.interval = 1;
    }
    s.nextReview = currentRound + s.interval;
    return s;
  }

  /** Words scheduled at or before currentRound. */
  getDueWords(count, currentRound) {
    return [...this.words.entries()]
      .filter(([, s]) => s.nextReview <= currentRound && s.reps > 0)
      .sort((a, b) => a[1].nextReview - b[1].nextReview)
      .slice(0, count)
      .map(([id]) => id);
  }

  /** Words never seen. */
  getNewWords(count) {
    return [...this.words.entries()]
      .filter(([, s]) => s.reps === 0)
      .slice(0, count)
      .map(([id]) => id);
  }

  /** Fully learned: interval >= 20 rounds. */
  getMastered() {
    return [...this.words.entries()]
      .filter(([, s]) => s.interval >= 20)
      .map(([id]) => id);
  }

  /** Serialize for SaveSystem. */
  toJSON() { return [...this.words.entries()]; }
  fromJSON(arr) { this.words = new Map(arr ?? []); }
}
