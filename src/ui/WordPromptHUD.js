/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — WordPromptHUD (Part 041)
 * ============================================================
 * Bottom-center challenge card: "🔊 Geh zu: WORD", pulse on voice,
 * shrinking timer bar, green/red feedback with shake.
 */
import { Logger } from '../core/Logger.js';

export class WordPromptHUD {
  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'wo-prompt';
    this.root.style.cssText = `
      position: fixed; bottom: 78px; left: 50%; transform: translateX(-50%);
      z-index: 100; display: none; text-align: center;
      background: rgba(0,0,0,.7); border-radius: 16px; padding: 14px 28px;
      font-family: system-ui, sans-serif; min-width: 260px;`;
    this.root.innerHTML = `
      <div id="wo-prompt-word" style="
        font-size: 28px; font-weight: 800; color: #ffd54d;
        text-shadow: 0 2px 6px rgba(0,0,0,.8);">🔊 Geh zu: —</div>
      <div style="height: 5px; background: rgba(255,255,255,.2); border-radius: 3px; margin-top: 10px; overflow: hidden;">
        <div id="wo-prompt-bar" style="height: 100%; width: 100%; background: #2ecc71; transition: width .1s linear;"></div>
      </div>`;
    document.body.appendChild(this.root);
    this._word = this.root.querySelector('#wo-prompt-word');
    this._bar = this.root.querySelector('#wo-prompt-bar');
    this._time = 0;
    this._total = 1;
    Logger.ui('WordPromptHUD: ready');
  }

  /** @param {string} word @param {number} timeLimit s */
  show(word, timeLimit) {
    this._time = timeLimit;
    this._total = timeLimit;
    this._word.innerHTML = `🔊 Geh zu: <span style="color:#fff">${word}</span>`;
    this.root.style.display = 'block';
  }

  hide() { this.root.style.display = 'none'; }

  /** Call per frame with dt. */
  tick(dt) {
    if (this.root.style.display === 'none') return;
    this._time = Math.max(0, this._time - dt);
    this._bar.style.width = `${(this._time / this._total) * 100}%`;
    this._bar.style.background = this._time < 3 ? '#e74c3c' : '#2ecc71';
  }

  /** Voice pulse 1→1.2→1 over 0.3 s. */
  pulse() {
    this._word.style.transition = 'transform .15s ease-out';
    this._word.style.transform = 'scale(1.2)';
    setTimeout(() => { this._word.style.transform = 'scale(1)'; }, 150);
  }

  /** Correct: green flash "✅ RICHTIG! +100" */
  feedbackCorrect(points) {
    this._showFeedback(`✅ RICHTIG! +${points}`, '#1e8e4d');
  }

  /** Wrong: red flash + CSS shake "❌ FALSCH! -50" */
  feedbackWrong(points) {
    this._showFeedback(`❌ FALSCH! ${points}`, '#c0392b', true);
  }

  _showFeedback(text, bg, shake = false) {
    const old = this.root.style.background;
    this.root.style.background = bg;
    this._word.textContent = text;
    if (shake) {
      let n = 0;
      const iv = setInterval(() => {
        this.root.style.transform = `translateX(-50%) translateX(${(n % 2 ? 6 : -6)}px)`;
        if (++n > 6) { clearInterval(iv); this.root.style.transform = 'translateX(-50%)'; }
      }, 40);
    }
    setTimeout(() => {
      this.root.style.background = old;
      this.hide();
    }, 1500);
  }
}
