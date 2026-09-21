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
    // ── Part 067: full session summary from RoundManager history
    const hist = g.roundManager.history ?? [];
    const answered = hist.reduce((a, r) => a + r.total, 0);
    const right = hist.reduce((a, r) => a + r.correct, 0);
    const acc = answered ? Math.round((right / answered) * 100) : 0;
    const best = hist.length ? Math.max(...hist.map((r) => r.score)) : 0;
    const worst = hist.length ? Math.min(...hist.map((r) => r.score)) : 0;
    const perRound = hist.map((r, i) =>
      `<div style="font-size:14px; opacity:.8; margin:2px 0;">R${i + 1} ${r.template}: ${r.score} Pkt · ${r.correct}/${r.total}</div>`).join('');
    const el = document.createElement('div');
    el.id = 'wo-results';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 33; display: grid; place-items: center;
      background: rgba(8, 12, 20, 0.62); color: #fff;
      font-family: system-ui, sans-serif; text-align: center;`;
    el.innerHTML = `
      <div style="background:#161d2b; border-radius:22px; padding:34px 48px; box-shadow:0 24px 80px rgba(0,0,0,.55); min-width:min(90vw,400px);">
        <h1 style="font-size:36px;">🏆 SESSION VORBEI!</h1>
        <p style="font-size:22px; margin-top:12px;">Gesamt: <strong>${total}</strong> Punkte</p>
        <p style="font-size:16px; opacity:.85; margin-top:4px;">${hist.length} Runden · Treffsicherheit ${acc}% (${right}/${answered})</p>
        <p style="font-size:16px; opacity:.85;">Beste Runde ${best} · Schwächste ${worst}</p>
        <div style="margin-top:10px;">${perRound}</div>
        <p style="font-size:17px; opacity:.85; margin-top:8px;">Neue Wörter: ${learned} · Meisterung: ${mastery}/100</p>
        <button id="wo-again" style="
          margin-top:20px; height:56px; padding:0 40px; border:0; border-radius:14px;
          background:#2ecc71; color:#062b14; font-size:19px; font-weight:800; cursor:pointer;">
          NOCHMAL</button>
      </div>`;
    document.body.appendChild(el);
    this._el = el;
    el.querySelector('#wo-again').addEventListener('click', () => g.state.transition('MENU'));
    Logger.game(`RESULTS: total=${total} learned=${learned} mastered=${mastery} acc=${acc}%`);
  }

  onUpdate() { /* waits for the button */ }

  onExit() { this._el?.remove(); this._el = null; }
}
