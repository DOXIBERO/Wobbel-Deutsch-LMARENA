/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BeanModel (Part 009)
 * ============================================================
 * The character. Procedural by default; the GLTF swap-in lives in
 * loadGLTF(url) — changing ONE file moves the whole game to models.
 *
 * Body plan: capsule torso + belly, sphere head, eyes/smile,
 * stubby arms/hands/legs + red shoes + Berlin cap. All inside a
 * Group ("root") that the physics sphere drags around.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { Logger } from '../core/Logger.js';

export class BeanModel {
  /**
   * @param {{color?: number, isGLTF?: boolean}} [config]
   */
  constructor(config = {}) {
    const color = config.color ?? 0xFFD700;
    this.isGLTF = config.isGLTF ?? false;

    /** All visual meshes live here (physics moves this Group). */
    this.root = new THREE.Group();
    this.root.name = 'bean';

    /** Named parts — animator/skins target these. */
    this.parts = {};

    if (this.isGLTF) {
      // FUTURE PATH: a real .glb replaces buildProceduralBean().
      this.loadGLTF('/models/bean.glb'); // logs "GLTF swap ready" for now
    }
    this.buildProceduralBean(color); // default until a GLB exists

    // ── Physics: mass-1 sphere (r = 0.5)
    this.body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Sphere(0.5),
      material: physicsWorld.materials.BEAN,
      linearDamping: 0.05,
      angularDamping: 0.9,
      allowSleep: false, // forces must always move the bean
    });
    this.body.position.set(0, 2, 0);
    physicsWorld.addBody(this.body);
    physicsWorld.sync(this.root, this.body);

    Logger.game('BeanModel: bean ready (procedural, GLTF-swappable)');
  }

  /**
   * THE swap point: replace this method's body with a GLTF scene and
   * the whole game (animator included, via .parts) switches over.
   * @param {number} color
   */
  buildProceduralBean(color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xFF3333, roughness: 0.5 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
    const handMat = new THREE.MeshStandardMaterial({ color: 0xE6C200, roughness: 0.55 });
    this.materials = { bodyMat, handMat, shoeMat, capMat };

    const cast = (m) => { m.castShadow = true; return m; };

    // Torso (capsule) + chubby belly
    const torso = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.6, 8, 16), bodyMat));
    torso.name = 'torso';
    this.root.add(torso);

    const belly = cast(new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), bodyMat));
    belly.position.set(0, -0.05, 0.1);
    belly.name = 'belly';
    torso.add(belly);

    // Head (squished sphere)
    const head = cast(new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), bodyMat));
    head.position.set(0, 0.65, 0);
    head.scale.set(1, 0.9, 0.95);
    head.name = 'head';
    torso.add(head);

    // Eyes: white + pupil ×2
    const mkEye = (sx) => {
      const g = new THREE.Group();
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), whiteMat);
      g.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), darkMat);
      pupil.position.z = 0.055;
      g.add(pupil);
      g.position.set(0.11 * sx, 0.08, 0.24);
      head.add(g);
      return g;
    };
    this.parts.eyeL = mkEye(-1);
    this.parts.eyeR = mkEye(1);

    // Mouth: half-torus smile
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 12, Math.PI), darkMat);
    mouth.position.set(0, 0.5, 0.26);
    mouth.rotation.z = Math.PI; // arc opens down → smile
    torso.add(mouth);
    this.parts.mouth = mouth;

    // Arms (angled outward) + hands
    const mkArm = (sx) => {
      const arm = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 8), bodyMat));
      arm.position.set(0.34 * sx, 0.15, 0);
      arm.rotation.z = -0.5 * sx;
      torso.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), handMat);
      hand.position.set(0, -0.24, 0);
      arm.add(hand);
      return arm;
    };
    this.parts.armL = mkArm(-1);
    this.parts.armR = mkArm(1);

    // Legs + red shoes
    const mkLeg = (sx) => {
      const leg = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 4, 8), bodyMat));
      leg.position.set(0.16 * sx, -0.55, 0);
      torso.add(leg);
      const shoe = cast(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.25), shoeMat));
      shoe.position.set(0, -0.18, 0.05);
      leg.add(shoe);
      return leg;
    };
    this.parts.legL = mkLeg(-1);
    this.parts.legR = mkLeg(1);

    // Berlin cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.07, 16), capMat);
    cap.position.set(0, 0.28, 0);
    head.add(cap);
    this.parts.cap = cap;

    this.parts.torso = torso;
    this.parts.head = head;
  }

  /** Recolor every body material. */
  applyColor(hex) {
    this.materials.bodyMat.color.set(hex);
  }

  /**
   * FUTURE: replace the procedural bean with a GLTF model.
   * @param {string} url
   */
  loadGLTF(url) {
    // Real swap lands in a later part — the hook is the point today.
    console.log('GLTF swap ready: ' + url);
  }

  /** Physics cleanup (round teardown). */
  dispose() {
    physicsWorld.unsync(this.root);
    physicsWorld.removeBody(this.body);
    this.root.traverse((o) => {
      if (o.isMesh) o.geometry?.dispose();
    });
  }
}
