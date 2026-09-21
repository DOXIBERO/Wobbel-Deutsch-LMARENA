/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — WordGate (Part 022) — THE learning mechanic
 * ============================================================
 * Wall with 3 doors. Above each door: German word billboard.
 * Wrong doors = invisible solid walls (bounce back + penalty);
 * correct door = trigger → 'gate:correct'.
 *
 * Sequential activation (Part 023): a locked gate blocks ALL doors
 * and dims its labels; activate() opens it and speaks the word.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { makeTextSprite } from '../ui/TextSprite.js';
import { sfx } from '../audio/Sfx.js';
import { Logger } from '../core/Logger.js';

const DOOR_W = 2.5;
const DOOR_H = 3;
const DOOR_XS = [-3, 0, 3]; // centers across the 10 m course

export class WordGate {
  /**
   * @param {THREE.Scene} scene
   * @param {{z:number, options:object[], correctIndex:number, index:number,
   *          onCorrect:Function, onWrong:Function}} cfg
   */
  constructor(scene, cfg) {
    this.scene = scene;
    this.z = cfg.z;
    this.options = cfg.options;
    this.correctIndex = cfg.correctIndex;
    this.index = cfg.index;
    this.onCorrect = cfg.onCorrect;
    this.onWrong = cfg.onWrong;

    this.active = false;
    this.passed = false;
    this._debounce = 0;
    /** @type {Array<any>} */
    this._bodies = [];
    /** @type {Array<THREE.Object3D>} */
    this._meshes = [];

    this.#buildWall();
    this.#buildLabels();
    this.#buildDoors();

    Logger.game(`WordGate #${this.index + 1}: "${this.options[this.correctIndex].de}" @ z=${this.z}`);
  }

  #buildWall() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.7 });
    // 4 segments spanning [-5, 5] around the 3 door gaps
    const edges = [-5, ...DOOR_XS.flatMap((x) => [x - DOOR_W / 2, x + DOOR_W / 2]), 5];
    for (let i = 0; i < edges.length; i += 2) {
      const x0 = edges[i], x1 = edges[i + 1];
      const w = x1 - x0;
      if (w <= 0.01) continue;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, DOOR_H, 0.5), mat);
      seg.position.set((x0 + x1) / 2, DOOR_H / 2, this.z);
      seg.castShadow = true;
      this.scene.add(seg);
      this._meshes.push(seg);

      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(w / 2, DOOR_H / 2, 0.25)),
      });
      body.position.set((x0 + x1) / 2, DOOR_H / 2, this.z);
      physicsWorld.addBody(body);
      this._bodies.push(body);
    }
  }

  #buildLabels() {
    this._labels = [];
    this.options.forEach((opt, lane) => {
      const label = makeTextSprite(opt.de.toUpperCase(), { scale: 3, font: 'bold 96px Arial, sans-serif' });
      label.position.set(DOOR_XS[lane], DOOR_H + 0.9, this.z + 0.3);
      this.scene.add(label);
      this._meshes.push(label);
      this._labels.push(label);
    });
    this.#dimLabels(true);
  }

  #dimLabels(locked) {
    for (const l of this._labels) l.material.opacity = locked ? 0.35 : 1;
  }

  #buildDoors() {
    this._doorBodies = [];
    DOOR_XS.forEach((x, lane) => {
      // Correct lane: trigger (overlap detection); wrong lanes: invisible walls
      const isCorrect = lane === this.correctIndex;
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(DOOR_W / 2, DOOR_H / 2, 0.25)),
      });
      body.position.set(x, DOOR_H / 2, this.z);
      // Correct door starts SOLID (gate locked) → becomes a pass-through
      // trigger on activate(). Wrong doors stay solid forever.
      if (isCorrect) body.collisionResponse = true;
      body.addEventListener('collide', (e) => this.#onDoorEnter(e, lane));
      physicsWorld.addBody(body);
      this._bodies.push(body);
      this._doorBodies.push(body);
    });
  }

  #onDoorEnter(event, lane) {
    if (!this.active || this.passed) return;
    if (performance.now() < this._debounce) return;
    // Only react to the PLAYER bean (tagged on its body)
    const other = event.body;
    if (!other || other._woTag !== 'player') return;
    this._debounce = performance.now() + 1000;

    if (lane === this.correctIndex) {
      this.passed = true;
      this.onCorrect({ gate: this, word: this.options[lane] });
    } else {
      this.onWrong({ gate: this, word: this.options[lane] });
    }
  }

  /** Open this gate (sequential activation) + speak the word. */
  activate() {
    if (this.active) return;
    this.active = true;
    this.#dimLabels(false);
    // Correct door becomes a pass-through trigger; wrong doors stay solid.
    const door = this._doorBodies[this.correctIndex];
    door.collisionResponse = false;
    door.isTrigger = true;
    sfx.speak(this.options[this.correctIndex].de);
    Logger.game(`WordGate #${this.index + 1}: ACTIVATED`);
  }

  /**
   * Deterministic pass check — runs every frame for the ACTIVE gate.
   * cannon-es contact events are unreliable for pass-through doors
   * (collisionResponse=false pairs may generate no contact), so we
   * detect the plane crossing geometrically instead.
   * @param {CANNON.Body} beanBody
   */
  update(beanBody) {
    if (!this.active || this.passed) return;
    const pz = beanBody.position.z;
    if (this._prevZ === null) { this._prevZ = pz; return; }
    const crossed = this._prevZ > this.z && pz <= this.z; // runs toward −z
    this._prevZ = pz;
    if (!crossed) return;
    // Which door span was the bean in when it crossed?
    const lane = DOOR_XS.findIndex((x) => Math.abs(beanBody.position.x - x) <= DOOR_W / 2);
    if (lane === this.correctIndex) {
      this.passed = true;
      this.onCorrect({ gate: this, word: this.options[this.correctIndex] });
    }
  }

  /** Did the player just approach? (speak once on approach) */
  maybeSpeakOnApproach(playerZ) {
    if (this.active && !this.passed && !this._spokeNear && playerZ - this.z < 10) {
      this._spokeNear = true;
      sfx.speak(this.options[this.correctIndex].de);
    }
  }

  dispose() {
    for (const b of this._bodies) physicsWorld.removeBody(b);
    for (const m of this._meshes) {
      m.material?.map?.dispose();
      m.material?.dispose();
      m.geometry?.dispose?.();
      this.scene.remove(m);
    }
  }
}
