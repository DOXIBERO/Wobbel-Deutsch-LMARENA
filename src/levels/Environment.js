/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — Environment (Part 003): ground + lights
 * ============================================================
 * First visuals: green ground under a blue sky with real shadows.
 */
import * as THREE from 'three';
import { Logger } from '../core/Logger.js';

/** @type {THREE.Mesh|null} */ let ground = null;
/** @type {THREE.Light[]} */ const lights = [];

/**
 * @param {THREE.Scene} scene
 */
export function init(scene) {
  // ── Ground: 60×60 green plane
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x5a9c4a, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Lights: ambient + shadow-casting sun + hemisphere
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  lights.push(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(8, 15, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 50;
  lights.push(sun);

  const hemi = new THREE.HemisphereLight(0x87CEEB, 0x5a9c4a, 0.4);
  lights.push(hemi);

  scene.add(ambient, sun, hemi);
  Logger.game('Environment: ground + 3 lights ready');
  return { ground, lights };
}

export { ground, lights };
