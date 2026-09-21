/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — CameraController (Part 008)
 * ============================================================
 * Third-person follow: smooth lerp toward target+offset, look at
 * the target's chest (+1), never dips underground, decaying shake.
 * Uses camera.lookAt directly (camera convention — safe).
 */
import * as THREE from 'three';

export class CameraController {
  /** @param {THREE.PerspectiveCamera} camera */
  constructor(camera) {
    this.camera = camera;
    /** @type {THREE.Object3D|null} */
    this.target = null;
    this.offset = new THREE.Vector3(0, 6, 10);
    this.lerpSpeed = 0.06;
    this.minY = 1.5;

    this._desired = new THREE.Vector3();
    this._lookAt = new THREE.Vector3();
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeElapsed = 0;
  }

  /** @param {THREE.Object3D} target */
  setTarget(target) { this.target = target; }

  /** Decaying random shake. */
  shake(intensity = 0.4, duration = 0.4) {
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeElapsed = 0;
  }

  get shaking() { return this._shakeIntensity > 0 && this._shakeElapsed < this._shakeDuration; }

  /** @param {number} dt fixed delta */
  update(dt, orbit = null) {
    if (!this.target) return;

    // Orbit offset (mouse look / zoom): yaw-pitch-zoom spherical around bean
    if (orbit) {
      const { yaw, pitch, zoom } = orbit;
      this.offset.set(
        Math.sin(yaw) * Math.cos(pitch) * zoom,
        Math.sin(pitch) * zoom,
        Math.cos(yaw) * Math.cos(pitch) * zoom
      );
    }
    this._desired.copy(this.target.position).add(this.offset);
    const k = 1 - Math.pow(1 - this.lerpSpeed, dt * 60); // frame-rate independent
    this.camera.position.lerp(this._desired, k);

    this._lookAt.copy(this.target.position);
    this._lookAt.y += 1;
    this.camera.lookAt(this._lookAt);

    if (this.shaking) {
      this._shakeElapsed += dt;
      const decay = Math.max(0, 1 - this._shakeElapsed / this._shakeDuration);
      const amp = this._shakeIntensity * decay * decay;
      this.camera.position.x += (Math.random() * 2 - 1) * amp;
      this.camera.position.y += (Math.random() * 2 - 1) * amp;
      this.camera.position.z += (Math.random() * 2 - 1) * amp;
    }

    if (this.camera.position.y < this.minY) this.camera.position.y = this.minY;
  }
}
