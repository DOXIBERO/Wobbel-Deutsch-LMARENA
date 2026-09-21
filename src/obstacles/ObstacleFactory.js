/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — ObstacleFactory (Part 058)
 * ============================================================
 * Registry for all 15 obstacle types + course assembly.
 * create(type, cfg, scene) → instance; createAll(template, scene)
 * builds the structural course (floor/walls/finish) + every
 * non-gate segment; destroyAll(obstacles) cleans everything.
 *
 * Common obstacle interface: update(dt, beanBody, hooks?),
 * activate(), deactivate(), destroy() (alias of dispose()).
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { makeTextSprite } from '../ui/TextSprite.js';
import { FinishLine } from '../levels/FinishLine.js';
import { WordGate } from './WordGate.js';
import { MovingPlatform } from './MovingPlatform.js';
import { SwingingHammer } from './SwingingHammer.js';
import { SpinningLog } from './SpinningLog.js';
import { Bumper } from './Bumper.js';
import { Trampoline } from './Trampoline.js';
import { ConveyorBelt } from './ConveyorBelt.js';
import { LavaFloor } from './LavaFloor.js';
import { FallingBlocks } from './FallingBlocks.js';
import { WindTunnel } from './WindTunnel.js';
import { WordBridge } from './WordBridge.js';
import { ColorSort } from './ColorSort.js';
import { CountingZone } from './CountingZone.js';
import { IceFloor } from './IceFloor.js';
import { SlimeZone } from './SlimeZone.js';
import { Logger } from '../core/Logger.js';

export const REGISTRY = {
  DOOR_GATE: WordGate,
  MOVING_PLATFORM: MovingPlatform,
  SWINGING_HAMMER: SwingingHammer,
  SLIME_ZONE: SlimeZone,
  CONVEYOR_BELT: ConveyorBelt,
  BUMPER: Bumper,
  TRAMPOLINE: Trampoline,
  ICE_FLOOR: IceFloor,
  LAVA_FLOOR: LavaFloor,
  SPINNING_LOG: SpinningLog,
  FALLING_BLOCKS: FallingBlocks,
  WIND_TUNNEL: WindTunnel,
  WORD_BRIDGE: WordBridge,
  COLOR_SORT: ColorSort,
  COUNTING_ZONE: CountingZone,
};

export const ObstacleFactory = {
  /** All 15 registered type keys. */
  get types() { return Object.keys(REGISTRY); },

  /**
   * Build one obstacle.
   * @param {string} type REGISTRY key
   * @param {object} cfg segment config {z, x?, ...type-specific, ...hooks}
   * @param {THREE.Scene} scene
   */
  create(type, cfg = {}, scene) {
    const Cls = REGISTRY[type];
    if (!Cls) { Logger.game(`ObstacleFactory: unknown type "${type}"`); return null; }
    return new Cls(scene, cfg);
  },

  /**
   * Build a whole course from a template: floor, side walls, START
   * pad, FinishLine + every non-gate segment (gates are wired by
   * PlayingState — they need the round's word selections).
   * @returns {{obstacles:object[], finish:FinishLine, length:number, group:THREE.Group, dispose:Function}}
   */
  createAll(template, scene, hooks = {}) {
    const length = template.length;
    const group = new THREE.Group();

    // ── Floor strip
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, length + 12),
      new THREE.MeshStandardMaterial({ color: 0x69a85c, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 5 - (length + 12) / 2);
    floor.receiveShadow = true;
    group.add(floor);

    // ── Side walls (static)
    for (const wx of [-5.3, 5.3]) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 3, length + 12),
        new THREE.MeshStandardMaterial({ color: 0x8d9aa5, roughness: 0.8 }));
      wall.position.set(wx, 1.5, 5 - (length + 12) / 2);
      group.add(wall);
      const body = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(0.3, 1.5, (length + 12) / 2)) });
      body.position.set(wx, 1.5, 5 - (length + 12) / 2);
      physicsWorld.addBody(body);
      group.userData.bodies ??= [];
      group.userData.bodies.push(body);
    }

    // ── START pad
    const start = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 4),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.35 }));
    start.rotation.x = -Math.PI / 2;
    start.position.set(0, 0.02, 3);
    group.add(start);
    const startLbl = makeTextSprite('START', { scale: 2.4, font: 'bold 96px Arial, sans-serif' });
    startLbl.position.set(0, 1.6, 3);
    group.add(startLbl);

    scene.add(group);

    // ── FinishLine at the far end
    const finishZ = -(length - 5);
    const finish = new FinishLine(scene, {
      z: finishZ,
      onCross: hooks.onFinishCross ?? null,
    });

    // ── Segments (gates skipped — words live in the round plan)
    const obstacles = [];
    for (const seg of template.segments) {
      if (seg.type === 'DOOR_GATE' || seg.type === 'WORD_ZONE') continue;
      const inst = ObstacleFactory.create(seg.type, { ...seg.config, ...hooks }, scene);
      if (inst) obstacles.push(inst);
    }
    Logger.game(`ObstacleFactory: built "${template.id}" — ${obstacles.length} obstacles, length ${length} m`);

    return {
      obstacles, finish, length, group,
      finishZ,
      dispose() {
        for (const o of obstacles) o.dispose?.();
        finish.dispose();
        for (const b of group.userData.bodies ?? []) physicsWorld.removeBody(b);
        scene.remove(group);
      },
    };
  },

  /** Clean up a whole obstacle list. */
  destroyAll(obstacles) {
    for (const o of obstacles) o.dispose?.();
    obstacles.length = 0;
  },
};
