/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — SurfaceZones (Part 032)
 * ============================================================
 * AABB floor zones that change the bean's feel: ICE (slides),
 * SLIME (crawl + weak jumps). Visual pads + EventBus events.
 * Physics material swap = per-frame friction override on the bean.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

export class SurfaceZones {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    /** @type {Array<{minX,maxX,minZ,maxZ,type,mesh,beanInside}>} */
    this.zones = [];
  }

  /**
   * @param {{x:number, z:number}} center
   * @param {{w:number, d:number}} size
   * @param {'ICE'|'SLIME'} type
   */
  addZone(center, size, type) {
    const color = type === 'ICE' ? 0xADD8E6 : 0x44AA00;
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: type === 'ICE' ? 0.15 : 0.95,
      transparent: type === 'ICE', opacity: type === 'ICE' ? 0.8 : 1,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.w, 0.06, size.d), mat);
    mesh.position.set(center.x, 0.03, center.z);
    mesh.receiveShadow = true;
    if (type === 'SLIME') this.#bumpy(mesh.geometry); // vertex displacement
    this.scene.add(mesh);

    this.zones.push({
      type,
      mesh,
      minX: center.x - size.w / 2, maxX: center.x + size.w / 2,
      minZ: center.z - size.d / 2, maxZ: center.z + size.d / 2,
      beanInside: false,
    });
    Logger.game(`SurfaceZone: ${type} @ z=${center.z}`);
  }

  /** Random vertical displacement = bumpy slime. */
  #bumpy(geometry) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.08);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Per-frame check → returns active surface type (NORMAL default).
   * Emits surface:enter / surface:exit.
   * @param {{x:number, z:number}} beanPos
   * @returns {'NORMAL'|'ICE'|'SLIME'}
   */
  update(beanPos) {
    let active = 'NORMAL';
    for (const z of this.zones) {
      const inside = beanPos.x >= z.minX && beanPos.x <= z.maxX
        && beanPos.z >= z.minZ && beanPos.z <= z.maxZ;
      if (inside && !z.beanInside) { z.beanInside = true; eventBus.emit('surface:enter', { type: z.type }); }
      if (!inside && z.beanInside) { z.beanInside = false; eventBus.emit('surface:exit', { type: z.type }); }
      if (inside) active = z.type;
    }
    return active;
  }

  dispose() {
    for (const z of this.zones) {
      z.mesh.geometry.dispose(); z.mesh.material.dispose();
      this.scene.remove(z.mesh);
    }
    this.zones = [];
  }
}
