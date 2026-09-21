/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — RoundEndState (Parts 024 + 067)
 * ============================================================
 * "RUNDE VORBEI!" + round stats + live rankings (player vs bots),
 * DifficultyScaler adjust, then next round (COUNTDOWN) or RESULTS.
 * Between rounds: "RUNDE X/Y" + next-course preview.
 */
import { Logger } from '../core/Logger.js';

export class RoundEndState {
  constructor(game) { this.game = game; }

  onEnter() {
    const g = this.game;
    g.physicsFrozen = true;
    g.bankRound();
    this._t = 0;
    const s = g.lastRoundStats ?? { score: 0, correct: 0, wrong: 0, total: 0, rank: 1, reason: '' };
    const rm = g.roundManager;
    const medals = ['🥇', '🥈', '🥉'];
    const rankings = (g.lastRoundRankings ?? [{ key: 'player', name: 'DU' }])
      .slice(0, 6)
      .map((r, i) => `<div style="margin:3px 0; ${r.key === 'player' ? 'font-weight:800; color:#ffd54f;' : 'opacity:.85;'}">
        ${i + 1}. ${medals[i] ?? '·'} ${r.key === 'player' ? 'DU' : r.name}${r.finished ? ' 🏁' : ''}</div>`)
      .join('');

    const more = rm.active && rm.index + 1 < rm.total;
    const next = more ? rm.plan[rm.index + 1] : null;
    const stars = (d) => '★'.repeat(d) + '☆'.repeat(3 - d);
    const preview = next
      ? `<p style="margin-top:16px; font-size:15px; opacity:.85;">
          RUNDE ${rm.index + 2}/${rm.total}: <strong>${next.template.name}</strong> ${stars(next.difficulty)}
          ${next.template.generated ? '· generiert' : ''}</p>`
      : '<p style="margin-top:16px; font-size:15px; opacity:.7;">Letzte Runde geschafft!</p>';

    const el = document.createElement('div');
    el.id = 'wo-roundend';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 33; display: grid; place-items: center;
      background: rgba(8, 12, 20, 0.55); color: #fff;
      font-family: system-ui, sans-serif; text-align: center;`;
    el.innerHTML = `
      <div style="background:#161d2b; border-radius:22px; padding:32px 46px; box-shadow:0 24px 80px rgba(0,0,0,.55); min-width:min(88vw,360px);">
        <h1 style="font-size:38px;">RUNDE VORBEI!</h1>
        <p style="font-size:20px; margin-top:12px;">Punkte: <strong>${s.score}</strong></p>
        <p style="font-size:17px; opacity:.85;">Wörter richtig: ${s.correct}/${s.total}</p>
        <div style="margin-top:14px; font-size:17px; text-align:left; display:inline-block;">${rankings}</div>
        ${preview}
        <p style="margin-top:14px; opacity:.55; font-size:14px;">Nächste Runde…</p>
      </div>`;
    document.body.appendChild(el);
    this._el = el;

    // ── Part 068: adapt the NEXT round before it starts
    g.roundManager.applyAdjustment(s);
    Logger.game(`ROUND_END: score=${s.score} ${s.correct}/${s.total} (${s.reason})`);
  }

  onUpdate(dt) {
    this._t += dt;
    if (this._t >= 6) {
      const g = this.game;
      const next = g.roundManager.advanceRound();
      if (next) g.state.transition('COUNTDOWN'); // next round
      else g.state.transition('RESULTS');
    }
  }

  onExit() {
    this.game.physicsFrozen = false;
    this._el?.remove();
    this._el = null;
  }
}
