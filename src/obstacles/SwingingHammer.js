/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — SwingingHammer (Part 048)
 * ============================================================
 * Pendulum: hinge at an overhead anchor, gravity-driven swing
 * (~2.5 s period). Hit = impulse 15 + ragdoll via onSmash callback.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { Logger } from '../core/Logger.js';

export class SwingingHammer {
  /**
   * @param {THREE.Scene} scene
   * @param {{x:number, z:number, onSmash?:Function}} cfg
   */
  constructor(scene, cfg) {
    this.onSmash = cfg.onSmash;
    this.anchor = new CANNON.Vec3(cfg.x, 5.5, cfg.z);

    // ── Visual: handle + head (driven by the physics chain)
    this.group = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.7 })
    );
    handle.position.y = -1.75;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xCC0000, roughness: 0.4 })
    );
    head.position.y = -3.5;
    head.castShadow = true;
    this.group.add(handle, head);
    scene.add(this.group);

    // ── Physics: static anchor + dynamic rod (box), hinge with limits
    const anchorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(0.05) });
    anchorBody.position.copy(this.anchor);
    physicsWorld.addBody(anchorBody);

    this.rod = new CANNON.Body({
      mass: 4,
      shape: new CANNON.Box(new CANNON.Vec3(0.08, 1.75, 0.08)),
    });
    this.rod.position.set(this.anchor.x, this.anchor.y - 1.75, this.anchor.z);
    this.rod.angularDamping = 0.01;
    physicsWorld.addBody(this.rod);

    this.hinge = new CANNON.HingeConstraint(anchorBody, this.rod, {
      pivotA: new CANNON.Vec3(0, 0, 0),
      pivotB: new CANNON.Vec3(0, 1.75, 0),
      axisA: new CANNON.Vec3(0, 0, 1), // swing in the X-Y plane
      axisB: new CANNON.Vec3(0, 0, 1),
    });
    physicsWorld.world.addConstraint(this.hinge);

    // Nudge it swinging (gravity keeps it going)
    this.rod.applyImpulse(new CANNON.Vec3(6, 0, 0));

    // Head contact → smash
    this.sensor = new CANNON.Body({
      mass: 0, shape: new CANNON.Sphere(0.5),
      collisionFilterGroup: 2, collisionFilterMask: 1,
    });
    Logger.game(`SwingingHammer @ z=${cfg.z}`);
  }

  /** Sync the visual pendulum + smash check (per fixed step). */
  update(_dt, beanBody, onRagdoll) {
    // Head world position = anchor + rotated (0,-3.5,0)
    const q = this.rod.quaternion;
    const local = new CANNON.Vec3(0, -3.5, 0);
    const world = this.rod.position.vadd(local);
    void q;
    this.group.position.copy(this.rod.position);
    this.group.quaternion.copy(this.rod.quaternion);

    if (beanBody && !this._smashDebounce) {
      const dx = beanBody.position.x - world.x;
      const dy = beanBody.position.y - world.y;
      const dz = beanBody.position.z - world.z;
      if (dx * dx + dy * dy + dz * dz < 1.1) {
        this._smashDebounce = true;
        beanBody.velocity.set(beanBody.velocity.x * 0.5 + 4, 6, beanBody.velocity.z * 0.5);
        onRagdoll?.(12); // impact speed ≥ 8 → ragdoll
        this.onSmash?.();
        setTimeout(() => { this._smashDebounce = false; }, 1500);
      }
    }
  }

  dispose() {
    physicsWorld.world.removeConstraint(this.hinge);
    physicsWorld.removeBody(this.rod);
    this.group.parent?.remove(this.group);
  }
}
