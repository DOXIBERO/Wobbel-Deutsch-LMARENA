/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BeanAnimator (Parts 026-030)
 * ============================================================
 * Procedural animation state machine over BeanModel.parts:
 *   IDLE (v<0.5) bob/tilt/sway/breathing · RUN (v>0.5) gait
 *   JUMP squash→stretch→settle (0.6 s) · FALL arms-flail panic
 *   DIVE belly-flop (0.8 s) · STUMBLE trip (0.5 s)
 *   VICTORY hops + pumps (3 s)
 * All posing is ADDITIVE over physics; weights blend 0.2 s.
 * GLTF path (Part 030): loadGLTFAnimations() maps named clips and
 * setMode() routes to the mixer instead — one-line swap later.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

const BLEND = 0.2;      // state blend time (s)
const DUR = { jump: 0.6, dive: 0.8, stumble: 0.5, victory: 3.0 };

export class BeanAnimator {
  /**
   * @param {import('./BeanModel.js').BeanModel} model
   */
  constructor(model) {
    this.model = model;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.state = 'idle';           // idle|run|jump|fall|dive|stumble|victory
    this.mode = null;              // active one-shot (jump/dive/stumble/victory)
    this.modeT = 0;
    this.runWeight = 0;            // 0 = idle, 1 = run
    this._stumbleSide = 1;
    this._flail = { l: new THREE.Euler(), r: new THREE.Euler() };
    this._flailT = 0;
    this._rest = this.#snapshotRest();
    this.disabled = false;         // ragdoll freeze

    // GLTF (Part 030) — dormant until loadGLTFAnimations()
    this.mixer = null;
    this.gltfActions = {};

    eventBus.on('player:jump', () => this.play('jump'));
    eventBus.on('player:dive', () => this.play('dive'));
    eventBus.on('player:stumble', () => this.play('stumble'));
    eventBus.on('player:win', () => this.play('victory'));
  }

