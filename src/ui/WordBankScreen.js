/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — WordBankScreen (Part 072)
 * ============================================================
 * All 100 words by category with mastery dots (🔴🟡🟢⭐),
 * filter buttons, tap-to-hear pronunciation and a mastery
 * progress bar. Scrollable grid with big tap targets.
 */
import { VocabularyDB, VOCABULARY } from '../data/VocabularyDB.js';
import { germanVoice } from '../audio/GermanVoice.js';

const CATS = ['ALL', ...new Set(VOCABULARY.map((w) => w.category))];

export class WordBankScreen {
  /** @param {import('../core/Game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.db = new VocabularyDB();
    this.filter = 'ALL';
    this.sort = 'category';
    this.el = null;
  }

  show() {
    this.el = document.createElement('div');
    this.el.id = 'wo-wordbank';
    this.el.style.cssText = `position:fixed; inset:0; z-index:40; background:#0d1420; color:#fff;
      font-family:system-ui,sans-serif; display:flex; flex-direction:column; overflow:hidden;`;
    this.el.innerHTML = `
      <div style="padding:14px 18px; display:flex; align-items:center; gap:12px; flex:0 0 auto;">
        <button data-a="back" style="padding:10px 16px; border-radius:12px; border:0; background:#2a3550; color:#fff; font-size:16px;">← Zurück</button>
        <strong id="wb-progress" style="font-size:16px;"></strong>
      </div>
      <div id="wb-filters" style="display:flex; flex-wrap:wrap; gap:6px; padding:0 18px 10px; flex:0 0 auto;"></div>
      <div id="wb-sort" style="display:flex; gap:6px; padding:0 18px 10px; flex:0 0 auto;">
        <button data-s="category" style="padding:8px 12px; border-radius:10px; border:0; background:#2a3550; color:#fff;">Kategorie</button>
        <button data-s="alpha" style="padding:8px 12px; border-radius:10px; border:0; background:#2a3550; color:#fff;">A–Z</button>
        <button data-s="mastery" style="padding:8px 12px; border-radius:10px; border:0; background:#2a3550; color:#fff;">Mastery</button>
      </div>
      <div id="wb-grid" style="flex:1 1 auto; overflow-y:auto; padding:0 18px 24px; display:grid;
        grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; align-content:start;"></div>`;
    document.body.appendChild(this.el);

    this.el.querySelector('[data-a="back"]').addEventListener('click', () => this.hide());
    for (const c of CATS) {
      const b = document.createElement('button');
      b.textContent = c === 'ALL' ? 'Alle' : c;
      b.dataset.f = c;
      b.style.cssText = 'padding:8px 10px; border-radius:10px; border:0; background:#2a3550; color:#fff; font-size:13px;';
      b.addEventListener('click', () => { this.filter = c; this.#render(); });
      this.el.querySelector('#wb-filters').appendChild(b);
    }
    for (const b of this.el.querySelectorAll('[data-s]')) {
      b.addEventListener('click', () => { this.sort = b.dataset.s; this.#render(); });
    }
    this.#render();
  }

  #masteryDot(w) {
    const srs = this.game.srs.words.get(w.id);
    if (!srs) return ['🔴', 'Neu'];
    if (srs.interval > 15) return ['⭐', 'Mastered'];
    if (srs.interval >= 5) return ['🟢', 'Known'];
    return ['🟡', 'Learning'];
  }

  #render() {
    const grid = this.el.querySelector('#wb-grid');
    let words = this.filter === 'ALL' ? [...VOCABULARY] : this.db.getByCategory(this.filter);
    if (this.sort === 'alpha') words.sort((a, b) => a.de.localeCompare(b.de, 'de'));
    else if (this.sort === 'mastery') words.sort((a, b) => (this.game.srs.words.get(b.id)?.interval ?? 0) - (this.game.srs.words.get(a.id)?.interval ?? 0));

    const mastered = VOCABULARY.filter((w) => (this.game.srs.words.get(w.id)?.interval ?? 0) > 15).length;
    this.el.querySelector('#wb-progress').textContent = `${mastered}/100 Wörter gemeistert`;
    grid.innerHTML = '';

    for (const w of words) {
      const [dot, label] = this.#masteryDot(w);
      const card = document.createElement('button');
      card.style.cssText = `text-align:left; padding:12px; border-radius:14px; border:1px solid #26314a;
        background:#141c2c; color:#fff; cursor:pointer;`;
      card.innerHTML = `<div style="font-size:26px;">${w.emoji ?? ''}</div>
        <div style="font-size:18px; font-weight:700;">${w.de}</div>
        <div style="opacity:0.7; font-size:14px;">${w.en}</div>
        <div style="font-size:12px; margin-top:4px;">${dot} ${label}</div>`;
      card.addEventListener('click', () => germanVoice.speak(w.de, 0.8));
      grid.appendChild(card);
    }
  }

  hide() { this.el?.remove(); this.el = null; }
}
