// rotate-handle — a box with a ring handle you grab to rotate it.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { buildRotateHandle } from '../interaction/transform-handles.js';

class RotateHandleScene extends Scene {
  async init() {
    // The target box.
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.3, metalness: 0.5 }),
    );
    box.position.set(0, 1.4, -1.4);
    box.castShadow = true;
    this.add(box);
    this._box = box;

    // Build Y-axis rotate handle.
    this._ring = buildRotateHandle(box, {
      axis: new THREE.Vector3(0, 1, 0),
      radius: 0.28,
      tube: 0.018,
      color: 0x00ccff,
    });
    this._ring.position.copy(box.position);
    this.add(this._ring);

    // Raycaster for controller pointing at the ring.
    this._raycaster = new THREE.Raycaster();
    this._dragging = false;
    this._activeIndex = -1;

    if (this.app.controllers) {
      this.onDispose(
        this.app.controllers.events.on('selectstart', ({ index }) => {
          // Check if ray hits the ring.
          const ray = this.app.controllers.getRay(index);
          this._raycaster.ray.copy(ray);
          const hits = this._raycaster.intersectObject(this._ring, false);
          if (hits.length > 0) {
            this._dragging = true;
            this._activeIndex = index;
          }
        }),
      );
      this.onDispose(
        this.app.controllers.events.on('selectend', ({ index }) => {
          if (index === this._activeIndex) {
            this._dragging = false;
            this._activeIndex = -1;
          }
        }),
      );
    }

    this._t = 0;
  }

  update(dt) {
    this._t += dt;

    let ray = null;
    if (this._dragging && this._activeIndex >= 0 && this.app.controllers) {
      ray = this.app.controllers.getRay(this._activeIndex);
    }

    this._ring.updateHandle(this._dragging, ray);

    // Desktop: auto-rotate the box slowly.
    if (!this._dragging) {
      this._box.rotation.y += dt * 0.5;
      this._ring.rotation.z += dt * 0.5;
    }

    // Highlight ring when dragging.
    this._ring.material.emissive.setHex(this._dragging ? 0x003366 : 0x000000);
  }
}

register({
  id: 'rotate-handle',
  title: 'Rotate Handle',
  category: 'Interaction',
  tags: ['rotate', 'handle', 'gizmo', 'controller'],
  description: 'A box with a ring handle you grab to rotate it around the Y axis.',
  xr: 'vr',
  factory: (app) => new RotateHandleScene(app),
});
