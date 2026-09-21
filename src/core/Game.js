/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — Game (Part 019) — master orchestrator
 * ============================================================
 * Wires all 18 systems, owns the loop, the session (R1→R5) and
 * round preparation. Exposes window.__wo for tooling/tests.
 */
import * as THREE from 'three';
import { engine as Engine, render as renderScene, init as initEngine } from './Engine.js';
import * as Environment from '../levels/Environment.js';
import { GameLoop } from './GameLoop.js';
import { GameState } from './GameState.js';
import { eventBus } from './EventBus.js';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { CameraController } from './CameraController.js';
import { InputManager } from './InputManager.js';
import { BeanModel } from '../player/BeanModel.js';
import { CourseBuilder } from '../levels/CourseBuilder.js';
import { VocabularyDB } from '../data/VocabularyDB.js';
import { SRSEngine } from '../data/SRSEngine.js';
import { PlayerProfile } from '../data/PlayerProfile.js';
import { RoundConfig } from '../data/RoundConfig.js';
import { WordSelector } from './WordSelector.js';
import { GameRules } from '../data/GameRules.js';
import { ScoreManager } from './ScoreManager.js';
import { TimerSystem } from './TimerSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { HUD } from '../ui/HUD.js';
import { sfx } from '../audio/Sfx.js';
import { DebugPanel } from './DebugPanel.js';
import { BeanAnimator } from '../player/BeanAnimator.js';
import { WobbleSystem } from '../physics/WobbleSystem.js';
import { BeanCollisions } from '../physics/BeanCollisions.js';
import { TouchControls } from './TouchControls.js';
import { germanVoice } from '../audio/GermanVoice.js';
import { soundFX } from '../audio/SoundFX.js';
import { music } from '../audio/MusicSystem.js';
import { AudioSync } from '../audio/AudioSync.js';
import { WordPromptHUD } from '../ui/WordPromptHUD.js';
import { RoundManager } from './RoundManager.js';
import { DifficultyScaler } from './DifficultyScaler.js';
import { QualityManager } from './QualityManager.js';
import { WordBankScreen } from '../ui/WordBankScreen.js';
import { SettingsScreen } from '../ui/SettingsScreen.js';
import { TutorialOverlay } from '../ui/TutorialOverlay.js';
import { BootState } from '../states/BootState.js';
import { MenuState } from '../states/MenuState.js';
import { CountdownState } from '../states/CountdownState.js';
import { PlayingState } from '../states/PlayingState.js';
import { RoundEndState } from '../states/RoundEndState.js';
import { ResultsState } from '../states/ResultsState.js';
import { Logger } from './Logger.js';

