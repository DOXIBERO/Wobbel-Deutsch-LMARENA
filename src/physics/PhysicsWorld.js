/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — PhysicsWorld (Part 007)
 * ============================================================
 * cannon-es world: gravity, SAP broadphase, sleep, surface
 * materials (BEAN/GROUND/ICE/SLIME) and mesh↔body syncing.
 */
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { Logger } from '../core/Logger.js';

class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    // ── Surface materials (Part 007)
    const mk = (friction, restitution) => new CANNON.Material(`m${friction}${restitution}`);
    this.materials = {
      BEAN: mk(0.3, 0.5),
      GROUND: mk(0.5, 0.1),
      ICE: mk(0.02, 0.3),
      SLIME: mk(0.9, 0.0),
    };
    const cm = (a, b, f, r) => this.world.addContactMaterial(
      new CANNON.ContactMaterial(a, b, { friction: f, restitution: r })
    );
    cm(this.materials.BEAN, this.materials.GROUND, 0.3, 0.5);
    cm(this.materials.BEAN, this.materials.ICE, 0.02, 0.3);
    cm(this.materials.BEAN, this.materials.SLIME, 0.9, 0.0);

    // ── Infinite ground plane matching the visual ground
    this.groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: this.materials.GROUND,
    });
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.addBody(this.groundBody);

    /** @type {Array<{mesh:THREE.Object3D, body:CANNON.Body}>} */
    this._pairs = [];
    Logger.physics('PhysicsWorld: ready (gravity, materials, ground)');
  }

  addBody(b) { this.world.addBody(b); }
  removeBody(b) { this.world.removeBody(b); }

  /** Advance one fixed step. */
  step(dt) { this.world.step(dt); }

  /** Keep a visual mesh glued to a physics body. */
  sync(mesh, body) {
    this._pairs.push({ mesh, body });
  }

  unsync(mesh) { this._pairs = this._pairs.filter((p) => p.mesh !== mesh); }

  /** Copy body transforms into meshes (call after step). */
  syncPairs() {
    for (const { mesh, body } of this._pairs) {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
  }
}

export const physicsWorld = new PhysicsWorld();
