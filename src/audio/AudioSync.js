/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — AudioSync (Part 042)
 * ============================================================
 * Coordinates GermanVoice + SoundFX + WordPromptHUD: challenge
 * presentation (voice → pulse → timer bar), feedback, countdown.
 */
import { germanVoice } from './GermanVoice.js';
import { soundFX } from './SoundFX.js';
import { sfx } from './Sfx.js';

class AudioSync {
  /** @param {import('../ui/WordPromptHUD.js').WordPromptHUD} hud */
  constructor(hud) {
    this.hud = hud;
  }

  /**
   * Present a word challenge: HUD + spoken word (0.5 s delay) + timer bar.
   * @param {{de:string, en:string}} word
   * @param {number} timeLimit s
   */
  presentWordChallenge(word, timeLimit) {
    this.hud.show(word.de.toUpperCase(), timeLimit);
    setTimeout(() => {
      germanVoice.stop();       // queue discipline: latest challenge wins
      germanVoice.speak(word.de);
      this.hud.pulse();
    }, 500);
  }

  /**
   * @param {boolean} correct
   * @param {number} points
   */
  playFeedback(correct, points) {
    if (correct) {
      soundFX.play('correct');
      this.hud.feedbackCorrect(points);
    } else {
      soundFX.play('wrong');
      this.hud.feedbackWrong(points);
    }
  }

  /** Countdown sounds: 3/2/1 beeps + "Los!" */
  announceCountdown(step) {
    if (step < 3) {
      soundFX.play('beep');
    } else {
      soundFX.play('go');
      germanVoice.speak('Los!');
    }
  }
}

export { AudioSync };
