// Same icosahedron at 5 tessellation levels side by side.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const LEVELS = [0, 1, 2, 3, 4];

class SubdivisionLodScene extends Scene {
  async init() {
    this._meshes = [];
    const spacing = 0.52;
    const startX = -((LEVELS.length - 1) * spacing) / 2;
    const mat = new THREE.MeshStandardMaterial({ color: 0x44ccaa, roughness: 0.4, metalness: 0.15 });

    for (let i = 0; i < LEVELS.length; i++) {
      const detail = LEVELS[i];
      const geo = new THREE.IcosahedronGeometry(0.19, detail);

      // Alternate wireframe + solid so differences are visible.
      const m = mat.clone();
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(startX + i * spacing, 1.45, -2.0);
      mesh.castShadow = true;
      this.add(mesh);
      this._meshes.push(mesh);

      // Label below (tiny wireframe box to indicate level).
      const label = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }),
      );
      label.position.set(startX + i * spacing, 1.45 - 0.30, -2.0);
      this.add(label);
    }
  }

  update(dt) {
    for (const m of this._meshes) {
      m.rotation.y += dt * 0.4;
    }
  }
}

register({
  id: 'subdivision-lod',
  title: 'Subdivision LOD',
  category: 'Geometry',
  tags: ['lod', 'subdivision', 'tessellation'],
  description: 'An icosahedron shown at five increasing tessellation levels side by side.',
  xr: 'vr',
  factory: (app) => new SubdivisionLodScene(app),
});
