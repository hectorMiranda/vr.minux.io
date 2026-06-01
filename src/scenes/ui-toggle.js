// ui-toggle.js — a Toggle3D that turns a point light on/off.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Toggle3D } from '../ui/toggle3d.js';
import { makeLabel, setText } from '../ui/canvas-label.js';

class UIToggleScene extends Scene {
  async init() {
    // A sphere lit by the toggleable light
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffcc66, roughness: 0.5, metalness: 0.2,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 24), sphereMat);
    sphere.position.set(0, 1.55, -1.2);
    sphere.castShadow = true;
    this.add(sphere);

    // Toggleable point light
    this._light = new THREE.PointLight(0xffeedd, 2, 3);
    this._light.position.set(0.3, 2.0, -0.8);
    this.add(this._light);

    // Toggle widget
    this._toggle = new Toggle3D({
      state: true,
      onChange: (on) => {
        this._light.intensity = on ? 2 : 0;
        setText(this._statusLabel, on ? 'Light: ON' : 'Light: OFF');
      },
    });
    this._toggle.group.position.set(0, 1.2, -1.2);
    this.add(this._toggle.group);
    this.onDispose(() => this._toggle.dispose());

    // Status label
    this._statusLabel = makeLabel('Light: ON', {
      width: 192, height: 40, fontSize: 20,
      color: '#aaffcc', background: 'rgba(0,0,0,0.5)',
      scale: 0.001,
    });
    this._statusLabel.position.set(0, 1.12, -1.2);
    this.add(this._statusLabel);

    // Auto-cycle
    this._cycleT = 0;
  }

  update(dt) {
    this._cycleT += dt;
    if (this._cycleT > 2.0) {
      this._cycleT = 0;
      this._toggle.toggle();
    }
  }
}

register({
  id: 'ui-toggle',
  title: 'UI Toggle',
  category: 'UI',
  tags: ['ui', 'toggle', 'light'],
  description: 'A Toggle3D switch that turns a point light on and off; auto-cycles on desktop.',
  xr: 'vr',
  factory: (app) => new UIToggleScene(app),
});
