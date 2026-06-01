// Thumbstick Readout — a 2D crosshair plane showing thumbstick x/y.
// Auto-circles the crosshair on desktop when no XR session is active.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { getThumbstick } from '../xr/input-sources.js';

const PANEL_SIZE = 0.5;

class ThumbstickReadoutScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 0.9, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    // One readout panel per controller
    this._panels = [];
    const xOffsets = [-0.35, 0.35];
    const labels = ['Left', 'Right'];

    for (let ci = 0; ci < 2; ci++) {
      const group = new THREE.Group();
      group.position.set(xOffsets[ci], 1.5, -1.2);
      this.add(group);

      // Background square
      const bgGeo = new THREE.PlaneGeometry(PANEL_SIZE, PANEL_SIZE);
      const bgMat = new THREE.MeshStandardMaterial({
        color: 0x111122,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });
      const bg = new THREE.Mesh(bgGeo, bgMat);
      group.add(bg);
      this.onDispose(() => { bgGeo.dispose(); bgMat.dispose(); });

      // Crosshair lines
      const hGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-PANEL_SIZE / 2.1, 0, 0.001),
        new THREE.Vector3(PANEL_SIZE / 2.1, 0, 0.001),
      ]);
      const vGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -PANEL_SIZE / 2.1, 0.001),
        new THREE.Vector3(0, PANEL_SIZE / 2.1, 0.001),
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x334466 });
      group.add(new THREE.Line(hGeo, lineMat));
      group.add(new THREE.Line(vGeo, lineMat));
      this.onDispose(() => {
        hGeo.dispose(); vGeo.dispose(); lineMat.dispose();
      });

      // Dot indicator
      const dotGeo = new THREE.CircleGeometry(0.025, 16);
      const dotMat = new THREE.MeshStandardMaterial({
        color: ci === 0 ? 0x44aaff : 0xff6644,
        emissive: ci === 0 ? 0x44aaff : 0xff6644,
        emissiveIntensity: 0.6,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.z = 0.003;
      group.add(dot);
      this.onDispose(() => { dotGeo.dispose(); dotMat.dispose(); });

      // Label
      const labelMesh = this._makeLabel(labels[ci]);
      labelMesh.position.set(0, PANEL_SIZE / 2 + 0.07, 0);
      group.add(labelMesh);

      this._panels.push({ dot, group });
    }

    this._t = 0;
    this._autoCircle = true;
  }

  _makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 48);
    ctx.fillStyle = '#aaddff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 24);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.3, 0.055);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  update(dt) {
    this._t += dt;
    const half = PANEL_SIZE / 2 - 0.04;

    for (let ci = 0; ci < 2; ci++) {
      const ctrl = this.app.controllers.controllers[ci];
      const { x, y } = getThumbstick(ctrl);

      let dx = x, dy = y;
      // If no live input (both zero), use auto-circle
      if (dx === 0 && dy === 0) {
        const angle = this._t * 1.2 + ci * Math.PI;
        dx = Math.cos(angle) * 0.6;
        dy = Math.sin(angle) * 0.6;
      }

      const dot = this._panels[ci].dot;
      dot.position.x = dx * half;
      dot.position.y = dy * half;
    }
  }
}

register({
  id: 'thumbstick-readout',
  title: 'Thumbstick Readout',
  category: 'Input',
  tags: ['controller', 'thumbstick', 'axes', 'input'],
  description: 'Shows a 2D crosshair panel tracking thumbstick x/y for each controller; auto-circles on desktop.',
  xr: 'vr',
  factory: (app) => new ThumbstickReadoutScene(app),
});
