/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — TouchControls (Part 036)
 * ============================================================
 * Mobile: left virtual joystick (proportional), right JUMP/DIVE
 * buttons, multi-touch safe, no scroll/zoom, audio unlock overlay.
 * Emits through the SAME InputManager paths as the keyboard.
 */
import { eventBus } from './EventBus.js';
import { sfx } from '../audio/Sfx.js';
import { Logger } from './Logger.js';

export class TouchControls {
  /** @param {import('./InputManager.js').InputManager} input */
  constructor(input) {
    this.input = input;
    this.joyId = null;
    this.joyVec = { x: 0, y: 0 }; // -1..1 (y+ = forward)
    if (!this.#isTouch()) { Logger.ui('TouchControls: touch not detected — skipped'); return; }

    const css = (s) => Object.assign(document.createElement('div'), { style: s });

    // ── Joystick base + thumb (left)
    this.base = css(`
      position: fixed; left: 24px; bottom: 90px; width: 120px; height: 120px;
      border-radius: 50%; background: rgba(255,255,255,.2); z-index: 60;
      touch-action: none;`);
    this.thumb = css(`
      position: absolute; left: 35px; top: 35px; width: 50px; height: 50px;
      border-radius: 50%; background: rgba(255,255,255,.55); pointer-events: none;`);
    this.base.appendChild(this.thumb);
    document.body.appendChild(this.base);

    // ── JUMP / DIVE buttons (right)
    this.btnJump = css(`
      position: fixed; right: 26px; bottom: 80px; width: 80px; height: 80px;
      border-radius: 50%; background: rgba(46,204,113,.85); z-index: 60;
      display: grid; place-items: center; font-size: 34px; color: #fff;
      user-select: none; touch-action: none;`);
    this.btnJump.textContent = '⬆';
    this.btnDive = css(`
      position: fixed; right: 36px; bottom: 175px; width: 60px; height: 60px;
      border-radius: 50%; background: rgba(52,152,219,.85); z-index: 60;
      display: grid; place-items: center; font-size: 26px; color: #fff;
      user-select: none; touch-action: none;`);
    this.btnDive.textContent = '⬇';
    document.body.appendChild(this.btnJump);
    document.body.appendChild(this.btnDive);

    // ── Events: multi-touch (joystick pointer ≠ button pointers)
    this.base.addEventListener('touchstart', (e) => this.#joyStart(e), { passive: false });
    this.base.addEventListener('touchmove', (e) => this.#joyMove(e), { passive: false });
    this.base.addEventListener('touchend', (e) => this.#joyEnd(e), { passive: false });
    this.btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); input.tryJump(); }, { passive: false });
    this.btnDive.addEventListener('touchstart', (e) => { e.preventDefault(); input.tryDive(); }, { passive: false });

    // Block page scroll/zoom gestures
    document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // ── Audio unlock on first tap (mobile requirement)
    this.unlock = css(`
      position: fixed; inset: 0; z-index: 70; display: grid; place-items: center;
      background: rgba(8,12,20,.8); color: #fff; font-size: 26px; font-weight: 800;
      font-family: system-ui, sans-serif;`);
    this.unlock.textContent = '👆 Tap to Start';
    this.unlock.addEventListener('touchstart', () => {
      try { speechSynthesis?.speak(new SpeechSynthesisUtterance('')); } catch { /* noop */ }
      sfx.beep(440, 0.05, 0.01); // wakes/resumes the AudioContext
      this.unlock.remove();
    }, { once: true, passive: true });
    document.body.appendChild(this.unlock);

    Logger.ui('TouchControls: joystick + JUMP/DIVE mounted');
  }

  #isTouch() {
    return 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
  }

  #joyStart(e) {
    e.preventDefault();
    if (this.joyId !== null) return;
    this.joyId = e.changedTouches[0].identifier;
    this.#joyMove(e);
  }

  #joyMove(e) {
    e.preventDefault();
    const t = [...e.changedTouches].find((t) => t.identifier === this.joyId);
    if (!t) return;
    const r = this.base.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = t.clientX - cx, dy = t.clientY - cy;
    const max = r.width / 2;
    const dist = Math.min(max, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    const tx = Math.cos(ang) * dist, ty = Math.sin(ang) * dist;
    this.thumb.style.left = `${35 + tx * (dist / max)}px`;
    this.thumb.style.top = `${35 + ty * (dist / max)}px`;
    this.joyVec.x = (dx / max) * (dist / max > 0.15 ? 1 : dist / max / 0.15);
    this.joyVec.y = (-dy / max) * (dist / max > 0.15 ? 1 : dist / max / 0.15);
    this.joyVec.x = Math.max(-1, Math.min(1, this.joyVec.x));
    this.joyVec.y = Math.max(-1, Math.min(1, this.joyVec.y));
  }

  #joyEnd(e) {
    e.preventDefault();
    if (![...e.changedTouches].some((t) => t.identifier === this.joyId)) return;
    this.joyId = null;
    this.joyVec.x = 0; this.joyVec.y = 0;
    this.thumb.style.left = '35px'; this.thumb.style.top = '35px';
  }

  /** Merge the joystick vector into keyboard axes (called by InputManager). */
  axes() { return this.joyVec ?? { x: 0, y: 0 }; }

  dispose() {
    this.base?.remove(); this.btnJump?.remove(); this.btnDive?.remove(); this.unlock?.remove();
  }
}
