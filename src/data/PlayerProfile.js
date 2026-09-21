/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — PlayerProfile (Part 015)
 * ============================================================
 * Learning state + settings; serialized by SaveSystem.
 */
export class PlayerProfile {
  constructor() {
    this.wordsLearned = new Set();
    this.currentStreak = 0;
    this.longestStreak = 0;
    /** @type {string[]} mastered word ids */
    this.mastered = [];
    /** @type {Array<{round:number, score:number, correct:number, wrong:number, date:string}>} */
    this.sessionHistory = [];
    this.settings = { audioVol: 1, sensitivity: 1, nativeLang: 'en' };
  }

  completeWord(id) {
    this.wordsLearned.add(id);
    if (!this.mastered.includes(id)) this.mastered.push(id);
  }

  incrementStreak() {
    this.currentStreak += 1;
    this.longestStreak = Math.max(this.longestStreak, this.currentStreak);
  }

  breakStreak() { this.currentStreak = 0; }

  /** @param {{score:number, correct:number, wrong:number, round:number}} stats */
  addSession(stats) {
    this.sessionHistory.push({ ...stats, date: new Date().toISOString() });
  }

  /** % of answers that were correct across all recorded sessions. */
  getAccuracy() {
    const c = this.sessionHistory.reduce((a, s) => a + (s.correct ?? 0), 0);
    const w = this.sessionHistory.reduce((a, s) => a + (s.wrong ?? 0), 0);
    return c + w === 0 ? 1 : c / (c + w);
  }

  toJSON() {
    return {
      wordsLearned: [...this.wordsLearned],
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      mastered: this.mastered,
      sessionHistory: this.sessionHistory,
      settings: this.settings,
    };
  }

  fromJSON(j) {
    if (!j) return;
    this.wordsLearned = new Set(j.wordsLearned ?? []);
    this.currentStreak = j.currentStreak ?? 0;
    this.longestStreak = j.longestStreak ?? 0;
    this.mastered = j.mastered ?? [];
    this.sessionHistory = j.sessionHistory ?? [];
    Object.assign(this.settings, j.settings ?? {});
  }
}
