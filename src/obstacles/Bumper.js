/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — Bumper (Part 047)
 * ============================================================
 * Pink candy bumper: static cylinder, radial impulse on contact +
 * bounce sound + spark particles.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { soundFX } from '../audio/SoundFX.js';
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

export class Bumper {
  /**
   * @param {THREE.Scene} scene
   * @param {{x:number, z:number, onSpark?:Function}} pos
   */
  constructor(scene, pos) {
    this.pos = new CANNON.Vec3(pos.x, 0.75, pos.z);
    this.onSpark = pos.onSpark;

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 1.5, 20),
      new THREE.MeshStandardMaterial({ color: 0xFF69B4, emissive: 0xFF1493, emissiveIntensity: 0.35, roughness: 0.4 })
    );
    mesh.position.copy(this.pos);
    mesh.castShadow = true;
    scene.add(mesh);
    this.mesh = mesh;

    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Cylinder(0.7, 0.7, 1.5, 12),
      material: physicsWorld.materials.BEAN, // bouncy pair
    });
    this.body.position.copy(this.pos);
    this.body.addEventListener('collide', (e) => this.#hit(e));
    physicsWorld.addBody(this.body);
    Logger.game(`Bumper @ (${pos.x}, ${pos.z})`);
  }

  #hit(event) {
    const bean = event.body;
    if (!bean?._woTag) return;
    const dir = new CANNON.Vec3(bean.position.x - this.pos.x, 0, bean.position.z - this.pos.z);
    if (dir.length() < 0.01) dir.set(0, 0, 1);
    dir.normalize();
    const force = 12 + Math.random() * 8; // 12-20
    bean.velocity.x = dir.x * force * 0.8;
    bean.velocity.z = dir.z * force * 0.8;
    bean.velocity.y = Math.max(bean.velocity.y, 3);
    soundFX.play('bounce');
    this.onSpark?.(new THREE.Vector3(this.pos.x, 1.2, this.pos.z));
    eventBus.emit('bumper:hit', {});
  }

  /** Part 058 common interface (event-driven — nothing per-frame). */
  update(_dt, _beanBody) { /* collision events do the work */ }
  activate() {} deactivate() {}
  destroy() { this.dispose(); }

  dispose() {
    this.body.removeEventListener('collide', this.#hit);
    physicsWorld.removeBody(this.body);
    this.mesh.geometry.dispose(); this.mesh.material.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
