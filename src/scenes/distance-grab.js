// distance-grab — point the controller ray at a distant object and pull it in.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { PointerRaycaster } from '../interaction/raycaster.js';

const COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6];

class DistanceGrabScene extends Scene {
  async init() {
    // Floating spheres at a distance.
    this._spheres = [];
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 20, 16),
        new THREE.MeshStandardMaterial({ color: COLORS[i], roughness: 0.3, metalness: 0.3 }),
      );
      mesh.position.set((i - 2) * 0.35, 1.4, -2.5);
      mesh.castShadow = true;
      this.add(mesh);
      this._spheres.push(mesh);
    }

    // Hand target position (spheres fly here when pulled).
    this._handPos = new THREE.Vector3(0, 1.2, -0.5);

    // State
    this._hovered = null;
    this._pulling = null;   // sphere currently flying toward hand
    this._released = [];    // spheres that have arrived, gently floating

    // Auto-sweep for desktop: a virtual ray that pans left/right.
    this._sweepAngle = 0;

    // Raycaster (controller 0 if available, otherwise camera sweep).
    this._rc = new PointerRaycaster({
      source: this.app.camera,
      isCamera: false,
      rayLength: 5,
      rayColor: 0x00ffcc,
    });
    this._rc.setTargets(this._spheres);

    // Ray-line helper on controller 0.
    this._rayLineAdded = false;

    // Listen for select to trigger pull.
    if (this.app.controllers) {
      this.onDispose(
        this.app.controllers.events.on('selectstart', ({ index }) => {
          if (index !== 0) return;
          if (this._hovered && !this._pulling) {
            this._startPull(this._hovered);
          }
        }),
      );
    }

    this._t = 0;
  }

  _startPull(mesh) {
    this._pulling = mesh;
    this._spheres = this._spheres.filter((s) => s !== mesh);
    this._rc.setTargets(this._spheres);
  }

  update(dt) {
    this._t += dt;

    // ---- Desktop: sweep camera ray side to side ----
    this._sweepAngle += dt * 0.7;

    // Build a world-space ray from camera + gentle sweep offset.
    const cam = this.app.camera;
    const origin = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const sweepX = Math.sin(this._sweepAngle) * 0.4;
    const dir = new THREE.Vector3(sweepX, 0, -1).normalize();
    dir.applyQuaternion(cam.quaternion);

    // Override with real controller ray if available.
    const ctrl = this.app.controllers?.controllers?.[0];
    const useCtrl = ctrl && ctrl.visible;
    let ray;
    if (useCtrl) {
      ray = this.app.controllers.getRay(0);
    } else {
      ray = new THREE.Ray(origin, dir);
    }

    const hit = this._rc.update(ray);
    this._hovered = hit ? hit.object : null;

    // Tint hovered sphere.
    this._spheres.forEach((s) => {
      const mat = s.material;
      if (s === this._hovered) {
        mat.emissive.setHex(0x336633);
      } else {
        mat.emissive.setHex(0x000000);
      }
    });

    // Animate pull.
    if (this._pulling) {
      const target = this._handPos.clone().applyMatrix4(cam.matrixWorld);
      this._pulling.position.lerp(
        new THREE.Vector3(
          origin.x + dir.x * 0.4,
          origin.y + dir.y * 0.4 - 0.1,
          origin.z + dir.z * 0.4,
        ),
        Math.min(1, dt * 8),
      );
      const dist = this._pulling.position.distanceTo(origin);
      if (dist < 0.5) {
        this._released.push(this._pulling);
        this._pulling = null;
      }
    }

    // Float released spheres near camera.
    this._released.forEach((s, i) => {
      s.position.y += Math.sin(this._t * 1.5 + i) * dt * 0.03;
    });

    // Gentle auto-bob for all idle spheres.
    this._spheres.forEach((s, i) => {
      s.position.y =
        1.4 + Math.sin(this._t * 0.9 + i * 1.2) * 0.06;
    });
  }
}

register({
  id: 'distance-grab',
  title: 'Distance Grab',
  category: 'Interaction',
  tags: ['grab', 'ray', 'select', 'controller'],
  description: 'Point the controller ray at a distant object and pull it in on select.',
  xr: 'vr',
  factory: (app) => new DistanceGrabScene(app),
});
