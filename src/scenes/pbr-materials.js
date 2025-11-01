// PBR Materials — a grid of spheres spanning roughness × metalness.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class PbrMaterialsScene extends Scene {
  async init() {
    const ROWS = 5; // roughness
    const COLS = 5; // metalness
    const SPACING = 0.32;

    const geo = new THREE.SphereGeometry(0.12, 32, 16);
    const totalW = (COLS - 1) * SPACING;
    const totalH = (ROWS - 1) * SPACING;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const roughness = row / (ROWS - 1);
        const metalness = col / (COLS - 1);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness,
          metalness,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          col * SPACING - totalW / 2,
          1.4 + totalH / 2 - row * SPACING,
          -1.5,
        );
        mesh.castShadow = true;
        this.add(mesh);
      }
    }

    // Floor receiver
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.9, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, -1.5);
    floor.receiveShadow = true;
    this.add(floor);

    // Key light
    const key = new THREE.DirectionalLight(0xfff5ee, 2.5);
    key.position.set(2, 3, 2);
    key.castShadow = true;
    this.add(key);

    // Fill + rim
    const fill = new THREE.DirectionalLight(0xaabbff, 0.8);
    fill.position.set(-2, 1, -1);
    this.add(fill);

    const rim = new THREE.DirectionalLight(0xffddaa, 0.6);
    rim.position.set(0, 2, 3);
    this.add(rim);

    const ambient = new THREE.AmbientLight(0x222233, 1);
    this.add(ambient);

    // Label backdrop
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(totalW + 0.1, totalH + 0.1),
      new THREE.MeshBasicMaterial({ color: 0x111122, transparent: true, opacity: 0.4 }),
    );
    back.position.set(0, 1.4, -1.52);
    this.add(back);

    this._time = 0;
    this._key = key;
  }

  update(dt) {
    this._time += dt;
    // Subtle key-light orbit
    this._key.position.x = Math.sin(this._time * 0.3) * 3;
    this._key.position.z = Math.cos(this._time * 0.3) * 3 + 1;
  }

  dispose() { super.dispose(); }
}

register({
  id: 'pbr-materials',
  title: 'PBR Materials',
  category: 'Rendering',
  tags: ['pbr', 'roughness', 'metalness', 'materials'],
  description: 'A 5×5 grid of spheres spanning roughness (rows) × metalness (cols) under a rotating three-point light rig.',
  xr: 'vr',
  factory: (app) => new PbrMaterialsScene(app),
});
