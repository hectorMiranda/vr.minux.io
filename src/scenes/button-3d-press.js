// button-3d-press — physical 3D buttons that depress when poked and emit click.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Emitter } from '../util/events.js';

const BUTTON_COUNT = 4;
const PRESS_DEPTH = 0.04;
const PRESS_FORCE_DIST = 0.06; // controller tip must be within this distance to "poke"
const COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f];
const LABELS = ['A', 'B', 'C', 'D'];

class Button3DPressScene extends Scene {
  async init() {
    // Shared event bus for button clicks.
    this.buttonEvents = new Emitter();

    // Panel background.
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.28, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }),
    );
    panel.position.set(0, 1.4, -1.4);
    panel.receiveShadow = true;
    this.add(panel);

    // Buttons.
    this._buttons = [];
    for (let i = 0; i < BUTTON_COUNT; i++) {
      const x = (i - 1.5) * 0.24;

      // Housing (socket).
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.06, 24),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 }),
      );
      housing.rotation.x = Math.PI / 2;
      housing.position.set(x, 1.4, -1.375);
      this.add(housing);

      // Cap (the pressable part).
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.03, 24),
        new THREE.MeshStandardMaterial({ color: COLORS[i], roughness: 0.3, metalness: 0.5 }),
      );
      cap.rotation.x = Math.PI / 2;
      // Rest position: cap face flush with front of housing.
      const restZ = -1.375 + 0.045;
      cap.position.set(x, 1.4, restZ);
      cap.castShadow = true;
      this.add(cap);

      // Canvas label above button.
      const labelMesh = _makeLabel(LABELS[i], COLORS[i]);
      labelMesh.position.set(x, 1.56, -1.39);
      this.add(labelMesh);

      this._buttons.push({
        cap,
        housing,
        restZ,
        pressedZ: restZ - PRESS_DEPTH,
        pressed: false,
        travel: 0,      // 0 = rest, 1 = fully pressed
        clickFired: false,
        label: labelMesh,
        flashTimer: 0,
        index: i,
      });
    }

    this._t = 0;
    this._autoIdx = 0;
    this._autoTimer = 0;
  }

  /** Check if a world-space point is poking a button cap. */
  _checkPoke(worldPoint) {
    for (const btn of this._buttons) {
      const dx = worldPoint.x - btn.cap.position.x;
      const dy = worldPoint.y - btn.cap.position.y;
      const dz = worldPoint.z - btn.cap.position.z;
      const radialDist = Math.sqrt(dx * dx + dy * dy);
      // Must be within the cap radius and pressing from the front.
      if (radialDist < 0.055 && dz < PRESS_FORCE_DIST && dz > -0.04) {
        btn.pressed = true;
      }
    }
  }

  update(dt) {
    this._t += dt;

    // Check controller tip proximity.
    const controllers = this.app.controllers?.controllers;
    if (controllers) {
      // Clear pressed flags each frame.
      for (const btn of this._buttons) btn.pressed = false;

      for (const ctrl of controllers) {
        if (!ctrl.visible) continue;
        // Tip = controller world position (approximately).
        const tip = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
        this._checkPoke(tip);
      }
    }

    // Desktop auto-press demo.
    this._autoTimer -= dt;
    if (!controllers || controllers.every((c) => !c.visible)) {
      if (this._autoTimer <= 0) {
        this._autoTimer = 1.2;
        this._buttons[this._autoIdx % BUTTON_COUNT].pressed = true;
        this._autoIdx++;
      }
    }

    // Animate buttons.
    for (const btn of this._buttons) {
      const targetTravel = btn.pressed ? 1 : 0;
      btn.travel += (targetTravel - btn.travel) * Math.min(1, dt * 20);

      // Z position.
      btn.cap.position.z = btn.restZ + (btn.pressedZ - btn.restZ) * btn.travel;

      // Fire click at full press.
      if (btn.travel > 0.95 && !btn.clickFired) {
        btn.clickFired = true;
        btn.flashTimer = 0.25;
        this.buttonEvents.emit('click', { index: btn.index, label: LABELS[btn.index] });
      }
      if (btn.travel < 0.5) btn.clickFired = false;

      // Flash.
      if (btn.flashTimer > 0) {
        btn.flashTimer -= dt;
        btn.cap.material.emissive.setScalar(btn.flashTimer * 3);
      } else {
        btn.cap.material.emissive.setScalar(0);
      }
    }
  }
}

function _makeLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  const c = new THREE.Color(color);
  ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
}

register({
  id: 'button-3d-press',
  title: '3D Button Press',
  category: 'Interaction',
  tags: ['button', 'press', 'poke', 'controller'],
  description: 'Physical 3D buttons that depress when poked and emit a click event.',
  xr: 'vr',
  factory: (app) => new Button3DPressScene(app),
});
