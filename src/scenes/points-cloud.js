// A few thousand points forming a rotating galaxy with vertex colors.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const COUNT = 4000;

function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4)];
}

class PointsCloudScene extends Scene {
  async init() {
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      // Spiral arms: random angle, radius weighted toward centre.
      const arm = Math.floor(Math.random() * 2) * Math.PI;
      const r = Math.pow(Math.random(), 0.5) * 0.9;
      const theta = arm + r * 3.0 + (Math.random() - 0.5) * 0.5;
      const spread = (1 - r) * 0.06 + 0.01;

      positions[i * 3]     = Math.cos(theta) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 2;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      // Colour: blue-white core, orange arms.
      const hue = r < 0.3 ? 210 : 30 + Math.random() * 30;
      const sat = r < 0.3 ? 0.3 : 0.8;
      const lig = 0.55 + Math.random() * 0.4;
      const [rr, gg, bb] = hslToRgb(hue, sat, lig);
      colors[i * 3]     = rr;
      colors[i * 3 + 1] = gg;
      colors[i * 3 + 2] = bb;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.012,
      vertexColors: true,
      sizeAttenuation: true,
    });

    const pts = new THREE.Points(geo, mat);
    pts.position.set(0, 1.5, -2.0);
    pts.scale.setScalar(1.2);
    this.add(pts);
    this._pts = pts;
  }

  update(dt) {
    this._pts.rotation.y += dt * 0.12;
    this._pts.rotation.x += dt * 0.02;
  }
}

register({
  id: 'points-cloud',
  title: 'Points Cloud',
  category: 'Basics',
  tags: ['points', 'particles', 'galaxy', 'vertex-colors'],
  description: 'Several thousand vertex-colored points arranged as a spiral galaxy, slowly rotating.',
  xr: 'vr',
  factory: (app) => new PointsCloudScene(app),
});
