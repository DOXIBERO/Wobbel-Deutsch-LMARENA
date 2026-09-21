/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — Trampoline (Part 047)
 * ============================================================
 * Blue pad: landing hard (vy < -2) launches the bean (vy 14) with
 * squash-stretch (via WobbleSystem.squash) + bounce sound.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

export class Trampoline {
  /**
   * @param {THREE.Scene} scene
   * @param {{x:number, z:number, wobble?:import('../physics/WobbleSystem.js').WobbleSystem}} pos
   */
  constructor(scene, pos) {
    this.pos = new CANNON.Vec3(pos.x, 0.1, pos.z);
    this.wobble = pos.wobble;

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x0066FF, roughness: 0.5 })
    );
    mesh.position.copy(this.pos);
    mesh.castShadow = true;
    scene.add(mesh);
    this.mesh = mesh;

    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Cylinder(1.5, 1.5, 0.2, 16),
    });
    this.body.position.copy(this.pos);
    this.body.addEventListener('collide', (e) => this.#launch(e));
    physicsWorld.addBody(this.body);
    Logger.game(`Trampoline @ (${pos.x}, ${pos.z})`);
  }

  #launch(event) {
    const bean = event.body;
    if (!bean?._woTag) return;
    if (bean.velocity.y > -2) return; // only when landing from above
    bean.velocity.y = 14;
    this.wobble?.squash(0.7); // big squash → boing
    soundFX.play('bounce');
  }

  dispose() {
    physicsWorld.removeBody(this.body);
    this.mesh.geometry.dispose(); this.mesh.material.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
