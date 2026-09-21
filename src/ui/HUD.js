/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — HUD (Part 023)
 * ============================================================
 * Timer (top-center 32px), score (top-right), word prompt
 * (bottom-center), full-screen green/red feedback flashes.
 */
import { Logger } from '../core/Logger.js';

export class HUD {
  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'wo-hud';
    this.root.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 20;
      font-family: system-ui, -apple-system, sans-serif; color: #fff;
      display: none;`;
    this.root.innerHTML = `
      <div id="wo-hud-timer" style="
        position:absolute; top:14px; left:50%; transform:translateX(-50%);
        font-size:32px; font-weight:800; text-shadow:0 2px 8px rgba(0,0,0,.6);">60</div>
      <div style="
        position:absolute; top:16px; right:18px; text-align:right;
        text-shadow:0 2px 6px rgba(0,0,0,.6);">
        <div style="font-size:24px; font-weight:800;" id="wo-hud-score-points">0</div>
        <div style="font-size:13px; opacity:.85;" id="wo-hud-score-streak"></div>
      </div>
      <div id="wo-hud-prompt" style="
        position:absolute; bottom:26px; left:50%; transform:translateX(-50%);
        background:rgba(10,14,20,.75); border-radius:14px; padding:12px 22px;
        font-size:20px; font-weight:700; white-space:nowrap;"></div>`;
    document.body.appendChild(this.root);

    this._timer = this.root.querySelector('#wo-hud-timer');
    this._points = this.root.querySelector('#wo-hud-score-points');
    this._streak = this.root.querySelector('#wo-hud-score-streak');
    this._prompt = this.root.querySelector('#wo-hud-prompt');

    // Feedback flash layer
    this._flash = document.createElement('div');
    this._flash.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 19;
      opacity: 0; transition: opacity .12s;`;
    document.body.appendChild(this._flash);
    Logger.ui('HUD: ready');
  }

  show() { this.root.style.display = 'block'; }
  hide() { this.root.style.display = 'none'; }

  /** @param {number} seconds */
  setTimer(seconds) {
    this._timer.textContent = String(Math.max(0, Math.ceil(seconds)));
    this._timer.style.color = seconds <= 10 ? '#ff8a80' : '#fff';
  }

  /** @param {number} points @param {number} streak */
  setScore(points, streak = 0) {
    this._points.textContent = String(points);
    this._streak.textContent = streak >= 5 ? '🔥 ×3' : streak >= 3 ? '⚡ ×2' : '';
  }

  /** "🔊 Geh zu: word" */
  setPrompt(text) {
    this._prompt.innerHTML = text ? `🔊 Geh zu: <strong>${text}</strong>` : '🏁 ZIEL — LAUF!';
  }

  /** Green/red feedback flash. */
  flash(color) {
    this._flash.style.background = color;
    this._flash.style.opacity = '0.45';
    setTimeout(() => { this._flash.style.opacity = '0'; }, 140);
  }
}
