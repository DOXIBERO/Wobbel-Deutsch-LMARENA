/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — IceFloor (Part 058 registry filler)
 * ============================================================
 * Per-instance icy strip (template courses). Pale translucent
 * panel + ICE surface events while the bean is on it.
 * (The classic course keeps using batch-2 SurfaceZones.)
 */
import * as THREE from 'three';
import { Logger } from '../core/Logger.js';

export class IceFloor {
  /** @param {{x?:number, z:number, width?:number, length?:number, onSurface?:Function}} cfg */
  constructor(scene, cfg = {}) {
    this.x = cfg.x ?? 0;
    this.z = cfg.z;
    this.width = cfg.width ?? 10;
    this.length = cfg.length ?? 5;
    this.onSurface = cfg.onSurface ?? null;   // (name|null) — 'ICE' while on
    this.group = new THREE.Group();
    this.group.position.set(this.x, 0, this.z);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.length),
      new THREE.MeshStandardMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.1 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.025;
    this.group.add(mesh);
    scene.add(this.group);
    this._on = false;
    Logger.game(`IceFloor @z=${this.z}`);
  }
  update(_dt, beanBody) {
    const p = beanBody?.position;
    const on = !!p && Math.abs(p.x - this.x) < this.width / 2 && Math.abs(p.z - this.z) < this.length / 2 && p.y < 1;
    if (on !== this._on) { this._on = on; this.onSurface?.(on ? 'ICE' : null); }
  }
  activate() {} deactivate() {}
  destroy() { this.dispose(); }
  dispose() { this.group.parent?.remove(this.group); }
}
