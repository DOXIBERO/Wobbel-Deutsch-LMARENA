/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — LevelTemplates (Part 059)
 * ============================================================
 * 8 pre-designed courses. Each: { id, name, theme, length,
 * difficulty, gateCount, categories, segments[] }.
 * segment = { type, z, config } — DOOR_GATE z's mark where the
 * round's word gates are built (words come from the round plan).
 * 'classic-60' reproduces the batch-2 course 1:1.
 */
export const CLASSIC = {
  id: 'classic-60', name: 'Wobbel Klassik', theme: 'grass', length: 65, difficulty: 1,
  gateCount: 3, categories: 'ALL', classic: true, segments: [],
};

export const TEMPLATES = [
  CLASSIC,
  {
    id: 'kreuzberg-easy', name: 'Kreuzberg Locker', theme: 'urban', length: 60, difficulty: 1,
    gateCount: 3, categories: 'ALL',
    segments: [
      { type: 'BUMPER', z: -24, config: { x: -1.5 } },
      { type: 'BUMPER', z: -42, config: { x: 1.5 } },
      { type: 'DOOR_GATE', z: -15, config: {} },
      { type: 'DOOR_GATE', z: -30, config: {} },
      { type: 'DOOR_GATE', z: -48, config: {} },
    ],
  },
  {
    id: 'spati-numbers', name: 'Späti Zahlen', theme: 'urban', length: 65, difficulty: 1,
    gateCount: 3, categories: ['NUMBERS', 'COLORS'],
    segments: [
      { type: 'CONVEYOR_BELT', z: -10, config: { x: 0, dir: 'LEFT', speed: 'slow' } },
      { type: 'ICE_FLOOR', z: -24, config: { width: 10, length: 6 } },
      { type: 'COUNTING_ZONE', z: -40, config: { target: 3 } },
      { type: 'DOOR_GATE', z: -17, config: {} },
      { type: 'DOOR_GATE', z: -33, config: {} },
      { type: 'DOOR_GATE', z: -52, config: {} },
    ],
  },
  {
    id: 'ubahn-directions', name: 'U-Bahn Richtungen', theme: 'metro', length: 70, difficulty: 2,
    gateCount: 3, categories: ['DIRECTIONS', 'GREETINGS'],
    segments: [
      { type: 'MOVING_PLATFORM', z: -22, config: { type: 'HORIZONTAL', speed: 2, start: { x: 2, y: 0.15, z: -22 }, end: { x: 5, y: 0.15, z: -22 } } },
      { type: 'SWINGING_HAMMER', z: -40, config: { x: 0.2 } },
      { type: 'DOOR_GATE', z: -14, config: {} },
      { type: 'DOOR_GATE', z: -30, config: {} },
      { type: 'DOOR_GATE', z: -55, config: {} },
    ],
  },
  {
    id: 'tiergarten-wild', name: 'Tiergarten Wild', theme: 'park', length: 70, difficulty: 2,
    gateCount: 3, categories: ['ANIMALS', 'OBJECTS'],
    segments: [
      { type: 'FALLING_BLOCKS', z: -22, config: {} },
      { type: 'SPINNING_LOG', z: -44, config: { x: 0, speed: 2 } },
      { type: 'DOOR_GATE', z: -14, config: {} },
      { type: 'DOOR_GATE', z: -32, config: {} },
      { type: 'DOOR_GATE', z: -55, config: {} },
    ],
  },
  {
    id: 'alexanderplatz-mix', name: 'Alexanderplatz Mix', theme: 'city', length: 80, difficulty: 3,
    gateCount: 4, categories: 'ALL',
    segments: [
      { type: 'CONVEYOR_BELT', z: -10, config: { dir: 'RIGHT', speed: 'med' } },
      { type: 'ICE_FLOOR', z: -18, config: { width: 10, length: 5 } },
      { type: 'COLOR_SORT', z: -28, config: {} },
      { type: 'FALLING_BLOCKS', z: -36, config: {} },
      { type: 'WIND_TUNNEL', z: -45, config: { dir: 'UP', strength: 'med' } },
      { type: 'SPINNING_LOG', z: -60, config: { speed: 2.4 } },
      { type: 'TRAMPOLINE', z: -68, config: { x: 2.5 } },
      { type: 'DOOR_GATE', z: -14, config: {} },
      { type: 'DOOR_GATE', z: -34, config: {} },
      { type: 'DOOR_GATE', z: -52, config: {} },
      { type: 'DOOR_GATE', z: -70, config: {} },
    ],
  },
  {
    id: 'neukolln-food', name: 'Neukölln Essen', theme: 'street', length: 75, difficulty: 2,
    gateCount: 3, categories: ['FOOD', 'PLACES'],
    segments: [
      { type: 'WORD_BRIDGE', z: -30, config: {} },     // words injected at build time
      { type: 'LAVA_FLOOR', z: -48, config: { width: 8, length: 4 } },
      { type: 'TRAMPOLINE', z: -42, config: { x: 0 } },
      { type: 'DOOR_GATE', z: -15, config: {} },
      { type: 'DOOR_GATE', z: -38, config: {} },
      { type: 'DOOR_GATE', z: -62, config: {} },
    ],
  },
  {
    id: 'wedding-body', name: 'Wedding Körper', theme: 'street', length: 75, difficulty: 2,
    gateCount: 3, categories: ['BODY', 'ACTIONS'],
    segments: [
      { type: 'WIND_TUNNEL', z: -36, config: { dir: 'UP', strength: 'strong' } },
      { type: 'COUNTING_ZONE', z: -55, config: { target: 5 } },
      { type: 'BUMPER', z: -20, config: { x: 1.5 } },
      { type: 'DOOR_GATE', z: -14, config: {} },
      { type: 'DOOR_GATE', z: -30, config: {} },
      { type: 'DOOR_GATE', z: -62, config: {} },
    ],
  },
  {
    id: 'mitte-master', name: 'Mitte Meister', theme: 'city', length: 90, difficulty: 3,
    gateCount: 5, categories: 'ALL',
    segments: [
      { type: 'CONVEYOR_BELT', z: -9, config: { dir: 'LEFT', speed: 'fast' } },
      { type: 'ICE_FLOOR', z: -17, config: { width: 10, length: 5 } },
      { type: 'COLOR_SORT', z: -27, config: {} },
      { type: 'FALLING_BLOCKS', z: -35, config: {} },
      { type: 'WORD_BRIDGE', z: -46, config: {} },
      { type: 'LAVA_FLOOR', z: -60, config: { width: 8, length: 4 } },
      { type: 'TRAMPOLINE', z: -55, config: { x: 0 } },
      { type: 'SPINNING_LOG', z: -70, config: { speed: 2.6 } },
      { type: 'WORD_ZONE', z: -80, config: {} },
      { type: 'DOOR_GATE', z: -12, config: {} },
      { type: 'DOOR_GATE', z: -32, config: {} },
      { type: 'DOOR_GATE', z: -52, config: {} },
      { type: 'DOOR_GATE', z: -68, config: {} },
      { type: 'DOOR_GATE', z: -82, config: {} },
    ],
  },
];

export const LevelTemplates = {
  all: TEMPLATES,

  /** @param {string} id */
  getTemplate(id) { return TEMPLATES.find((t) => t.id === id) ?? CLASSIC; },

  /** Random template of a given difficulty (±0). */
  getRandom(difficulty) {
    const pool = TEMPLATES.filter((t) => t.difficulty === difficulty && !t.classic);
    return pool[Math.floor(Math.random() * pool.length)] ?? CLASSIC;
  },

  /** Template matching a player level: 1-2 easy, 3-4 medium, 5+ hard. */
  getProgression(playerLevel) {
    const difficulty = playerLevel <= 2 ? 1 : playerLevel <= 4 ? 2 : 3;
    return LevelTemplates.getRandom(difficulty);
  },
};
