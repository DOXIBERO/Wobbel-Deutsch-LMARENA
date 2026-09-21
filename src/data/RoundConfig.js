/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — RoundConfig (Part 016)
 * ============================================================
 * Five escalating round presets. A session = R1 → R5.
 */
export const ROUND_PRESETS = [
  { id: 1, mode: 'colors', duration: 60, categories: ['COLORS'], difficulty: 1, botCount: 0 },
  { id: 2, mode: 'numbers', duration: 75, categories: ['NUMBERS'], difficulty: 1, botCount: 0 },
  { id: 3, mode: 'directions', duration: 90, categories: ['DIRECTIONS'], difficulty: 2, botCount: 0 },
  { id: 4, mode: 'food-animals', duration: 90, categories: ['FOOD', 'ANIMALS'], difficulty: 2, botCount: 0 },
  { id: 5, mode: 'all', duration: 120, categories: 'ALL', difficulty: 3, botCount: 0 },
];

export class RoundConfig {
  /** @param {number} id 1..5 */
  getPreset(id) {
    return ROUND_PRESETS.find((r) => r.id === id) ?? ROUND_PRESETS[0];
  }

  get count() { return ROUND_PRESETS.length; }
}
