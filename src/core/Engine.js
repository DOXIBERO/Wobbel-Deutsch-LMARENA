/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — Engine (Part 002)
 * ============================================================
 * Owns the Three.js trinity: WebGLRenderer, Scene, PerspectiveCamera.
 * GLTFLoader is imported from day one so any mesh can be swapped to a
 * GLTF model later by changing ONE file (see BeanModel.loadGLTF).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Logger } from './Logger.js';

/** @type {THREE.WebGLRenderer|null} */
let renderer = null;
/** @type {THREE.Scene|null} */
let scene = null;
/** @type {THREE.PerspectiveCamera|null} */
let camera = null;

/** Shared GLTF loader — ready for model drop-ins. */
export const gltfLoader = new GLTFLoader();

/**
 * Create renderer/scene/camera and attach them to the DOM.
 * @param {HTMLCanvasElement} [canvas]
 */
export function init(canvas = document.getElementById('game-canvas')) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);

  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );
  camera.position.set(0, 8, 14);
  camera.lookAt(0, 1, 0);

  window.addEventListener('resize', onResize);
  Logger.game('Engine: WebGLRenderer, Scene and Camera ready');
  return engine;
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/** Render one frame (GameLoop.onRender calls this). */
export function render() {
  if (renderer && scene && camera) renderer.render(scene, camera);
}

/** Singleton accessors (populated after init). */
export const engine = {
  get renderer() { return renderer; },
  get scene() { return scene; },
  get camera() { return camera; },
};
