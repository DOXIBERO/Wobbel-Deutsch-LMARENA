/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — FinishLine (Part 070)
 * ============================================================
 * Checkered floor strip + "ZIEL!" banner + confetti burst on
 * every finisher + placement overlay (🥇🥈🥉 …). Geometric
 * crossing detection for player AND bots.
 */
import * as THREE from 'three';
import { makeTextSprite } from '../ui/TextSprite.js';
import { eventBus } from '../core/EventBus.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

/** @type {Array<THREE.Points>} self-updating confetti bursts */
const bursts = [];

export class FinishLine {
  /** @param {{z:number, onCross?:Function}} cfg onCross(body) per finisher */
  constructor(scene, cfg = {}) {
    this.z = cfg.z;
    this.onCross = cfg.onCross ?? null;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, this.z);
    this._finished = new Set();
    this._prevZ = new Map();

    // ── Checkered canvas (black/white, 2×2 per meter)
    const cv = document.createElement('canvas');
    cv.width = 160; cv.height = 80;
    const c = cv.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
      c.fillStyle = (x + y) % 2 ? '#111' : '#f5f5f5';
      c.fillRect(x * 20, y * 20, 20, 20);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(1.4, 1);
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    strip.rotation.x = -Math.PI / 2;
    strip.position.y = 0.02;
    this.group.add(strip);

    const banner = makeTextSprite('ZIEL!', { scale: 4, font: 'bold 110px Arial, sans-serif' });
    banner.position.set(0, 2.6, 0);
    this.group.add(banner);
    scene.add(this.group);
    Logger.game(`FinishLine @z=${this.z}`);
  }

  /** Track any bean (player or bot). bodyKey must be stable per bean. */
  update(dt, beanBody, key) {
    FinishLine.updateBursts(dt);
    if (!beanBody) return;
    const pz = beanBody.position.z;
    const prev = this._prevZ.get(key);
    this._prevZ.set(key, pz);
    if (prev === undefined || this._finished.has(key)) return;
    if (prev > this.z && pz <= this.z) {
      this._finished.add(key);
      FinishLine.burst(this.group.parent ?? this.group, new THREE.Vector3(beanBody.position.x, 1.5, this.z));
      this.onCross?.(key, beanBody);
      eventBus.emit(key === 'player' ? 'player:finished' : 'bot:finished', { key, z: this.z });
    }
  }

  /** 3rd/4th+ get no podium: +500/+300/+200, then +100 (game code applies). */
  static placePoints(place) { return place === 1 ? 500 : place === 2 ? 300 : place === 3 ? 200 : 100; }

  /** "1. 🥇 You | 2. 🥈 Hans | …" overlay. */
  static showPlacements(list) {
    const medals = ['🥇', '🥈', '🥉'];
    const el = document.createElement('div');
    el.id = 'wo-placements';
    el.style.cssText = `position:fixed; left:50%; top:14%; transform:translateX(-50%);
      z-index:31; background:rgba(13,18,28,0.88); border-radius:18px; padding:18px 30px;
      color:#fff; font-family:system-ui,sans-serif; font-size:20px; text-align:left;
      box-shadow:0 18px 60px rgba(0,0,0,.5);`;
    el.innerHTML = list.slice(0, 8).map((p, i) =>
      `<div style="margin:4px 0; ${p.key === 'player' ? 'font-weight:800; color:#ffd54f;' : ''}">
        ${i + 1}. ${medals[i] ?? '_flags'} ${p.key === 'player' ? 'DU' : p.name} — ${p.label ?? ''}</div>`).join('');
    document.body.appendChild(el);
    return el;
  }

  // ── Confetti ────────────────────────────────────────────────
  /** Spawn a one-shot confetti burst at pos (self-removing). */
  static burst(scene, pos) {
    soundFX.play('victory');
    const N = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const vel = [];
    const palette = [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xe040fb];
    for (let i = 0; i < N; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5);
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5);
      const c = new THREE.Color(palette[i % palette.length]);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 4, (Math.random() - 0.5) * 4));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true }));
    pts.userData = { vel, life: 2.4 };
    scene.add(pts);
    bursts.push(pts);
  }

  static updateBursts(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const pts = bursts[i];
      const pos = pts.geometry.attributes.position;
      const vel = pts.userData.vel;
      pts.userData.life -= dt;
      for (let k = 0; k < vel.length; k++) {
        vel[k].y -= 6 * dt;
        pos.array[k * 3] += vel[k].x * dt;
        pos.array[k * 3 + 1] = Math.max(0.05, pos.array[k * 3 + 1] + vel[k].y * dt);
        pos.array[k * 3 + 2] += vel[k].z * dt;
      }
      pos.needsUpdate = true;
      pts.material.opacity = Math.max(0, pts.userData.life / 2.4);
      if (pts.userData.life <= 0) {
        pts.parent?.remove(pts);
        pts.geometry.dispose(); pts.material.dispose();
        bursts.splice(i, 1);
      }
    }
  }

  destroy() { this.dispose(); }
  dispose() { this.group.parent?.remove(this.group); }
}
