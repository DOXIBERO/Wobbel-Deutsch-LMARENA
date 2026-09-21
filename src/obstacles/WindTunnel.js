/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — WindTunnel (Part 054)
 * ============================================================
 * Semi-transparent tube with particle streaks. Beans inside the
 * tunnel AABB get a constant wind force — UP (lift to an elevated
 * path), SIDEWAYS or BACKWARD. Extreme wobble (5/1) inside.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { soundFX } from '../audio/SoundFX.js';
import { Logger } from '../core/Logger.js';

const STRENGTHS = { weak: 6, med: 9, strong: 12 };

export class WindTunnel {
  /**
   * @param {{x?:number, z:number, dir?:'UP'|'LEFT'|'RIGHT'|'BACK', strength?:'weak'|'med'|'strong',
   *          length?:number, onWind?:Function}} cfg
   */
  constructor(scene, cfg = {}) {
    this.x = cfg.x ?? 0;
    this.z = cfg.z;
    this.length = cfg.length ?? 8;
    this.force = STRENGTHS[cfg.strength ?? 'med'];
    this.dir = cfg.dir ?? 'UP';
    this.onWind = cfg.onWind ?? null;     // (inside:boolean) → extreme wobble hook
    this.group = new THREE.Group();
    this.group.position.set(this.x, this.dir === 'UP' ? this.length / 2 : 0, this.z);

    // ── Transparent tube (UP = vertical column, else horizontal along z)
    const geo = this.dir === 'UP'
      ? new THREE.CylinderGeometry(2, 2, this.length, 20, 1, true)
      : new THREE.CylinderGeometry(2, 2, this.length, 20, 1, true).rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xbfe4ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false,
    });
    this.group.add(new THREE.Mesh(geo, mat));

    // ── 20 white streak sprites riding the wind (wrap around)
    const dot = document.createElement('canvas');
    dot.width = 16; dot.height = 16;
    const dc = dot.getContext('2d');
    const grd = dc.createRadialGradient(8, 8, 0, 8, 8, 8);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    dc.fillStyle = grd; dc.fillRect(0, 0, 16, 16);
    this._dotTex = new THREE.CanvasTexture(dot);
    this.streaks = [];
    for (let i = 0; i < 20; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._dotTex, transparent: true, opacity: 0.8 }));
      s.scale.set(0.5, 0.5, 1);
      this.#placeStreak(s, Math.random());
      this.group.add(s);
      this.streaks.push(s);
    }
    // ── Direction arrow sprite at the top/entry
    const arrow = document.createElement('canvas');
    arrow.width = 64; arrow.height = 64;
    const ac = arrow.getContext('2d');
    ac.strokeStyle = '#fff'; ac.lineWidth = 6; ac.beginPath();
    if (this.dir === 'UP') { ac.moveTo(32, 56); ac.lineTo(32, 12); ac.moveTo(16, 28); ac.lineTo(32, 10); ac.lineTo(48, 28); }
    else { ac.moveTo(10, 32); ac.lineTo(52, 32); ac.moveTo(38, 16); ac.lineTo(54, 32); ac.lineTo(38, 48); }
    ac.stroke();
    const arrowSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(arrow), transparent: true }));
    arrowSpr.scale.set(1.2, 1.2, 1);
    arrowSpr.position.set(0, this.dir === 'UP' ? this.length / 2 - 0.6 : 0, this.dir === 'UP' ? 0 : -this.length / 2 + 0.8);
    this.group.add(arrowSpr);
    scene.add(this.group);

    this._t = 0;
    this._whoosh = null;
    this._inside = false;
    Logger.game(`WindTunnel @z=${this.z} dir=${this.dir} F=${this.force}`);
  }

  #placeStreak(s, phase) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 1.5;
    s.userData.t = phase;
    if (this.dir === 'UP') s.position.set(Math.cos(a) * r, -this.length / 2 + phase * this.length, Math.sin(a) * r);
    else s.position.set(Math.cos(a) * r, Math.sin(a) * r, -this.length / 2 + phase * this.length);
  }

  update(dt, beanBody) {
    this._t += dt;
    for (const s of this.streaks) {         // ride + wrap
      s.userData.t += dt * 0.35;
      if (s.userData.t > 1) s.userData.t -= 1;
      const t = s.userData.t;
      if (this.dir === 'UP') s.position.y = -this.length / 2 + t * this.length;
      else s.position.z = -this.length / 2 + t * this.length;
    }

    let inside = false;
    if (beanBody) {
      const p = beanBody.position;
      const rad = Math.hypot(p.x - this.x, this.dir === 'UP' ? p.z - this.z : p.y - 1);
      const along = this.dir === 'UP' ? (p.y > -0.5 && p.y < this.length + 0.5) : Math.abs(p.z - this.z) < this.length / 2;
      inside = rad < 2 && along;
      if (inside) {
        const f = this.dir === 'UP' ? new CANNON.Vec3(0, this.force, 0)
          : this.dir === 'LEFT' ? new CANNON.Vec3(-this.force, 0, 0)
          : this.dir === 'RIGHT' ? new CANNON.Vec3(this.force, 0, 0)
          : new CANNON.Vec3(0, 0, this.force);
        beanBody.applyForce(f, p);
      }
    }
    if (inside !== this._inside) { this._inside = inside; this.onWind?.(inside); }
    if (inside) this.#whooshStart(); else this.#whooshStop();
  }

  #whooshStart() {
    if (this._whoosh) return;
    const ctx = soundFX.ctx; if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7;
    const gain = ctx.createGain(); gain.gain.value = 0.05;
    src.connect(f).connect(gain).connect(ctx.destination); src.start();
    this._whoosh = { src, gain };
  }
  #whooshStop() {
    if (!this._whoosh) return;
    try { this._whoosh.src.stop(); } catch { /* stopped */ }
    this._whoosh = null;
  }

  activate() {}
  deactivate() { this.#whooshStop(); }
  destroy() { this.dispose(); }
  dispose() {
    this.#whooshStop();
    this._dotTex.dispose();
    this.group.parent?.remove(this.group);
  }
}
