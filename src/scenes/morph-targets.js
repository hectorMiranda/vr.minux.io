// A mesh with morph attributes animating between a sphere and a box shape.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class MorphTargetsScene extends Scene {
  async init() {
    // Use a sphere as the base geometry; morph target will pull verts toward a box.
    const DETAIL = 32;
    const geo = new THREE.SphereGeometry(0.3, DETAIL, DETAIL / 2);

    const posAttr = geo.attributes.position;
    const count = posAttr.count;

    // Build box-shape morph target by projecting each sphere vertex onto a unit cube.
    const morphPos = new Float32Array(count * 3);
    const HALF = 0.3;
    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      // Normalize to unit cube: scale each component so the largest = HALF.
      const m = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      const scale = m > 0 ? HALF / m : 1;
      morphPos[i * 3]     = x * scale;
      morphPos[i * 3 + 1] = y * scale;
      morphPos[i * 3 + 2] = z * scale;
    }

    geo.morphAttributes.position = [
      new THREE.BufferAttribute(morphPos, 3),
    ];

    const mat = new THREE.MeshStandardMaterial({
      color: 0x33aaff,
      roughness: 0.35,
      metalness: 0.2,
      morphTargets: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.morphTargetInfluences = [0];
    mesh.position.set(0, 1.5, -1.8);
    mesh.castShadow = true;
    this.add(mesh);

    this._mesh = mesh;
    this._t = 0;
  }

  update(dt) {
    this._t += dt * 0.5;
    // Oscillate influence 0..1..0
    const influence = (Math.sin(this._t) + 1) / 2;
    this._mesh.morphTargetInfluences[0] = influence;
    this._mesh.rotation.y += dt * 0.4;
  }
}

register({
  id: 'morph-targets',
  title: 'Morph Targets',
  category: 'Geometry',
  tags: ['morph', 'animation', 'shape'],
  description: 'A mesh with morph attributes smoothly blending between a sphere and a cube.',
  xr: 'vr',
  factory: (app) => new MorphTargetsScene(app),
});
