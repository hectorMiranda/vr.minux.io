// Base class every test scene extends.
//
// Lifecycle, called by the App:
//   await scene.init()           -> build contents, add meshes via this.add()
//   scene.update(dt, frame)      -> per-frame; `frame` is the XRFrame (or null)
//   scene.onSessionStart(session)-> optional; XR session just began
//   scene.onSessionEnd()         -> optional; XR session ended
//   scene.dispose()              -> free geometries/materials, remove listeners
//
// The App injects itself; from it a scene can reach the renderer, the THREE
// scene graph, the camera rig, controllers, the clock, and helpers.

import * as THREE from 'three';

export class Scene {
  constructor(app) {
    this.app = app;
    /** A group that holds everything this scene adds; removed on dispose. */
    this.group = new THREE.Group();
    this.group.name = 'scene-root';
    this._disposables = [];
  }

  /** Add an object to the scene group and track it for disposal. */
  add(...objects) {
    for (const o of objects) {
      this.group.add(o);
      this._disposables.push(o);
    }
    return objects[0];
  }

  /** Register an arbitrary cleanup callback run on dispose. */
  onDispose(fn) {
    this._disposables.push({ _fn: fn });
  }

  /** Override: build the scene. May be async (e.g. to load assets). */
  async init() {}

  /** Override: per-frame update. dt = seconds since last frame. */
  update(_dt, _frame) {}

  /** Default disposal: free GPU resources and run custom callbacks. */
  dispose() {
    for (const d of this._disposables) {
      if (d && typeof d._fn === 'function') {
        d._fn();
        continue;
      }
      d?.traverse?.((obj) => {
        obj.geometry?.dispose?.();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
        else mat?.dispose?.();
      });
    }
    this.group.clear();
    this._disposables.length = 0;
  }
}
