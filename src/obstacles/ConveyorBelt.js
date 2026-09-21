/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — ConveyorBelt (Part 051)
 * ============================================================
 * Yellow-black chevron belt that drags the bean sideways.
 * Static box + constant lateral force while the bean is on top.
 * Mechanical 120 Hz hum while the bean rides.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

const SPEEDS = { slow: 4, med: 6, fast: 8 };        // force magnitude (N)
const DIRS = {
  RIGHT: new THREE.Vector2(1, 0), LEFT: new THREE.Vector2(-1, 0),
  FORWARD: new THREE.Vector2(0, -1), BACK: new THREE.Vector2(0, 1),
};

export class ConveyorBelt {
  /** @param {{x?:number, z:number, dir?:'LEFT'|'RIGHT'|'FORWARD'|'BACK', speed?:'slow'|'med'|'fast', onRagdoll?:Function}} cfg */
  constructor(scene, cfg = {}) {
    this.x = cfg.x ?? 0;
    this.z = cfg.z;
    this.force = SPEEDS[cfg.speed ?? 'slow'];
    const d = DIRS[cfg.dir ?? 'RIGHT'];
    this.dir = { x: d.x, z: d.y };
    this.onRagdoll = cfg.onRagdoll ?? null;
    this.group = new THREE.Group();
    this.group.position.set(this.x, 0, this.z);

    // ── Scrolling chevron texture (canvas: yellow bg, black arrows)
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const c = cv.getContext('2d');
    c.fillStyle = '#ffd200'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#111'; c.lineWidth = 14;
    for (const y of [32, 96]) {            // two chevrons pointing +v (belt forward)
      c.beginPath(); c.moveTo(20, y + 18); c.lineTo(64, y - 18); c.lineTo(108, y + 18); c.stroke();
    }
    this.tex = new THREE.CanvasTexture(cv);
    this.tex.wrapS = this.tex.wrapT = THREE.RepeatWrapping;
    this.tex.repeat.set(1, 3);

    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.15, 6),
      new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.6 }));
    belt.position.y = 0.075;
    belt.receiveShadow = true;
    this.group.add(belt);

    // ── Gray metal side rails (visual + physics borders)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.6, roughness: 0.4 });
    for (const rx of [-1.55, 1.55]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 6), railMat);
      rail.position.set(rx, 0.17, 0);
      this.group.add(rail);
    }
    scene.add(this.group);

    // ── Physics: belt top (slightly slippery) + rails
    this._bodies = [];
    const beltBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(1.5, 0.075, 3)) });
    beltBody.position.set(this.x, 0.075, this.z);
    physicsWorld.addBody(beltBody); this._bodies.push(beltBody);
    for (const rx of [-1.55, 1.55]) {
      const rail = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(0.05, 0.175, 3)) });
      rail.position.set(this.x + rx, 0.175, this.z);
      physicsWorld.addBody(rail); this._bodies.push(rail);
    }

    this._hum = null;                       // { osc, gain } while ridden
    this._active = true;
    Logger.game(`ConveyorBelt @z=${this.z} dir=${cfg.dir ?? 'RIGHT'} force=${this.force}`);
  }

  #humStart() {
    if (this._hum) return;
    const ctx = soundFX.ctx; if (!ctx) return;
    const osc = ctx.createOscillator(); osc.frequency.value = 120; osc.type = 'sawtooth';
    const gain = ctx.createGain(); gain.gain.value = 0.015;
    osc.connect(gain).connect(ctx.destination); osc.start();
    this._hum = { osc, gain };
  }
  #humStop() {
    if (!this._hum) return;
    try { this._hum.osc.stop(); } catch { /* already stopped */ }
    this._hum = null;
  }

  /** Drag any bean standing on the belt. */
  update(dt, beanBody) {
    if (this._active) {                     // scroll texture in movement direction
      this.tex.offset.y -= dt * this.force * 0.12 * (this.dir.z >= 0 ? -1 : 1);
      this.tex.offset.x += dt * this.force * 0.12 * this.dir.x;
    }
    if (!beanBody) return;
    const p = beanBody.position;
    const on = Math.abs(p.x - this.x) < 1.6 && Math.abs(p.z - this.z) < 3.1 && p.y < 1.4 && p.y > -0.5;
    if (on && this._active) {
      this.#humStart();
      beanBody.applyForce(new CANNON.Vec3(this.dir.x * this.force, 0, this.dir.z * this.force), p);
    } else this.#humStop();
  }

  activate() { this._active = true; }
  deactivate() { this._active = false; this.#humStop(); }
  destroy() { this.dispose(); }
  dispose() {
    this.#humStop();
    for (const b of this._bodies) physicsWorld.removeBody(b);
    this._bodies = [];
    this.tex.dispose();
    this.group.parent?.remove(this.group);
  }
}
