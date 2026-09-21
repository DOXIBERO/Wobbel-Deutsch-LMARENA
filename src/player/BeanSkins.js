/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BeanSkins (Part 010)
 * ============================================================
 * Six Berlin-flavored costumes. When the bean goes GLTF later,
 * applySkin remaps those materials instead (same API).
 */
export const SKINS = {
  CLASSIC: { body: 0xFFD700, shoes: 0xFF3333, cap: 0x333333 },
  KREUZBERG: { body: 0x222222, shoes: 0x00FF00, cap: 0xFFD700 },
  SPATI: { body: 0xFFFFFF, shoes: 0x0066FF, cap: 0xFF6600 },
  UBAHN: { body: 0x888888, shoes: 0xFFCC00, cap: 0x003366 },
  BERGHAIN: { body: 0x111111, shoes: 0x111111, cap: 0x111111 },
  DONER: { body: 0xF4A460, shoes: 0x8B4513, cap: 0xFFFFFF },
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
  // GLTF future path: traverse beanModel.gltfScene and remap materials.
  return cfg;
}
