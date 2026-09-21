/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BootState (Part 020)
 * ============================================================
 * Shows the loading veil, warms up data, auto-advances to MENU (~1 s).
 */
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

export class BootState {
  /** @param {import('../core/Game.js').Game} game */
  constructor(game) { this.game = game; }

  onEnter() {
    Logger.game('BOOT: initializing…');
    this.game.saveSystem.load(); // restores profile + SRS (or defaults)
    this._t = 0;
  }

  onUpdate(dt) {
    this._t += dt;
    if (this._t >= 1) this.game.state.transition('MENU');
  }

  onExit() {
    const veil = document.getElementById('boot-overlay');
    if (veil) veil.remove();
    Logger.game('BOOT: data layer ready');
    void eventBus;
  }
}
