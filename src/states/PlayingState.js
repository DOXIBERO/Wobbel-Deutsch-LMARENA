/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — PlayingState (Parts 024 + 071)
 * ============================================================
 * The round itself. Round 1 keeps the classic batch-2 course;
 * later RoundManager rounds build template/generated courses via
 * ObstacleFactory, add checkpoint arches, a FinishLine with
 * confetti + rankings and a field of AI bots (BotController).
 */
import * as CANNON from 'cannon-es';
import { CourseBuilder, COURSE } from '../levels/CourseBuilder.js';
import { WordGate } from '../obstacles/WordGate.js';
import { WordZone } from '../obstacles/WordZone.js';
import { BeanRagdoll } from '../player/BeanRagdoll.js';
import { BeanCollisions } from '../physics/BeanCollisions.js';
import { BotController } from '../player/BotController.js';
import { ObstacleFactory } from '../obstacles/ObstacleFactory.js';
import { CheckpointSystem } from '../core/CheckpointSystem.js';
import { FinishLine } from '../levels/FinishLine.js';
import { music } from '../audio/MusicSystem.js';
import { soundFX } from '../audio/SoundFX.js';
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
    g.playing = this;            // Game loop drives surfaces/obstacles through this ref
    g.score.reset();
    this.correct = 0;
    this.wrong = 0;
    this.finished = false;
    this._survivalAcc = 0;
    this._nextGate = 0;          // sequential activation cursor
    this._checkpointsHit = new Set();
    this._finishers = [];
    this._ended = false;
    this._surfaceNow = 'NORMAL'; // template surface override (ICE/SLIME strips)
    this.gates = [];
    this.zone = { active: false, start() {}, update: () => null, updateVisual() {}, dispose() {} };
    this.course = null;
    this.bots = null;
    this.tc = null;
    this.checkpoints = null;
    this._recoverPenalty = (e) => { g.score.add('player', -200); g.hud.flash('#ff1744'); };

    // ── Which course? RoundManager plan → template/generated, else classic
    this.plan = g.roundManager?.current ?? null;
    this._template = this.plan && !this.plan.template.classic ? this.plan.template : null;
    this._finishZ = COURSE.finishZ;

    if (this._template) this.#buildTemplateCourse();
    else this.#buildClassicCourse();

    // ── Player bean: reset to the start pad + collision filters
    //    (group 2 = player; mask 1 = world only — bots never shove the player)
    g.bean.body.position.set(0, 1.2, 4);
    g.bean.body.velocity.set(0, 0, 0);
    g.bean.body._woTag = 'player';
    g.bean.body.collisionFilterGroup = 2;
    g.bean.body.collisionFilterMask = 1;
    g.inputManager.attach(g.bean.root, g.bean.body, g.engine.camera);
    g.cameraController.setTarget(g.bean.root);

    // ── Batch 2: ragdoll + grab collisions (player refs)
    g.ragdoll = new BeanRagdoll({
      bean: g.bean,
      animator: g.animator,
      scene: g.engine.scene,
      checkpointZ: () => (this.checkpoints
        ? this.checkpoints.zFor('player')
        : this.course.lastCheckpointZ(g.bean.body.position.z)),
    });
    g.collisions = new BeanCollisions({
      player: { body: g.bean.body, model: g.bean, wobble: g.wobble, animator: g.animator },
      bots: () => [],
    });
    eventBus.on('player:recovered', this._recoverPenalty);   // Part 069: −200

    // ── Batch 3: the bot field (Part 065)
    this.#spawnBots();

    // ── Timer + music
    this.duration = this._template
      ? Math.min(120, Math.max(70, Math.round(COURSE.duration * (this._template.length / 65))))
      : COURSE.duration;
    g.timers.createTimer('round', this.duration,
      (left) => {
        g.hud.setTimer(left);
        eventBus.emit('timer:tick', { remaining: left });
      },
      () => this.endRound('timeout'));
    music.setMode('NORMAL');
    music.play();

    // ── First gate speaks on activation
    this.gates[0].activate();
    g.audioSync.presentWordChallenge(this.gates[0].options[this.gates[0].correctIndex], 10);

    // ── Batch 3: first-play tutorial (Part 074)
    g.tutorial?.maybeStart();

    Logger.game(`PLAYING: R${this.plan ? this.plan.template.id : g.currentRound.id} started (${this.duration}s, ${this.gates.length} gates)`);
  }

  /** Classic batch-2 course: CourseBuilder + 3 gates + WordZone. */
  #buildClassicCourse() {
    const g = this.game;
    this.course = new CourseBuilder(g.engine.scene);
    this.gates = g.roundWords.map((sel, i) => this.#makeGate(sel, COURSE.gates[i], i));

    // ── WordZone floor challenge (z=-50, between Gate 3 and finish)
    this.zone = new WordZone(g.engine.scene, {
      z: -50,
      onPass: () => {
        g.score.addPoints('player', 'correct');
        g.hud.flash('#00e676');
        soundFX.play('correct');
      },
      onFail: () => {
        g.score.addPoints('player', 'wrong');
        g.hud.flash('#ff1744');
        soundFX.play('wrong');
        g.ragdoll?.trigger();
      },
    });
    this.zone.setVariant('COLOR_MATCH');
    this._zoneArmed = false;
    this._finishLabel = makeTextSprite('🏁', { scale: 1.6 });
    this._finishLabel.position.set(0, 1.6, COURSE.finishZ);
    g.engine.scene.add(this._finishLabel);
  }

  /** Template/generated course (Parts 058–060, 069, 070). */
  #buildTemplateCourse() {
    const g = this.game;
    const tpl = this._template;

    // Inject round words into word-driven segments (clone → safe mutation)
    const sel = g.roundWords[0];
    if (sel) {
      const words = [sel.correct, ...sel.distractors.slice(0, 3)];
      for (const seg of tpl.segments) {
        if (seg.type === 'WORD_BRIDGE' && !seg.config.words) {
          seg.config.words = words.slice(0, 4);
          seg.config.correctIndex = Math.floor(Math.random() * 4);
          seg.config.voice = g.voice;
          seg.config.onFall = () => g.ragdoll?.trigger();
        }
      }
    }

    // Shared hooks for every obstacle instance
    const hooks = {
      onSpark: () => soundFX.play('bounce'),
      onSmash: () => { g.inputManager.stun(1); g.ragdoll?.trigger(); },
      onRagdoll: (impact) => g.ragdoll?.maybeTrigger(impact),
      onHit: () => { g.inputManager.stun(2); g.ragdoll?.trigger(); },
      onEliminate: () => g.ragdoll?.trigger(),
      onSticky: (on) => { this._surfaceNow = on ? 'SLIME' : 'NORMAL'; },
      onSurface: (name) => { this._surfaceNow = name ?? 'NORMAL'; },
      onWind: (on) => { this._surfaceNow = on ? 'ICE' : 'NORMAL'; },   // 5/1 = extreme
      onPass: () => { g.score.addPoints('player', 'correct'); g.hud.flash('#00e676'); },
      onWrong: () => { g.score.addPoints('player', 'wrong'); g.hud.flash('#ff1744'); g.profile.breakStreak(); },
      onFinishCross: (key) => {
        if (key !== 'player') return;
        this._finishers.push(key);
        const order = this._finishers.length;
        if (order === 1) g.score.addPoints('player', 'firstFinish');
        else g.score.add('player', FinishLine.placePoints(order));
      },
    };

    this.tc = ObstacleFactory.createAll(tpl, g.engine.scene, hooks);
    this._finishZ = this.tc.finishZ;
    this.course = this.#courseShim();

    // ── Gates at the template's DOOR_GATE zs (shallow → deep)
    const gateSegs = tpl.segments.filter((s) => s.type === 'DOOR_GATE').sort((a, b) => b.z - a.z);
    this.gates = gateSegs.map((seg, i) => this.#makeGate(g.roundWords[i] ?? g.roundWords[0], seg.z, i));

    // ── Optional WORD_ZONE segment → same floor challenge as classic
    const zoneSeg = tpl.segments.find((s) => s.type === 'WORD_ZONE');
    if (zoneSeg) {
      this.zone = new WordZone(g.engine.scene, {
        z: zoneSeg.z,
        onPass: hooks.onPass,
        onFail: () => { hooks.onWrong(); g.ragdoll?.trigger(); },
      });
      this.zone.setVariant('COLOR_MATCH');
    } else { this.zone = { active: false, start() {}, update: () => null, dispose() {} }; }
    this._zoneArmed = false;

    // ── Checkpoint arches every 20 m (Part 069)
    const zs = [];
    for (let z = 0; z > this._finishZ; z -= 20) zs.push(z);
    this.checkpoints = new CheckpointSystem(g.engine.scene, { zs });
  }

  #makeGate(sel, z, i) {
    const g = this.game;
    // Gate has exactly 3 doors: keep the correct word + first 2 distractors.
    const distractors = sel.distractors.slice(0, 2);
    const options = [sel.correct, ...distractors].sort(() => Math.random() - 0.5);
    const correctIndex = options.findIndex((o) => o.id === sel.correct.id);
    return new WordGate(g.engine.scene, {
      z,
      index: i,
      options,
      correctIndex,
      onCorrect: ({ word }) => this.#onGateCorrect(word),
      onWrong: ({ word }) => this.#onGateWrong(word),
    });
  }

  /** course-API shim so the Game loop can drive template obstacles too. */
  #courseShim() {
    const tc = this.tc;
    const self = this;
    return {
      updateSurfaces() { return self._surfaceNow; },
      updateObstacles(dt, body) {
        for (const o of tc.obstacles) {
          o.update(dt, body);
          for (const b of self.bots?.botBodies ?? []) o.update(dt, b);   // bots feel it too
        }
        FinishLine.updateBursts(dt);
      },
      lastCheckpointZ: () => self.checkpoints?.zFor('player') ?? 4,
      dispose: () => tc.dispose(),
    };
  }

  #spawnBots() {
    const g = this.game;
    const count = this.plan?.botCount ?? 3;
    const hazards = this._template
      ? this._template.segments
        .filter((s) => !['DOOR_GATE', 'WORD_ZONE', 'ICE_FLOOR', 'SLIME_ZONE'].includes(s.type))
        .map((s) => ({ z: s.z, kind: s.type, x: s.config.x, dir: s.config.dir, force: s.config.force }))
      : [
          { z: -13.5, kind: 'MOVING_PLATFORM' },
          { z: -26.5, kind: 'SWINGING_HAMMER' },
          { z: -40, kind: 'TRAMPOLINE' },
          { z: -48, kind: 'SPINNING_LOG' },
          { z: -8, kind: 'BUMPER', x: -1.5 },
          { z: -12, kind: 'BUMPER', x: -1.5 },
        ];
    this.bots = new BotController(g.engine.scene);
    // Bots respawn at the deepest checkpoint behind their position (Part 069)
    const cpFn = (z) => {
      const zs = this.checkpoints?.zs ?? COURSE.gates;
      let best = 4;
      for (const c of zs) if (z <= c + 2) best = c;
      return best;
    };
    this.bots.spawnBots(count, hazards, { length: 65, finishZ: this._finishZ }, cpFn);
  }

  /** Color word for the WordZone challenge (R1) or last gate word. */
  gateWordsForZone() {
    const gate = this.gates[this._nextGate - 1] ?? this.gates[0];
    return gate.options[gate.correctIndex];
  }

  #onGateCorrect(word) {
    const g = this.game;
    const pts = g.score.addPoints('player', 'correct');
    g.profile.incrementStreak();
    g.srs.recordAnswer(word.id, 5, g.currentRound.id);
    g.profile.completeWord(word.id);
    this.correct += 1;
    g.hud.flash('#00e676');
    g.audioSync.playFeedback(true, pts);
    g.hud.setScore(g.score.getEntry('player').points, g.score.getEntry('player').streak);
    soundFX.play('correct');
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
    g.audioSync.playFeedback(false, -50);
    g.hud.setScore(g.score.getEntry('player').points, 0);
    soundFX.play('wrong');
    eventBus.emit('gate:wrong', { word });
    Logger.game(`gate:wrong ${word.de}`);
  }

  /** Sequential activation (Part 023). */
  #advanceGate() {
    this._nextGate += 1;
    const next = this.gates[this._nextGate];
    if (next) {
      next.activate();
      this.game.audioSync.presentWordChallenge(next.options[next.correctIndex], 10);
    }
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

    // ── WordZone: arm after the LAST gate, resolve standing on timer end
    if (!this._zoneArmed && this.gates.length > 0 && this._nextGate >= this.gates.length) {
      this._zoneArmed = true;
      const zoneWord = this.gateWordsForZone();
      if (zoneWord) this.zone.start(zoneWord);
    }
    if (this.zone.active) {
      const resolved = this.zone.update(dt, g.bean.body);
      if (resolved) { g.wordPrompt.hide(); g.hud.setPrompt('🏁 ZIEL — SPRINT!'); }
    }

    // ── Gate pass detection (geometric — see WordGate.update)
    for (const gate of this.gates) gate.update(g.bean.body);

    // ── Ragdoll on hard landings (falling impacts only — upward vy is a
    //    jump/trampoline launch, never a crash; >8 falling = wipeout)
    const _vy = g.bean.body.velocity.y;
    if (_vy < 0) g.ragdoll?.maybeTrigger(-_vy);

    // ── Bots + checkpoints (Parts 065, 069)
    if (this.bots) {
      this.bots.update(dt, { gates: this.gates, surface: this._surfaceNow });
      const beanRows = [{ key: 'player', body: g.bean.body },
        ...this.bots.bots.filter((b) => b.alive).map((b) => ({ key: b.name, body: b.body }))];
      this.checkpoints?.update(dt, beanRows);
      // Classic course: bots past the line count as finishers for rankings
      if (!this.tc) {
        for (const b of this.bots.bots) {
          if (b.alive && !b.finished && b.body.position.z <= this._finishZ) b.finish(this.bots.time);
        }
      }
    }

    // ── Tutorial progress (Part 074)
    const activeGate = this.gates.find((gt) => !gt.passed);
    g.tutorial?.update(g.bean.body, activeGate && activeGate.z - z < 8);

    if (!this.finished && z <= this._finishZ) {
      this.finished = true;
      this._finishers.push('player');
      const order = this._finishers.length; // 1st finisher → +500
      if (order === 1) g.score.addPoints('player', 'firstFinish');
      else g.score.add('player', FinishLine.placePoints(order));
      eventBus.emit('player:finished', { order });
      eventBus.emit('player:win', {}); // victory animation
      soundFX.play('victory');
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
    // Part 070: freeze the live rankings for the ROUND_END overlay
    g.lastRoundRankings = this.bots?.getRankings(e.points) ?? [
      { key: 'player', name: 'DU', score: e.points, finished: this.finished },
    ];
    g.roundManager?.history.push({
      template: this.plan?.template.id ?? 'classic-60',
      score: e.points, correct: this.correct, wrong: this.wrong, total: this.correct + this.wrong,
    });
    g.profile.addSession({
      round: g.currentRound.id, score: e.points,
      correct: this.correct, wrong: this.wrong,
    });
    eventBus.emit('game:roundEnd', g.lastRoundStats);
    g.state.transition('ROUND_END');
  }

  onExit() {
    const g = this.game;
    g.playing = null;            // surfaces/obstacles go inert outside PLAYING
    eventBus.off('player:recovered', this._recoverPenalty);
    g.inputManager.detach();
    for (const gate of this.gates) gate.dispose();
    this.gates = [];
    this.zone.dispose();
    this.course.dispose();
    this.checkpoints?.dispose();
    this.bots?.dispose();
    this.bots = null;
    g.collisions?.dispose(); g.collisions = null;
    g.ragdoll = null;
    music.pause();
    if (this._finishLabel) g.engine.scene.remove(this._finishLabel);
    g.hud.hide();
    g.wordPrompt.hide();
    Logger.game('PLAYING: exited (course cleared)');
  }
}
