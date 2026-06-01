// Render loop wrapper. Uses renderer.setAnimationLoop so it works in and out
// of an XR session (XR drives the loop at the headset's refresh rate).
import * as THREE from 'three';

export class RenderLoop {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.clock = new THREE.Clock();
    this._cbs = new Set();
    this._running = false;
  }

  /** Register a per-frame callback (dt, frame). Returns an unsubscribe fn. */
  onFrame(cb) {
    this._cbs.add(cb);
    return () => this._cbs.delete(cb);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.renderer.setAnimationLoop((_t, frame) => {
      const dt = Math.min(this.clock.getDelta(), 0.1);
      for (const cb of this._cbs) cb(dt, frame);
      this.renderer.render(this.scene, this.camera);
    });
  }

  stop() {
    this._running = false;
    this.renderer.setAnimationLoop(null);
  }
}
