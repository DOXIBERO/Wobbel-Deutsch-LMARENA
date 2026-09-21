/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — TextSprite helper (Parts 012/022)
 * ============================================================
 * Canvas-texture billboards: bold white text with black outline,
 * always facing the camera. Used for START/ZIEL + gate words.
 */
import * as THREE from 'three';

/**
 * @param {string} text
 * @param {{font?: string, pad?: number, scale?: number, color?: string}} [opts]
 * @returns {THREE.Sprite}
 */
export function makeTextSprite(text, opts = {}) {
  const font = opts.font ?? 'bold 80px Arial, sans-serif';
  const pad = opts.pad ?? 24;
  const scale = opts.scale ?? 3; // world width of the sprite

  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + pad * 2;
  const h = 120;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#000';
  ctx.strokeText(text, w / 2, h / 2);
  ctx.fillStyle = opts.color ?? '#fff';
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(scale, (scale * h) / w, 1);
  return sprite;
}
