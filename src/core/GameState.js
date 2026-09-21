/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — GameState (Part 006)
 * ============================================================
 * Finite state machine with a strict transition map. Invalid
 * transitions throw — game flow bugs surface immediately.
 *
 *   BOOT → MENU → COUNTDOWN → PLAYING → ROUND_END → COUNTDOWN|RESULTS
 *   RESULTS → MENU
 */
import { eventBus } from './EventBus.js';
import { Logger } from './Logger.js';

export const STATES = {
  BOOT: 'BOOT',
  MENU: 'MENU',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  ROUND_END: 'ROUND_END',
  RESULTS: 'RESULTS',
};

const TRANSITIONS = {
  BOOT: [STATES.MENU],
  MENU: [STATES.COUNTDOWN],
  COUNTDOWN: [STATES.PLAYING],
  PLAYING: [STATES.ROUND_END],
  ROUND_END: [STATES.COUNTDOWN, STATES.RESULTS],
  RESULTS: [STATES.MENU],
};

export class GameState {
  constructor() {
    this.current = STATES.BOOT;
    /** @type {Record<string, {onEnter:Function, onUpdate:Function, onExit:Function}>} */
    this.impls = {};
  }

  register(impls) { this.impls = impls; }

  /**
   * @param {keyof typeof STATES} next
   */
  can(next) { return (TRANSITIONS[this.current] ?? []).includes(next); }

  transition(next) {
    if (!this.impls[next]) throw new Error(`GameState: no impl for ${next}`);
    if (!this.can(next)) throw new Error(`GameState: illegal transition ${this.current} → ${next}`);
    Logger.game(`GameState: ${this.current} → ${next}`);
    this.impls[this.current]?.onExit?.();
    this.current = next;
    this.impls[next].onEnter();
    eventBus.emit('state:change', { from: this.current, to: next });
  }

  /** Illegal on purpose (acceptance check helper). */
  forceInvalidForTest() { this.transition(STATES.PLAYING); }

  onUpdate(dt) { this.impls[this.current]?.onUpdate?.(dt); }
}
