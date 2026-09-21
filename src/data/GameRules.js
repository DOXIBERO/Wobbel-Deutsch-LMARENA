/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — GameRules (Part 017)
 * ============================================================
 * Pure scoring math: gates, streaks, finish, survival, elim.
 */
export const GameRules = {
  CORRECT: 100,
  WRONG: -50,
  WRONG_STUN_SECONDS: 1.5,
  FIRST_FINISH: 500,
  SURVIVAL_PER_SEC: 10,
  ELIMINATION_PENALTY: -200,
  ELIMINATION_RESPAWN_SECONDS: 3,
  STREAK_X2: 3,
  STREAK_X3: 5,

  /**
   * @param {'correct'|'wrong'|'firstFinish'|'survival'|'elimination'} event
   * @param {{streak?: number, seconds?: number}} [ctx]
   */
  calcScore(event, ctx = {}) {
    const streak = ctx.streak ?? 0;
    switch (event) {
      case 'correct': {
        let pts = this.CORRECT;
        if (streak >= this.STREAK_X3) pts *= 3;
        else if (streak >= this.STREAK_X2) pts *= 2;
        return pts;
      }
      case 'wrong': return this.WRONG;
      case 'firstFinish': return this.FIRST_FINISH;
      case 'survival': return this.SURVIVAL_PER_SEC * (ctx.seconds ?? 1);
      case 'elimination': return this.ELIMINATION_PENALTY;
      default: return 0;
    }
  },
};
