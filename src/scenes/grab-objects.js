// grab-objects — squeeze the grip to grab and release small cubes.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { GrabSystem } from '../interaction/grab.js';

const COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6];

class GrabObjectsScene extends Scene {
  async init() {
    // Table platform
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.05, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 }),
    );
    table.position.set(0, 1.0, -1.2);
    table.receiveShadow = true;
    this.add(table);

    // Small grabbable cubes on top of the table
    this._cubes = [];
    for (let i = 0; i < 5; i++) {
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: COLORS[i], roughness: 0.4, metalness: 0.2 }),
      );
      cube.position.set((i - 2) * 0.22, 1.08, -1.2);
      cube.castShadow = true;
      this.add(cube);
      this._cubes.push(cube);
    }

    // Label
    const label = _makeLabel('Squeeze grip to grab');
    label.position.set(0, 1.55, -1.2);
    this.add(label);

    // GrabSystem — only works in XR; guard gracefully
    this._grab = null;
    if (this.app.controllers) {
      this._grab = new GrabSystem({ controllers: this.app.controllers, reach: 0.3 });
      this._cubes.forEach((c) => this._grab.add(c));
      this.onDispose(() => this._grab.dispose());
    }

    this._t = 0;
  }

  update(dt) {
    this._t += dt;
    // Gentle auto-bob so the scene looks alive on desktop.
    this._cubes.forEach((cube, i) => {
      const grabbed =
        this._grab?.getGrabbed(0) === cube || this._grab?.getGrabbed(1) === cube;
      if (!grabbed) {
        cube.rotation.y += dt * 0.6;
        cube.position.y = 1.08 + Math.sin(this._t * 1.2 + i) * 0.015;
      }
    });
  }
}

function _makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.roundRect(0, 0, 512, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  return mesh;
}

register({
  id: 'grab-objects',
  title: 'Grab Objects',
  category: 'Interaction',
  tags: ['grab', 'squeeze', 'controller'],
  description: 'Grab and release small cubes with the grip button.',
  xr: 'vr',
  factory: (app) => new GrabObjectsScene(app),
});
