/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — InputManager (Part 011)
 * ============================================================
 * Keyboard → physics forces. Camera-relative WASD, Space jump
 * (grounded only), Shift dive (batch 2 hook), E grab (batch 3 hook).
 * Force smoothing (0.1 s) + 8 m/s speed cap keep movement silky.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { eventBus } from './EventBus.js';

export class InputManager {
  constructor() {
    /** @type {Set<string>} */
    this.keys = new Set();
    /** @type {CANNON.Body|null} */
    this.body = null;
    /** @type {THREE.Camera|null} */
    this.camera = null;
    /** @type {THREE.Object3D|null} visual root to rotate toward movement */
    this.beanRoot = null;

    this.forwardForce = 8;
    this.strafeForce = 5;
    this.jumpImpulse = 8;           // Part 011 spec
    this.maxSpeed = 8;

    this._force = new THREE.Vector2();  // smoothed (x=strafe, y=forward)
    this._camDir = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._diveCooldown = 0;
    this._stunnedUntil = 0;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space') this.tryJump();
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.tryDive();
      if (e.code === 'KeyE') eventBus.emit('player:grab', {});
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Attach the player's visuals + body + camera each round. */
  attach(beanRoot, body, camera) {
    this.beanRoot = beanRoot;
    this.body = body;
    this.camera = camera;
  }

  detach() { this.beanRoot = null; this.body = null; this.camera = null; }

  /** Stun gate (wrong door penalty from Part 022 uses this). */
  stun(seconds) { this._stunnedUntil = performance.now() / 1000 + seconds; }
  get stunned() { return performance.now() / 1000 < this._stunnedUntil; }

  pressed(key) { return this.keys.has(key); }

  /** Grounded check: tiny vertical velocity window. */
  get grounded() {
    return this.body ? Math.abs(this.body.velocity.y) < 0.5 : false;
  }

  tryJump() {
    if (!this.body || !this.grounded) return;
    this.body.wakeUp();
    this.body.applyImpulse(new CANNON.Vec3(0, this.jumpImpulse, 0));
    eventBus.emit('player:jump', {});
  }

  tryDive() {
    if (!this.body || this._diveCooldown > 0) return;
    this._diveCooldown = 1;
    eventBus.emit('player:dive', {});
  }

  /**
   * Per-fixed-step: smoothed camera-relative forces + facing + cap.
   * @param {number} dt
   */
  update(dt) {
    this._diveCooldown = Math.max(0, this._diveCooldown - dt);
    if (!this.body || !this.camera) return;

    // Camera basis flattened onto the ground plane
    this.camera.getWorldDirection(this._camDir);
    this._camDir.y = 0;
    this._camDir.normalize();
    this._right.crossVectors(this._camDir, this._up);

    const axis = (pos, neg) => (this.keys.has(pos) ? 1 : 0) - (this.keys.has(neg) ? 1 : 0);
    const fwd = axis('KeyW', 'KeyS') + axis('ArrowUp', 'ArrowDown');
    const strafe = axis('KeyD', 'KeyA') + axis('ArrowRight', 'ArrowLeft');
    if (this.stunned) { this._force.set(0, 0); return; }

    // Smooth toward the target force over ~0.1 s
    const k = 1 - Math.exp(-dt / 0.1);
    this._force.x += (strafe * this.strafeForce - this._force.x) * k;
    this._force.y += (fwd * this.forwardForce - this._force.y) * k;
    if (fwd || strafe) this.body.wakeUp(); // sleeping bodies ignore forces

    // World-space force
    this.body.force.x += this._camDir.x * this._force.y + this._right.x * this._force.x;
    this.body.force.z += this._camDir.z * this._force.y + this._right.z * this._force.x;

    // Speed cap: horizontal damping above 8 m/s
    const v = this.body.velocity;
    const h = Math.hypot(v.x, v.z);
    if (h > this.maxSpeed) {
      const s = this.maxSpeed / h;
      v.x *= s; v.z *= s;
    }

    // Face the movement direction (lerp 0.12 per frame)
    if (this.beanRoot && h > 0.5) {
      const targetY = Math.atan2(v.x, v.z);
      let d = targetY - this.beanRoot.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.beanRoot.rotation.y += d * 0.12;
    }
  }
}
