/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — LevelGenerator (Part 060)
 * ============================================================
 * Infinite courses from a seed (mulberry32 → reproducible).
 * Picks difficulty-appropriate obstacles, guarantees a WordGate
 * every ~3rd slot, keeps 8–12 m gaps so every course is
 * completable. Output shape = a LevelTemplates entry.
 */
import { Logger } from '../core/Logger.js';

/** mulberry32 PRNG — deterministic from a 32-bit seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Segment pools per difficulty (gates handled separately)
const POOLS = {
  1: [
    { type: 'BUMPER', make: (z, r) => ({ type: 'BUMPER', z, config: { x: (r() < 0.5 ? -1 : 1) * (1 + r() * 0.7) } }), len: 2 },
    { type: 'TRAMPOLINE', make: (z, r) => ({ type: 'TRAMPOLINE', z, config: { x: (r() - 0.5) * 5 } }), len: 3 },
  ],
  2: [
    { type: 'SWINGING_HAMMER', make: (z) => ({ type: 'SWINGING_HAMMER', z, config: { x: 0.2 } }), len: 3 },
    { type: 'ICE_FLOOR', make: (z) => ({ type: 'ICE_FLOOR', z, config: { width: 10, length: 5 } }), len: 5 },
    { type: 'CONVEYOR_BELT', make: (z, r) => ({ type: 'CONVEYOR_BELT', z, config: { dir: r() < 0.5 ? 'LEFT' : 'RIGHT', speed: r() < 0.5 ? 'slow' : 'med' } }), len: 6 },
    { type: 'SPINNING_LOG', make: (z) => ({ type: 'SPINNING_LOG', z, config: { speed: 2 } }), len: 3 },
    { type: 'MOVING_PLATFORM', make: (z) => ({ type: 'MOVING_PLATFORM', z, config: { type: 'HORIZONTAL', speed: 2, start: { x: 2, y: 0.15, z }, end: { x: 5, y: 0.15, z } } }), len: 4 },
  ],
  3: [
    { type: 'LAVA_FLOOR', make: (z, r) => ({ type: 'LAVA_FLOOR', z, config: { width: 8, length: r() < 0.5 ? 4 : 3 } }), len: 4 },
    { type: 'FALLING_BLOCKS', make: (z) => ({ type: 'FALLING_BLOCKS', z, config: {} }), len: 4 },
    { type: 'WIND_TUNNEL', make: (z, r) => ({ type: 'WIND_TUNNEL', z, config: { dir: r() < 0.6 ? 'UP' : 'LEFT', strength: 'med' } }), len: 8 },
    { type: 'WORD_BRIDGE', make: (z) => ({ type: 'WORD_BRIDGE', z, config: {} }), len: 6 },
    { type: 'COLOR_SORT', make: (z) => ({ type: 'COLOR_SORT', z, config: {} }), len: 3 },
    { type: 'COUNTING_ZONE', make: (z, r) => ({ type: 'COUNTING_ZONE', z, config: { target: [1, 2, 3, 5][Math.floor(r() * 4)] } }), len: 7 },
  ],
};

export const LevelGenerator = {
  /**
   * @param {{difficulty?:number, length?:number, wordCategories?:string[]|string, seed?:number}} cfg
   * @returns {object} template-shaped course plan
   */
  generate(cfg = {}) {
    const difficulty = Math.min(3, Math.max(1, cfg.difficulty ?? 1));
    const targetLength = cfg.length ?? [0, 60, 70, 85][difficulty];
    const rnd = mulberry32(cfg.seed ?? (Math.random() * 0xffffffff) >>> 0);

    const segments = [];
    const gateCount = Math.max(3, Math.round(targetLength / 16));   // ~every 16 m
    const gateEvery = 3;                                            // every 3rd obstacle slot
    let z = -8;                     // START pad ends around z=+3; first slot at −8
    let slot = 0;
    const pool = [...POOLS[1], ...(difficulty >= 2 ? POOLS[2] : []), ...(difficulty >= 3 ? POOLS[3] : [])];

    while (z > -(targetLength - 8)) {
      if (slot % gateEvery === gateEvery - 1) {
        // Guaranteed word gate (learning never skips a beat)
        segments.push({ type: 'DOOR_GATE', z, config: {} });
        z -= 12;
      } else {
        const def = pool[Math.floor(rnd() * pool.length)];
        const seg = def.make(z, rnd);
        segments.push(seg);
        z -= def.len + 7 + rnd() * 5;   // gap 8–12 m → always completable
      }
      slot++;
    }
    // Fill remaining gates so gateCount matches the word plan
    while (segments.filter((s) => s.type === 'DOOR_GATE').length < gateCount) {
      segments.push({ type: 'DOOR_GATE', z: z - 6, config: {} });
      z -= 12;
    }
    // Gates ordered shallowest-first for the sequential unlock
    const gates = segments.filter((s) => s.type === 'DOOR_GATE').sort((a, b) => b.z - a.z);
    const rest = segments.filter((s) => s.type !== 'DOOR_GATE').sort((a, b) => b.z - a.z);
    const finalLength = Math.abs(z) + 14;

    const plan = {
      id: `gen-${cfg.seed ?? 'rnd'}`,
      name: `Generator ${difficulty === 1 ? 'leicht' : difficulty === 2 ? 'mittel' : 'schwer'}`,
      theme: 'generated', length: Math.max(60, Math.round(finalLength / 5) * 5), difficulty,
      gateCount: gates.length,
      categories: cfg.wordCategories ?? 'ALL',
      generated: true,
      segments: [...rest, ...gates],
    };
    Logger.game(`LevelGenerator: "${plan.id}" ${plan.length}m, ${gates.length} gates, ${rest.length} obstacles (seed ${cfg.seed ?? 'random'})`);
    return plan;
  },

  /** Same seed → same course. */
  generateFromSeed(seed) { return LevelGenerator.generate({ seed }); },
};
