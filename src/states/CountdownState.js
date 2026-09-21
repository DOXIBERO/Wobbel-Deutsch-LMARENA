/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — CountdownState (Part 021)
 * ============================================================
 * 3 → 2 → 1 → LOS! with 440 Hz beeps (880 Hz on LOS), then PLAYING.
 */
import { sfx } from '../audio/Sfx.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

export class CountdownState {
  constructor(game) {
    this.game = game;
    this._el = null;
  }

  onEnter() {
    this.game.session ??= { presets: [], index: 0 };
    this._step = 0;
    this._t = 0;
    this._el = document.createElement('div');
    this._el.id = 'wo-countdown';
    this._el.style.cssText = `
      position: fixed; inset: 0; z-index: 32; display: grid; place-items: center;
      font-size: 150px; font-weight: 900; color: #fff;
      text-shadow: 0 6px 30px rgba(0,0,0,.55); font-family: system-ui, sans-serif;`;
    this._el.textContent = '3';
    document.body.appendChild(this._el);
    soundFX.play('beep');
    this.#prepareRound();
    Logger.game('COUNTDOWN: 3');
  }

  /** Load the current round's words into the course while counting down. */
  #prepareRound() {
    this.game.prepareRound();
    this.game.hud.show();
  }

  onUpdate(dt) {
    this._t += dt;
    if (this._t >= 1) {
      this._t = 0;
      this._step += 1;
      if (this._step === 1) { this._el.textContent = '2'; soundFX.play('beep'); }
      else if (this._step === 2) { this._el.textContent = '1'; soundFX.play('beep'); }
      else if (this._step === 3) { this._el.textContent = 'LOS!'; soundFX.play('go'); }
      else if (this._step === 4) { this._el.textContent = ''; } // 0.5 s pause
      else {
        this.game.state.transition('PLAYING');
      }
    }
  }

  onExit() {
    this._el?.remove();
    this._el = null;
  }
}
