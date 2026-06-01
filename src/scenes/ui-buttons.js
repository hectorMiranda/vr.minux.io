// ui-buttons.js — three Button3D widgets that change a cube's color when clicked.
// Auto-cycles on desktop so it's visibly alive without XR.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Button3D } from '../ui/button3d.js';

const COLORS = [0xff4444, 0x44cc88, 0x4488ff];
const LABELS = ['Red', 'Green', 'Blue'];

class UIButtonsScene extends Scene {
  async init() {
    // Cube that the buttons tint
    this._cubeMat = new THREE.MeshStandardMaterial({
      color: COLORS[0], roughness: 0.4, metalness: 0.1,
    });
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      this._cubeMat,
    );
    cube.position.set(0, 1.5, -1.2);
    cube.castShadow = true;
    this.add(cube);
    this._cube = cube;

    // Three buttons
    this._buttons = [];
    const btnY = 1.2;
    const spacing = 0.22;
    for (let i = 0; i < 3; i++) {
      const idx = i;
      const btn = new Button3D({
        label: LABELS[i],
        color: COLORS[i],
        hoverColor: new THREE.Color(COLORS[i]).lerp(new THREE.Color(0xffffff), 0.2).getHex(),
        pressColor: new THREE.Color(COLORS[i]).lerp(new THREE.Color(0x000000), 0.3).getHex(),
        onClick: () => this._cubeMat.color.setHex(COLORS[idx]),
      });
      btn.group.position.set((i - 1) * spacing, btnY, -1.2);
      this.add(btn.group);
      this._buttons.push(btn);
      this.onDispose(() => btn.dispose());
    }

    // Auto-cycle on desktop
    this._cycleT = 0;
    this._cycleIdx = 0;
  }

  update(dt) {
    this._cube.rotation.y += dt * 0.5;
    this._cycleT += dt;
    if (this._cycleT > 1.5) {
      this._cycleT = 0;
      // Flash the button
      const btn = this._buttons[this._cycleIdx];
      btn.setPressed(true);
      // un-press next frame via timeout simulation: use a flag
      this._pendingRelease = btn;
      this._releaseTimer = 0.12;
      this._cycleIdx = (this._cycleIdx + 1) % 3;
    }
    if (this._pendingRelease && this._releaseTimer > 0) {
      this._releaseTimer -= dt;
      if (this._releaseTimer <= 0) {
        this._pendingRelease.setPressed(false);
        this._pendingRelease = null;
      }
    }
  }
}

register({
  id: 'ui-buttons',
  title: 'UI Buttons',
  category: 'UI',
  tags: ['ui', 'button', 'interaction'],
  description: 'Three Button3D widgets that change a cube\'s color; auto-cycles on desktop.',
  xr: 'vr',
  factory: (app) => new UIButtonsScene(app),
});
