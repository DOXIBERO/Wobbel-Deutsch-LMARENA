/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — GermanVoice (Part 037)
 * ============================================================
 * Files-first (/audio/de/{word}.mp3 when present), Web Speech API
 * fallback with German voice detection + queue. Mobile-safe after
 * the Tap-to-Start unlock. Emits voice:start / voice:end.
 */
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

class GermanVoice {
  constructor() {
    this.germanVoice = null;
    this.queue = [];
    this.speaking = false;
    this.buffers = new Map(); // word → AudioBuffer (future files)
    this.ctx = null;

    const pick = () => {
      try {
        const voices = speechSynthesis.getVoices();
        this.germanVoice = voices.find((v) => v.lang?.startsWith('de')) ?? null;
        if (!this.germanVoice) Logger.error('GermanVoice: no German voice → default');
      } catch { /* no speech synthesis */ }
    };
    pick();
    try { speechSynthesis.addEventListener('voiceschanged', pick); } catch { /* older */ }
  }

  /**
   * Future: load pre-recorded mp3s; missing files keep speech fallback.
   * @param {string[]} wordList
   */
  async loadAudioFiles(wordList) {
    for (const word of wordList) {
      try {
        const res = await fetch(`/audio/de/${word}.mp3`);
        if (!res.ok) continue;
        this.ctx ??= new (window.AudioContext ?? window.webkitAudioContext)();
        this.buffers.set(word, await this.ctx.decodeAudioData(await res.arrayBuffer()));
      } catch { /* file missing → fallback stays */ }
    }
    Logger.audio(`GermanVoice: ${this.buffers.size}/${wordList.length} audio files loaded`);
  }

  /**
   * @param {string} word
   * @param {number} [rate]
   * @param {number} [pitch]
   */
  speak(word, rate = 0.8, pitch = 1.0) {
    this.queue.push({ word, rate, pitch });
    if (!this.speaking) this.#next();
  }

  #next() {
    const item = this.queue.shift();
    if (!item) { this.speaking = false; return; }
    this.speaking = true;
    eventBus.emit('voice:start', { word: item.word });

    // 1) Pre-recorded buffer (when loaded)
    const buf = this.buffers.get(item.word);
    if (buf && this.ctx) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.onended = () => { eventBus.emit('voice:end', { word: item.word }); this.#next(); };
      src.connect(this.ctx.destination);
      src.start();
      return;
    }

    // 2) Web Speech fallback
    try {
      const u = new SpeechSynthesisUtterance(item.word);
      u.lang = 'de-DE';
      u.rate = item.rate; u.pitch = item.pitch;
      if (this.germanVoice) u.voice = this.germanVoice;
      u.onend = () => { eventBus.emit('voice:end', { word: item.word }); this.#next(); };
      u.onerror = () => { eventBus.emit('voice:end', { word: item.word }); this.#next(); };
      speechSynthesis.speak(u);
    } catch {
      eventBus.emit('voice:end', { word: item.word });
      this.#next();
    }
  }

  stop() {
    this.queue = [];
    try { speechSynthesis.cancel(); } catch { /* noop */ }
    this.speaking = false;
  }

  isSpeaking() { return this.speaking || this.queue.length > 0; }
}

export const germanVoice = new GermanVoice();
