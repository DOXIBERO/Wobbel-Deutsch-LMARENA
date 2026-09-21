/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — CheckpointSystem (Part 069)
 * ============================================================
 * Glowing arches every 20 m. Crossing updates that bean's last
 * checkpoint (player + bots), plays an ascending 3-note chime and
 * emits 'checkpoint:reached'. Elimination respawn reads lastZ.
 */
import * as THREE from 'three';
import { eventBus } from './EventBus.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from './Logger.js';

export class CheckpointSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {{zs:number[], onReach?:Function}} cfg
   */
  constructor(scene, cfg) {
    this.zs = cfg.zs;
    this.onReach = cfg.onReach ?? null;
    this.lastZ = new Map();          // key → z of the last checkpoint crossed
    this.group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd54f, emissive: 0xffc107, emissiveIntensity: 0.9, transparent: true, opacity: 0.85,
    });
    for (const z of this.zs) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(3, 0.14, 8, 28, Math.PI), mat);
      arch.position.set(0, 0.05, z);      // half-ring standing over the course
      this.group.add(arch);
    }
    scene.add(this.group);
    Logger.game(`CheckpointSystem: arches @ ${this.zs.join(', ')}`);
  }

  /**
   * @param {number} _dt
   * @param {Array<{key:string, body:CANNON.Body}>} beans player + bots
   */
  update(_dt, beans) {
    for (const { key, body } of beans) {
      if (!body) continue;
      const z = body.position.z;
      for (let i = 0; i < this.zs.length; i++) {
        const cz = this.zs[i];
        const prev = this.lastZ.get(key) ?? 999;   // start "before" all arches
        if (prev > cz && z <= cz) {                // crossed this arch (runs toward −z)
          this.lastZ.set(key, cz);
          if (key === 'player') this.#chime();
          eventBus.emit('checkpoint:reached', { beanId: key, index: i });
          this.onReach?.({ key, index: i, z: cz });
        } else if (prev <= cz && z > cz) {
          this.lastZ.set(key, 999);                // walked back up — keep it simple
        }
      }
    }
  }

  /** Deepest checkpoint z for a bean (default: start line z=+4). */
  zFor(key) { return this.lastZ.get(key) ?? 4; }

  #chime() {                                   // ascending 3-note
    soundFX.play('beep');
    setTimeout(() => soundFX.play('beep'), 130);
    setTimeout(() => soundFX.play('go'), 260);
  }

  dispose() { this.group.parent?.remove(this.group); }
}
