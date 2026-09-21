/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BeanSkins + Accessories (Parts 010+049)
 * ============================================================
 * Six Berlin skins; KREUZBERG gold chain, BERGHAIN sunglasses,
 * SPATI apron, DONER chef hat. Accessories swap with the skin.
 */
import * as THREE from 'three';

export const SKINS = {
  CLASSIC: { body: 0xFFD700, shoes: 0xFF3333, cap: 0x333333, accessory: null },
  KREUZBERG: { body: 0x222222, shoes: 0x00FF00, cap: 0xFFD700, accessory: 'chain' },
  SPATI: { body: 0xFFFFFF, shoes: 0x0066FF, cap: 0xFF6600, accessory: 'apron' },
  UBAHN: { body: 0x888888, shoes: 0xFFCC00, cap: 0x003366, accessory: null },
  BERGHAIN: { body: 0x111111, shoes: 0x111111, cap: 0x111111, accessory: 'sunglasses' },
  DONER: { body: 0xF4A460, shoes: 0x8B4513, cap: 0xFFFFFF, accessory: 'chefhat' },
};

/**
 * @param {import('./BeanModel.js').BeanModel} beanModel
 * @param {keyof typeof SKINS} name
 */
export function applySkin(beanModel, name) {
  const cfg = SKINS[name] ?? SKINS.CLASSIC;
  beanModel.materials.bodyMat.color.set(cfg.body);
  beanModel.materials.shoeMat.color.set(cfg.shoes);
  beanModel.materials.capMat.color.set(cfg.cap);

  removeAccessory(beanModel);
  if (cfg.accessory) addAccessory(beanModel, cfg.accessory);
  return cfg;
}

/** @param {'chain'|'sunglasses'|'apron'|'chefhat'} type */
export function addAccessory(beanModel, type) {
  let acc = null;
  if (type === 'chain') {
    acc = new THREE.Group();
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.012, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.9, roughness: 0.25 })
    );
    chain.position.set(0, 0.25, 0.32);
    chain.rotation.x = 0.35;
    const pendant = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.04),
      new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.9, roughness: 0.2 })
    );
    pendant.position.set(0, 0.02, 0.42);
    acc.add(chain, pendant);
    acc.name = 'acc-chain';
    beanModel.parts.torso.add(acc);
  } else if (type === 'sunglasses') {
    acc = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, transparent: true, opacity: 0.7 });
    for (const sx of [-1, 1]) {
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 20), frameMat);
      frame.position.set(0.11 * sx, 0.08, 0.27);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), lensMat);
      lens.position.set(0.11 * sx, 0.08, 0.275);
      acc.add(frame, lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.008), frameMat);
    bridge.position.set(0, 0.08, 0.27);
    acc.add(bridge);
    acc.name = 'acc-sunglasses';
    beanModel.parts.head.add(acc);
  } else if (type === 'apron') {
    acc = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8, side: THREE.DoubleSide })
    );
    acc.position.set(0, -0.05, 0.42);
    acc.name = 'acc-apron';
    beanModel.parts.torso.add(acc);
  } else if (type === 'chefhat') {
    acc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 0.25, 16),
      new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.85 })
    );
    acc.position.set(0, 0.42, 0);
    acc.name = 'acc-chefhat';
    beanModel.parts.head.add(acc);
  }
  beanModel.accessory = acc;
  return acc;
}

export function removeAccessory(beanModel) {
  if (beanModel.accessory) {
    beanModel.accessory.parent?.remove(beanModel.accessory);
    beanModel.accessory = null;
  }
}
