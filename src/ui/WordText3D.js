/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — WordText3D (Part 040)
 * ============================================================
 * Giant canvas-texture sprites: gate labels (3 m), floating bobbing
 * labels, HUD-size words. Object pool → no GC spikes.
 */
import * as THREE from 'three';

class WordText3D {
  constructor() {
    /** @type {Map<string, THREE.Sprite[]>} */
    this.pool = new Map();
    this.live = [];
  }

  /** Acquire from pool (or create). Caller positions it. */
  #acquire(text, opts) {
    const key = `${text}|${opts.fontSize}|${opts.color}`;
    let s = (this.pool.get(key) ?? []).pop();
    if (!s) {
      const tex = this.#draw(text, opts);
      s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    }
    s.visible = true;
    this.live.push(s);
    return s;
  }

  /** Return to pool. */
  release(sprite) {
    sprite.visible = false;
    sprite.parent?.remove(sprite);
    this.live = this.live.filter((s) => s !== sprite);
    const text = sprite.userData.poolKey ?? '';
    if (!this.pool.has(text)) this.pool.set(text, []);
    this.pool.get(text).push(sprite);
  }

  releaseAll() {
    for (const s of [...this.live]) this.release(s);
  }

  #draw(text, { size = 128, color = '#FFF', outline = '#000', outlineWidth = 8, bg = null, width = 512, height = 256, font = 'bold 110px Arial' }) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); }
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = outline;
    ctx.strokeText(text, width / 2, height / 2);
    ctx.fillStyle = color;
    ctx.fillText(text, width / 2, height / 2);
    return new THREE.CanvasTexture(canvas);
  }

  /** Gate label: 3 m wide, above the door. */
  createGateLabel(text, position) {
    const s = this.#acquire(text.toUpperCase(), { fontSize: 110 });
    s.userData.poolKey = `${text.toUpperCase()}|110|#FFF`;
    s.scale.set(3, 1.5, 1);
    s.position.copy(position);
    s.material.map = this.#draw(text.toUpperCase(), { fontSize: 110 });
    s.material.needsUpdate = true;
    return s;
  }

  /** Floating label that bobs (caller updates with updateBobs). */
  createFloatingLabel(text, position, color = '#FFF') {
    const s = this.#acquire(text, { fontSize: 96, color });
    s.userData.poolKey = `${text}|96|${color}`;
    s.userData.baseY = position.y;
    s.userData.bobPhase = Math.random() * Math.PI * 2;
    s.scale.set(2.5, 1.25, 1);
    s.position.copy(position);
    return s;
  }

  /** Extra-large word (4 m) for the bottom-center prompt. */
  createHUDWord(text, position) {
    const s = this.#acquire(text.toUpperCase(), { fontSize: 140 });
    s.userData.poolKey = `${text.toUpperCase()}|140|#FFF`;
    s.scale.set(4, 2, 1);
    s.position.copy(position);
    return s;
  }

  /** Animate bobbing labels (call per frame). */
  updateBobs(dt, sprites) {
    for (const s of sprites) {
      if (!s.userData.baseY) continue;
      s.userData.bobPhase += dt * 2;
      s.position.y = s.userData.baseY + Math.sin(s.userData.bobPhase) * 0.15;
    }
  }
}

export const wordText3D = new WordText3D();
