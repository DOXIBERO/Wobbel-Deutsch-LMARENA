/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — MovingPlatform (Part 046)
 * ============================================================
 * Kinematic hazard-striped platform, ping-pong between two points.
 * HORIZONTAL (X) / VERTICAL (Y elevator) / CIRCULAR (sin/cos).
 * Kinematic bodies carry dynamic riders automatically in cannon-es
 * (contact solver), so the bean rides for free.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { Logger } from '../core/Logger.js';

function hazardTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#111';
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i + 16, 0); ctx.lineTo(i + 16 + 128, 128); ctx.lineTo(i + 128, 128);
    ctx.closePath(); ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

export class MovingPlatform {
  /**
   * @param {THREE.Scene} scene
   * @param {{start:{x,y,z}, end:{x,y,z}, speed?:number, type?:'HORIZONTAL'|'VERTICAL'|'CIRCULAR'}} cfg
   */
  constructor(scene, cfg) {
    this.type = cfg.type ?? 'HORIZONTAL';
    this.speed = cfg.speed ?? 2.5;
    this.start = new CANNON.Vec3(cfg.start.x, cfg.start.y, cfg.start.z);
    this.end = new CANNON.Vec3(cfg.end.x, cfg.end.y, cfg.end.z);
    this.t = 0;
    this.dir = 1;
    this._last = new CANNON.Vec3();

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.3, 3),
      new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.6 })
    );
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    this.body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(new CANNON.Vec3(2, 0.15, 1.5)),
    });
    this.body.position.copy(this.start);
    physicsWorld.addBody(this.body);
    physicsWorld.sync(this.mesh, this.body);
    Logger.game(`MovingPlatform: ${this.type} @ z=${cfg.start.z}`);
  }

  /** Ping-pong update (per fixed step). */
  update(dt) {
    this._last.copy(this.body.position);
    const dist = this.start.distanceTo(this.end);
    this.t += (this.dir * this.speed * dt) / Math.max(0.01, dist);

    if (this.type === 'CIRCULAR') {
      const a = this.t * Math.PI * 2;
      this.body.position.set(
        this.start.x + (this.end.x - this.start.x) * (0.5 + 0.5 * Math.sin(a)),
        this.start.y,
        this.start.z + (this.end.z - this.start.z) * (0.5 + 0.5 * Math.cos(a))
      );
    } else {
      if (this.t > 1) { this.t = 1; this.dir = -1; }
      if (this.t < 0) { this.t = 0; this.dir = 1; }
      const y = this.type === 'VERTICAL' ? 1 : 0;
      this.body.position.set(
        this.start.x + (this.end.x - this.start.x) * this.t,
        this.start.y + (this.end.y - this.start.y) * this.t * y,
        this.start.z + (this.end.z - this.start.z) * this.t
      );
    }
    // Surface velocity so the contact solver carries riders
    this.body.velocity.set(
      (this.body.position.x - this._last.x) / dt,
      (this.body.position.y - this._last.y) / dt,
      (this.body.position.z - this._last.z) / dt
    );
  }

  dispose() {
    physicsWorld.unsync(this.mesh);
    physicsWorld.removeBody(this.body);
    this.mesh.geometry.dispose(); this.mesh.material.map?.dispose(); this.mesh.material.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
