/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — TutorialOverlay (Part 074)
 * ============================================================
 * First-play guide, 4 steps keyed to real player actions:
 * run 5 m → jump → reach a gate → done. "ÜBERSPRINGEN" skips;
 * never shows again (PlayerProfile.settings.tutorialDone).
 */
import { Logger } from '../core/Logger.js';

const STEPS = [
  { text: 'Benutze WASD zum Laufen! (Use WASD to run!)', done: (t) => t.moved >= 5 },
  { text: 'Drücke LEERTASTE zum Springen! (Press SPACE to jump!)', done: (t) => t.jumped },
  { text: 'Höre das Wort und wähle die richtige Tür! (Listen and pick the right door!)', done: (t) => t.gateNear },
  { text: 'Sammle Punkte und lerne Deutsch! (Collect points, learn German!)', done: (t) => t.next },
];

export class TutorialOverlay {
  /** @param {import('../core/Game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.el = null;
    this.step = 0;
    this.track = { moved: 0, jumped: false, gateNear: false, next: false };
    this._lastZ = null;
    this._onJump = null;
  }

  /** Called from PlayingState.onEnter. Shows only on the first ever round. */
  maybeStart() {
    if (this.game.profile.settings.tutorialDone) return false;
    this.step = 0;
    this.track = { moved: 0, jumped: false, gateNear: false, next: false };
    this.#render();
    this._onJump = () => { this.track.jumped = true; };
    window.addEventListener('keydown', this._onJump, { once: false });
    Logger.game('TUTORIAL: started');
    return true;
  }

  /** Called from PlayingState.onUpdate with the bean body. */
  update(beanBody, nearGate) {
    if (!this.el) return;
    if (this._lastZ === null) this._lastZ = beanBody.position.z;
    this.track.moved += Math.max(0, this._lastZ - beanBody.position.z);
    this._lastZ = beanBody.position.z;
    this.track.gateNear ||= !!nearGate;
    const step = STEPS[this.step];
    if (step.done(this.track)) this.#advance();
  }

  #advance() {
    this.step += 1;
    if (this.step >= STEPS.length) { this.#finish(); return; }
    this.track.next = this.step === STEPS.length - 1;   // last step auto-closes
    this.#render();
  }

  #render() {
    this.el?.remove();
    const step = STEPS[Math.min(this.step, STEPS.length - 1)];
    const el = document.createElement('div');
    el.id = 'wo-tutorial';
    el.style.cssText = `position:fixed; left:50%; bottom:18%; transform:translateX(-50%); z-index:34;
      background:rgba(13,18,28,0.92); border-radius:18px; padding:18px 26px; color:#fff;
      font-family:system-ui,sans-serif; text-align:center; max-width:min(92vw,520px);
      box-shadow:0 18px 60px rgba(0,0,0,.5);`;
    el.innerHTML = `
      <div style="font-size:19px; font-weight:700;">${step.text}</div>
      <div style="opacity:.55; font-size:13px; margin-top:6px;">Schritt ${this.step + 1}/${STEPS.length}</div>
      <button data-a="next" style="margin-top:12px; padding:10px 22px; border-radius:12px; border:0; background:#2ecc71; color:#062b14; font-size:16px; font-weight:700;">WEITER</button>
      <button data-a="skip" style="margin-top:12px; margin-left:8px; padding:10px 18px; border-radius:12px; border:0; background:#3a4557; color:#fff; font-size:15px;">ÜBERSPRINGEN</button>`;
    document.body.appendChild(el);
    this.el = el;
    el.querySelector('[data-a="next"]').addEventListener('click', () => this.#advance());
    el.querySelector('[data-a="skip"]').addEventListener('click', () => this.#finish());
  }

  #finish() {
    this.el?.remove();
    this.el = null;
    window.removeEventListener('keydown', this._onJump);
    this.game.profile.settings.tutorialDone = true;
    this.game.saveSystem?.save();
    Logger.game('TUTORIAL: done (never shows again)');
  }
}
