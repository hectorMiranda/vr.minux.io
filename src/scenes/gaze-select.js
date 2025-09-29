// gaze-select — objects fill a progress ring and trigger when looked at for ~1.5 s.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const DWELL_TIME = 1.5;   // seconds to trigger
const RING_SEGS = 64;
const COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6];

class GazeSelectScene extends Scene {
  async init() {
    this._targets = [];

    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 0.4;
      // Main sphere.
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 24, 18),
        new THREE.MeshStandardMaterial({ color: COLORS[i], roughness: 0.4, metalness: 0.2 }),
      );
      sphere.position.set(x, 1.4, -1.6);
      sphere.castShadow = true;
      this.add(sphere);

      // Progress ring (torus, initially scale=0).
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.012, 8, RING_SEGS),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      ring.position.copy(sphere.position);
      ring.position.z += 0.001;
      ring.scale.set(0, 0, 0);
      this.add(ring);

      // A "selected" flash material (applied temporarily).
      this._targets.push({
        sphere,
        ring,
        dwell: 0,
        selected: false,
        flashTimer: 0,
        origColor: COLORS[i],
      });
    }

    // Progress ring arc (we'll fake it by scaling a partial torus via arc).
    // Instead use a custom arc mesh rebuilt each frame.
    this._arcLine = null;  // built lazily

    this._raycaster = new THREE.Raycaster();
    this._t = 0;
  }

  update(dt) {
    this._t += dt;
    const cam = this.app.camera;

    // Cast camera center ray.
    this._raycaster.setFromCamera({ x: 0, y: 0 }, cam);

    const meshes = this._targets.map((t) => t.sphere);
    const hits = this._raycaster.intersectObjects(meshes, false);
    const hitObj = hits.length ? hits[0].object : null;

    for (const target of this._targets) {
      const isGazed = target.sphere === hitObj;

      // Flash timer.
      if (target.flashTimer > 0) {
        target.flashTimer -= dt;
        const flash = Math.abs(Math.sin(target.flashTimer * 20));
        target.sphere.material.emissive.setScalar(flash * 0.8);
        if (target.flashTimer <= 0) {
          target.flashTimer = 0;
          target.selected = false;
          target.dwell = 0;
          target.sphere.material.emissive.setScalar(0);
        }
        target.ring.scale.setScalar(0);
        continue;
      }

      if (isGazed && !target.selected) {
        target.dwell = Math.min(DWELL_TIME, target.dwell + dt);
      } else if (!isGazed) {
        target.dwell = Math.max(0, target.dwell - dt * 2);
      }

      const progress = target.dwell / DWELL_TIME;

      // Show ring scaled to progress.
      if (progress > 0.01) {
        const s = 0.8 + progress * 0.2;
        target.ring.scale.setScalar(s);
        target.ring.rotation.z = -Math.PI / 2;
        target.ring.material.color.setHSL(progress * 0.33, 1, 0.6);
        // Look at camera.
        target.ring.lookAt(cam.getWorldPosition(new THREE.Vector3()));
      } else {
        target.ring.scale.setScalar(0);
      }

      // Trigger at full dwell.
      if (target.dwell >= DWELL_TIME && !target.selected) {
        target.selected = true;
        target.flashTimer = 0.8;
      }

      // Idle animation.
      target.sphere.position.y = 1.4 + Math.sin(this._t * 0.7 + this._targets.indexOf(target)) * 0.05;
      target.ring.position.copy(target.sphere.position);
    }
  }
}

register({
  id: 'gaze-select',
  title: 'Gaze Select',
  category: 'Interaction',
  tags: ['gaze', 'dwell', 'select', 'camera'],
  description: 'Objects fill a progress ring and trigger when looked at for ~1.5 s.',
  xr: 'vr',
  factory: (app) => new GazeSelectScene(app),
});
