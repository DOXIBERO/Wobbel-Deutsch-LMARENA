/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — MusicSystem (Part 039)
 * ============================================================
 * Procedural chiptune loop: bass (C3-E3-G3-E3), pentatonic melody
 * eighths, noise hats + sine kick. CALM/NORMAL/INTENSE with fades;
 * auto-INTENSE on 'timer:tick' < 15 s.
 */
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

const MODES = {
  CALM: { bpm: 100, melody: false, hats: false, vol: 0.25 },
  NORMAL: { bpm: 130, melody: true, hats: true, vol: 0.5 },
  INTENSE: { bpm: 160, melody: true, hats: true, vol: 0.62, octave: 2 },
};

const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0]; // C major pentatonic (C4-ish)
const BASS = [130.81, 164.81, 196.0, 164.81];         // C3 E3 G3 E3

class MusicSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.mode = 'CALM';
    this.playing = false;
    this._beat = 0;
    this._timer = null;
    eventBus.on('timer:tick', ({ remaining }) => {
      if (this.playing && remaining < 15 && this.mode !== 'INTENSE') this.setMode('INTENSE');
    });
  }

  #audio() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  play() {
    const ctx = this.#audio();
    if (!ctx || this.playing) return;
    this.playing = true;
    this.master.gain.linearRampToValueAtTime(MODES[this.mode].vol, ctx.currentTime + 2); // fade in 2 s
    this.#loop();
    Logger.audio(`Music: ${this.mode}`);
  }

  pause() {
    this.playing = false;
    clearTimeout(this._timer);
    if (this.master) this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
  }

  setVolume(v) {
    if (this.master && this.playing) this.master.gain.value = MODES[this.mode].vol * v;
  }

  /** @param {'CALM'|'NORMAL'|'INTENSE'} mode */
  setMode(mode) {
    this.mode = mode;
    if (this.master && this.playing) {
      this.master.gain.linearRampToValueAtTime(MODES[mode].vol, this.ctx.currentTime + 1); // crossfade 1 s
    }
  }

  #loop() {
    if (!this.playing) return;
    const m = MODES[this.mode];
    const beatLen = 60 / m.bpm;
    const beat = this._beat % 4;

    // Kick on beats 1 & 3
    if (beat % 2 === 0) this.#kick(beatLen);
    // Hats every beat (double in INTENSE)
    if (m.hats) { this.#hat(beatLen / (m.octave ? 2 : 1)); }
    // Bass note per bar-step
    this.#tone(BASS[beat], beatLen * 0.9, 'sine', 0.35);
    // Melody: random pentatonic eighths
    if (m.melody && Math.random() < 0.75) {
      const f = PENTA[Math.floor(Math.random() * PENTA.length)] * (m.octave ?? 1);
      this.#tone(f, beatLen / 2, 'triangle', 0.18);
    }

    this._beat++;
    this._timer = setTimeout(() => this.#loop(), beatLen * 1000);
  }

  #tone(freq, dur, type, gain) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g).connect(this.master);
    osc.start(); osc.stop(ctx.currentTime + dur);
  }

  #kick(dur) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(g).connect(this.master);
    osc.start(); osc.stop(ctx.currentTime + 0.13);
    void dur;
  }

  #hat(dur) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    src.connect(hp).connect(g).connect(this.master);
    src.start();
    void dur;
  }
}

export const music = new MusicSystem();
