/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — FallingBlocks (Part 053)
 * ============================================================
 * 6 cracked stone cubes (1.5 m) hanging at y=8. When the bean
 * passes underneath they drop after a random 0.5–1.5 s delay
 * (staggered, one wave at a time). Hit → ragdoll + 2 s stun.
 * After 5 s on the ground each block teleports back to ceiling.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

const RESET_AFTER = 5;

export class FallingBlocks {
  /** @param {{x?:number, z:number, onHit?:Function}} cfg */
  constructor(scene, cfg = {}) {
    this.x = cfg.x ?? 0;
    this.z = cfg.z;                     // center row z (blocks span z−1 … z+1)
    this.onHit = cfg.onHit ?? null;     // (impact) → player ragdoll + stun
    this.group = new THREE.Group();

    // ── Cracked stone canvas texture
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const c = cv.getContext('2d');
    c.fillStyle = '#8d8d8d'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(40,40,40,0.8)'; c.lineWidth = 2;
    for (let i = 0; i < 7; i++) {       // crack lines
      c.beginPath();
      let x = Math.random() * 128, y = Math.random() * 128;
      c.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; c.lineTo(x, y); }
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, 0, 128, 12);
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });

    this.blocks = [];
    const xs = [-1.8, 0, 1.8], zs = [-1, 1];
    for (const bx of xs) for (const bz of zs) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mat);
      mesh.castShadow = true;
      const body = new CANNON.Body({
        mass: 5, shape: new CANNON.Box(new CANNON.Vec3(0.75, 0.75, 0.75)),
        sleepSpeedLimit: 0.1,             // Part 075: rest bodies stop calculating
      });
      body.position.set(this.x + bx, 8, this.z + bz);
      body.updateMassProperties();
      body.sleep();                       // held by "trigger" = force-sleep
      body.addEventListener('collide', (e) => this.#onCollide(bz === zs[0] ? null : null, e));
      physicsWorld.addBody(body);
      this.group.add(mesh);
      this.blocks.push({ mesh, body, home: new CANNON.Vec3(this.x + bx, 8, this.z + bz),
        state: 'held', delay: 0, groundTime: 0, crashed: false, warned: false, warnIn: 0 });
    }
    scene.add(this.group);
    this._cooldown = 0;                   // stagger: one release wave at a time
    Logger.game(`FallingBlocks @z=${this.z}`);
  }

  #onCollide(_unused, e) {
    const other = e.body;
    if (other?._woTag === 'player' && this.onHit) this.onHit(9);
  }

  update(dt, beanBody) {
    this._cooldown = Math.max(0, this._cooldown - dt);
    let heldWave = false;
    for (const b of this.blocks) {
      if (b.state === 'held') {
        // Keep parked at the ceiling while held
        b.body.position.copy(b.home);
        b.body.velocity.set(0, 0, 0);
        // Release when the player approaches from the front (+stagger cooldown)
        if (beanBody && this._cooldown <= 0 && !heldWave) {
          const dz = beanBody.position.z - (b.home.z);
          const dx = Math.abs(beanBody.position.x - b.home.x);
          if (dz > 0.5 && dz < 2.2 && dx < 2.6 && b.body.sleepState === CANNON.Body.SLEEPING) {
            b.delay = 0.5 + Math.random();            // 0.5–1.5 s
            b.warnIn = Math.max(0, b.delay - 0.4);
            b.state = 'armed';
            this._cooldown = 0.9;                     // stagger next wave
            heldWave = true;
          }
        }
      } else if (b.state === 'armed') {
        b.delay -= dt;
        b.warnIn -= dt;
        if (b.warnIn <= 0 && !b.warned) { b.warned = true; this.#rumble(); }
        if (b.delay <= 0) { b.body.wakeUp(); b.state = 'falling'; }
      } else if (b.state === 'falling') {
        if (b.body.position.y <= 0.8 && !b.crashed) {
          b.crashed = true;
          this.#crash();
        }
        if (b.body.position.y <= 0.78 && Math.abs(b.body.velocity.y) < 0.6) {
          b.state = 'ground'; b.groundTime = RESET_AFTER;
        }
      } else if (b.state === 'ground') {
        b.groundTime -= dt;
        if (b.groundTime <= 0) {                      // teleport back to ceiling
          b.body.position.copy(b.home);
          b.body.velocity.set(0, 0, 0);
          b.body.sleep();
          b.crashed = false; b.warned = false;
          b.state = 'held';
        }
      }
    }
    // Sync visuals
    for (const b of this.blocks) { b.mesh.position.copy(b.body.position); b.mesh.quaternion.copy(b.body.quaternion); }
  }

  #rumble() {
    const ctx = soundFX.ctx; if (!ctx) return;
    const t = ctx.currentTime;
    const buf = FallingBlocks.#noise(ctx, 0.35);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 120;
    const gain = ctx.createGain(); gain.gain.value = 0.06;
    src.connect(f).connect(gain).connect(ctx.destination); src.start(t);
  }
  #crash() {
    const ctx = soundFX.ctx; if (!ctx) return;
    const t = ctx.currentTime;
    const buf = FallingBlocks.#noise(ctx, 0.25);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(f).connect(gain).connect(ctx.destination); src.start(t);
  }
  static #noise(ctx, secs) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * secs, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  activate() {}
  deactivate() {}
  destroy() { this.dispose(); }
  dispose() {
    for (const b of this.blocks) physicsWorld.removeBody(b.body);
    this.group.parent?.remove(this.group);
  }
}
