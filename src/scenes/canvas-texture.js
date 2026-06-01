// Canvas Texture — a live 2D canvas drawing animation used as a texture on a panel.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const CW = 512, CH = 512;

class CanvasTextureScene extends Scene {
  async init() {
    this._canvas = document.createElement('canvas');
    this._canvas.width = CW;
    this._canvas.height = CH;
    this._ctx = this._canvas.getContext('2d');

    this._tex = new THREE.CanvasTexture(this._canvas);
    this._tex.colorSpace = THREE.SRGBColorSpace;
    this.onDispose(() => this._tex.dispose());

    // Main display panel
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({ map: this._tex }),
    );
    panel.position.set(0, 1.5, -1.5);
    this.add(panel);

    // Decorative frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.26, 1.26, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.7, metalness: 0.3 }),
    );
    frame.position.set(0, 1.5, -1.52);
    this.add(frame);

    // Small side panel showing a cropped view (same texture)
    const side = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({ map: this._tex }),
    );
    side.position.set(0.9, 1.5, -1.5);
    side.rotation.y = -0.3;
    this.add(side);

    const ambient = new THREE.AmbientLight(0x334455, 1.2);
    this.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(2, 3, 2);
    this.add(key);

    // Particle system state (for drawing trails)
    this._particles = Array.from({ length: 30 }, (_, i) => ({
      x: Math.random() * CW,
      y: Math.random() * CH,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      hue: (i / 30) * 360,
      r: 4 + Math.random() * 8,
    }));

    this._time = 0;
  }

  _drawFrame(t) {
    const ctx = this._ctx;

    // Fade previous frame
    ctx.fillStyle = 'rgba(10, 10, 20, 0.18)';
    ctx.fillRect(0, 0, CW, CH);

    // Draw spirograph-style pattern
    const cx = CW / 2, cy = CH / 2;
    const arms = 7;
    for (let a = 0; a < arms; a++) {
      const baseAngle = (a / arms) * Math.PI * 2 + t * 0.3;
      const r1 = 160 + Math.sin(t * 0.7 + a) * 40;
      const r2 = 60 + Math.cos(t * 1.1 + a) * 20;
      const nx = cx + Math.cos(baseAngle) * r1;
      const ny = cy + Math.sin(baseAngle) * r1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(nx, ny,
        cx + Math.cos(baseAngle + Math.PI / arms) * r2,
        cy + Math.sin(baseAngle + Math.PI / arms) * r2,
      );
      ctx.strokeStyle = `hsla(${(a / arms * 360 + t * 40) % 360}, 90%, 65%, 0.5)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Update and draw particles
    this._particles.forEach((p) => {
      p.x += p.vx * 1.5;
      p.y += p.vy * 1.5;
      // Attract to center
      const dx = cx - p.x, dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      p.vx += (dx / dist) * 0.12;
      p.vy += (dy / dist) * 0.12;
      // Speed limit
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 3) { p.vx *= 3 / speed; p.vy *= 3 / speed; }
      // Wrap
      if (p.x < 0) p.x = CW;
      if (p.x > CW) p.x = 0;
      if (p.y < 0) p.y = CH;
      if (p.y > CH) p.y = 0;

      p.hue = (p.hue + 0.5) % 360;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `hsla(${p.hue}, 100%, 80%, 0.9)`);
      g.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });

    // Central ring
    ctx.beginPath();
    ctx.arc(cx, cy, 30 + Math.sin(t * 2) * 10, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${(t * 60) % 360}, 90%, 80%, 0.8)`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  update(dt) {
    this._time += dt;
    this._drawFrame(this._time);
    this._tex.needsUpdate = true;
  }

  dispose() { super.dispose(); }
}

register({
  id: 'canvas-texture',
  title: 'Canvas Texture',
  category: 'Rendering',
  tags: ['canvas', 'texture', '2d', 'animation'],
  description: 'A live 2D canvas animation (spirograph trails + particle swarm) streamed as a CanvasTexture onto a panel each frame.',
  xr: 'vr',
  factory: (app) => new CanvasTextureScene(app),
});
