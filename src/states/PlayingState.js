/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — PlayingState (Part 024)
 * ============================================================
 * The round itself: timer, 3 sequential word gates, scoring with
 * streaks, survival points, checkpoints, soft elimination, finish.
 */
import * as CANNON from 'cannon-es';
import { CourseBuilder, COURSE } from '../levels/CourseBuilder.js';
import { WordGate } from '../obstacles/WordGate.js';
import { GameRules } from '../data/GameRules.js';
import { eventBus } from '../core/EventBus.js';
import { makeTextSprite } from '../ui/TextSprite.js';
import { Logger } from '../core/Logger.js';

export class PlayingState {
  constructor(game) {
    this.game = game;
  }

  onEnter() {
    const g = this.game;
    g.score.reset();
    this.correct = 0;
    this.wrong = 0;
    this.finished = false;
    this._survivalAcc = 0;
    this._nextGate = 0;          // sequential activation cursor
    this._checkpointsHit = new Set();
    this._finishers = [];

    // ── Course + gates from the prepared round words
    this.course = new CourseBuilder(g.engine.scene);
    this.gates = g.roundWords.map((sel, i) => new WordGate(g.engine.scene, {
      z: COURSE.gates[i],
      index: i,
      options: sel.options,
      correctIndex: sel.options.findIndex((o) => o.id === sel.correct.id),
      onCorrect: ({ word }) => this.#onGateCorrect(word),
      onWrong: ({ word }) => this.#onGateWrong(word),
    }));

    // ── Player bean: reset to the start pad
    g.bean.body.position.set(0, 1.2, 4);
    g.bean.body.velocity.set(0, 0, 0);
    g.bean.body._woTag = 'player';
    g.inputManager.attach(g.bean.root, g.bean.body, g.engine.camera);
    g.cameraController.setTarget(g.bean.root);
    this._finishLabel = makeTextSprite('🏁', { scale: 1.6 });
    this._finishLabel.position.set(0, 1.6, COURSE.finishZ);
    g.engine.scene.add(this._finishLabel);

    // ── Timer
    this.duration = g.currentRound.duration;
    g.timers.createTimer('round', this.duration,
      (left) => g.hud.setTimer(left),
      () => this.endRound('timeout'));

    // ── First gate speaks on activation
    this.gates[0].activate();
    g.hud.setPrompt(this.#promptText());
    Logger.game(`PLAYING: R${g.currentRound.id} started (${this.duration}s, 3 gates)`);
  }

  /** English meaning so the player knows which German door to find. */
  #promptText() {
    const gate = this.gates[this._nextGate];
    if (!gate) return null;
    return gate.options[gate.correctIndex].en;
  }

  #onGateCorrect(word) {
    const g = this.game;
    const pts = g.score.addPoints('player', 'correct');
    g.profile.incrementStreak();
    g.srs.recordAnswer(word.id, 5, g.currentRound.id);
    g.profile.completeWord(word.id);
    this.correct += 1;
    g.hud.flash('#00e676');
    g.hud.setScore(g.score.getEntry('player').points, g.score.getEntry('player').streak);
    eventBus.emit('gate:correct', { word });
    this.#advanceGate();
    Logger.game(`gate:correct ${word.de} +${pts}`);
  }

  #onGateWrong(word) {
    const g = this.game;
    g.score.addPoints('player', 'wrong');
    g.profile.breakStreak();
    g.srs.recordAnswer(word.id, 1, g.currentRound.id);
    this.wrong += 1;
    g.inputManager.stun(GameRules.WRONG_STUN_SECONDS);
    g.cameraController.shake(0.3, 0.2);
    g.hud.flash('#ff1744');
    g.hud.setScore(g.score.getEntry('player').points, 0);
    eventBus.emit('gate:wrong', { word });
    Logger.game(`gate:wrong ${word.de}`);
  }

  /** Sequential activation (Part 023). */
  #advanceGate() {
    this._nextGate += 1;
    this.gates[this._nextGate]?.activate();
    this.game.hud.setPrompt(this.#promptText());
  }

  onUpdate(dt) {
    const g = this.game;
    g.timers.update(dt);

    // Survival points: +10 per full second alive
    this._survivalAcc += dt;
    if (this._survivalAcc >= 1) {
      const secs = Math.floor(this._survivalAcc);
      this._survivalAcc -= secs;
      g.score.addPoints('player', 'survival', { seconds: 0 });
      g.score.add('player', GameRules.calcScore('survival', { seconds: secs }));
    }

    // Voice replay on approach + finish-line crossing
    const z = g.bean.body.position.z;
    this.gates.forEach((gate) => gate.maybeSpeakOnApproach(z));
    if (!this.finished && z <= COURSE.finishZ) {
      this.finished = true;
      this._finishers.push('player');
      const order = this._finishers.length; // 1st finisher → +500
      if (order === 1) g.score.addPoints('player', 'firstFinish');
      eventBus.emit('player:finished', { order });
      this.endRound('finish');
    }

    // Soft elimination: somehow fell out of the world → 3 s respawn, −200
    if (g.bean.body.position.y < -10) {
      this.#softEliminate();
    }

    const e = g.score.getEntry('player');
    g.hud.setTimer(g.timers.getRemaining('round'));
    g.hud.setScore(e.points, e.streak);
  }

  #softEliminate() {
    const g = this.game;
    if (this._eliminating) return;
    this._eliminating = true;
    g.score.addPoints('player', 'elimination');
    g.hud.flash('#ff1744');
    const respawnZ = this._nextGate > 0 ? COURSE.gates[this._nextGate - 1] + 3 : 4;
    setTimeout(() => {
      g.bean.body.position.set(0, 1.2, Math.max(respawnZ, COURSE.startZ - 5));
      g.bean.body.velocity.set(0, 0, 0);
      this._eliminating = false;
    }, GameRules.ELIMINATION_RESPAWN_SECONDS * 1000);
  }

  endRound(reason) {
    if (this._ended) return;
    this._ended = true;
    const g = this.game;
    g.timers.cancel('round');

    const e = g.score.getEntry('player');
    g.lastRoundStats = {
      reason,
      score: e.points,
      correct: this.correct,
      wrong: this.wrong,
      total: this.correct + this.wrong,
      rank: g.score.getPlayerRank('player'),
    };
    g.profile.addSession({
      round: g.currentRound.id, score: e.points,
      correct: this.correct, wrong: this.wrong,
    });
    eventBus.emit('game:roundEnd', g.lastRoundStats);
    g.state.transition('ROUND_END');
  }

  onExit() {
    const g = this.game;
    g.inputManager.detach();
    for (const gate of this.gates) gate.dispose();
    this.gates = [];
    this.course.dispose();
    g.engine.scene.remove(this._finishLabel);
    g.hud.hide();
    Logger.game('PLAYING: exited (course cleared)');
  }
}
