/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — CourseBuilder (Part 012)
 * ============================================================
 * Straight walled course: z +5 (START) → z −60 (ZIEL), 10 m wide.
 * Gray side walls (physics + visual), green floor, checkered
 * finish zone, billboard labels. Gates slot in at z −15/−30/−45.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { makeTextSprite } from '../ui/TextSprite.js';
import { SurfaceZones } from '../physics/SurfaceZones.js';
import { MovingPlatform } from '../obstacles/MovingPlatform.js';
import { Bumper } from '../obstacles/Bumper.js';
import { Trampoline } from '../obstacles/Trampoline.js';
import { SwingingHammer } from '../obstacles/SwingingHammer.js';
import { SpinningLog } from '../obstacles/SpinningLog.js';
import { Logger } from '../core/Logger.js';

export const COURSE = {
  startZ: 5,
  finishZ: -60,
  halfWidth: 5,
  wallX: 5.25,
  gates: [-15, -30, -45],
  checkpoints: [-15, -30, -45],
  duration: 90, // full-course timer (Part 050)
};

export class CourseBuilder {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    /** @type {Array<any>} */
    this.obstacles = [];
    this.surfaceZones = new SurfaceZones(scene);
    this.build();
    this.buildObstacles();
    Logger.game('CourseBuilder: full course ready (3 gates + 6 obstacle types + 2 zones)');
  }

  /** Part 050: bumpers, platform, hammer, trampoline, log, ice + slime. */
  buildObstacles() {
    const sparkless = (v) => this._lastSpark = v;
    // 2 bumpers (z=-8, z=-12)
    this.obstacles.push(new Bumper(this.scene, { x: -1.5, z: -8, onSpark: sparkless }));   // between lanes
    this.obstacles.push(new Bumper(this.scene, { x: -1.5, z: -12, onSpark: sparkless }));  // center-left, between lanes
    // Horizontal moving platform (z=-13 area)
    this.obstacles.push(new MovingPlatform(this.scene, {
      type: 'HORIZONTAL', speed: 2.5,
      start: { x: -1.8, y: 0.15, z: -13.5 }, end: { x: 1.8, y: 0.15, z: -13.5 }, // low: roll over it
    }));
    // ICE zone (z −20..−25)
    this.surfaceZones.addZone({ x: 0, z: -22.5 }, { w: 10, d: 5 }, 'ICE'); // pure floor: no blockers
    // Swinging hammer (z=-25)
    this.hammer = new SwingingHammer(this.scene, { x: 0, z: -26.5, onSmash: sparkless });
    // (post-ice, before Gate 2 — swings across, time your run)
    // SLIME zone (z −30..−35)
    this.surfaceZones.addZone({ x: 0, z: -32.5 }, { w: 10, d: 5 }, 'SLIME');
    // Trampoline (z=-40)
    this.obstacles.push(new Trampoline(this.scene, { x: 3.2, z: -40 })); // off the racing line
    // Spinning log (z=-48)
    this.obstacles.push(new SpinningLog(this.scene, { x: 0, z: -48, y: 0.4, speed: 2 }));
  }

  /** Per-frame obstacle animation. */
  updateObstacles(dt, beanBody, onRagdoll) {
    for (const o of this.obstacles) o.update?.(dt);
    this.hammer?.update(dt, beanBody, onRagdoll);
  }

  /** @param {{x:number, z:number}} beanPos */
  updateSurfaces(beanPos) {
    return this.surfaceZones.update(beanPos);
  }

  /** Furthest checkpoint z the bean has passed (ragdoll respawn). */
  lastCheckpointZ(beanZ) {
    let z = COURSE.startZ - 5;
    for (const c of COURSE.checkpoints) if (beanZ <= c) break; else z = c;
    return z + 2;
  }

  build() {
    // ── Side walls: visual + physics
    const length = COURSE.startZ - COURSE.finishZ + 5; // 70
    const cz = (COURSE.startZ + COURSE.finishZ) / 2 - 2.5;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, length), wallMat);
      wall.position.set(side * COURSE.wallX, 1.5, cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);

      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(0.25, 1.5, length / 2)),
      });
      body.position.set(side * COURSE.wallX, 1.5, cz);
      physicsWorld.addBody(body);
    }

    // ── Floor strip along the whole course (slightly darker than grass)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(COURSE.halfWidth * 2, length),
      new THREE.MeshStandardMaterial({ color: 0x6fae5c, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, cz);
    floor.receiveShadow = true;
    this.group.add(floor);

    // ── START label + pad
    const start = makeTextSprite('START', { scale: 3 });
    start.position.set(0, 2.2, 4);
    this.group.add(start);
    const startPad = new THREE.Mesh(
      new THREE.PlaneGeometry(COURSE.halfWidth * 2, 4),
      new THREE.MeshStandardMaterial({ color: 0x8fd47a, roughness: 0.9 })
    );
    startPad.rotation.x = -Math.PI / 2;
    startPad.position.set(0, 0.02, 3);
    this.group.add(startPad);

    // ── ZIEL label + checkered finish zone (canvas texture)
    const ziel = makeTextSprite('ZIEL!', { scale: 3.4 });
    ziel.position.set(0, 2.4, -58);
    this.group.add(ziel);

    const finish = new THREE.Mesh(
      new THREE.PlaneGeometry(COURSE.halfWidth * 2, 5),
      new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.8 })
    );
    finish.rotation.x = -Math.PI / 2;
    finish.position.set(0, 0.02, -57.5);
    this.group.add(finish);
  }

  dispose() {
    this.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material?.map?.dispose(); o.material?.dispose(); } });
    this.scene.remove(this.group);
  }
}

/** 2-row checkerboard canvas texture (finish line). */
function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const cell = 16;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#111' : '#eee';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 2.5);
  return tex;
}