export class Game {
  constructor() {
    // ── Core 18 systems (Part 019 order)
    this.engine = initEngine();            // 1. Engine (renderer/scene/camera)
    Environment.init(Engine.scene);        // ground + lights (Part 003)
    this.loop = new GameLoop();            // 2. GameLoop
    this.state = new GameState();          // 3. GameState
    this.events = eventBus;                // 4. EventBus
    this.physics = physicsWorld;           // 5. PhysicsWorld
    this.cameraController = new CameraController(Engine.camera); // 6.
    this.inputManager = new InputManager(); // 7.
    this.bean = new BeanModel({ color: 0xFFD700 }); // 8.
    this.db = new VocabularyDB();          // 9.
    this.srs = new SRSEngine();            // 10.
    this.profile = new PlayerProfile();    // 11.
    this.roundConfig = new RoundConfig();  // 12.
    this.wordSelector = new WordSelector(); // 13.
    this.rules = GameRules;                // 14.
    this.score = new ScoreManager();       // 15.
    this.timers = new TimerSystem();       // 16.
    this.saveSystem = new SaveSystem({ profile: this.profile, srs: this.srs }); // 17+18 wrapper
    this.hud = new HUD();

    // ── Batch 2 systems
    this.animator = new BeanAnimator(this.bean);          // 026-030
    this.wobble = new WobbleSystem();                     // 031
    this.collisions = null;                               // 033 (per round refs)
    this.ragdoll = null;                                  // 034 (per round refs)
    this.touch = new TouchControls(this.inputManager);    // 036
    this.inputManager.touch = this.touch;
    this.wordPrompt = new WordPromptHUD();                // 041
    this.audioSync = new AudioSync(this.wordPrompt);      // 042
    this.soundFX = soundFX;                               // 038
    this.voice = germanVoice;                             // 037
    this.music = music;                                   // 039

    // ── Batch 3 systems (066, 072-074)
    this.roundManager = new RoundManager(this);           // 066
    this.wordBank = new WordBankScreen(this);             // 072
    this.settings = new SettingsScreen(this);             // 073
    this.tutorial = new TutorialOverlay(this);            // 074

    // Volume from profile settings
    soundFX.setVolume(this.profile.settings.audioVol);
    QualityManager.init(this);                            // 075 (saved quality)

    // ── Round/session state
    this.session = null;          // { presets, index }
    this.currentRound = null;     // active preset
    this.roundWords = null;       // [{correct, distractors, options}] per gate
    this.lastRoundStats = null;
    this.sessionTotal = 0;
    this.physicsFrozen = false;
    this.fps = 0;
    void CourseBuilder; // built per-round by PlayingState

    // ── States
    this.state.register({
      BOOT: new BootState(this),
      MENU: new MenuState(this),
      COUNTDOWN: new CountdownState(this),
      PLAYING: new PlayingState(this),
      ROUND_END: new RoundEndState(this),
      RESULTS: new ResultsState(this),
    });

    // ── Loop wiring (Part 019): update → state + physics + camera + input
    this.loop.onUpdate((dt) => {
      this.state.onUpdate(dt);
      if (this.physicsFrozen) return;

      // Surface zone under the bean → wobble params + feel
      const surface = this.playing?.course?.updateSurfaces?.(this.bean.body.position) ?? 'NORMAL';
      if (surface !== this.wobble.surface) {
        this.wobble.setSurface(surface);
        if (surface === 'SLIME') this.inputManager.jumpImpulse = 5.6;  // 30% weaker
        else this.inputManager.jumpImpulse = 8;
      }

      this.inputManager.update(dt);
      this.physics.step(dt);
      this.physics.syncPairs();

      // Physics sanity guard: a solver hiccup (rare phantom contact) must
      // never fling the bean into orbit — clamp absurd velocities instead.
      const bv = this.bean.body.velocity;
      const sp2 = bv.lengthSquared();
      if (sp2 > 3600) bv.scale(60 / Math.sqrt(sp2), bv);   // hard cap 60 m/s
      if (this.bean.body.position.y > 60) { this.bean.body.position.y = 8; bv.set(0, 0, 0); }

      // Visual layers (additive over physics)
      const v = this.bean.body.velocity;
      this.animator.update(dt, v);
      this.wobble.update(dt, this.bean.body, this.bean.root, v);
      this.ragdoll?.update(dt);
      this.playing?.course?.updateObstacles?.(dt, this.bean.body, (impact) => this.ragdoll?.maybeTrigger(impact));
      this.playing?.zone?.updateVisual?.(dt);
      this.wordPrompt.tick(dt);

      // Camera: orbit-lerp follow (mouse look) around the bean
      this.cameraController.update(dt, this.inputManager._pointerLocked
        ? { yaw: this.inputManager.orbitYaw, pitch: this.inputManager.orbitPitch, zoom: this.inputManager.zoom }
        : null);

      this.collisions?.updateGrab(this.inputManager.pressed('KeyE'));
    });
    this.loop.onRender(() => renderScene());

    // FPS for the debug panel
    this._fpsFrames = 0; this._fpsAcc = 0;
    this.loop.onRender((alpha, now) => {
      this._fpsFrames++;
      this._fpsAcc += 1 / 60;
      if (this._fpsAcc >= 1) { this.fps = this._fpsFrames; this._fpsFrames = 0; this._fpsAcc = 0; }
    });

    // ── Debug + tooling handle
    this.debugPanel = new DebugPanel(this);
    if (typeof window !== 'undefined') window.__wo = this;

    Logger.game('Game v2.0 initialized | State: BOOT | 18 systems');
  }

  start() {
    // Enter the initial state (FSM only calls onEnter on transitions).
    this.state.impls[this.state.current].onEnter();
    eventBus.emit('state:change', { to: this.state.current });
    this.loop.start();
  }

  /** Menu "SPIELEN": begin a full session (RoundManager plan, Part 066). */
  startSession() {
    this.sessionTotal = 0;
    this.roundManager.startSession({ rounds: 5 });
    this.state.transition('COUNTDOWN');
  }

  /** Called by CountdownState: build the round's word plan (+template course info). */
  prepareRound() {
    if (this.roundManager.active) {
      this.roundManager.prepareRound();     // sets roundWords + currentRound
    } else {
      this.currentRound = this.session.presets[this.session.index];
      this.wordSelector.startRound();
      this.roundWords = [0, 1, 2].map((gateIndex) =>
        this.wordSelector.selectForGate(gateIndex, this.currentRound, this.srs, this.currentRound.id));
    }
  }

  /** Accumulate the session total at round end (RoundEndState reads it). */
  bankRound() {
    this.sessionTotal += this.lastRoundStats?.score ?? 0;
    eventBus.emit('session:banked', { total: this.sessionTotal });
  }

  dispose() {
    this.loop.stop();
    this.bean.dispose();
  }
}
