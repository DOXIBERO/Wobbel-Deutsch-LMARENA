/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — WordBridge (Part 055)
 * ============================================================
 * A pit (5 m wide, 3 m deep, slime bottom) crossed by 4 narrow
 * planks, each labeled with a German word. The voice calls the
 * target word — only THAT plank has a physics body. Wrong plank
 * = fall through into the slime (soft elimination).
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { makeTextSprite } from '../ui/TextSprite.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

const PLANK_XS = [-2.4, -0.8, 0.8, 2.4];

export class WordBridge {
  /**
   * @param {{z:number, correctIndex:number, words:object[], onFall?:Function, voice?:{speak:Function}}} cfg
   *   words = 4 vocab entries; words[correctIndex] is the target.
   */
  constructor(scene, cfg = {}) {
    this.z = cfg.z;
    this.correctIndex = cfg.correctIndex ?? 0;
    this.words = cfg.words;
    this.onFall = cfg.onFall ?? null;
    this.voice = cfg.voice ?? null;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, this.z);
    this._bodies = [];
    this._meshes = [];
    this._spoke = false;

    // ── Pit walls + slime bottom (soft elimination pool)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
    for (const [w, h, d, px, py] of [[10, 3, 0.4, 0, -1.5], [10, 0.3, 5.4, 0, -3.05]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(px, py, 0);
      this.group.add(m);
    }
    const slime = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 5),
      new THREE.MeshStandardMaterial({ color: 0x59c93c, emissive: 0x2c7a12, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
    slime.rotation.x = -Math.PI / 2;
    slime.position.y = -2.9;
    this.group.add(slime);
    this._meshes.push(slime);

    // ── 4 planks; only the correct one gets a physics body
    const plankMat = new THREE.MeshStandardMaterial({ color: 0xa9713d, roughness: 0.8 });
    PLANK_XS.forEach((x, i) => {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 5), plankMat);
      plank.position.set(x, 0, 0);
      plank.castShadow = true;
      this.group.add(plank);
      this._meshes.push(plank);

      const label = makeTextSprite(this.words[i].de.toUpperCase(), { scale: 2.2, font: 'bold 90px Arial, sans-serif' });
      label.position.set(x, 1.5, 0);
      this.group.add(label);
      this._meshes.push(label);

      if (i === this.correctIndex) {
        const body = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(0.4, 0.09, 2.5)) });
        body.position.set(x, 0.09, this.z);
        physicsWorld.addBody(body);
        this._bodies.push(body);
      }
    });
    scene.add(this.group);
    Logger.game(`WordBridge @z=${this.z}: "${this.words[this.correctIndex].de}" plank ${this.correctIndex}`);
  }

  update(dt, beanBody) {
    // Speak the target word once the bean gets close
    if (!this._spoke && beanBody && this.z - beanBody.position.z < 10 && beanBody.position.z > this.z) {
      this._spoke = true;
      this.voice?.speak(this.words[this.correctIndex].de, 0.8);
    }
    // Slime bath = soft elimination (ragdoll → checkpoint respawn)
    if (beanBody && beanBody.position.y < -2.2 &&
        Math.abs(beanBody.position.z - this.z) < 3) {
      this.onFall?.();
    }
  }

  activate() {}
  deactivate() {}
  destroy() { this.dispose(); }
  dispose() {
    for (const b of this._bodies) physicsWorld.removeBody(b);
    for (const m of this._meshes) { m.material?.map?.dispose(); m.material?.dispose(); m.geometry?.dispose?.(); }
    this.group.parent?.remove(this.group);
  }
}
