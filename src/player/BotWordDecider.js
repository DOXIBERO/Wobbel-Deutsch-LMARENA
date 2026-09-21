/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BotWordDecider (Part 063)
 * ============================================================
 * Gate choices per bot: hesitation (reactionTime), skill roll to
 * "know" the word, follow-the-crowd vs random door when clueless.
 * Emits 'bot:decided' {botId, gateId, correct}.
 */
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

export class BotWordDecider {
  /** @param {import('./BotBean.js').BotBean} bot */
  constructor(bot) {
    this.bot = bot;
    this.state = 'idle';        // idle|thinking|committed
    this.gate = null;
    this.targetX = 0;
    this._wait = 0;
    this._done = new Set();
  }

  /**
   * @param {number} dt
   * @param {Array<object>} gates live WordGates: {z, active, passed, correctIndex, options}
   * @param {Array<import('./BotBean.js').BotBean>} peers other bots
   */
  update(dt, gates = [], peers = []) {
    if (!this.bot.alive || this.bot.finished) return { targetX: 0 };
    const p = this.bot.body.position;
    const gate = gates.find((g) => g.active && !g.passed);
    if (!gate) { this.state = 'idle'; return { targetX: 0 }; }

    const dz = p.z - gate.z;
    if (dz < 0 || dz > 6) return { targetX: 0 };          // not near yet

    // Wrong door bounce → visible stumble + retry (physical wall did the rest)
    if (this._done.has(gate) && this.state === 'committed' && dz > 0.6) {
      this.state = 'idle';                                 // think again, fall behind
    }

    if (this.state === 'idle' && !this._wait && !this._done.has(gate)) {
      this.state = 'thinking';
      this._wait = this.bot.reactionTime * (0.7 + Math.random() * 0.6);  // hesitate
    }

    if (this.state === 'thinking') {
      this._wait -= dt;
      if (this._wait <= 0) this.#decide(gate, peers);
      return { targetX: 0, freeze: dz < 4 };               // visible pause before doors
    }

    return { targetX: this.targetX };
  }

  #decide(gate, peers) {
    this.state = 'committed';
    this._wait = 0;
    const knows = Math.random() < this.bot.skill;
    let laneIdx;
    if (knows) {
      laneIdx = gate.correctIndex;
    } else if (Math.random() < 0.4) {
      // follow the nearest committed peer's lane guess
      const near = peers
        .filter((b) => b !== this.bot && b.alive && b.decider?.state === 'committed')
        .sort((a, b2) => a.body.position.z - b2.body.position.z)[0];
      laneIdx = near ? near.decider.laneIdx : Math.floor(Math.random() * 3);
    } else {
      laneIdx = Math.floor(Math.random() * 3);             // wild guess
    }
    this.laneIdx = laneIdx;
    this.targetX = [-3, 0, 3][laneIdx] ?? 0;
    this.gate = gate;
    this._done.add(gate);
    eventBus.emit('bot:decided', {
      botId: this.bot.name, gateId: gate.index ?? -1, correct: laneIdx === gate.correctIndex,
    });
    Logger.game(`bot:decided ${this.bot.name} → door ${laneIdx} ${laneIdx === gate.correctIndex ? '✓' : '✗'}`);
  }
}
