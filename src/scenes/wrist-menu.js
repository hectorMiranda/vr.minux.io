// wrist-menu.js — a Menu attached to controller grip, summoned by squeeze.
// On desktop (no XR) the menu floats in world space and auto-cycles items.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Menu } from '../ui/menu.js';
import { makeLabel, setText } from '../ui/canvas-label.js';

const MENU_ITEMS = ['Teleport', 'Settings', 'Help', 'Exit'];

class WristMenuScene extends Scene {
  async init() {
    this._menuVisible = true;

    // Reference sphere
    this._sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 32, 24),
      new THREE.MeshStandardMaterial({ color: 0xffaa33, roughness: 0.4, metalness: 0.1 }),
    );
    this._sphere.position.set(0, 1.5, -1.5);
    this.add(this._sphere);

    // Menu
    this._menu = new Menu({
      items: MENU_ITEMS,
      onSelect: (item) => {
        setText(this._infoLabel, `Selected: ${item}`);
      },
    });
    this._menu.group.position.set(0, 1.5, -1.2);
    this.add(this._menu.group);
    this.onDispose(() => this._menu.dispose());

    // Info label
    this._infoLabel = makeLabel('Wrist Menu', {
      width: 240, height: 40, fontSize: 20,
      color: '#eeeeff', background: 'rgba(0,0,0,0.6)',
      scale: 0.001,
    });
    this._infoLabel.position.set(0, 1.78, -1.2);
    this.add(this._infoLabel);

    // Controller squeeze to toggle menu
    this.onDispose(this.app.controllers.events.on('squeezestart', ({ index }) => {
      if (index === 0) {
        this._menuVisible = !this._menuVisible;
        this._menu.group.visible = this._menuVisible;
      }
    }));

    // Controller selectstart to move cursor
    this.onDispose(this.app.controllers.events.on('selectstart', ({ index }) => {
      if (index === 0 && this._menuVisible) {
        this._menu.moveCursor(1);
        this._menu.select();
      }
    }));

    // Attach menu to controller grip when in XR
    this._grip = null;

    // Auto-cycle for desktop
    this._cycleT = 0;
  }

  onSessionStart() {
    const grip = this.app.controllers.grips?.[0];
    if (grip) {
      this._grip = grip;
      grip.add(this._menu.group);
      this._menu.group.position.set(0.05, 0.05, -0.05);
      this._menu.group.rotation.x = -Math.PI / 4;
    }
  }

  onSessionEnd() {
    if (this._grip) {
      this._grip.remove(this._menu.group);
      this._menu.group.position.set(0, 1.5, -1.2);
      this._menu.group.rotation.x = 0;
      this._grip = null;
      this.group.add(this._menu.group);
    }
  }

  update(dt) {
    this._sphere.rotation.y += dt * 0.5;
    this._cycleT += dt;
    if (this._cycleT > 1.2) {
      this._cycleT = 0;
      this._menu.moveCursor(1);
    }
  }
}

register({
  id: 'wrist-menu',
  title: 'Wrist Menu',
  category: 'UI',
  tags: ['ui', 'menu', 'controller', 'xr'],
  description: 'A Menu widget attached to the left controller grip, summoned by squeeze.',
  xr: 'vr',
  factory: (app) => new WristMenuScene(app),
});
