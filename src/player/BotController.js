/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BotController (Part 065)
 * ============================================================
 * Spawns/manages the bot field: per-frame movement + word
 * decisions + animation + wobble, eliminations (3 falls or off
 * the world), finish detection and live rankings by Z progress.
 */
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { BotBean } from './BotBean.js';
import { BotMovement } from './BotMovement.js';
import { BotWordDecider } from './BotWordDecider.js';
import { BOT_PRESETS } from '../data/BotPresets.js';
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

export class BotController {
  constructor(scene) {
    this.scene = scene;
    this.bots = [];
    this.time = 0;
    this.nav = { courseLength: -65, finishZ: -60, hazards: [], rng: Math.random };
  }

  /**
   * @param {number} count
   * @param {Array<{z:number, kind:string, x?:number}>} hazards for nav behaviors
   * @param {{length:number, finishZ:number}} course
   * @param {Function} checkpointZ shared respawn fn
   * @param {Function} [rng]
   */
  spawnBots(count, hazards, course, checkpointZ, rng = Math.random) {
    this.removeBots();
    this.nav = { courseLength: -course.length, finishZ: course.finishZ, hazards, rng };
    const presets = [...BOT_PRESETS].sort(() => rng() - 0.5).slice(0, count);
    presets.forEach((p, i) => {
      const bot = new BotBean(this.scene, {
        ...p,
        spawn: { x: -3 + (i % 5) * 1.5 + (rng() - 0.5), z: -2 - Math.floor(i / 5) * 1.5 },
        checkpointZ: () => checkpointFn(bot.body.position.z),
      });
      bot.movement = new BotMovement(bot, this.nav);
      bot.decider = new BotWordDecider(bot);
      this.bots.push(bot);
    });
    Logger.game(`BotController: ${count} bots on the line`);
    eventBus.emit('bots:spawned', { count });
  }

  /**
   * @param {number} dt
   * @param {{gates?:Array, surface?:string}} ctx live course info for decisions
   */
  update(dt, ctx = {}) {
    this.time += dt;
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      const decision = bot.decider.update(dt, ctx.gates ?? [], this.bots);
      bot.movement.update(dt, {
        targetX: decision.targetX ?? 0,
        hazards: this.nav.hazards,
        surface: ctx.surface,
        nearby: this.bots,
      });
      if (decision.freeze) bot.body.velocity.z = Math.min(bot.body.velocity.z, 0.2);
      // finish line?
      if (!bot.finished && bot.body.position.z <= this.nav.finishZ + 0.5) {
        bot.finish(this.time);
        eventBus.emit('bots:finished', { name: bot.name, time: this.time });
      }
      bot.update(dt);
    }
  }

  /** Physical events from obstacles: (impactBody, impactSpeed). */
  handleImpact(body, impact) {
    const bot = this.bots.find((b) => b.body === body);
    if (bot && impact > 8) bot.hit();
  }

  getAliveBots() { return this.bots.filter((b) => b.alive); }

  /** Sorted by finish time, then Z progress. */
  getRankings(playerScore = 0) {
    const rows = this.bots.map((b) => ({
      key: b.name, name: b.name,
      z: b.body?.position.z ?? this.nav.finishZ,
      finished: b.finished, time: b.finishTime, score: 0,
    }));
    rows.push({ key: 'player', name: 'DU', z: window.__wo?.bean?.body?.position.z ?? 0, finished: false, time: 0, score: playerScore });
    rows.sort((a, b) => {
      if (a.finished && b.finished) return a.time - b.time;
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return a.z - b.z;    // deeper (more negative) = ahead
    });
    return rows;
  }

  removeBots() {
    for (const b of this.bots) b.dispose();
    this.bots = [];
  }

  /** Total bean body count (player + bots) for obstacle loops. */
  get botBodies() { return this.bots.filter((b) => b.alive && !b.ragdoll.active).map((b) => b.body); }

  dispose() { this.removeBots(); }
}
