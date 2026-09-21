/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BotMovement (Parts 062 + 064)
 * ============================================================
 * Waypoint steering along the linear course + obstacle-specific
 * behaviors: platform edge-wait, hammer timing, bumper dodge,
 * ice braking, lava/bridge jumps, block dodging, wind lean-in.
 * Stuck detection → burst forward; random ±lateral offset so
 * the pack spreads naturally.
 */
import * as CANNON from 'cannon-es';

const WAYPOINT_STEP = 6;        // m between course waypoints

export class BotMovement {
  /**
   * @param {import('./BotBean.js').BotBean} bot
   * @param {{courseLength:number, hazards:Array<{z:number, kind:string, x?:number}>,
   *          finishZ:number, rng:Function}} nav
   */
  constructor(bot, nav) {
    this.bot = bot;
    this.finishZ = nav.finishZ;
    this.rng = nav.rng ?? Math.random;
    // Waypoints down the center; the decider/steering adds offsets
    this.waypoints = [];
    for (let z = 0; z > nav.courseLength; z -= WAYPOINT_STEP) this.waypoints.push({ x: 0, z });
    this.waypoints.push({ x: 0, z: nav.courseLength });
    this.wpIndex = 0;
    this.offset = (this.rng() - 0.5) * 2.4;          // personal lane offset
    this.offsetTimer = 3 + this.rng() * 4;
    this.baseSpeed = 4 + bot.skill * 3;              // Fritz 4.5 … Otto 6.85
    this.speedMul = 1;
    this.stuckT = 0;
    this.jumpCd = 0;
    // One-shot flags per hazard (approach once)
    this._hazDone = new Set();
  }

  /**
   * @param {number} dt
   * @param {object} ctx { gates, hazards, surface, windLean } live course info
   */
  update(dt, ctx = {}) {
    if (!this.bot.alive || this.bot.finished || this.bot.ragdoll.active) return;
    const body = this.bot.body;
    const p = body.position;
    this.jumpCd = Math.max(0, this.jumpCd - dt);

    // ── Waypoint advance (2 m threshold)
    let wp = this.waypoints[Math.min(this.wpIndex, this.waypoints.length - 1)];
    while (wp && p.z - wp.z < 2 && this.wpIndex < this.waypoints.length - 1) {
      this.wpIndex += 1;
      wp = this.waypoints[this.wpIndex];
    }

    // ── Speed personality: ±10% wander, surface adjustments
    this.offsetTimer -= dt;
    if (this.offsetTimer <= 0) {
      this.offset = (this.rng() - 0.5) * 2.4;
      this.offsetTimer = 3 + this.rng() * 4;
    }
    this.speedMul = 1 + Math.sin(p.z * 1.7 + this.bot.skill * 10) * 0.1;
    if (ctx.surface === 'ICE') this.speedMul *= this.bot.skill > 0.6 ? 0.55 : 1.05; // pros brake
    if (ctx.surface === 'SLIME') this.speedMul *= 0.7;

    // ── Forward force
    const fwd = this.baseSpeed * this.speedMul;
    body.applyForce(new CANNON.Vec3(0, 0, -fwd), p);

    // ── Steering: waypoint X + personal offset + decider target + avoidance
    let targetX = wp.x + this.offset + (ctx.targetX ?? 0);
    // Avoid the bean directly ahead (±1 m sidestep)
    for (const other of ctx.nearby ?? []) {
      if (other === this.bot || !other.alive) continue;
      const o = other.body.position;
      if (o.z < p.z && p.z - o.z < 1.5 && Math.abs(o.x - p.x) < 0.9) targetX += p.x > o.x ? 1 : -1;
    }
    const dx = targetX - p.x;
    body.applyForce(new CANNON.Vec3(Math.max(-5, Math.min(5, dx)), 0, 0), p);

    // ── Obstacle-specific jumps (Part 064)
    this.#obstacleBehavior(p, ctx);

    // ── Stuck recovery: barely moving for 2 s → burst + hop
    if (Math.abs(body.velocity.z) < 1 && !this.bot.ragdoll.active) {
      this.stuckT += dt;
      if (this.stuckT > 2) {
        body.applyForce(new CANNON.Vec3(0, 0, -fwd * 4), p);
        this.#jump();
        this.stuckT = 0;
      }
    } else this.stuckT = 0;
  }

  #obstacleBehavior(p, ctx) {
    for (const h of ctx.hazards ?? []) {
      const dz = p.z - h.z;                       // >0 = approaching
      const key = h.kind + h.z;
      if (dz < 0 || dz > 7 || this._hazDone.has(key)) continue;
      const skill = this.bot.skill;
      switch (h.kind) {
        case 'SPINNING_LOG':
        case 'LAVA_FLOOR':
          if (dz < 2.2) this.#jump();             // hop over
          break;
        case 'FALLING_BLOCKS':
          if (skill > 0.5 && dz < 4) {            // pros dodge the block row
            this._hazDone.add(key);
            this.offset = (p.x > 0 ? -2.2 : 2.2);
          }
          break;
        case 'SWINGING_HAMMER':
          if (skill > 0.55 && dz < 3.5 && dz > 2.5) this.speedMul *= 0.2;  // time it
          if (dz < 1.6) this.speedMul = 1.6;      // sprint the gap
          break;
        case 'MOVING_PLATFORM':
          if (dz < 3 && dz > 1.5) this.speedMul = 0.3;   // wait at the edge
          if (dz <= 1.5) this.#jump();            // hop on / across
          break;
        case 'BUMPER':
          if (skill > 0.5 && dz < 4.5 && Math.abs(h.x - p.x) < 2) {
            this.offset = p.x + (p.x > h.x ? 1.6 : -1.6);   // steer around
            this._hazDone.add(key);
          }
          break;
        case 'CONVEYOR_BELT':
          this.speedMul *= 1.25;                  // fight the drag
          break;
        case 'WIND_TUNNEL':
          if (h.dir && h.dir !== 'UP' && dz < 4) this.offset = h.dir === 'LEFT' ? 1.2 : -1.2;   // lean into the wind
          break;
        default:
          break;
      }
      if (dz < 0.5) this._hazDone.add(key);
    }
  }

  #jump() {
    if (this.jumpCd > 0) return;
    const body = this.bot.body;
    if (Math.abs(body.velocity.y) > 0.6) return;    // grounded-ish only
    this.jumpCd = 0.8;
    body.wakeUp();
    body.applyImpulse(new CANNON.Vec3(0, 7.5, 0), body.position);
  }
}
