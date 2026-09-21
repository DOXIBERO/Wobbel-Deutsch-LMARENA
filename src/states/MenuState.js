/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — MenuState (Part 020)
 * ============================================================
 * Title card + 3 fat touch-friendly buttons. SPIELEN starts a
 * session (R1→R5). The 3D world (bean on grass) shows behind.
 */
import { Logger } from '../core/Logger.js';
import { sfx } from '../audio/Sfx.js';

export class MenuState {
  constructor(game) {
    this.game = game;
    /** @type {number|null} */
    this._previewTimer = null;
  }

  onEnter() {
    const el = document.createElement('div');
    el.id = 'wo-menu';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 30; display: grid; place-items: center;
      background: rgba(8, 12, 20, 0.35); font-family: system-ui, sans-serif;`;
    el.innerHTML = `
      <div style="
        background: #161d2b; border-radius: 22px; padding: 34px 44px;
        box-shadow: 0 24px 80px rgba(0,0,0,.55); text-align: center; color:#fff;
        min-width: min(88vw, 380px);">
        <h1 style="font-size: 44px; letter-spacing: 2px;">WOBBEL DEUTSCH 🫘🇩🇪</h1>
        <p style="opacity:.7; margin: 8px 0 26px; font-size: 17px;">Learn German by Running!</p>
        <div style="display:grid; gap:14px;">
          <button data-action="start" style="${BTN}; background:#2ecc71; color:#062b14;">▶ SPIELEN</button>
          <button data-action="words" style="${BTN}; background:#3498db;">📚 WÖRTER</button>
          <button data-action="settings" style="${BTN}; background:#3a4557;">⚙️ EINSTELLUNGEN</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.querySelector('[data-action="start"]').addEventListener('click', () => {
      sfx.beep(660, 0.08, 0.08);
      this.game.startSession(); // R1 → COUNTDOWN
    });
    el.querySelector('[data-action="words"]').addEventListener('click', () => {
      sfx.beep(660, 0.08, 0.08);
      this.game.wordBank.show();        // Part 072
    });
    el.querySelector('[data-action="settings"]').addEventListener('click', () => {
      sfx.beep(660, 0.08, 0.08);
      this.game.settings.show();        // Part 073
    });

    // Menu camera: slow orbit around the bean
    this._t = 0;
    Logger.game('MENU: overlay shown');
  }

  onUpdate(dt) {
    // Gentle camera sway so the menu feels alive
    this._t += dt;
    const cam = this.game.engine.camera;
    if (cam && this.game.bean) {
      cam.position.x = Math.sin(this._t * 0.3) * 4;
      cam.position.y = 4.5;
      cam.position.z = 10 + Math.cos(this._t * 0.3) * 2;
      cam.lookAt(this.game.bean.root.position.x, 1, this.game.bean.root.position.z);
    }
  }

  onExit() {
    document.getElementById('wo-menu')?.remove();
  }
}

const BTN = `
  height:56px; border:0; border-radius:14px; font-size:19px; font-weight:800;
  cursor:pointer; color:#fff; letter-spacing:1px;`;
