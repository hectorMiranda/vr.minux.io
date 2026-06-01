// A torus knot with a standard material, slowly rotating on multiple axes.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class SpinningTorusScene extends Scene {
  async init() {
    const geo = new THREE.TorusKnotGeometry(0.35, 0.12, 128, 20, 2, 3);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8844ee,
      roughness: 0.3,
      metalness: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 1.5, -1.8);
    mesh.castShadow = true;
    this.add(mesh);
    this._mesh = mesh;
  }

  update(dt) {
    this._mesh.rotation.x += dt * 0.4;
    this._mesh.rotation.y += dt * 0.6;
  }
}

register({
  id: 'spinning-torus',
  title: 'Spinning Torus Knot',
  category: 'Basics',
  tags: ['mesh', 'geometry', 'torus'],
  description: 'A torus knot with a standard PBR material rotating on two axes.',
  xr: 'vr',
  factory: (app) => new SpinningTorusScene(app),
});
