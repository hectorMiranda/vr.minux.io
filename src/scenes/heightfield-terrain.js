// A plane displaced by layered sine noise into rolling terrain with vertex colors by height.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const GRID = 80; // segments per side
const SIZE = 2.4;

function layeredNoise(x, z) {
  // Simple layered sine waves acting as "noise".
  return (
    0.14 * Math.sin(x * 2.1 + z * 1.7) +
    0.07 * Math.sin(x * 4.3 - z * 3.1) +
    0.04 * Math.sin(x * 8.0 + z * 6.5) +
    0.02 * Math.sin(x * 15.0 - z * 11.0)
  );
}

function heightToColor(h, minH, maxH) {
  const t = (h - minH) / (maxH - minH);
  // Beach (t≈0) -> grass -> rock -> snow (t≈1).
  if (t < 0.25) return new THREE.Color(0.76, 0.70, 0.50);      // sand
  if (t < 0.55) return new THREE.Color(0.25, 0.55, 0.20);      // grass
  if (t < 0.80) return new THREE.Color(0.45, 0.38, 0.30);      // rock
  return new THREE.Color(0.92, 0.92, 0.96);                    // snow
}

class HeightfieldTerrainScene extends Scene {
  async init() {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, GRID, GRID);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    // Displace Y based on height function.
    let minH = Infinity, maxH = -Infinity;
    const heights = [];
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = layeredNoise(x, z);
      heights.push(h);
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }

    for (let i = 0; i < count; i++) {
      pos.setY(i, heights[i]);
      const col = heightToColor(heights[i], minH, maxH);
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 1.3, -2.2);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.add(mesh);
    this._mesh = mesh;
  }

  update(dt) {
    // Gentle slow tilt to show the terrain from a good angle.
    this._mesh.rotation.y += dt * 0.1;
  }
}

register({
  id: 'heightfield-terrain',
  title: 'Heightfield Terrain',
  category: 'Geometry',
  tags: ['terrain', 'heightfield', 'vertex-colors', 'noise'],
  description: 'A plane displaced by layered sine noise into rolling terrain with elevation-based vertex colors.',
  xr: 'vr',
  factory: (app) => new HeightfieldTerrainScene(app),
});
