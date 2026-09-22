/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — BotBean (Part 061)
 * ============================================================
 * An AI racer: full bean model (random preset skin), procedural
 * animator (local events only), wobble spring, ragdoll, physics
 * sphere + floating name label. Collision-filtered so bots never
 * shove the player (world + other bots only).
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { physicsWorld } from '../physics/PhysicsWorld.js';
import { BeanModel } from './BeanModel.js';
import { BeanAnimator } from './BeanAnimator.js';
import { WobbleSystem } from '../physics/WobbleSystem.js';
import { BeanRagdoll } from './BeanRagdoll.js';
import { applySkin } from './BeanSkins.js';
import { BOT_PRESETS } from '../data/BotPresets.js';
import { Logger } from '../core/Logger.js';

export class BotBean {
  /**
   * @param {THREE.Scene} scene
   * @param {{name?:string, skill?:number, skin?:string, reactionTime?:number,
   *          spawn:{x:number, z:number}, checkpointZ?:Function}} cfg
   */
  constructor(scene, cfg = {}) {
    const preset = BOT_PRESETS.find((p) => p.name === cfg.name) ?? {};
    this.name = cfg.name ?? preset.name ?? 'Bot';
    this.skill = cfg.skill ?? preset.skill ?? 0.5;
    this.reactionTime = cfg.reactionTime ?? preset.reactionTime ?? 0.8;
    this.alive = true;
    this.finished = false;
    this.finishTime = 0;
    this.falls = 0;

    // ── Model + skin + animator (no global event subscriptions!)
    this.model = new BeanModel({ color: 0xffe08a });
    applySkin(this.model, cfg.skin ?? preset.skin ?? 'CLASSIC');
    this.animator = new BeanAnimator(this.model, { globalEvents: false });
    this.root = this.model.root;
    scene.add(this.root);

    // ── Floating name label (billboard, ~1 m wide)
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const c = cv.getContext('2d');
    c.font = 'bold 40px system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(10,14,22,0.65)';
    c.beginPath(); c.roundRect(8, 8, 240, 48, 22); c.fill();
    c.fillStyle = '#fff'; c.fillText(this.name, 128, 34);
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }));
    this.label.scale.set(1, 0.25, 1);
    this.label.position.y = 2.2;
    this.root.add(this.label);

    // ── Physics sphere (same as player) — group 4: world + bots, never player
    this.body = new CANNON.Body({
      mass: 1, shape: new CANNON.Sphere(0.5),
      linearDamping: 0.3, angularDamping: 0.5,   // shoved beans settle fast (no rocketing)
      collisionFilterGroup: 4, collisionFilterMask: 1 | 4,
    });
    this.body.position.set(cfg.spawn.x, 1.2, cfg.spawn.z);
    this.body._woTag = `bot:${this.name}`;
    this.body.allowSleep = false;
    physicsWorld.addBody(this.body);

    this.wobble = new WobbleSystem();
    this.ragdoll = new BeanRagdoll({
      bean: { root: this.root, body: this.body },
      animator: this.animator,
      scene,
      checkpointZ: cfg.checkpointZ ?? (() => 0),
    });

    Logger.game(`BotBean "${this.name}" skill=${this.skill} skin=${cfg.skin ?? preset.skin}`);
  }

  /** True if this body belongs to one of my ragdoll debris spheres. */
  ownsBody(body) { return this.ragdoll.bodies.includes(body); }

  update(dt) {
    if (!this.alive) return;
    const v = this.body.velocity;
    if (v.lengthSquared() > 1600) v.scale(40 / v.length(), v);   // solver hiccup guard
    if (v.y > 8) v.y = 8;            // bumper/platform pops stay hop-sized (no floaters)
    else if (v.y < -22) v.y = -22;
    // ── Course bounds: racers never leave the track (Fall Guys walls).
    //    Out of bounds → respawn at the last checkpoint instead of
    //    wandering off into the void where nobody can see them.
    const p = this.body.position;
    if (p.y > 12) { p.y = 2; this.body.velocity.set(0, 0, 0); }   // platform-squeeze launch cap
    if (p.y < -6 || p.z > 12 || p.z < -120 || Math.abs(p.x) > 6.5) {
      this.#respawn();
      return;
    }
    this.physicsWorldSync();
    this.animator.update(dt, v);
    this.wobble.update(dt, this.body, this.root, v);
    this.ragdoll.update(dt);
  }

  /** Back on the track (checkpoint, never ahead of the start line). */
  #respawn() {
    const z = this.ragdoll.checkpointZ ? this.ragdoll.checkpointZ() : 4;
    this.body.position.set((Math.random() - 0.5) * 5, 1.2, Math.min(4, z));
    this.body.velocity.set(0, 0, 0);
  }

  /** Copy physics pose to the visual root. */
  physicsWorldSync() {
    if (this.ragdoll.active) return;      // debris drives itself via syncPairs
    this.root.position.copy(this.body.position);
    this.root.quaternion.copy(this.body.quaternion);
  }

  /** Hard hit / hazard: count it; 3 falls = eliminated. */
  hit() {
    if (!this.alive || this.ragdoll.active) return;
    this.falls += 1;
    this.ragdoll.trigger();
    if (this.falls >= 3) setTimeout(() => this.eliminate(), 2600);
  }

  eliminate() {
    if (!this.alive) return;
    this.alive = false;
    this.root.visible = false;
    physicsWorld.removeBody(this.body);
  }

  finish(time) {
    this.finished = true;
    this.finishTime = time;
    this.animator.play('victory');
  }

  dispose() {
    if (this.ragdoll.active) this.ragdoll.recover();   // clear debris first
    if (this.alive) physicsWorld.removeBody(this.body);
    this.label.material.map.dispose();
    this.label.material.dispose();
    this.model.dispose();
    this.root.parent?.remove(this.root);
  }
}
