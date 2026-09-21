/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — GameLoop (Part 004)
 * ============================================================
 * Fixed-timestep accumulator loop: 60 updates/s, render each rAF.
 * Real delta clamped at 0.05 s → tab switches never explode physics.
 */
import { Logger } from './Logger.js';

export class GameLoop {
  static FIXED_DT = 1 / 60;
  static MAX_DELTA = 0.05;

  constructor() {
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this._rafId = 0;
    this.updateCbs = new Set();
    this.renderCbs = new Set();
    this._fpsFrames = 0;
    this._fpsWindow = 0;
  }

  /** Register a fixed-step update callback (receives fixed dt). */
  onUpdate(cb) { this.updateCbs.add(cb); }

  /** Register a per-frame render callback (receives alpha 0..1). */
  onRender(cb) { this.renderCbs.add(cb); }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    const tick = (now) => {
      if (!this.running) return;
      this._rafId = requestAnimationFrame(tick);

      let realDelta = (now - this.lastTime) / 1000;
      this.lastTime = now;
      if (realDelta > GameLoop.MAX_DELTA) realDelta = GameLoop.MAX_DELTA; // tab protection

      // FPS readout every 2 s (acceptance: ~60)
      this._fpsFrames++; this._fpsWindow += realDelta;
      if (this._fpsWindow >= 2) {
        Logger.game(`FPS: ${Math.round(this._fpsFrames / this._fpsWindow)}`);
        this._fpsFrames = 0; this._fpsWindow = 0;
      }

      this.accumulator += realDelta;
      while (this.accumulator >= GameLoop.FIXED_DT) {
        for (const cb of this.updateCbs) cb(GameLoop.FIXED_DT);
        this.accumulator -= GameLoop.FIXED_DT;
      }
      const alpha = this.accumulator / GameLoop.FIXED_DT;
      for (const cb of this.renderCbs) cb(alpha);
    };
    this._rafId = requestAnimationFrame(tick);
    Logger.game(`GameLoop: started (fixed dt = ${GameLoop.FIXED_DT.toFixed(4)}s)`);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._rafId);
  }
}
