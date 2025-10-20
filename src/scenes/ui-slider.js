// ui-slider.js — a Slider3D that scales a cube live.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Slider3D } from '../ui/slider3d.js';
import { makeLabel, setText } from '../ui/canvas-label.js';

class UISliderScene extends Scene {
  async init() {
    // Cube being scaled
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x88aaff, roughness: 0.4, metalness: 0.1 }),
    );
    cube.position.set(0, 1.55, -1.2);
    cube.castShadow = true;
    this.add(cube);
    this._cube = cube;

    // Slider
    this._slider = new Slider3D({
      length: 0.35,
      value: 0.5,
      onChange: (v) => {
        const s = 0.3 + v * 1.4;
        this._cube.scale.setScalar(s);
        setText(this._valLabel, `Scale: ${s.toFixed(2)}`);
      },
    });
    this._slider.group.position.set(0, 1.15, -1.2);
    this.add(this._slider.group);
    this.onDispose(() => this._slider.dispose());

    // Value label
    this._valLabel = makeLabel('Scale: 0.95', {
      width: 192, height: 40, fontSize: 20,
      color: '#ddffdd', background: 'rgba(0,0,0,0.5)',
      scale: 0.001,
    });
    this._valLabel.position.set(0, 1.08, -1.2);
    this.add(this._valLabel);

    // Auto-animate slider on desktop
    this._dir = 1;
    this._autoT = 0;
  }

  update(dt) {
    this._cube.rotation.y += dt * 0.4;
    this._autoT += dt * 0.3 * this._dir;
    if (this._autoT > 1) { this._autoT = 1; this._dir = -1; }
    if (this._autoT < 0) { this._autoT = 0; this._dir = 1; }
    this._slider.setValue(this._autoT);
  }
}

register({
  id: 'ui-slider',
  title: 'UI Slider',
  category: 'UI',
  tags: ['ui', 'slider', 'interaction'],
  description: 'A Slider3D widget that continuously scales a cube from small to large.',
  xr: 'vr',
  factory: (app) => new UISliderScene(app),
});
