/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — ResultsState (Part 024)
 * ============================================================
 * Session totals: score, words learned, mastery X/100.
 * "NOCHMAL" → MENU.
 */
import { Logger } from '../core/Logger.js';

export class ResultsState {
  constructor(game) { this.game = game; }

  onEnter() {
    const g = this.game;
    const total = g.sessionTotal;
    const learned = g.profile.wordsLearned.size;
    const mastery = g.srs.getMastered().length;
    const el = document.createElement('div');
    el.id = 'wo-results';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 33; display: grid; place-items: center;
      background: rgba(8, 12, 20, 0.62); color: #fff;
      font-family: system-ui, sans-serif; text-align: center;`;
    el.innerHTML = `
      <div style="background:#161d2b; border-radius:22px; padding:38px 52px; box-shadow:0 24px 80px rgba(0,0,0,.55); min-width:min(88vw,380px);">
        <h1 style="font-size:36px;">🏆 SESSION VORBEI!</h1>
        <p style="font-size:22px; margin-top:14px;">Gesamt: <strong>${total}</strong> Punkte</p>
        <p style="font-size:17px; opacity:.85; margin-top:6px;">Neue Wörter: ${learned}</p>
        <p style="font-size:17px; opacity:.85;">Meisterung: ${mastery}/100</p>
        <button id="wo-again" style="
          margin-top:24px; height:56px; padding:0 40px; border:0; border-radius:14px;
          background:#2ecc71; color:#062b14; font-size:19px; font-weight:800; cursor:pointer;">
          NOCHMAL</button>
      </div>`;
    document.body.appendChild(el);
    this._el = el;
    el.querySelector('#wo-again').addEventListener('click', () => g.state.transition('MENU'));
    Logger.game(`RESULTS: total=${total} learned=${learned} mastered=${mastery}`);
  }

  onUpdate() { /* waits for the button */ }

  onExit() { this._el?.remove(); this._el = null; }
}
