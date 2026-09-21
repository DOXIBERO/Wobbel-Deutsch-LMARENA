/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — QualityManager (Part 075)
 * ============================================================
 * FPS watch: < 30 fps for 5 s → auto performance mode (shadows
 * off, pixelRatio 1, −50 % particles). Manual Low/Medium/High
 * quality from Settings. Frustum culling stays three.js default.
 */
import { Logger } from './Logger.js';

const QUALITY = {
  low: { shadows: false, pixelRatio: 1, particles: 0 },
  medium: { shadows: true, shadowSize: 512, pixelRatio: 1.5, particles: 0.5 },
  high: { shadows: true, shadowSize: 1024, pixelRatio: 2, particles: 1 },
};

export const QualityManager = {
  mode: 'high',
  particleScale: 1,
  _lowT: 0,

  /** Wire the renderer; reads saved quality from profile.settings. */
  init(game) {
    this.game = game;
    this.apply(game.profile.settings.quality ?? 'high');
  },

  /** @param {'low'|'medium'|'high'} mode */
  apply(mode) {
    this.mode = mode;
    const q = QUALITY[mode] ?? QUALITY.high;
    const r = this.game.engine.renderer;
    r.shadowMap.enabled = q.shadows;
    if (q.shadowSize) {
      for (const light of this.game.engine.scene.children.filter((o) => o.isDirectionalLight)) {
        light.shadow.mapSize.setScalar(q.shadowSize);
        light.shadow.map?.dispose();
        light.shadow.map = null;
      }
    }
    r.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, q.pixelRatio));
    this.particleScale = q.particles;
    this.game.profile.settings.quality = mode;
    Logger.game(`QualityManager: ${mode} (shadows=${q.shadows} dpr=${r.getPixelRatio()} particles=${q.particles})`);
  },

  /** Auto-reduce when FPS < 30 for 5 s (one-way until reload). */
  tick(dt, fps) {
    if (this.mode === 'low') return;
    if (fps < 30) {
      this._lowT += dt;
      if (this._lowT >= 5) {
        this.apply('low');
        Logger.game('Performance mode activated');
      }
    } else this._lowT = 0;
  },
};
