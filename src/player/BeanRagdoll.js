/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BeanRagdoll (Part 034)
 * ============================================================
 * Hard hit (impact > 8) → 6 floppy sphere bodies (ConeTwist),
 * tumble 2.5 s (invulnerable), recover at checkpoint with a
 * stumble. Visual bean hidden during the tumble.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

const RAGDOLL_TIME = 2.5;

export class BeanRagdoll {
  /** @param {{bean: import('./BeanModel.js').BeanModel, animator: import('./BeanAnimator.js').BeanAnimator, checkpointZ: Function}} refs */
  constructor(refs) {
    this.bean = refs.bean;
    this.animator = refs.animator;
    this.checkpointZ = refs.checkpointZ;
    /** @type {Array<CANNON.Body>} */
    this.bodies = [];
    /** @type {Array<CANNON.Constraint>} */
    this.constraints = [];
    /** @type {Array<THREE.Mesh>} */
    this.meshes = [];
    this.active = false;
    this.timer = 0;
  }

  /** @param {number} impactSpeed */
  maybeTrigger(impactSpeed) {
    if (this.active || impactSpeed <= 8) return;
    this.trigger();
  }

  trigger() {
    if (this.active) return;
    this.active = true;
    this.timer = RAGDOLL_TIME;
    this.animator.disabled = true;   // freeze procedural posing
    this.bean.root.visible = false;  // hide the rigid bean

    const base = this.bean.body.position;
    const v = this.bean.body.velocity;
    const defs = [
      { r: 0.2, off: [0, 1.5, 0] },   // head
      { r: 0.35, off: [0, 0.8, 0] },  // torso
      { r: 0.1, off: [-0.45, 0.9, 0] }, // armL
      { r: 0.1, off: [0.45, 0.9, 0] },  // armR
      { r: 0.12, off: [-0.2, 0.2, 0] }, // legL
      { r: 0.12, off: [0.2, 0.2, 0] },  // legR
    ];
    const mat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.55 });
    const prev = null;
    for (const d of defs) {
      const body = new CANNON.Body({ mass: 0.3, shape: new CANNON.Sphere(d.r) });
      body.position.set(base.x + d.off[0], base.y + d.off[1], base.z + d.off[2]);
      body.velocity.set(v.x, v.y + 2, v.z); // inherit + small pop
      physicsWorld.addBody(body);
      this.bodies.push(body);

      const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.r, 10, 8), mat);
      mesh.castShadow = true;
      (this.bean.root.parent ?? this.scene)?.add(mesh); // host may be detached between rounds
      if (mesh.parent) this.meshes.push(mesh);
      physicsWorld.sync(mesh, body);
    }
    // Loose ConeTwist chain: each part loosely tied to the previous
    for (let i = 1; i < this.bodies.length; i++) {
      const c = new CANNON.ConeTwistConstraint(this.bodies[i - 1], this.bodies[i], {
        pivotA: new CANNON.Vec3(0, -0.3, 0),
        pivotB: new CANNON.Vec3(0, 0.3, 0),
        axisA: new CANNON.Vec3(0, 1, 0),
        axisB: new CANNON.Vec3(0, 1, 0),
        angle: Math.PI / 3,
        twistAngle: Math.PI / 4,
      });
      physicsWorld.world.addConstraint(c);
      this.constraints.push(c);
    }
    this.bean.body.velocity.set(0, 0, 0);
    this.bean.body.position.set(base.x, -50, base.z); // park the real body
    Logger.physics('RAGDOLL triggered!');
  }

  /** Fixed-step countdown → auto-recover. */
  update(dt) {
    if (!this.active) return;
    this.timer -= dt;
    if (this.timer <= 0) this.recover();
  }

  recover() {
    // Remove ragdoll physics + meshes
    for (const c of this.constraints) physicsWorld.world.removeConstraint(c);
    for (const b of this.bodies) physicsWorld.removeBody(b);
    for (const m of this.meshes) {
      physicsWorld.unsync(m);
      m.geometry.dispose(); m.material.dispose();
      m.parent?.remove(m);
    }
    this.bodies = []; this.constraints = []; this.meshes = [];

    // Respawn at the last checkpoint
    const z = this.checkpointZ();
    this.bean.body.position.set(0, 1.2, z);
    this.bean.body.velocity.set(0, 0, 0);
    this.bean.root.visible = true;
    this.animator.disabled = false;
    this.animator.play('stumble'); // recovery anim
    this.active = false;
    eventBus.emit('player:recovered', {});
    Logger.physics('RAGDOLL recovered at checkpoint');
  }
}
