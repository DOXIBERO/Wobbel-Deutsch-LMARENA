/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — SettingsScreen (Part 073)
 * ============================================================
 * Sliders/toggles that apply live and persist via SaveSystem:
 * audio + music volume, voice speed, camera sensitivity + mode,
 * UI language (placeholder), quality, debug HUD.
 */
import { soundFX } from '../audio/SoundFX.js';
import { music } from '../audio/MusicSystem.js';
import { germanVoice } from '../audio/GermanVoice.js';
import { QualityManager } from '../core/QualityManager.js';
import { Logger } from '../core/Logger.js';

export class SettingsScreen {
  /** @param {import('../core/Game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.el = null;
  }

  show() {
    const s = this.game.profile.settings;
    this.el = document.createElement('div');
    this.el.id = 'wo-settings';
    this.el.style.cssText = `position:fixed; inset:0; z-index:40; background:#0d1420; color:#fff;
      font-family:system-ui,sans-serif; overflow-y:auto; padding:20px;`;
    const slider = (id, label, min, max, step, val) => `
      <label style="display:block; margin:18px 0; font-size:17px;">${label}
        <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"
          style="width:100%; height:34px; accent-color:#4f8cff;">
      </label>`;
    this.el.innerHTML = `
      <button data-a="back" style="padding:10px 16px; border-radius:12px; border:0; background:#2a3550; color:#fff; font-size:16px;">← Zurück</button>
      <h2 style="margin:10px 0 0;">Einstellungen</h2>
      ${slider('s-audio', `🔊 Audio (${Math.round((s.audioVol ?? 0.8) * 100)})`, 0, 100, 1, Math.round((s.audioVol ?? 0.8) * 100))}
      ${slider('s-music', `🎵 Musik (${Math.round((s.musicVol ?? 0.6) * 100)})`, 0, 100, 1, Math.round((s.musicVol ?? 0.6) * 100))}
      ${slider('s-voice', `🗣️ Sprechtempo (${(s.voiceRate ?? 0.8).toFixed(2)})`, 0.5, 1.5, 0.05, s.voiceRate ?? 0.8)}
      ${slider('s-sens', `📷 Kamera-Empfindlichkeit (${(s.sensitivity ?? 1).toFixed(2)})`, 0.5, 2, 0.05, s.sensitivity ?? 1)}
      <div style="margin:18px 0;">
        <strong style="font-size:17px;">Kamera-Modus</strong><br>
        ${['follow', 'top', 'side'].map((m) => `
          <label style="margin-right:16px; font-size:16px;">
            <input type="radio" name="cammode" value="${m}" ${(s.cameraMode ?? 'follow') === m ? 'checked' : ''}> ${m}
          </label>`).join('')}
      </div>
      <div style="margin:18px 0;">
        <strong style="font-size:17px;">Qualität</strong><br>
        ${['low', 'medium', 'high'].map((m) => `
          <label style="margin-right:16px; font-size:16px;">
            <input type="radio" name="quality" value="${m}" ${(s.quality ?? 'high') === m ? 'checked' : ''}> ${m}
          </label>`).join('')}
      </div>
      <label style="display:block; margin:18px 0; font-size:17px;">
        <input id="s-debug" type="checkbox" ${s.debug ? 'checked' : ''}> Debug-Anzeige
      </label>
      <label style="display:block; margin:18px 0; font-size:17px;">Sprache (UI)
        <select id="s-lang" style="display:block; margin-top:6px; padding:10px; font-size:16px; border-radius:10px; background:#2a3550; color:#fff; border:0;">
          ${['English', 'Arabic', 'Spanish'].map((l) => `<option ${(s.uiLang ?? 'English') === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>`;
    document.body.appendChild(this.el);

    this.el.querySelector('[data-a="back"]').addEventListener('click', () => this.hide());

    const bind = (id, fn) => this.el.querySelector(id).addEventListener('input', (e) => { fn(e.target); this.#save(); });
    bind('#s-audio', (t) => { s.audioVol = t.value / 100; soundFX.setVolume(s.audioVol); t.labels[0].childNodes[0].textContent = `🔊 Audio (${t.value}) `; });
    bind('#s-music', (t) => { s.musicVol = t.value / 100; music.setVolume?.(s.musicVol); });
    bind('#s-voice', (t) => { s.voiceRate = +t.value; germanVoice.defaultRate = s.voiceRate; });
    bind('#s-sens', (t) => { s.sensitivity = +t.value; });
    for (const r of this.el.querySelectorAll('[name="cammode"]')) {
      r.addEventListener('change', () => { s.cameraMode = r.value; this.#save(); });
    }
    for (const r of this.el.querySelectorAll('[name="quality"]')) {
      r.addEventListener('change', () => { QualityManager.apply(r.value); this.#save(); });
    }
    bind('#s-debug', (t) => { s.debug = t.checked; this.game.debugPanel?.setVisible?.(t.checked); });
    this.el.querySelector('#s-lang').addEventListener('change', (e) => { s.uiLang = e.target.value; this.#save(); });
    Logger.game('SETTINGS: open');
  }

  #save() {
    this.game.saveSystem?.save();
  }

  hide() {
    this.el?.remove();
    this.el = null;
    Logger.game('SETTINGS: closed (saved)');
  }
}
