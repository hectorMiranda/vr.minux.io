// A parametric ripple surface using ParametricGeometry, animating amplitude over time.
import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { register } from './registry.js';
import { Scene } from './base.js';

class ParametricSurfaceScene extends Scene {
  async init() {
    this._t = 0;

    // We rebuild the geometry each frame inside update via a mutable ref.
    // For efficiency, we use a Float32Array buffer and update in place.
    const SLICES = 60;

    // Initial geometry with a dummy function; will be replaced immediately.
    const makeFunc = (t) => (u, v, target) => {
      const x = (u - 0.5) * 2.0;
      const z = (v - 0.5) * 2.0;
      const r = Math.sqrt(x * x + z * z);
      const y = 0.18 * Math.sin(r * 6.0 - t * 2.5) * Math.max(0, 1 - r * 0.7);
      target.set(x, y, z);
    };

    this._geo = new ParametricGeometry(makeFunc(0), SLICES, SLICES);
    this._makeFunc = makeFunc;
    this._slices = SLICES;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x2266ff,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide,
      wireframe: false,
    });

    const mesh = new THREE.Mesh(this._geo, mat);
    mesh.position.set(0, 1.38, -2.0);
    mesh.castShadow = true;
    this.add(mesh);
    this._mesh = mesh;
  }

  update(dt) {
    this._t += dt;

    // Rebuild parametric geometry each frame.
    const newGeo = new ParametricGeometry(this._makeFunc(this._t), this._slices, this._slices);
    this._mesh.geometry.dispose();
    this._mesh.geometry = newGeo;
    this._geo = newGeo;

    this._mesh.rotation.y += dt * 0.2;
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'parametric-surface',
  title: 'Parametric Surface',
  category: 'Geometry',
  tags: ['parametric', 'surface', 'ripple', 'animation'],
  description: 'An animated ripple surface generated with ParametricGeometry, rebuilt each frame.',
  xr: 'vr',
  factory: (app) => new ParametricSurfaceScene(app),
});
