// Button Presses — visualize each gamepad button as a bar that lights when pressed.
// Auto-demo animates bars on desktop (no XR session).
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { getAllButtons } from '../xr/input-sources.js';

const BUTTON_COUNT = 7; // Standard XR gamepad has up to 7 buttons
const BAR_W = 0.06;
const BAR_MAX_H = 0.2;
const BAR_GAP = 0.09;
const COLORS_IDLE = [0x334466, 0x334466, 0x334466, 0x334466, 0x334466, 0x334466, 0x334466];
const COLORS_PRESSED = [0xff4444, 0xffaa00, 0x44ff88, 0x44aaff, 0xaa44ff, 0xff44aa, 0xffff44];

class ButtonPressesScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 0.9, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    // Build bar arrays for two controllers
    this._controllerBars = [];
    const xOffsets = [-0.5, 0.5];
    for (let ci = 0; ci < 2; ci++) {
      const bars = [];
      const labelText = ci === 0 ? 'Left' : 'Right';
      const ctrlLabel = this._makeLabel(labelText);
      ctrlLabel.position.set(xOffsets[ci], 1.75, -1.2);
      this.add(ctrlLabel);

      for (let bi = 0; bi < BUTTON_COUNT; bi++) {
        const x = xOffsets[ci] + (bi - (BUTTON_COUNT - 1) / 2) * BAR_GAP;
        const bar = this._makeBar(bi);
        bar.position.set(x, 1.4, -1.2);
        this.add(bar);
        bars.push(bar);

        // Button index label
        const idxLabel = this._makeSmallLabel(String(bi));
        idxLabel.position.set(x, 1.2, -1.2);
        this.add(idxLabel);
      }
      this._controllerBars.push(bars);
    }

    this._t = 0;
  }

  _makeBar(index) {
    const geo = new THREE.BoxGeometry(BAR_W, BAR_MAX_H, BAR_W);
    // Pivot at bottom: offset geometry up by half height
    geo.translate(0, BAR_MAX_H / 2, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS_IDLE[index % COLORS_IDLE.length],
      roughness: 0.5,
      metalness: 0.3,
      emissive: 0x000000,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.y = 0.05; // starts very flat
    this.onDispose(() => { geo.dispose(); mat.dispose(); });
    mesh.userData.idlColor = COLORS_IDLE[index % COLORS_IDLE.length];
    mesh.userData.activeColor = COLORS_PRESSED[index % COLORS_PRESSED.length];
    return mesh;
  }

  _makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 24);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.35, 0.06);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  _makeSmallLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 48);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '22px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 32, 24);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.05, 0.04);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  _setBar(bar, value, pressed) {
    bar.scale.y = 0.05 + value * 0.95;
    const color = pressed
      ? bar.userData.activeColor
      : bar.userData.idlColor;
    bar.material.color.setHex(color);
    bar.material.emissive.setHex(pressed ? color : 0x000000);
    bar.material.emissiveIntensity = pressed ? 0.4 : 0;
  }

  update(dt) {
    this._t += dt;

    for (let ci = 0; ci < 2; ci++) {
      const ctrl = this.app.controllers.controllers[ci];
      const liveButtons = getAllButtons(ctrl);
      const bars = this._controllerBars[ci];

      for (let bi = 0; bi < BUTTON_COUNT; bi++) {
        const bar = bars[bi];
        if (liveButtons.length > bi) {
          this._setBar(bar, liveButtons[bi].value, liveButtons[bi].pressed);
        } else {
          // Desktop auto-demo: stagger a wave across bars
          const wave = (Math.sin(this._t * 2 + bi * 0.8 + ci * Math.PI) + 1) / 2;
          const pressed = wave > 0.75;
          this._setBar(bar, wave, pressed);
        }
      }
    }
  }
}

register({
  id: 'button-presses',
  title: 'Button Presses',
  category: 'Input',
  tags: ['controller', 'button', 'gamepad', 'input'],
  description: 'Visualizes each gamepad button as a bar that fills and lights when pressed; auto-animates on desktop.',
  xr: 'vr',
  factory: (app) => new ButtonPressesScene(app),
});
