/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — main (Parts 001→019)
 * ============================================================
 * Entry point: create the Game, start the loop. Everything else
 * flows through the state machine.
 */
import { Game } from './core/Game.js';

console.log('Wobbel Deutsch v2.0 booting');

const game = new Game();
game.start();
