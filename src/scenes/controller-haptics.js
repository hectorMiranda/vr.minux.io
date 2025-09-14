// Controller Haptics — buttons that fire haptic pulses of varying strength.
// Visual feedback flashes when a pulse fires.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { pulse } from '../xr/haptics.js';

const PRESETS = [
  { label: 'Light', intensity: 0.2, ms: 60, color: 0x88ddff },
  { label: 'Medium', intensity: 0.5, ms: 120, color: 0xffdd44 },
  { label: 'Strong', intensity: 1.0, ms: 200, color: 0xff4422 },
  { label: 'Buzz', intensity: 0.8, ms: 400, color: 0xaa44ff },
];

class ControllerHapticsScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 1.0, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    // Build haptic buttons in a row
    this._buttons = [];
    const startX = -((PRESETS.length - 1) / 2) * 0.22;

    for (let i = 0; i < PRESETS.length; i++) {
      const preset = PRESETS[i];
      const group = new THREE.Group();
      group.position.set(startX + i * 0.22, 1.5, -1.2);
      this.add(group);

      const btnGeo = new THREE.BoxGeometry(0.16, 0.08, 0.04);
      const btnMat = new THREE.MeshStandardMaterial({
        color: preset.color,
        roughness: 0.5,
        metalness: 0.3,
        emissive: preset.color,
        emissiveIntensity: 0.1,
      });
      const btn = new THREE.Mesh(btnGeo, btnMat);
      group.add(btn);
      this.onDispose(() => { btnGeo.dispose(); btnMat.dispose(); });

      const labelMesh = this._makeLabel(preset.label);
      labelMesh.position.set(0, -0.08, 0.025);
      group.add(labelMesh);

      this._buttons.push({ btn, btnMat, preset, flashTimer: 0, group });
    }

    // Instructions label
    const instr = this._makeLabel('Select a button → controller pulses');
    instr.position.set(0, 1.85, -1.2);
    instr.scale.set(2.5, 2.5, 2.5);
    this.add(instr);

    // Hook into controller select events
    for (let ci = 0; ci < 2; ci++) {
      this.onDispose(
        this.app.controllers.events.on('selectstart', ({ index }) => {
          // Fire all haptic presets in sequence to demo; in real XR use raycasting
          const preset = PRESETS[index % PRESETS.length];
          pulse(this.app.controllers.controllers[index], preset.intensity, preset.ms);
          this._flashButton(index % PRESETS.length);
        }),
      );
    }

    this._t = 0;
    this._autoPulseTimer = 0;
    this._autoPulseIndex = 0;
  }

  _flashButton(i) {
    if (this._buttons[i]) {
      this._buttons[i].flashTimer = 0.4;
    }
  }

  _makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 24);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.18, 0.034);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  update(dt) {
    this._t += dt;

    // Auto-demo: cycle through presets every 1.5 s on desktop
    this._autoPulseTimer += dt;
    if (this._autoPulseTimer > 1.5) {
      this._autoPulseTimer = 0;
      this._flashButton(this._autoPulseIndex);
      this._autoPulseIndex = (this._autoPulseIndex + 1) % PRESETS.length;
    }

    for (const entry of this._buttons) {
      if (entry.flashTimer > 0) {
        entry.flashTimer -= dt;
        const t = Math.max(0, entry.flashTimer / 0.4);
        entry.btnMat.emissiveIntensity = 0.1 + t * 0.9;
        entry.btn.scale.set(1, 1, 1 + t * 0.4);
      } else {
        entry.btnMat.emissiveIntensity = 0.1 + Math.sin(this._t * 1.5) * 0.05;
        entry.btn.scale.set(1, 1, 1);
      }
    }
  }
}

register({
  id: 'controller-haptics',
  title: 'Controller Haptics',
  category: 'Input',
  tags: ['controller', 'haptics', 'rumble', 'input'],
  description: 'Buttons that fire haptic pulses of varying intensity and duration; visual flash confirms each pulse.',
  xr: 'vr',
  factory: (app) => new ControllerHapticsScene(app),
});
