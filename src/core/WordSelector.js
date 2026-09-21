/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — WordSelector (Part 016)
 * ============================================================
 * Picks gate words per round: 60% SRS-due / 30% new / 10% mastered
 * review. Distractors always come from the same category, and the
 * correct word never repeats within a round.
 */
import { VocabularyDB } from '../data/VocabularyDB.js';

const db = new VocabularyDB();

export class WordSelector {
  constructor() {
    /** @type {string[]} correct words already used this round */
    this.used = [];
  }

  startRound() { this.used = []; }

  /**
   * @param {number} gateIndex 0-based gate in the round
   * @param {{categories: string[]|string, difficulty?: number}} round preset
   * @param {import('../data/SRSEngine.js').SRSEngine} srs
   * @param {number} currentRound
   * @returns {{correct: object, distractors: object[], options: object[]}}
   */
  selectForGate(gateIndex, round, srs, currentRound = 0) {
    const pool = round.categories === 'ALL'
      ? db.getAll()
      : round.categories.flatMap((c) => db.getByCategory(c));

    // ── Correct word: SRS mix (60/30/10), never repeated this round
    const due = srs.getDueWords(50, currentRound).filter((id) => !this.used.includes(id));
    const fresh = srs.getNewWords(50).filter((id) => !this.used.includes(id));
    const mastered = srs.getMastered().filter((id) => !this.used.includes(id));
    const roll = Math.random();
    let pickPool;
    if (roll < 0.6 && due.length) pickPool = due.map((id) => db.getById(id));
    else if (roll < 0.9 || !mastered.length) pickPool = fresh.map((id) => db.getById(id)).filter(Boolean);
    else pickPool = mastered.map((id) => db.getById(id));

    const fallback = pool.filter((w) => !this.used.includes(w.id));
    const candidates = (pickPool.length ? pickPool : fallback).filter((w) => w && pool.some((p) => p.id === w.id));
    const correct = candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : fallback[0] ?? pool[0];

    this.used.push(correct.id);

    // ── Distractors: same category, not the correct word
    const sameCat = db.getByCategory(correct.category).filter((w) => w.id !== correct.id);
    const distractors = [...sameCat].sort(() => Math.random() - 0.5).slice(0, 3);
    while (distractors.length < 3) { // tiny categories: steal from the pool
      const w = pool[Math.floor(Math.random() * pool.length)];
      if (w.id !== correct.id && !distractors.includes(w)) distractors.push(w);
    }

    // Shuffle options so the correct lane varies
    const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return { correct, distractors, options };
  }
}
