/** Shared math helpers. */
export const clamp = (v, abs) => Math.max(-abs, Math.min(abs, v));
export const clampRange = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
