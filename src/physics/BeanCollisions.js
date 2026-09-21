/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BeanCollisions (Part 033)
 * ============================================================
 * Bean↔bean comedy: bounce impulses (capped 10) + stumble +
 * wobble boost. Grab (hold E near a bot < 1.5 m) ties beans with
 * a DistanceConstraint + yellow line; release fires them apart.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from './PhysicsWorld.js';
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

export class BeanCollisions {
  /**
   * @param {{player: {body, model, wobble, animator}, bots: Array<{body, model, wobble, animator}>}} refs
   */
  constructor(refs) {
    this.player = refs.player;
    this.getBots = refs.bots;
    this.grabConstraint = null;
    this.grabLine = null;
    this._debounce = new Map();

    this._onCollide = (e) => this.#handle(e);
    this.player.body.addEventListener('collide', this._onCollide);
    Logger.physics('BeanCollisions: bean↔bean listening');
  }

  #handle(event) {
    const other = event.body;
    if (!other?._woTag?.startsWith('bot')) return;
    const now = performance.now();
    if (now - (this._debounce.get(other.id) ?? 0) < 400) return; // 0.4 s debounce
    this._debounce.set(other.id, now);

    // Bounce both away (relative velocity × 0.5, capped 10)
    const a = this.player.body, b = other;
    const dir = new CANNON.Vec3(b.position.x - a.position.x, 0, b.position.z - a.position.z);
    const dist = Math.max(0.1, dir.length());
    dir.scale(1 / dist, dir);
    const rel = Math.min(10, a.velocity.length() + b.velocity.length()) * 0.5;
    a.velocity.x -= dir.x * rel; a.velocity.z -= dir.z * rel;
    b.velocity.x += dir.x * rel; b.velocity.z += dir.z * rel;

    // Stumble + wobble boost both
    this.player.animator.play('stumble');
    this.player.wobble.boost();
    const bot = this.getBots().find((x) => x.body === b);
    if (bot) { bot.animator.play('stumble'); bot.wobble.boost(); }

    eventBus.emit('bean:collision', { with: other.id });
  }

  /**
   * Per-frame: grab start/stop + line update. Call from Game loop.
   * @param {boolean} grabHeld E key state
   */
  updateGrab(grabHeld) {
    const a = this.player.body;
    if (grabHeld && !this.grabConstraint) {
      const near = this.getBots().find((bot) => bot.body.position.distanceTo(a.position) < 1.5);
      if (near) {
        this.grabConstraint = new CANNON.DistanceConstraint(a, near.body, 1.5);
        physicsWorld.world.addConstraint(this.grabConstraint);
        this.grabbedBot = near;

        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        this.grabLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffd54d }));
        this.grabLine.frustumCulled = false;
        this.player.model.root.parent?.add(this.grabLine);
        eventBus.emit('bean:grab', { bot: near.body.id });
        Logger.physics('grab started');
      }
    } else if (!grabHeld && this.grabConstraint) {
      this.#release();
    }

    if (this.grabLine) {
      const pos = this.grabLine.geometry.attributes.position;
      const ap = a.position, bp = this.grabbedBot.body.position;
      pos.setXYZ(0, ap.x, ap.y, ap.z);
      pos.setXYZ(1, bp.x, bp.y, bp.z);
      pos.needsUpdate = true;
    }
  }

  #release() {
    physicsWorld.world.removeConstraint(this.grabConstraint);
    const a = this.player.body, b = this.grabbedBot.body;
    const dir = new CANNON.Vec3(b.position.x - a.position.x, 0, b.position.z - a.position.z);
    dir.normalize();
    b.velocity.x += dir.x * 5; b.velocity.z += dir.z * 5;
    a.velocity.x -= dir.x * 5; a.velocity.z -= dir.z * 5;

    this.grabLine?.parent?.remove(this.grabLine);
    this.grabLine?.geometry.dispose();
    this.grabLine = null;
    this.grabConstraint = null;
    eventBus.emit('bean:release', {});
    Logger.physics('grab released');
  }

  dispose() {
    this.player.body.removeEventListener('collide', this._onCollide);
    if (this.grabConstraint) physicsWorld.world.removeConstraint(this.grabConstraint);
    this.grabLine?.parent?.remove(this.grabLine);
  }
}
