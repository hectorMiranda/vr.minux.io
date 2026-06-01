// A LatheGeometry vase from a profile curve, slowly rotating.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

function makeVaseProfile() {
  // Profile points in (x, y) — x is radius, y is height (0 = bottom).
  const pts = [
    [0.00,  0.00],
    [0.10,  0.02],
    [0.18,  0.08],
    [0.22,  0.16],
    [0.20,  0.28],
    [0.14,  0.38],
    [0.10,  0.45],
    [0.12,  0.52],
    [0.18,  0.58],
    [0.20,  0.62],
    [0.18,  0.66],
    [0.14,  0.68],
    [0.10,  0.70],
  ];
  return pts.map(([x, y]) => new THREE.Vector2(x, y));
}

class LatheVaseScene extends Scene {
  async init() {
    const profile = makeVaseProfile();
    const geo = new THREE.LatheGeometry(profile, 48);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xcc6633,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    // Centre vase at eye height; profile goes 0..0.7, so shift down by half.
    mesh.position.set(0, 1.5 - 0.35, -1.8);
    mesh.scale.setScalar(0.9);
    mesh.castShadow = true;
    this.add(mesh);
    this._mesh = mesh;
  }

  update(dt) {
    this._mesh.rotation.y += dt * 0.4;
  }
}

register({
  id: 'lathe-vase',
  title: 'Lathe Vase',
  category: 'Geometry',
  tags: ['lathe', 'vase', 'profile', 'geometry'],
  description: 'A ceramic-style vase built with LatheGeometry from a hand-crafted profile curve.',
  xr: 'vr',
  factory: (app) => new LatheVaseScene(app),
});
