/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — SpinningLog (Part 048)
 * ============================================================
 * Horizontal log spinning around Z at 2-5 rad/s; riders get
 * carried around and must time their jump.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { Logger } from '../core/Logger.js';

export class SpinningLog {
  /**
   * @param {THREE.Scene} scene
   * @param {{x:number, z:number, y?:number, speed?:number}} cfg
   */
  constructor(scene, cfg) {
    this.speed = cfg.speed ?? 3;

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 8, 12),
      new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.85 })
    );
    mesh.rotation.z = Math.PI / 2; // lay along X
    mesh.castShadow = true;
    scene.add(mesh);

    this.body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Cylinder(0.4, 0.4, 8, 10),
    });
    // Cylinder axis is Y by default → rotate to X, then spin around world Z
    this.body.quaternion.setFromEuler(0, 0, Math.PI / 2);
    this.body.position.set(cfg.x, cfg.y ?? 0.4, cfg.z);
    this.body.angularVelocity.set(Math.PI / 2, 0, 0); // spin around world X→Z plane (log axis)
    physicsWorld.addBody(this.body);
    physicsWorld.sync(mesh, this.body);
    this.mesh = mesh;
    Logger.game(`SpinningLog @ z=${cfg.z} (${this.speed} rad/s)`);
  }

  update() { /* angularVelocity drives it; sync handled by pairs */ }

  dispose() {
    physicsWorld.unsync(this.mesh);
    physicsWorld.removeBody(this.body);
    this.mesh.geometry.dispose(); this.mesh.material.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
