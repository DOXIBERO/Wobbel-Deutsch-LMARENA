/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — SaveSystem (Part 018)
 * ============================================================
 * localStorage persistence (key 'wobbel-save', v2.0.0) with
 * corruption fallback + auto-save on 'game:roundEnd'.
 */
import { eventBus } from './EventBus.js';
import { Logger } from './Logger.js';

const KEY = 'wobbel-save';
const VERSION = '2.0.0';

export class SaveSystem {
  /**
   * @param {{ profile: import('../data/PlayerProfile.js').PlayerProfile,
   *           srs: import('../data/SRSEngine.js').SRSEngine }} data
   */
  constructor(data) {
    this.data = data;
    eventBus.on('game:roundEnd', () => this.save());
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        version: VERSION,
        profile: this.data.profile.toJSON(),
        srs: this.data.srs.toJSON(),
      }));
    } catch (e) { Logger.error('SaveSystem: save failed', e?.message); }
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const j = JSON.parse(raw); // corrupted JSON throws → fallback
      if (j.version !== VERSION) return false;
      this.data.profile.fromJSON(j.profile);
      this.data.srs.fromJSON(j.srs);
      return true;
    } catch {
      Logger.error('SaveSystem: corrupted save → defaults');
      return false;
    }
  }

  reset() { try { localStorage.removeItem(KEY); } catch { /* private mode */ } }
}
