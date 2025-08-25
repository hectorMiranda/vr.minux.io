// Several sprites that always face the camera, bobbing gently.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const COLORS = [0xff4444, 0xffaa00, 0xffff00, 0x44ff88, 0x44aaff, 0xcc44ff, 0xff44aa];

/** Build a soft circle texture on a canvas. */
function makeSpriteTexture(color) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const hex = `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, hex);
  grad.addColorStop(0.6, hex);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

class BillboardSpritesScene extends Scene {
  async init() {
    this._sprites = [];

    for (let i = 0; i < COLORS.length; i++) {
      const tex = makeSpriteTexture(COLORS[i]);
      this.onDispose(() => tex.dispose());

      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);

      const angle = (i / COLORS.length) * Math.PI * 2;
      const radius = 0.7;
      sprite.position.set(
        Math.cos(angle) * radius,
        1.5,
        -2.0 + Math.sin(angle) * radius,
      );
      sprite.scale.setScalar(0.22);

      this.add(sprite);
      this._sprites.push({ sprite, phase: (i / COLORS.length) * Math.PI * 2, baseY: 1.5 });
    }

    this._t = 0;
  }

  update(dt) {
    this._t += dt;
    for (const { sprite, phase, baseY } of this._sprites) {
      sprite.position.y = baseY + Math.sin(this._t * 1.5 + phase) * 0.08;
    }
  }
}

register({
  id: 'billboard-sprites',
  title: 'Billboard Sprites',
  category: 'Basics',
  tags: ['sprite', 'billboard', 'canvas'],
  description: 'Canvas-painted sprite circles that always face the camera and gently bob.',
  xr: 'vr',
  factory: (app) => new BillboardSpritesScene(app),
});
