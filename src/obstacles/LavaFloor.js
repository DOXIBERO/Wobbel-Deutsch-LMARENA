/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — LavaFloor (Part 052)
 * ============================================================
 * Glowing animated lava strip. Standing on it 2 s = soft
 * elimination (ragdoll + checkpoint respawn). Quick hops across
 * are safe. Sticky (SLIME wobble) + orange light + bubbling SFX.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

const BURN_TIME = 2;

export class LavaFloor {
  /** @param {{x?:number, z:number, width?:number, length?:number, onEliminate?:Function, onSticky?:Function}} cfg */
  constructor(scene, cfg = {}) {
    this.x = cfg.x ?? 0;
    this.z = cfg.z;
    this.width = cfg.width ?? 6;
    this.length = cfg.length ?? 4;
    this.onEliminate = cfg.onEliminate ?? null;   // () => ragdoll + respawn
    this.onSticky = cfg.onSticky ?? null;         // (on:boolean) → SLIME wobble
    this.group = new THREE.Group();
    this.group.position.set(this.x, 0, this.z);

    // ── Animated lava canvas: orange-red gradient + dark crust patches
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#ff9500'); g.addColorStop(0.5, '#ff4400'); g.addColorStop(1, '#c22b00');
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) {                 // darker crust blobs
      c.fillStyle = `rgba(60,20,8,${0.35 + Math.random() * 0.3})`;
      c.beginPath();
      c.ellipse(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 26, 6 + Math.random() * 18, Math.random() * 3, 0, 7);
      c.fill();
    }
    this.tex = new THREE.CanvasTexture(cv);
    this.tex.wrapS = this.tex.wrapT = THREE.RepeatWrapping;
    this.tex.repeat.set(2, 2);

    this.mat = new THREE.MeshStandardMaterial({
      map: this.tex, emissive: 0xff4400, emissiveIntensity: 0.4, emissiveMap: this.tex, roughness: 0.9,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.length), this.mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.02;
    plane.receiveShadow = true;
    this.group.add(plane);

    this.light = new THREE.PointLight(0xff6a00, 1, 6);   // illuminates nearby objects
    this.light.position.set(0, 1.5, 0);
    this.group.add(this.light);
    scene.add(this.group);

    // ── Trigger zone (pass-through box; overlap checked per frame)
    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC, collisionResponse: false,
      shape: new CANNON.Box(new CANNON.Vec3(this.width / 2, 1, this.length / 2)),
    });
    this.body.position.set(this.x, 0.5, this.z);
    physicsWorld.addBody(this.body);

    this._burn = 0;
    this._bubbleIn = 0.5;
    this._t = 0;
    this._sticky = false;
    Logger.game(`LavaFloor @z=${this.z} (${this.width}×${this.length})`);
  }

  update(dt, beanBody) {
    this._t += dt;
    this.mat.emissiveIntensity = 0.45 + Math.sin(this._t * 2.2) * 0.15;  // 0.3–0.6
    this.tex.offset.x = Math.sin(this._t * 0.35) * 0.1;                  // slow crust drift
    this.tex.offset.y += dt * 0.02;
    if (!beanBody) return;

    // ── Bubbling SFX: random low bursts, audible near the lava
    const near = Math.hypot(beanBody.position.x - this.x, beanBody.position.z - this.z) < 12;
    this._bubbleIn -= dt;
    if (near && this._bubbleIn <= 0) {
      this.#bubble();
      this._bubbleIn = 0.4 + Math.random() * 0.8;
    }

    // ── Burn timer
    const p = beanBody.position;
    const inside = Math.abs(p.x - this.x) < this.width / 2 && Math.abs(p.z - this.z) < this.length / 2 && p.y < 1.2;
    if (inside) {
      if (!this._sticky) { this._sticky = true; this.onSticky?.(true); }
      this._burn += dt;
      if (this._burn >= BURN_TIME) {
        this._burn = 0;
        this.onEliminate?.();              // ragdoll → checkpoint respawn
      }
    } else {
      this._burn = Math.max(0, this._burn - dt * 2);
      if (this._sticky) { this._sticky = false; this.onSticky?.(false); }
    }
  }

  #bubble() {
    const ctx = soundFX.ctx; if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sine';
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(65 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.18);
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.22);
  }

  activate() {}
  deactivate() {}
  destroy() { this.dispose(); }
  dispose() {
    physicsWorld.removeBody(this.body);
    this.tex.dispose(); this.mat.dispose();
    this.group.parent?.remove(this.group);
  }
}
