// two-hand-scale — grab an object with both controllers to scale it by distance.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class TwoHandScaleScene extends Scene {
  async init() {
    // The scalable object.
    const geo = new THREE.IcosahedronGeometry(0.18, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, roughness: 0.3, metalness: 0.4 });
    const gem = new THREE.Mesh(geo, mat);
    gem.position.set(0, 1.4, -1.4);
    gem.castShadow = true;
    this.add(gem);
    this._gem = gem;

    // Indicator spheres for controller positions.
    this._dots = [];
    for (let i = 0; i < 2; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 10, 8),
        new THREE.MeshBasicMaterial({ color: i === 0 ? 0x00ff88 : 0xff4488 }),
      );
      dot.visible = false;
      this.add(dot);
      this._dots.push(dot);
    }

    // State.
    this._grabbed = [false, false];    // which controllers are holding
    this._startDist = 0;
    this._startScale = 1;
    this._baseScale = 0.18;            // geometry radius, kept for reference

    this._t = 0;

    if (this.app.controllers) {
      this.onDispose(
        this.app.controllers.events.on('squeezestart', ({ index, controller }) => {
          // Only grab if controller is near the gem.
          const cPos = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
          if (cPos.distanceTo(this._gem.position) < 0.35) {
            this._grabbed[index] = true;
          }
        }),
      );
      this.onDispose(
        this.app.controllers.events.on('squeezeend', ({ index }) => {
          this._grabbed[index] = false;
        }),
      );
    }
  }

  update(dt) {
    this._t += dt;

    const controllers = this.app.controllers?.controllers;
    const g0 = this._grabbed[0];
    const g1 = this._grabbed[1];

    if (controllers) {
      // Show dot indicators when grabbing.
      for (let i = 0; i < 2; i++) {
        this._dots[i].visible = this._grabbed[i];
        if (this._grabbed[i]) {
          this._dots[i].position.setFromMatrixPosition(controllers[i].matrixWorld);
        }
      }
    }

    if (g0 && g1 && controllers) {
      const p0 = new THREE.Vector3().setFromMatrixPosition(controllers[0].matrixWorld);
      const p1 = new THREE.Vector3().setFromMatrixPosition(controllers[1].matrixWorld);
      const dist = p0.distanceTo(p1);

      if (this._startDist === 0) {
        // First frame of two-hand grab.
        this._startDist = dist;
        this._startScale = this._gem.scale.x;
      }

      const factor = Math.max(0.15, Math.min(4, dist / Math.max(0.01, this._startDist)));
      const s = this._startScale * factor;
      this._gem.scale.setScalar(s);

      // Move gem to midpoint.
      this._gem.position.lerpVectors(p0, p1, 0.5);
    } else {
      // Reset start dist when not two-hand grabbing.
      this._startDist = 0;

      // Idle: gentle spin & float.
      this._gem.rotation.y += dt * 0.6;
      this._gem.rotation.x += dt * 0.3;
      this._gem.position.y = 1.4 + Math.sin(this._t * 0.8) * 0.05;
    }
  }
}

register({
  id: 'two-hand-scale',
  title: 'Two-Hand Scale',
  category: 'Interaction',
  tags: ['scale', 'two-hand', 'grab', 'controller'],
  description: 'Grab an object with both controllers and scale it by the distance between them.',
  xr: 'vr',
  factory: (app) => new TwoHandScaleScene(app),
});
