// A grid of small cubes colored across hue and lightness using util/colors.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

// HSL -> 0xRRGGBB without Three.js dependency in the math.
function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  const r = f(0), g = f(8), b = f(4);
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

class ColorGridScene extends Scene {
  async init() {
    const COLS = 12;
    const ROWS = 6;
    const SIZE = 0.1;
    const GAP  = 0.03;
    const step = SIZE + GAP;

    const totalW = COLS * step - GAP;
    const totalH = ROWS * step - GAP;

    const group = new THREE.Group();
    group.position.set(0, 1.45, -2.0);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const hue = (col / COLS) * 360;
        const lightness = 0.3 + (row / (ROWS - 1)) * 0.5;
        const color = hslToHex(hue, 0.85, lightness);

        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(SIZE, SIZE, SIZE),
          new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.0 }),
        );
        mesh.position.set(
          col * step - totalW / 2 + SIZE / 2,
          -(row * step - totalH / 2 + SIZE / 2),
          0,
        );
        group.add(mesh);
      }
    }

    this.add(group);
    this._group = group;
  }

  update(dt) {
    this._group.rotation.y += dt * 0.15;
  }
}

register({
  id: 'color-grid',
  title: 'Color Grid',
  category: 'Basics',
  tags: ['color', 'grid', 'hsl'],
  description: 'A grid of small cubes sweeping hue (columns) and lightness (rows).',
  xr: 'vr',
  factory: (app) => new ColorGridScene(app),
});
