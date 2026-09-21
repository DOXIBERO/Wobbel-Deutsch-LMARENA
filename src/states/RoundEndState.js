/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — RoundEndState (Part 024)
 * ============================================================
 * "RUNDE VORBEI!" + round stats, physics frozen, 5 s → RESULTS
 * (last round) or COUNTDOWN (more rounds in the session).
 */
import { Logger } from '../core/Logger.js';

export class RoundEndState {
  constructor(game) { this.game = game; }

  onEnter() {
    this.game.physicsFrozen = true;
    this.game.bankRound();
    this._t = 0;
    const s = this.game.lastRoundStats ?? { score: 0, correct: 0, wrong: 0, total: 0, rank: 1, reason: '' };
    const el = document.createElement('div');
    el.id = 'wo-roundend';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 33; display: grid; place-items: center;
      background: rgba(8, 12, 20, 0.55); color: #fff;
      font-family: system-ui, sans-serif; text-align: center;`;
    el.innerHTML = `
      <div style="background:#161d2b; border-radius:22px; padding:36px 50px; box-shadow:0 24px 80px rgba(0,0,0,.55);">
        <h1 style="font-size:40px;">RUNDE VORBEI!</h1>
        <p style="font-size:20px; margin-top:14px;">Punkte: <strong>${s.score}</strong></p>
        <p style="font-size:17px; opacity:.85;">Wörter richtig: ${s.correct}/${s.total}</p>
        <p style="font-size:17px; opacity:.85;">Platz: ${s.rank}</p>
        <p style="margin-top:18px; opacity:.55; font-size:14px;">Nächste Runde…</p>
      </div>`;
    document.body.appendChild(el);
    this._el = el;
    Logger.game('ROUND_END: stats shown');
  }

  onUpdate(dt) {
    this._t += dt;
    if (this._t >= 5) {
      const g = this.game;
      if (g.session.index + 1 < g.session.presets.length) {
        g.session.index += 1;
        g.state.transition('COUNTDOWN'); // next round
      } else {
        g.state.transition('RESULTS');
      }
    }
  }

  onExit() {
    this.game.physicsFrozen = false;
    this._el?.remove();
    this._el = null;
  }
}
