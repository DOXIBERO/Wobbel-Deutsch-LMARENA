/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — CountingZone (Part 057)
 * ============================================================
 * Number words through COUNTING: 4 floor sections hold 1/3/5/2
 * bouncing apples. The voice says a number ("DREI") — after a
 * 5 s timer only the section with that count scores.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

const SEC_XS = [-3.6, -1.2, 1.2, 3.6];
export const NUM_WORDS = { 1: 'EINS', 2: 'ZWEI', 3: 'DREI', 4: 'VIER', 5: 'FÜNF' };
const TIMER = 5;

export class CountingZone {
  /** @param {{z:number, target?:number, onCorrect?:Function, onWrong?:Function, voice?:{speak:Function}}} cfg */
  constructor(scene, cfg = {}) {
    this.z = cfg.z;
    this.target = cfg.target ?? 3;
    this.onCorrect = cfg.onCorrect ?? null;
    this.onWrong = cfg.onWrong ?? null;
    this.voice = cfg.voice ?? null;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, this.z);
    this._apples = [];
    this._floors = [];
    this._labels = [];
    this._t = 0;
    this._armed = true;
    this._spoke = false;
    this._resolved = false;

    // ── 4 tinted section floors with their count label
    const counts = [1, 3, 5, 2];
    const tints = [0xffca28, 0x4dd0e1, 0xba68c8, 0xff8a65];
    counts.forEach((n, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: tints[i], transparent: true, opacity: 0.3 });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 6), mat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(SEC_XS[i], 0.03, 0);
      this.group.add(floor);
      this._floors.push(floor);

      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.2),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 }));
      lbl.rotation.x = -Math.PI / 2;
      lbl.position.set(SEC_XS[i], 0.04, -2.4);
      this.group.add(lbl);
      this._labels.push(lbl.material);
      this.#drawCount(lbl.material.map ?? null, lbl, n);

      // ── n apples: light dynamic spheres, keep them gently bouncing
      for (let k = 0; k < n; k++) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 }));
        const body = new CANNON.Body({ mass: 0.3, shape: new CANNON.Sphere(0.24), sleepSpeedLimit: 0.05 });
        body.position.set(SEC_XS[i] + (Math.random() - 0.5) * 1.6, 0.5 + Math.random() * 0.8, (Math.random() - 0.5) * 4.5);
        body.linearDamping = 0.25;
        physicsWorld.addBody(body);
        this.group.add(mesh);
        this._apples.push({ mesh, body, home: body.position.clone() });
      }
    });
    scene.add(this.group);
    this._jiggleIn = 1.5;
    Logger.game(`CountingZone @z=${this.z} target=${this.target} (${NUM_WORDS[this.target]})`);
  }

  #drawCount(_existing, lbl, n) {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const c = cv.getContext('2d');
    c.font = 'bold 92px Arial, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#fff';
    c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 10;
    c.strokeText(String(n), 64, 68); c.fillText(String(n), 64, 68);
    const tex = new THREE.CanvasTexture(cv);
    lbl.material.map = tex;
    lbl.material.needsUpdate = true;
  }

  update(dt, beanBody) {
    this._t += dt;

    // Apples: gentle periodic jiggle = visible counting chaos
    this._jiggleIn -= dt;
    if (this._jiggleIn <= 0) {
      this._jiggleIn = 1.6 + Math.random() * 0.8;
      for (const a of this._apples) {
        a.body.wakeUp();
        a.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 0.5, 1.2 + Math.random(), (Math.random() - 0.5) * 0.5), a.body.position);
      }
    }
    for (const a of this._apples) { a.mesh.position.copy(a.body.position); }

    if (!beanBody) return;
    // Speak the target number on approach
    if (!this._spoke && this.z - beanBody.position.z < 10 && beanBody.position.z > this.z) {
      this._spoke = true;
      this.voice?.speak(NUM_WORDS[this.target], 0.8);
    }

    // After the timer: score by where the player STANDS
    if (this._armed && this._t >= TIMER) {
      this._armed = false;
      this._resolved = true;
      const lane = SEC_XS.findIndex((x) => Math.abs(beanBody.position.x - x) <= 1.2);
      const counts = [1, 3, 5, 2];
      const correct = lane >= 0 && counts[lane] === this.target;
      this._floors.forEach((f, i) => {
        f.material.opacity = 0.55;
        f.material.color.setHex(i === lane && counts[i] === this.target ? 0x00e676 : (counts[i] === this.target ? 0x00e676 : 0xb71c1c));
      });
      if (correct) { soundFX.play('correct'); this.onCorrect?.(); }
      else { soundFX.play('wrong'); this.onWrong?.(); }
    }
  }

  activate() { this._armed = true; this._resolved = false; }
  deactivate() {}
  destroy() { this.dispose(); }
  dispose() {
    for (const a of this._apples) physicsWorld.removeBody(a.body);
    for (const f of this._floors) f.material.dispose();
    for (const l of this._labels) { l.map?.dispose(); l.dispose(); }
    this.group.parent?.remove(this.group);
  }
}
