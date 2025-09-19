// Trigger Pressure — a bar that fills with the analog trigger value.
// Two bars (one per controller) auto-animate on desktop.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { getTrigger } from '../xr/input-sources.js';

const BAR_HEIGHT = 0.4;
const BAR_WIDTH = 0.08;

class TriggerPressureScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 0.9, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    this._bars = [];
    const xOffsets = [-0.25, 0.25];
    const colors = [0x44aaff, 0xff6644];
    const labels = ['Left Trigger', 'Right Trigger'];

    for (let ci = 0; ci < 2; ci++) {
      const group = new THREE.Group();
      group.position.set(xOffsets[ci], 1.3, -1.2);
      this.add(group);

      // Track background
      const trackGeo = new THREE.BoxGeometry(BAR_WIDTH, BAR_HEIGHT, 0.01);
      const trackMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 1 });
      const track = new THREE.Mesh(trackGeo, trackMat);
      group.add(track);
      this.onDispose(() => { trackGeo.dispose(); trackMat.dispose(); });

      // Fill bar (pivot from bottom)
      const fillGeo = new THREE.BoxGeometry(BAR_WIDTH - 0.01, BAR_HEIGHT - 0.01, 0.015);
      fillGeo.translate(0, (BAR_HEIGHT - 0.01) / 2, 0);
      const fillMat = new THREE.MeshStandardMaterial({
        color: colors[ci],
        emissive: colors[ci],
        emissiveIntensity: 0.4,
        roughness: 0.4,
      });
      const fill = new THREE.Mesh(fillGeo, fillMat);
      fill.position.y = -(BAR_HEIGHT - 0.01) / 2;
      fill.scale.y = 0.0;
      group.add(fill);
      this.onDispose(() => { fillGeo.dispose(); fillMat.dispose(); });

      // Value label (canvas texture)
      const textMesh = this._makeValueMesh(colors[ci]);
      textMesh.position.set(0, BAR_HEIGHT / 2 + 0.07, 0);
      group.add(textMesh);

      const titleMesh = this._makeLabel(labels[ci]);
      titleMesh.position.set(0, -(BAR_HEIGHT / 2) - 0.07, 0);
      group.add(titleMesh);

      this._bars.push({ fill, fillMat, textMesh, textCanvas: textMesh.userData.canvas, textCtx: textMesh.userData.ctx, textTex: textMesh.userData.tex });
    }

    this._t = 0;
  }

  _makeValueMesh(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.12, 0.06);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { canvas, ctx, tex };
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  _makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#cccccc';
    ctx.font = '22px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 24);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.24, 0.045);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  _updateValueText(entry, value) {
    const { canvas, ctx, tex } = entry;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText((value * 100).toFixed(0) + '%', 64, 32);
    tex.needsUpdate = true;
  }

  update(dt) {
    this._t += dt;

    for (let ci = 0; ci < 2; ci++) {
      const ctrl = this.app.controllers.controllers[ci];
      let val = getTrigger(ctrl);

      // Auto-animate on desktop when no real input
      if (val === 0) {
        val = (Math.sin(this._t * 1.5 + ci * Math.PI) + 1) / 2;
      }

      const entry = this._bars[ci];
      entry.fill.scale.y = Math.max(0.001, val);
      entry.fillMat.emissiveIntensity = 0.2 + val * 0.6;
      this._updateValueText(entry, val);
    }
  }
}

register({
  id: 'trigger-pressure',
  title: 'Trigger Pressure',
  category: 'Input',
  tags: ['controller', 'trigger', 'analog', 'input'],
  description: 'A bar that fills proportionally to the analog trigger value for each controller.',
  xr: 'vr',
  factory: (app) => new TriggerPressureScene(app),
});
