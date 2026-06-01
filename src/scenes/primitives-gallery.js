// A row of the seven most common Three.js primitives, each slowly spinning.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const SHAPES = [
  { geo: () => new THREE.BoxGeometry(0.28, 0.28, 0.28),            color: 0xff4444 },
  { geo: () => new THREE.SphereGeometry(0.16, 32, 16),             color: 0xff9900 },
  { geo: () => new THREE.ConeGeometry(0.15, 0.32, 32),             color: 0xffee00 },
  { geo: () => new THREE.CylinderGeometry(0.12, 0.12, 0.3, 32),   color: 0x44cc44 },
  { geo: () => new THREE.TorusGeometry(0.14, 0.055, 16, 48),       color: 0x44aaff },
  { geo: () => new THREE.IcosahedronGeometry(0.17, 0),             color: 0x8844ff },
  { geo: () => new THREE.DodecahedronGeometry(0.16, 0),            color: 0xff44cc },
];

class PrimitivesGalleryScene extends Scene {
  async init() {
    this._meshes = [];
    const total = SHAPES.length;
    const spacing = 0.5;
    const startX = -((total - 1) * spacing) / 2;

    for (let i = 0; i < total; i++) {
      const { geo, color } = SHAPES[i];
      const mesh = new THREE.Mesh(
        geo(),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 }),
      );
      mesh.position.set(startX + i * spacing, 1.45, -2.0);
      mesh.castShadow = true;
      this.add(mesh);
      this._meshes.push(mesh);
    }
  }

  update(dt) {
    for (const m of this._meshes) {
      m.rotation.x += dt * 0.3;
      m.rotation.y += dt * 0.5;
    }
  }
}

register({
  id: 'primitives-gallery',
  title: 'Primitives Gallery',
  category: 'Basics',
  tags: ['mesh', 'geometry', 'primitives'],
  description: 'A row of all common Three.js primitives slowly rotating side by side.',
  xr: 'vr',
  factory: (app) => new PrimitivesGalleryScene(app),
});
