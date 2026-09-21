/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — DebugPanel (Part 025)
 * ============================================================
 * Toggle with D. FPS / state / bean pos / round / SRS due count,
 * refreshed every 500 ms.
 */
import { Logger } from '../core/Logger.js';

export class DebugPanel {
  /** @param {import('./Game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.visible = false;
    this.el = document.createElement('pre');
    this.el.id = 'wo-debug';
    this.el.style.cssText = `
      position: fixed; top: 10px; left: 10px; z-index: 40; display: none;
      background: rgba(0,0,0,.6); color: #9fe870; padding: 10px 12px;
      border-radius: 8px; font: 12px/1.5 monospace; pointer-events: none;
      white-space: pre;`;
    document.body.appendChild(this.el);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyD' && !e.repeat) this.toggle();
    });
    this._interval = setInterval(() => this.#refresh(), 500);
    Logger.ui('DebugPanel: ready — press D to toggle');
  }

  toggle() {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  #refresh() {
    if (!this.visible) return;
    const g = this.game;
    const p = g.bean?.body?.position;
    this.el.textContent = [
      `FPS: ${g.fps ?? '?'}`,
      `State: ${g.state.current}`,
      `Bean: ${p ? `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}` : '-'}`,
      `Round: R${g.currentRound?.id ?? '-'} (${(g.session?.index ?? 0) + 1}/${g.session?.presets.length ?? 5})`,
      `SRS due: ${g.srs.getDueWords(999, g.currentRound?.id ?? 0).length}`,
    ].join('\n');
  }
}
