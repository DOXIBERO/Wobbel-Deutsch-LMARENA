/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BotPresets (Part 061)
 * ============================================================
 * 10 AI opponents: name, skillLevel (0-1), skin key, reaction
 * time window (s) derived from skill. High skill = fast + right.
 */
export const BOT_PRESETS = [
  { name: 'Hans',   skill: 0.9,  skin: 'KREUZBERG' },
  { name: 'Greta',  skill: 0.85, skin: 'CLASSIC' },
  { name: 'Fritz',  skill: 0.3,  skin: 'DONER' },
  { name: 'Müller', skill: 0.5,  skin: 'SPATI' },
  { name: 'Schmidt', skill: 0.7, skin: 'UBAHN' },
  { name: 'Klaus',  skill: 0.2,  skin: 'CLASSIC' },
  { name: 'Anna',   skill: 0.75, skin: 'KREUZBERG' },
  { name: 'Lukas',  skill: 0.6,  skin: 'DONER' },
  { name: 'Lena',   skill: 0.4,  skin: 'SPATI' },
  { name: 'Otto',   skill: 0.95, skin: 'BERGHAIN' },
].map((p) => ({ ...p, reactionTime: 1.5 - p.skill * 1.2 }));   // 0.3–1.5 s

export const BotPresets = { all: BOT_PRESETS, get(count) { return BOT_PRESETS.slice(0, count); } };
