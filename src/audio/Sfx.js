/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — Sfx (Parts 021/022)
 * ============================================================
 * Web Audio beeps (countdown) + German voice via Web Speech API.
 */
import { Logger } from '../core/Logger.js';

class Sfx {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
  }

  #audio() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** @param {number} freq @param {number} duration s @param {number} [gain] */
  beep(freq, duration, gain = 0.15) {
    const ctx = this.#audio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    g.gain.value = gain;
    osc.connect(g).connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }

  /** Speak German text (rate 0.8). Falls back to the default voice. */
  speak(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 0.8;
      const de = speechSynthesis.getVoices().find((v) => v.lang?.startsWith('de'));
      if (de) u.voice = de; // fallback: default voice, still de-DE lang tag
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { /* audio-less environments */ }
  }
}

export const sfx = new Sfx();
