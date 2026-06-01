// Manages the (up to two) XR controllers: their grip spaces, target-ray
// spaces, and select/squeeze events. Scenes read controllers[i] and listen
// via the shared emitter.
import * as THREE from 'three';
import { Emitter } from '../util/events.js';

export class Controllers {
  constructor(renderer, parent) {
    this.renderer = renderer;
    this.parent = parent;
    this.events = new Emitter();
    this.controllers = [];
    this.grips = [];
    this._unbinders = [];

    for (let i = 0; i < 2; i += 1) {
      const controller = renderer.xr.getController(i);
      controller.userData.index = i;
      this._bindEvents(controller, i);
      parent.add(controller);
      this.controllers.push(controller);

      const grip = renderer.xr.getControllerGrip(i);
      parent.add(grip);
      this.grips.push(grip);
    }
  }

  _bindEvents(controller, index) {
    const fwd = (type) => {
      const handler = (e) => this.events.emit(type, { index, controller, data: e.data });
      controller.addEventListener(type, handler);
      this._unbinders.push(() => controller.removeEventListener(type, handler));
    };
    ['selectstart', 'selectend', 'select', 'squeezestart', 'squeezeend', 'squeeze', 'connected', 'disconnected'].forEach(fwd);
  }

  /** World-space ray from a controller's target-ray space. */
  getRay(index, ray = new THREE.Ray()) {
    const c = this.controllers[index];
    ray.origin.setFromMatrixPosition(c.matrixWorld);
    ray.direction.set(0, 0, -1).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion()));
    return ray;
  }

  update(_dt, _frame) {
    // Hook for per-frame controller work (overridden by interaction systems).
  }

  dispose() {
    this._unbinders.forEach((u) => u());
    this._unbinders.length = 0;
    [...this.controllers, ...this.grips].forEach((o) => this.parent.remove(o));
  }
}
