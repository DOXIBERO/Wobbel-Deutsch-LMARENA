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
    // Waypoints from just behind the start line down to the finish —
    // the ACTIVE waypoint is always the nearest one AHEAD of the bot
    // (stateless → bots can never "escape" the path).
    this.waypoints = [];
    for (let z = 8; z > nav.courseLength; z -= WAYPOINT_STEP) this.waypoints.push({ x: 0, z });
    this.waypoints.push({ x: 0, z: nav.courseLength });
    this.offset = (this.rng() - 0.5) * 2.4;          // personal lane offset
    this.offsetTimer = 3 + this.rng() * 4;
    this.holdDist = 2.5 + this.rng() * 6;            // personal slot: 2.5–8.5 m ahead of the player
    this.baseSpeed = 5.6 + bot.skill * 2.6;          // Klaus ~6.1 … Otto ~8.1 (player pace ~7.6)
    this.speedMul = 1;
    this.stuckT = 0;
    this.jumpCd = 0;
    // One-shot flags per hazard (approach once)
    this._hazDone = new Set();
  }

  /**
   * @param {number} dt
   * @param {object} ctx { gates, hazards, surface, playerZ } live course info
   */
  update(dt, ctx = {}) {
    if (!this.bot.alive || this.bot.finished || this.bot.ragdoll.active) return;
    const body = this.bot.body;
    const p = body.position;

    // ── Active waypoint = nearest waypoint still ahead of the bot
    let wp = this.waypoints[this.waypoints.length - 1];
    for (const w of this.waypoints) {
      if (w.z < p.z - 1) { wp = w; break; }   // first waypoint behind→ahead boundary
    }
    this.jumpCd = Math.max(0, this.jumpCd - dt);

    // ── Speed personality: ±10% wander, surface adjustments
    this.offsetTimer -= dt;
    if (this.offsetTimer <= 0) {
      this.offset = (this.rng() - 0.5) * 2.4;
      this.offsetTimer = 3 + this.rng() * 4;
    }
    this.speedMul = 1 + Math.sin(p.z * 1.7 + this.bot.skill * 10) * 0.1;
    if (ctx.surface === 'ICE') this.speedMul *= this.bot.skill > 0.6 ? 0.55 : 1.05; // pros brake
    if (ctx.surface === 'SLIME') this.speedMul *= 0.7;
    // ── PERSONAL HOVER DISTANCE (Fall Guys crowd): every bot keeps its own
    //    2.5–8.5 m slot ahead of the player → the pack fills the view and
    //    races WITH you instead of disappearing over the horizon.
    const ahead = (ctx.playerZ ?? 4) - p.z;    // >0 = bot is ahead of the player
    const err = ahead - this.holdDist;         // + = too far ahead, − = lagging
    let speed;
    if (err > 7) speed = -7;                            // way out front → trot back
    else if (err < -11) speed = 18;                     // dropped way behind → sprint in
    else speed = Math.max(1.5, Math.min(12, this.baseSpeed * this.speedMul * (1 + err * 0.24)));

    // ── Velocity steering (robust): drive speed directly instead of
    //    accumulating forces — no flying, no drifting, no wall-grinding.
    //    Gravity still owns y (jumps/launches stay physical).
    this.holdZ = null;
    let targetX = wp.x + this.offset + (ctx.targetX ?? 0);
    // Avoid the bean directly ahead (±1 m sidestep)
    for (const other of ctx.nearby ?? []) {
      if (other === this.bot || !other.alive) continue;
      const o = other.body.position;
      if (o.z < p.z && p.z - o.z < 1.5 && Math.abs(o.x - p.x) < 0.9) targetX += p.x > o.x ? 1 : -1;
    }
    if (this.holdZ !== null && this.holdZ !== undefined) {
      // Hammer timing: pause ON the spot (velocity zeroed, gravity holds)
      body.velocity.x = 0; body.velocity.z = 0;
    } else {
      body.velocity.x = Math.max(-speed * 0.8, Math.min(speed * 0.8, (targetX - p.x) * 2));
      body.velocity.z = -speed;
    }

    // ── Obstacle-specific jumps (Part 064)
    this.#obstacleBehavior(p, ctx);
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
