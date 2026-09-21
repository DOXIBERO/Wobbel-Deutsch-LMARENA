/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — Logger (Part 025, needed early by everyone)
 * ============================================================
 * Color-coded console logging with %c formatting.
 */
const C = {
  PHYSICS: '#5ab4ff',
  AUDIO: '#7ee787',
  GAME: '#ffd54d',
  ERROR: '#ff6b6b',
  DATA: '#c9a6ff',
  UI: '#ff9e64',
};

function fmt(tag) { return [`%c[${tag}]`, `color:${C[tag] ?? '#aaa'}; font-weight:bold`]; }

export const Logger = {
  physics: (...a) => console.log(...fmt('PHYSICS'), ...a),
  audio: (...a) => console.log(...fmt('AUDIO'), ...a),
  game: (...a) => console.log(...fmt('GAME'), ...a),
  error: (...a) => console.error(...fmt('ERROR'), ...a),
  data: (...a) => console.log(...fmt('DATA'), ...a),
  ui: (...a) => console.log(...fmt('UI'), ...a),
};
