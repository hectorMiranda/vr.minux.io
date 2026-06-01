// SmoothLocomotion — thumbstick-driven translation in the head-facing plane.
// Reads axes[2] (X) and axes[3] (Y) from the controller's gamepad.
// Movement is relative to the camera's horizontal facing direction.
import * as THREE from 'three';

const DEFAULT_SPEED = 3; // m/s

export class SmoothLocomotion {
  /**
   * @param {object} app - the App instance
   * @param {object} [opts]
   * @param {number} [opts.speed=3]          - movement speed in m/s
   * @param {number} [opts.controllerIndex=0] - which controller's thumbstick to read
   * @param {number} [opts.deadzone=0.12]    - thumbstick dead zone radius
   */
  constructor(app, opts = {}) {
    this._app = app;
    this.speed = opts.speed ?? DEFAULT_SPEED;
    this._index = opts.controllerIndex ?? 0;
    this._deadzone = opts.deadzone ?? 0.12;
    this._enabled = false;

    this._forward = new THREE.Vector3();
    this._right   = new THREE.Vector3();
    this._delta   = new THREE.Vector3();
  }

  enable()  { this._enabled = true; }
  disable() { this._enabled = false; }

  /**
   * Call each frame.  dt is seconds.
   * Returns the movement vector applied this frame (useful for debugging).
   */
  update(dt) {
    if (!this._enabled) return null;

    const controllers = this._app.controllers.controllers;
    const ctrl = controllers[this._index];
    if (!ctrl) return null;

    // Try to get gamepad axes from the XR input source
    const inputSource = ctrl.userData?.inputSource;
    const gamepad = inputSource?.gamepad ?? null;

    // axes[2] = thumbstick X (right = positive)
    // axes[3] = thumbstick Y (down = positive in XR spec, so negate for forward)
    let axisX = 0;
    let axisY = 0;
    if (gamepad && gamepad.axes && gamepad.axes.length >= 4) {
      axisX = gamepad.axes[2];
      axisY = gamepad.axes[3];
    }

    // Apply dead zone
    const len = Math.sqrt(axisX * axisX + axisY * axisY);
    if (len < this._deadzone) return null;
    const scale = (len - this._deadzone) / (1 - this._deadzone);
    axisX = (axisX / len) * scale;
    axisY = (axisY / len) * scale;

    // Derive heading from the camera's Y rotation (horizontal facing)
    const camera = this._app.camera;
    camera.getWorldDirection(this._forward);
    this._forward.y = 0;
    this._forward.normalize();
    this._right.crossVectors(this._forward, new THREE.Vector3(0, 1, 0)).normalize();

    this._delta
      .copy(this._forward).multiplyScalar(-axisY * this.speed * dt)
      .addScaledVector(this._right, axisX * this.speed * dt);

    this._app.rig.translate(this._delta.x, 0, this._delta.z);
    return this._delta.clone();
  }

  dispose() {}
}