  #snapshotRest() {
    const r = {};
    for (const [name, part] of Object.entries(this.model.parts)) {
      r[name] = { p: part.position.clone(), r: part.rotation.clone(), s: part.scale.clone() };
    }
    return r;
  }

  /** Part 030: map GLTF clips (idle/run/jump/fall/dive/stumble/victory). */
  loadGLTFAnimations(gltfScene, clips = []) {
    this.mixer = new THREE.AnimationMixer(gltfScene);
    for (const clip of clips) {
      const key = clip.name.toLowerCase().trim();
      if (['idle', 'run', 'jump', 'fall', 'dive', 'stumble', 'victory'].includes(key)) {
        this.gltfActions[key] = this.mixer.clipAction(clip);
      }
    }
    Logger.game(`BeanAnimator: GLTF anim mode ready (${Object.keys(this.gltfActions).length} clips)`);
    return Object.keys(this.gltfActions).length;
  }

  /** Route a mode to GLTF clips or procedural math. */
  setMode(mode) {
    if (this.mixer && this.gltfActions[mode]) {
      const next = this.gltfActions[mode];
      next.reset().fadeIn(BLEND).play();
      for (const [k, a] of Object.entries(this.gltfActions)) {
        if (k !== mode && a.isRunning()) a.crossFadeTo(next, BLEND, false);
      }
      return true;
    }
    this.mode = mode;
    this.modeT = 0;
    return false; // procedural path handled it
  }

  /** Trigger a one-shot. */
  play(name) {
    if (this.disabled) return;
    if (!DUR[name]) return;
    this.mode = name;
    this.modeT = 0;
    if (name === 'stumble') this._stumbleSide = Math.random() < 0.5 ? -1 : 1;
    if (name === 'victory') this.#restorePose();
    this.setMode(name);
  }

  /**
   * Per-fixed-step update.
   * @param {number} dt
   * @param {THREE.Vector3} velocity world velocity of the bean body
   */
  update(dt, velocity) {
    if (this.disabled) return;
    this.time += dt;

    if (this.mixer) { // GLTF path
      const speed = Math.hypot(velocity.x, velocity.z);
      const key = this.mode ?? (velocity.y < -2 ? 'fall' : speed > 0.5 ? 'run' : 'idle');
      if (!this.gltfActions[key]) this.setMode('idle');
      this.mixer.update(dt);
      return;
    }

    // ── One-shots fully own the pose
    if (this.mode) {
      this.modeT += dt;
      this.#oneShot(this.mode, this.modeT, dt);
      if (this.modeT >= DUR[this.mode]) { this.mode = null; this.#restorePose(); }
      return;
    }

    // ── State pick
    const speed = Math.hypot(velocity.x, velocity.z);
    let target = 'idle';
    if (velocity.y < -2) target = 'fall';
    else if (speed > 0.5) target = 'run';

    // run/idle cross-blend over 0.2 s
    const w = target === 'run' ? 1 : 0;
    this.runWeight += Math.sign(w - this.runWeight) * Math.min(Math.abs(w - this.runWeight), dt / BLEND);

    if (target === 'fall') this.#fall(dt);
    else { this.#idle(this.#iw()); this.#run(this.runWeight, speed); }
    this.state = target;
  }

  /** Idle weight = how much of idle shows (inverse of run blend). */
  #iw() { return 1 - this.runWeight; }

  // ── Continuous states ─────────────────────────────────────────
  #idle(w) {
    if (w <= 0.001) return;
    const m = this.model, t = this.time;
    m.parts.head.rotation.z = this.#r('head').r.z + Math.sin(t * 1.5) * 0.03 * w;
    const sway = Math.sin(t * 1.8) * 0.08 * w;
    m.parts.armL.rotation.z = this.#r('armL').r.z + sway;
    m.parts.armR.rotation.z = this.#r('armR').r.z - sway;
    m.parts.torso.scale.y = 1 + Math.sin(t * 2.0) * 0.015 * w; // breathing
  }

  #run(w, speed) {
    if (w <= 0.001) return;
    const m = this.model;
    const speedK = speed * 1.5;                 // cycle scales with velocity
    const phase = this.time * speedK;
    const swing = 0.6 * w;
    m.parts.legL.rotation.x = Math.sin(phase) * swing;
    m.parts.legR.rotation.x = Math.sin(phase + Math.PI) * swing;
    m.parts.armL.rotation.x = Math.sin(phase + Math.PI) * 0.5 * w;
    m.parts.armR.rotation.x = Math.sin(phase) * 0.5 * w;
    m.parts.torso.rotation.x = -0.15 * w;       // forward lean
    m.parts.head.position.y = this.#r('head').p.y + Math.abs(Math.sin(phase)) * 0.02 * w;
  }

  #fall(dt) {
    const m = this.model;
    this._flailT -= dt;
    if (this._flailT <= 0) { // re-randomize arms 10×/s
      this._flailT = 0.1;
      this._flail.l.set(Math.random() * 0.8 - 0.4, 0, Math.random() * 1.5 + 1.0);
      this._flail.r.set(Math.random() * 0.8 - 0.4, 0, -(Math.random() * 1.5 + 1.0));
    }
    m.parts.armL.rotation.copy(this._flail.l);
    m.parts.armR.rotation.copy(this._flail.r);
    m.parts.legL.rotation.x = 0.3;  // dangle
    m.parts.legR.rotation.x = 0.3;
    m.parts.head.rotation.x = 0.25; // look down
    m.parts.mouth.scale.y = 1.5;    // "O" mouth
    if (m.parts.pupilL) m.parts.pupilL.position.y = this.#r('pupilL').p.y - 0.02;
    if (m.parts.pupilR) m.parts.pupilR.position.y = this.#r('pupilR').p.y - 0.02;
  }

  // ── One-shots ─────────────────────────────────────────────────
  #oneShot(mode, t, dt) {
    const m = this.model;
    if (mode === 'jump') {
      let sx = 1, sy = 1, tuck = 0, raise = 0;
      if (t < 0.15) { const k = t / 0.15; sy = 1 - 0.2 * k; sx = 1 + 0.15 * k; tuck = 0.6 * k; }
      else if (t < 0.4) { sy = 1.2; sx = 0.9; raise = 1; }
      else { const k = Math.min(1, (t - 0.4) / 0.2); sy = 1.2 - 0.2 * k; sx = 0.9 + 0.1 * k; raise = 1 - k; }
      m.parts.torso.scale.set(sx, sy, sx);
      m.parts.legL.rotation.x = tuck; m.parts.legR.rotation.x = tuck;
      if (raise > 0) {
        m.parts.armL.rotation.z = this.#r('armL').r.z + 1.5 * raise;
        m.parts.armR.rotation.z = this.#r('armR').r.z - 1.5 * raise;
      }
    } else if (mode === 'dive') {
      let e;
      if (t < 0.12) e = t / 0.12;
      else if (t > 0.5) e = Math.max(0, 1 - (t - 0.5) / 0.3);
      else e = 1;
      m.parts.torso.rotation.x = -1.4 * e;   // 80° forward
      m.parts.armL.rotation.x = -1.5 * e; m.parts.armR.rotation.x = -1.5 * e;
      m.parts.armL.rotation.z = 0; m.parts.armR.rotation.z = 0;
      m.parts.legL.rotation.x = -0.3 * e; m.parts.legR.rotation.x = -0.3 * e;
      m.parts.torso.scale.set(1.1 * (1 - e) + 1 * e, 1 - 0.15 * e, 1.1 * (1 - e) + 1 * e);
    } else if (mode === 'stumble') {
      const e = Math.sin(Math.PI * Math.min(1, t / DUR.stumble)); // 0→1→0
      const d = this._stumbleSide;
      m.parts.torso.rotation.z = 0.7 * d * e;
      const arm = d > 0 ? 'armL' : 'armR';
      m.parts[arm].rotation.z = this.#r(arm).r.z + 2.0 * d * e;
      m.parts.legL.rotation.x = 0.3 * e; m.parts.legR.rotation.x = -0.3 * e;
      m.parts.eyeL.scale.y = 1 - 0.5 * e; m.parts.eyeR.scale.y = 1 - 0.5 * e; // squint
    } else if (mode === 'victory') {
      m.parts.torso.position.y = this.#r('torso').p.y + Math.abs(Math.sin(t * 6)) * 0.4;
      const pump = (Math.sin(t * Math.PI * 2 * 4) + 1) / 2;
      m.parts.armL.rotation.x = -2.5 * pump;
      m.parts.armR.rotation.x = -2.5 * (1 - pump);
      m.parts.head.rotation.x = -0.3;
    }
  }

  #r(name) { return this._rest[name]; }

  /** Reset every part to its rest pose (post one-shot / victory). */
  #restorePose() {
    for (const [name, part] of Object.entries(this.model.parts)) {
      const r = this._rest[name];
      if (!r) continue;
      part.position.copy(r.p); part.rotation.copy(r.r); part.scale.copy(r.s);
    }
    this.model.parts.torso.position.copy(this._rest.torso.p);
  }
}
