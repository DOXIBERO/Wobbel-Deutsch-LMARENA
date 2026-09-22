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
    // Fall Guys start pack: beans all around/behind the player (player z=+4),
    // so the crowd is visible from the first frame.
    // Pack positions: beside/ahead of the player's sprint line (x=±1.6..4.2),
    // z 0..5 — the player weaves INTO the crowd instead of bowling through it.
    const spots = [
      { x: -1.8, z: 3 }, { x: 1.8, z: 3 }, { x: -3.4, z: 1.5 }, { x: 3.4, z: 1.5 },
      { x: -2.6, z: 5 }, { x: 2.6, z: 5 }, { x: -4.2, z: 3.2 }, { x: 4.2, z: 3.2 },
      { x: -1.2, z: 6.5 }, { x: 1.2, z: 6.5 }, { x: -3.8, z: 6 }, { x: 3.8, z: 6 },
      { x: -2.2, z: 8 }, { x: 2.2, z: 8 },
    ];
    for (let i = 0; i < count; i++) {
      const p = BOT_PRESETS[i % BOT_PRESETS.length];
      const suffix = i >= BOT_PRESETS.length ? ` ${Math.floor(i / BOT_PRESETS.length) + 1}` : '';
      const spot = spots[i % spots.length];
      const bot = new BotBean(this.scene, {
        ...p,
        name: p.name + suffix,
        spawn: { x: spot.x + (rng() - 0.5) * 0.5, z: spot.z + rng() * 0.8 },
        checkpointZ: () => checkpointZ(bot.body.position.z),
      });
      bot.movement = new BotMovement(bot, this.nav);
      bot.decider = new BotWordDecider(bot);
      this.bots.push(bot);
    }
    Logger.game(`BotController: ${count} bots in the starting pack`);
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
      try {
        const decision = bot.decider.update(dt, ctx.gates ?? [], this.bots);
        bot.movement.update(dt, {
          targetX: decision.targetX ?? 0,
          hazards: this.nav.hazards,
          surface: ctx.surface,
          nearby: this.bots,
          playerZ: ctx.playerZ ?? 4,
        });
        if (decision.freeze) bot.body.velocity.z = Math.min(bot.body.velocity.z, 0.2);
        // finish line?
        if (!bot.finished && bot.body.position.z <= this.nav.finishZ + 0.5) {
          bot.finish(this.time);
          bot.body.velocity.set(0, 0, 0);   // celebrate at the line, don't coast off
          eventBus.emit('bots:finished', { name: bot.name, time: this.time });
        }
        bot.update(dt);
      } catch (e) {
        if (!bot._errLogged) {
          bot._errLogged = true;
          Logger.error(`BOT ${bot.name} update failed`, e?.message);
        }
      }
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
