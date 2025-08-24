// Labeled X/Y/Z axes plus a unit grid for spatial orientation reference.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const LABEL_COLORS = { X: 0xff3333, Y: 0x33ff33, Z: 0x3399ff };

/** Build a tiny label sprite with a colored canvas. */
function makeLabel(text, color, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
  ctx.font = `bold ${Math.floor(size * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(0.12);
  return { sprite, tex };
}

class AxesHelperScene extends Scene {
  async init() {
    const origin = new THREE.Vector3(0, 1.5, -2.0);

    const group = new THREE.Group();
    group.position.copy(origin);
    this.add(group);

    // AxesHelper: 0.6 m arms.
    const axes = new THREE.AxesHelper(0.6);
    group.add(axes);

    // Grid.
    const grid = new THREE.GridHelper(2, 10, 0x888888, 0x444444);
    grid.position.set(0, -0.6, 0); // floor level relative to pivot
    group.add(grid);

    // Labels.
    const labelDefs = [
      { key: 'X', pos: new THREE.Vector3(0.72, 0, 0) },
      { key: 'Y', pos: new THREE.Vector3(0, 0.72, 0) },
      { key: 'Z', pos: new THREE.Vector3(0, 0, 0.72) },
    ];
    for (const { key, pos } of labelDefs) {
      const { sprite, tex } = makeLabel(key, LABEL_COLORS[key]);
      sprite.position.copy(pos);
      group.add(sprite);
      this.onDispose(() => tex.dispose());
    }

    // Unit-tick markers along each positive axis.
    for (const [axis, color, vec] of [
      ['X', 0xff3333, new THREE.Vector3(1, 0, 0)],
      ['Y', 0x33ff33, new THREE.Vector3(0, 1, 0)],
      ['Z', 0x3399ff, new THREE.Vector3(0, 0, 1)],
    ]) {
      void axis; // intentionally unused
      const tickGeo = new THREE.SphereGeometry(0.018, 8, 8);
      const tick = new THREE.Mesh(tickGeo, new THREE.MeshBasicMaterial({ color }));
      tick.position.copy(vec.clone().multiplyScalar(0.6));
      group.add(tick);
    }

    this._group = group;
  }

  update(_dt) {
    // Static reference scene — no animation needed.
  }
}

register({
  id: 'axes-helper',
  title: 'Axes Helper',
  category: 'Basics',
  tags: ['axes', 'grid', 'orientation', 'reference'],
  description: 'Labeled X/Y/Z axes and a unit grid for spatial orientation reference.',
  xr: 'vr',
  factory: (app) => new AxesHelperScene(app),
});
