/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — WobbleSystem (Part 031) — THE FEEL 🫘
 * ============================================================
 * Spring-damper VISUAL layer on top of the precise physics body:
 *   acc = -spring * (visual - target) - damping * angVel
 * Leans INTO turns (motorcycle), overshoots 2-3× on stop,
 * squash-and-stretch on landings. Surface presets swap params.
 */
import * as THREE from 'three';
import { clamp } from '../core/MathUtils.js';

export const SURFACES = {
  NORMAL: { spring: 15, damping: 3 },
  ICE: { spring: 5, damping: 1 },     // wild wobble
  SLIME: { spring: 25, damping: 8 },  // heavy, barely moves
};

const _euler = new THREE.Euler();

export class WobbleSystem {
  constructor() {
    this.setSurface('NORMAL');
    this.tiltX = 0; this.tiltZ = 0;       // visual tilt (rad)
    this.tiltVelX = 0; this.tiltVelZ = 0;
    this.scaleY = 1; this.scaleVelY = 0;  // squash spring
    this.yaw = 0;                          // facing from velocity
    this.maxTilt = 0.4;
    this._prevVel = null;
    this._prevVy = 0;
    this.boostT = 0;                       // collision wobble boost
  }

  /** @param {'NORMAL'|'ICE'|'SLIME'} type */
  setSurface(type) {
    const p = SURFACES[type] ?? SURFACES.NORMAL;
    this.spring = p.spring;
    this.damping = p.damping;
    this.surface = type;
  }

  /** Short wobble intensity boost (bean-bean bumps). */
  boost() { this.boostT = 0.5; }

  /**
   * Fixed-step spring integration.
   * @param {number} dt
   * @param {{velocity: THREE.Vector3|{x,y,z}}} body physics body (velocity)
   * @param {THREE.Object3D} visualGroup the bean root (visual only)
   */
  update(dt, body, visualGroup, velocity) {
    const v = velocity;
    const hSpeed = Math.hypot(v.x, v.z);
    if (hSpeed > 0.5) this.yaw = Math.atan2(v.x, v.z);

    // ── Acceleration in bean-local frame → lean targets
    if (this._prevVel) {
      const ax = (v.x - this._prevVel.x) / dt;
      const az = (v.z - this._prevVel.z) / dt;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const fwdAcc = ax * sin + az * cos;
      const rightAcc = ax * cos - az * sin;

      const spring = this.boostT > 0 ? this.spring * 0.5 : this.spring;
      const targetZ = clamp(-rightAcc * 0.04, this.maxTilt); // lean into turns
      const targetX = clamp(fwdAcc * 0.03, this.maxTilt);    // brake/accel pitch
      this.#integrate(dt, targetX, targetZ, spring);
    }
    this._prevVel = { x: v.x, y: v.y, z: v.z };
    this.boostT = Math.max(0, this.boostT - dt);

    // ── Landing squash
    if (this._prevVy < -3 && Math.abs(v.y) < 1) this.squash(0.85);
    this._prevVy = v.y;

    // ── Squash spring (settles to 1)
    const sAcc = -60 * (this.scaleY - 1) - 8 * this.scaleVelY;
    this.scaleVelY += sAcc * dt;
    this.scaleY = Math.max(0.6, Math.min(1.3, this.scaleY + this.scaleVelY * dt));

    // ── Apply VISUAL-ONLY pose (physics body untouched)
    if (visualGroup) {
      _euler.set(this.tiltX, this.yaw, this.tiltZ, 'YXZ');
      visualGroup.quaternion.setFromEuler(_euler);
      visualGroup.scale.set(1 + (1 - this.scaleY) * 0.6, this.scaleY, 1 + (1 - this.scaleY) * 0.6);
    }
  }

  #integrate(dt, targetX, targetZ, spring) {
    const accX = -spring * (this.tiltX - targetX) - this.damping * this.tiltVelX;
    const accZ = -spring * (this.tiltZ - targetZ) - this.damping * this.tiltVelZ;
    this.tiltVelX += accX * dt;
    this.tiltVelZ += accZ * dt;
    this.tiltX = clamp(this.tiltX + this.tiltVelX * dt, this.maxTilt);
    this.tiltZ = clamp(this.tiltZ + this.tiltVelZ * dt, this.maxTilt);
  }

  /** Instant squash impulse (scaleY dip then springy settle). */
  squash(target = 0.85) { this.scaleY = target; this.scaleVelY = 2; }
}
