// SnapTurn — thumbstick-X flick rotates the camera rig by ±30° per flick.
// Requires the thumbstick to return to the dead zone before the next snap.
import * as THREE from 'three';

const SNAP_ANGLE_DEG = 30;
const THRESHOLD      = 0.6; // axis magnitude to trigger a snap
const DEADZONE       = 0.3; // must return below this before next snap

export class SnapTurn {
  /**
   * @param {object} app - the App instance
   * @param {object} [opts]
   * @param {number} [opts.angleDeg=30]       - degrees per snap
   * @param {number} [opts.threshold=0.6]     - axis magnitude to trigger
   * @param {number} [opts.controllerIndex=1] - which controller (right = 1 typically)
   */
  constructor(app, opts = {}) {
    this._app = app;
    this._angleDeg = opts.angleDeg ?? SNAP_ANGLE_DEG;
    this._threshold = opts.threshold ?? THRESHOLD;
    this._index = opts.controllerIndex ?? 1;
    this._enabled = false;
    this._ready = true; // waiting for axis to be flicked
    this._lastSnap = 0; // +1 or -1
    this._unsubs = [];
  }

  enable()  { this._enabled = true; }
  disable() { this._enabled = false; }

  /** Call each frame. */
  update(_dt) {
    if (!this._enabled) return;

    const ctrl = this._app.controllers.controllers[this._index];
    if (!ctrl) return;

    const inputSource = ctrl.userData?.inputSource;
    const gamepad = inputSource?.gamepad ?? null;
    if (!gamepad || !gamepad.axes || gamepad.axes.length < 3) return;

    const axis = gamepad.axes[2]; // thumbstick X

    if (this._ready) {
      if (axis > this._threshold) {
        this._snap(-1); // right flick = turn right = negative Y rotation
        this._ready = false;
        this._lastSnap = 1;
      } else if (axis < -this._threshold) {
        this._snap(+1); // left flick = turn left = positive Y rotation
        this._ready = false;
        this._lastSnap = -1;
      }
    } else {
      // Wait for return to dead zone
      if (Math.abs(axis) < DEADZONE) {
        this._ready = true;
      }
    }
  }

  _snap(sign) {
    const rad = (this._angleDeg * Math.PI / 180) * sign;
    this._app.rig.rotateY(rad);
    if (this._onSnap) this._onSnap(sign);
  }

  /** Optional callback called on each snap: fn(sign: +1 | -1) */
  set onSnap(fn) { this._onSnap = fn; }

  dispose() {}
}
