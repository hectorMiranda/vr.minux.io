// Extruded 3D text "MINUX" using TextGeometry + FontLoader.
// Falls back to extruded letter-box placeholders if the font cannot be loaded.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const FONT_URL = '/node_modules/three/examples/fonts/helvetiker_bold.typeface.json';

/** Fallback: a row of thin extruded rectangles standing in for letters. */
function buildFallback(group) {
  const WORD = 'MINUX';
  const w = 0.13, h = 0.20, d = 0.05;
  const spacing = 0.18;
  const startX = -((WORD.length - 1) * spacing) / 2;
  const mat = new THREE.MeshStandardMaterial({ color: 0xee4411, roughness: 0.3, metalness: 0.4 });

  for (let i = 0; i < WORD.length; i++) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(startX + i * spacing, 0, 0);
    group.add(mesh);
  }
}

class TextGeometry3dScene extends Scene {
  async init() {
    const root = new THREE.Group();
    root.position.set(0, 1.5, -2.0);
    this.add(root);
    this._root = root;

    try {
      // Dynamic import of addons — may fail if the path is not served.
      const { TextGeometry } = await import('three/addons/geometries/TextGeometry.js');
      const { FontLoader }   = await import('three/addons/loaders/FontLoader.js');

      const loader = new FontLoader();

      /** Wrap the callback-based load in a promise with a timeout. */
      const font = await Promise.race([
        new Promise((resolve, reject) => {
          loader.load(FONT_URL, resolve, undefined, reject);
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('font load timeout')), 5000),
        ),
      ]);

      const geo = new TextGeometry('MINUX', {
        font,
        size: 0.18,
        depth: 0.06,
        curveSegments: 6,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.008,
        bevelSegments: 3,
      });
      geo.center();

      const mat = new THREE.MeshStandardMaterial({
        color: 0xee4411,
        roughness: 0.3,
        metalness: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      root.add(mesh);

    } catch (_err) {
      // Font failed — use letter-box placeholders.
      buildFallback(root);
    }
  }

  update(dt) {
    this._root.rotation.y += dt * 0.4;
  }
}

register({
  id: 'text-geometry-3d',
  title: '3D Text Geometry',
  category: 'Geometry',
  tags: ['text', 'extrude', 'font', 'textgeometry'],
  description: 'Extruded 3D text "MINUX" via TextGeometry; falls back to box placeholders if the font fails.',
  xr: 'vr',
  factory: (app) => new TextGeometry3dScene(app),
});
