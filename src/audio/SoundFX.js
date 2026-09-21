/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — SoundFX (Part 038)
 * ============================================================
 * Hybrid: procedural Web Audio synthesis now, real .mp3 files via
 * load() later. 10 distinct game sounds, volume control, max 8
 * concurrent voices.
 */
import { Logger } from '../core/Logger.js';

const PRESETS = {
  correct: ['sine', [[523.25, 0.1], [659.25, 0.1], [783.99, 0.1]]],       // C5 E5 G5
  wrong: ['sawtooth', [[164.81, 0.1], [130.81, 0.1]]],                    // E3 C3
  jump: ['sine', 'sweep:200:600:0.1'],
  land: ['triangle', [[100, 0.15]]],
  beep: ['sine', [[440, 0.1]]],
  go: ['sine', [[880, 0.2]]],
  bounce: ['sine', 'sweep:300:150:0.1'],
  splash: ['noise', 0.3],
  victory: ['sine', [[523.25, 0.1], [659.25, 0.1], [783.99, 0.1], [1046.5, 0.25]]], // C5 E5 G5 C6
  stumble: ['sine', 'wobble:200:50:0.3'],
};

class SoundFX {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.master = null;
    this.volume = 1;
    this.files = new Map(); // name → AudioBuffer
    this.live = 0;
  }

  #audio() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** Load a real audio file (future swap-in). */
  async load(url, name) {
    const ctx = this.#audio();
    if (!ctx) return false;
    try {
      const res = await fetch(url);
      this.files.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
      return true;
    } catch { return false; }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  /**
   * @param {keyof typeof PRESETS} name
   * @param {number} [volume]
   */
  play(name, volume = 1) {
    if (this.files.has(name)) { this.#playFile(name, volume); return; }
    const ctx = this.#audio();
    if (!ctx || this.live >= 8) return; // max 8 concurrent
    const [type, spec] = PRESETS[name] ?? PRESETS.beep;
    if (spec === 'noise') return this.#noise(ctx, volume, type);
    if (typeof spec === 'string' && spec.startsWith('sweep:')) return this.#sweep(ctx, spec.split(':'), volume, type);
    if (typeof spec === 'string' && spec.startsWith('wobble:')) return this.#wobble(ctx, spec.split(':'), volume);
    let t = ctx.currentTime;
    for (const [freq, dur] of spec) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.14 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g).connect(this.master);
      osc.start(t); osc.stop(t + dur);
      this.#count(t + dur);
      t += dur;
    }
  }

  #playFile(name, volume) {
    const ctx = this.#audio();
    const src = ctx.createBufferSource();
    src.buffer = this.files.get(name);
    const g = ctx.createGain();
    g.gain.value = 0.8 * volume;
    src.connect(g).connect(this.master);
    src.start();
    this.#count(ctx.currentTime + src.buffer.duration);
  }

  #sweep(ctx, [, from, to, dur], volume, type) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(+from, t);
    osc.frequency.exponentialRampToValueAtTime(+to, t + +dur);
    g.gain.setValueAtTime(0.14 * volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + +dur);
    osc.connect(g).connect(this.master);
    osc.start(t); osc.stop(t + +dur);
    this.#count(t + +dur);
  }

  #wobble(ctx, [, base, depth, dur], volume) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    const t = ctx.currentTime;
    osc.frequency.value = +base;
    lfo.frequency.value = 12;
    lfoG.gain.value = +depth;
    lfo.connect(lfoG).connect(osc.frequency);
    g.gain.setValueAtTime(0.12 * volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + +dur);
    osc.connect(g).connect(this.master);
    osc.start(t); lfo.start(t);
    osc.stop(t + +dur); lfo.stop(t + +dur);
    this.#count(t + +dur);
  }

  #noise(ctx, volume, _type) {
    const dur = 0.3;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(g).connect(this.master);
    src.start();
    this.#count(ctx.currentTime + dur);
  }

  #count(until) {
    this.live++;
    setTimeout(() => { this.live--; }, Math.max(0, (until - this.ctx.currentTime) * 1000));
  }
}

export const soundFX = new SoundFX();
