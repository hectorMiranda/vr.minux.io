// ui-color-picker.js — hue/saturation sliders that tint a sphere.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Slider3D } from '../ui/slider3d.js';
import { makeLabel, setText } from '../ui/canvas-label.js';

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c);
  };
  const r = f(0), g = f(8), b = f(4);
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

class UIColorPickerScene extends Scene {
  async init() {
    this._hue = 0.6;
    this._sat = 0.8;

    // Sphere
    this._mat = new THREE.MeshStandardMaterial({
      color: hslToHex(this._hue, this._sat, 0.5),
      roughness: 0.35, metalness: 0.15,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 24), this._mat);
    sphere.position.set(0, 1.58, -1.2);
    sphere.castShadow = true;
    this.add(sphere);

    // Hue slider
    this._hueSlider = new Slider3D({
      length: 0.35, value: this._hue, trackColor: 0x332222, knobColor: 0xff6655,
      onChange: (v) => { this._hue = v; this._updateColor(); },
    });
    this._hueSlider.group.position.set(0, 1.25, -1.2);
    this.add(this._hueSlider.group);
    this.onDispose(() => this._hueSlider.dispose());

    // Saturation slider
    this._satSlider = new Slider3D({
      length: 0.35, value: this._sat, trackColor: 0x222233, knobColor: 0x6699ff,
      onChange: (v) => { this._sat = v; this._updateColor(); },
    });
    this._satSlider.group.position.set(0, 1.15, -1.2);
    this.add(this._satSlider.group);
    this.onDispose(() => this._satSlider.dispose());

    // Labels
    const hueLabel = makeLabel('Hue', {
      width: 96, height: 32, fontSize: 16,
      color: '#ffccaa', background: 'rgba(0,0,0,0)',
      scale: 0.001,
    });
    hueLabel.position.set(-0.22, 1.25, -1.2);
    this.add(hueLabel);

    const satLabel = makeLabel('Sat', {
      width: 96, height: 32, fontSize: 16,
      color: '#aaccff', background: 'rgba(0,0,0,0)',
      scale: 0.001,
    });
    satLabel.position.set(-0.22, 1.15, -1.2);
    this.add(satLabel);

    this._infoLabel = makeLabel('H:0.60  S:0.80', {
      width: 200, height: 36, fontSize: 18,
      color: '#ddddff', background: 'rgba(0,0,0,0.5)',
      scale: 0.001,
    });
    this._infoLabel.position.set(0, 1.05, -1.2);
    this.add(this._infoLabel);

    // Auto-animate
    this._t = 0;
    this._hDir = 1;
    this._sDir = 1;
  }

  _updateColor() {
    this._mat.color.setHex(hslToHex(this._hue, this._sat, 0.5));
    setText(this._infoLabel,
      `H:${this._hue.toFixed(2)}  S:${this._sat.toFixed(2)}`);
  }

  update(dt) {
    this._t += dt * 0.18;
    this._hue = (this._t % 1);
    this._hueSlider.setValue(this._hue, true);
    this._satSlider.setValue(0.5 + 0.45 * Math.sin(this._t * 1.3), true);
    this._sat = this._satSlider.value;
    this._updateColor();
  }
}

register({
  id: 'ui-color-picker',
  title: 'UI Color Picker',
  category: 'UI',
  tags: ['ui', 'slider', 'color', 'hsl'],
  description: 'Hue and saturation sliders that tint a sphere in real time.',
  xr: 'vr',
  factory: (app) => new UIColorPickerScene(app),
});
