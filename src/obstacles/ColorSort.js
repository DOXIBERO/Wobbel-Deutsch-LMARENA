/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — ColorSort (Part 056)
 * ============================================================
 * Color vocabulary + timing: the floor strip cycles
 * ROT→BLAU→GRÜN→GELB every 2 s. Cross the 4-door gate line
 * through the door MATCHING the floor color at that instant.
 * Match → points + chime; mismatch → penalty + backward bounce.
 */
import * as THREE from 'three';
import { makeTextSprite } from '../ui/TextSprite.js';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

export const SORT_COLORS = [
  { de: 'ROT', hex: 0xe53935 },
  { de: 'BLAU', hex: 0x1e88e5 },
  { de: 'GRÜN', hex: 0x43a047 },
  { de: 'GELB', hex: 0xfdd835 },
];
const DOOR_XS = [-3.75, -1.25, 1.25, 3.75];
const CYCLE = 2;

export class ColorSort {
  /** @param {{z:number, onPass?:Function, onWrong?:Function}} cfg */
  constructor(scene, cfg = {}) {
    this.z = cfg.z;
    this.onPass = cfg.onPass ?? null;
    this.onWrong = cfg.onWrong ?? null;
    this.group = new THREE.Group();
    this._t = 0;
    this._prevZ = null;
    this._resolved = false;

    // ── Emissive floor strip (the "which color NOW?" tell)
    this.floorMat = new THREE.MeshStandardMaterial({ color: 0xe53935, emissive: 0xe53935, emissiveIntensity: 0.7 });
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2), this.floorMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.03, this.z + 1.6);
    this.group.add(strip);

    // ── 4 doors: colored frames + word labels, all pass-through
    this.doorMats = [];
    SORT_COLORS.forEach((c, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: c.hex, emissive: c.hex, emissiveIntensity: 0.5 });
      this.doorMats.push(mat);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3, 0.18), mat);
      frame.position.set(DOOR_XS[i], 1.5, this.z);
      this.group.add(frame);
      const label = makeTextSprite(c.de, { scale: 1.7, font: 'bold 96px Arial, sans-serif' });
      label.position.set(DOOR_XS[i], 3.6, this.z);
      this.group.add(label);
    });

    // ── Wall segments between the 4 doors
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const edges = [-5, ...DOOR_XS.flatMap((x) => [x - 1.05, x + 1.05]), 5];
    for (let i = 0; i < edges.length; i += 2) {
      const w = edges[i + 1] - edges[i];
      if (w <= 0.01) continue;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, 3, 0.4), wallMat);
      seg.position.set((edges[i] + edges[i + 1]) / 2, 1.5, this.z);
      this.group.add(seg);
    }
    scene.add(this.group);
    Logger.game(`ColorSort @z=${this.z}`);
  }

  /** Floor color index right now (shared by floor + doors). */
  colorIndex() { return Math.floor(this._t / CYCLE) % SORT_COLORS.length; }

  update(dt, beanBody) {
    this._t += dt;
    const ci = this.colorIndex();
    const hex = SORT_COLORS[ci].hex;
    this.floorMat.color.setHex(hex);
    this.floorMat.emissive.setHex(hex);
    this.doorMats.forEach((m, i) => m.emissiveIntensity = i === ci ? 0.9 : 0.25);
    if (!beanBody || this._resolved) return;

    // ── Geometric gate-line crossing (same trick as WordGate)
    const pz = beanBody.position.z;
    if (this._prevZ === null) { this._prevZ = pz; return; }
    const crossed = this._prevZ > this.z && pz <= this.z;
    this._prevZ = pz;
    if (!crossed) return;

    const lane = DOOR_XS.findIndex((x) => Math.abs(beanBody.position.x - x) <= 1.05);
    this._resolved = true;
    if (lane === ci) {
      soundFX.play('correct');
      this.onPass?.();
    } else {
      soundFX.play('wrong');
      beanBody.velocity.z = 4;              // "bounce back" out of the gate
      this.onWrong?.();
    }
  }

  activate() { this._resolved = false; }
  deactivate() {}
  destroy() { this.dispose(); }
  dispose() {
    this.floorMat.dispose();
    for (const m of this.doorMats) m.dispose();
    this.group.parent?.remove(this.group);
  }
}
