// AR Passthrough: minimal AR scene with translucent floating cubes in
// passthrough; emphasises alpha/transparent background handling.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const CUBE_DATA = [
  { pos: [-0.35, 1.4, -1.0], color: 0x64b5f6, size: 0.12 },
  { pos: [ 0.35, 1.3, -1.1], color: 0xef9a9a, size: 0.10 },
  { pos: [ 0.00, 1.6, -1.2], color: 0xa5d6a7, size: 0.14 },
  { pos: [-0.55, 1.6, -1.3], color: 0xce93d8, size: 0.09 },
  { pos: [ 0.50, 1.5, -0.9], color: 0xffcc80, size: 0.11 },
  { pos: [-0.15, 1.2, -1.4], color: 0x80deea, size: 0.08 },
];

class ArPassthroughScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    this._cubes = [];
    this._time = 0;

    for (const { pos, color, size } of CUBE_DATA) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
      mesh.position.set(...pos);
      mesh.userData.baseY = pos[1];
      mesh.userData.phase = Math.random() * Math.PI * 2;
      this.add(mesh);
      this._cubes.push(mesh);
    }

    // Subtle edge lines on each cube to read shape against passthrough
    for (const cube of this._cubes) {
      const edges = new THREE.EdgesGeometry(cube.geometry);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
      });
      const lines = new THREE.LineSegments(edges, lineMat);
      cube.add(lines);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(1, 2, 1);
    this.add(dir);

    // Desktop neutral background
    this._desktopBg = new THREE.Color(0x1a1a2e);
  }

  onSessionStart() {
    // Remove background so passthrough camera shows through
    this.app.scene.background = null;
    this.app.renderer.setClearAlpha(0);
  }

  onSessionEnd() {
    this.app.scene.background = this._desktopBg;
    this.app.renderer.setClearAlpha(1);
  }

  update(dt) {
    this._time += dt;
    for (const cube of this._cubes) {
      const phase = cube.userData.phase;
      cube.position.y = cube.userData.baseY + Math.sin(this._time * 0.8 + phase) * 0.04;
      cube.rotation.x += dt * (0.2 + 0.1 * Math.sin(phase));
      cube.rotation.y += dt * (0.3 + 0.1 * Math.cos(phase));

      // Gently pulse opacity
      cube.material.opacity = 0.40 + 0.25 * (0.5 + 0.5 * Math.sin(this._time * 1.1 + phase));
    }
  }
}

register({
  id: 'ar-passthrough',
  title: 'AR Passthrough',
  category: 'AR',
  tags: ['ar', 'passthrough', 'transparent', 'alpha', 'floating'],
  description: 'Minimal AR scene: translucent floating cubes rendered over the passthrough camera feed with alpha-blended background.',
  xr: 'ar',
  factory: (app) => new ArPassthroughScene(app),
});
