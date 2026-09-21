/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — WordZone (Parts 044-045)
 * ============================================================
 * Floor challenge: 4 colored quadrants; stand on the right one
 * when the timer ends or the floor drops (soft elimination).
 * Variants: COLOR_MATCH, NUMBER_COUNT, OPPOSITE.
 */
import * as THREE from 'three';
import { wordText3D } from '../ui/WordText3D.js';
import { germanVoice } from '../audio/GermanVoice.js';
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

const QUAD = 5; // 5m × 5m each
const COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f];
const COLOR_NAMES = ['ROT', 'BLAU', 'GRUN', 'GELB'];

export class WordZone {
  /**
   * @param {THREE.Scene} scene
   * @param {{z:number, onPass:Function, onFail:Function}} cfg
   */
  constructor(scene, cfg) {
    this.scene = scene;
    this.z = cfg.z;
    this.onPass = cfg.onPass;
    this.onFail = cfg.onFail;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.active = false;
    this.timer = 0;
    this.correctIndex = -1;
    this.variant = 'COLOR_MATCH';
    /** @type {Array<THREE.Mesh>} */
    this.quads = [];
    /** @type {Array<THREE.Sprite>} */
    this.labels = [];
    this.dropped = false;

    // Build 2×2 quadrant grid centered at (0, z)
    const offsets = [[-QUAD / 2, -QUAD / 2], [QUAD / 2, -QUAD / 2], [-QUAD / 2, QUAD / 2], [QUAD / 2, QUAD / 2]];
    for (let i = 0; i < 4; i++) {
      const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(QUAD, QUAD),
        new THREE.MeshStandardMaterial({ color: COLORS[i], roughness: 0.8 })
      );
      quad.rotation.x = -Math.PI / 2;
      quad.position.set(offsets[i][0], 0.05, this.z + offsets[i][1]);
      quad.userData.baseY = 0.05;
      quad.userData.index = i;
      this.group.add(quad);
      this.quads.push(quad);
    }
    Logger.game(`WordZone: 4 quadrants @ z=${this.z}`);
  }

  /** @param {'COLOR_MATCH'|'NUMBER_COUNT'|'OPPOSITE'} type */
  setVariant(type) { this.variant = type; }

  /** Kick off a challenge with the given word (from VocabularyDB). */
  start(word) {
    if (this.active) return;
    this.active = true;
    this.timer = 5;
    this.dropped = false;

    // Pick the correct quadrant by variant
    if (this.variant === 'COLOR_MATCH') {
      this.correctIndex = COLOR_NAMES.indexOf(word.de.toUpperCase().replace('Ü', 'U').replace('WEIß', 'WEISS'));
      if (this.correctIndex === -1) this.correctIndex = Math.floor(Math.random() * 4);
      this.#labelQuads(COLOR_NAMES.map((n, i) => i === this.correctIndex ? word.de.toUpperCase() : n));
    } else if (this.variant === 'NUMBER_COUNT') {
      const n = parseInt(word.en, 10); // "three" → no; use de number words map
      this.correctIndex = Math.floor(Math.random() * 4);
      const emoji = '🍎';
      const count = { eins: 1, zwei: 2, drei: 3, vier: 4, funf: 5 }[word.id] ?? this.correctIndex + 1;
      this.correctIndex = count - 1 >= 0 && count - 1 < 4 ? count - 1 : this.correctIndex;
      this.#labelQuads([1, 2, 3, 4].map((c) => emoji.repeat(c)));
      void n;
    } else { // OPPOSITE
      this.correctIndex = Math.floor(Math.random() * 4);
      const pairs = { gross: 'klein', klein: 'gross', schnell: 'langsam', heiß: 'kalt' };
      const answer = pairs[word.id] ?? word.en.toUpperCase();
      const labels = ['?', '?', '?', '?'];
      labels[this.correctIndex] = answer.toUpperCase();
      this.#labelQuads(labels);
    }

    germanVoice.speak(word.de);
    eventBus.emit('zone:start', { word: word.id });
  }

  #labelQuads(texts) {
    this.labels.forEach((l) => wordText3D.release(l));
    this.labels = texts.map((t, i) => {
      const s = wordText3D.createFloatingLabel(t, this.quads[i].position.clone().setY(1.2), '#fff');
      this.group.add(s);
      return s;
    });
  }

  /** Per-frame: timer → drop wrong quadrants → resolve. */
  update(dt, beanBody) {
    if (!this.active) return false;
    wordText3D.updateBobs(dt, this.labels);
    this.timer -= dt;
    if (this.timer > 0) return false;

    // Which quadrant is the bean on?
    const bx = beanBody.position.x, bz = beanBody.position.z;
    const inX = Math.abs(bx) <= QUAD, inZ = Math.abs(bz - this.z) <= QUAD;
    const standing = (inX ? (bx > 0 ? 1 : 0) : -1) + (inZ ? (bz > this.z ? 2 : 0) : -99);

    if (!this.dropped) {
      this.dropped = true;
      const ok = standing >= 0 && standing === this.correctIndex;
      // Drop wrong quadrants (visual + event only; zone is decorative floor)
      this.quads.forEach((q) => {
        if (q.userData.index !== this.correctIndex) q.userData.drop = true;
      });
      if (ok) { this.onPass(); this.#resolve(true); return true; }
      if (standing < 0 || standing !== this.correctIndex) {
        // Bean was on a dropped quadrant → it falls (we nudge physics)
        beanBody.velocity.set(0, -2, 0);
        this.onFail();
        this.#resolve(false);
        return true;
      }
    }
    return false;
  }

  #resolve() {
    setTimeout(() => {
      // Reset: quads rise back after 3 s
      this.quads.forEach((q) => { q.userData.drop = false; });
      this.labels.forEach((l) => wordText3D.release(l));
      this.labels = [];
      this.active = false;
    }, 3000);
  }

  /** Per-frame visual: dropped quads sink 5 m over 0.5 s. */
  updateVisual(dt) {
    for (const q of this.quads) {
      const target = q.userData.drop ? -5 : q.userData.baseY;
      q.position.y += (target - q.position.y) * Math.min(1, dt * 8);
    }
  }

  dispose() {
    this.labels.forEach((l) => wordText3D.release(l));
    this.scene.remove(this.group);
  }
}
