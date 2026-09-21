/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — TimerSystem (Part 018)
 * ============================================================
 * Named countdown timers: tick + complete, pause/resume/cancel.
 */
export class TimerSystem {
  constructor() {
    /** @type {Map<string, {remaining:number, duration:number, onTick?:Function, onComplete:Function, paused:boolean}>} */
    this.timers = new Map();
  }

  /**
   * @param {string} id
   * @param {number} duration seconds
   * @param {(remaining:number)=>void} [onTick]
   * @param {()=>void} [onComplete]
   */
  createTimer(id, duration, onTick, onComplete) {
    this.timers.set(id, { remaining: duration, duration, onTick, onComplete, paused: false });
  }

  pause(id) { const t = this.timers.get(id); if (t) t.paused = true; }
  resume(id) { const t = this.timers.get(id); if (t) t.paused = false; }
  cancel(id) { this.timers.delete(id); }
  getRemaining(id) { return this.timers.get(id)?.remaining ?? 0; }

  /** @param {number} dt */
  update(dt) {
    for (const [id, t] of [...this.timers]) {
      if (t.paused) continue;
      t.remaining -= dt;
      t.onTick?.(Math.max(0, t.remaining));
      if (t.remaining <= 0) {
        this.timers.delete(id);
        t.onComplete?.();
      }
    }
  }
}
