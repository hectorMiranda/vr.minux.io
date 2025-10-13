// context-menu.js — click an object to open a small list menu near it.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { makeLabel, setText } from '../ui/canvas-label.js';

const MENU_ITEMS = ['Inspect', 'Move', 'Delete', 'Close'];
const ITEM_H = 0.06;
const ITEM_W = 0.2;
const ITEM_BG = 0x1e2840;
const ITEM_HL = 0x2a4a9a;

class ContextMenu {
  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;

    // Backdrop
    const backdropH = MENU_ITEMS.length * ITEM_H + 0.01;
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(ITEM_W + 0.01, backdropH),
      new THREE.MeshStandardMaterial({
        color: 0x111827, roughness: 0.8, metalness: 0.1,
        transparent: true, opacity: 0.93,
      }),
    );
    backdrop.position.z = -0.002;
    this.group.add(backdrop);

    this._items = [];
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: ITEM_BG, roughness: 0.5, metalness: 0.1,
      });
      const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(ITEM_W, ITEM_H - 0.005),
        mat,
      );
      const y = (MENU_ITEMS.length / 2 - 0.5 - i) * ITEM_H;
      bg.position.set(0, y, -0.001);
      this.group.add(bg);

      const lbl = makeLabel(MENU_ITEMS[i], {
        width: 160, height: 40, fontSize: 18,
        color: '#ddddff', background: 'rgba(0,0,0,0)',
        scale: ITEM_W / 160,
      });
      lbl.position.set(0, y, 0.001);
      this.group.add(lbl);

      this._items.push({ mat, lbl, bg });
    }
    this._highlighted = -1;
  }

  show(worldPos) {
    this.group.position.copy(worldPos);
    this.group.visible = true;
    this._highlighted = -1;
    this._refreshHighlight();
  }

  hide() {
    this.group.visible = false;
  }

  highlightItem(i) {
    this._highlighted = i;
    this._refreshHighlight();
  }

  _refreshHighlight() {
    for (let i = 0; i < this._items.length; i++) {
      this._items[i].mat.color.setHex(
        i === this._highlighted ? ITEM_HL : ITEM_BG,
      );
    }
  }

  dispose() {
    for (const item of this._items) {
      item.bg.geometry.dispose();
      item.mat.dispose();
      item.lbl.geometry.dispose();
      item.lbl.material.map.dispose();
      item.lbl.material.dispose();
    }
  }
}

class ContextMenuScene extends Scene {
  async init() {
    // Clickable objects
    this._objects = [];
    const colors = [0xff5533, 0x33aaff, 0x44dd77];
    const geos = [
      new THREE.SphereGeometry(0.09, 32, 24),
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.ConeGeometry(0.09, 0.2, 16),
    ];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i], roughness: 0.4, metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geos[i], mat);
      mesh.position.set((i - 1) * 0.28, 1.5, -1.2);
      mesh.castShadow = true;
      this.add(mesh);
      this._objects.push(mesh);
    }

    // Context menu
    this._ctxMenu = new ContextMenu();
    this.add(this._ctxMenu.group);
    this.onDispose(() => this._ctxMenu.dispose());

    // Status label
    this._statusLabel = makeLabel('Click an object', {
      width: 240, height: 40, fontSize: 20,
      color: '#eeeeff', background: 'rgba(0,0,0,0.5)',
      scale: 0.001,
    });
    this._statusLabel.position.set(0, 1.78, -1.2);
    this.add(this._statusLabel);

    // Auto-demo: cycle open/close + highlight items
    this._demoT = 0;
    this._demoPhase = 0;
    this._demoItem = 0;
    this._targetObj = 0;
  }

  update(dt) {
    // Gently rotate objects
    for (const o of this._objects) o.rotation.y += dt * 0.4;

    this._demoT += dt;
    switch (this._demoPhase) {
      case 0: // open menu
        if (this._demoT > 1.5) {
          const obj = this._objects[this._targetObj];
          const wp = new THREE.Vector3();
          obj.getWorldPosition(wp);
          wp.x += 0.14;
          wp.y += 0.1;
          wp.z += 0.01;
          this._ctxMenu.show(wp);
          setText(this._statusLabel, `Menu on object ${this._targetObj + 1}`);
          this._demoItem = 0;
          this._demoT = 0;
          this._demoPhase = 1;
        }
        break;
      case 1: // cycle highlight
        if (this._demoT > 0.4) {
          this._demoT = 0;
          this._ctxMenu.highlightItem(this._demoItem);
          this._demoItem++;
          if (this._demoItem >= MENU_ITEMS.length) {
            this._demoPhase = 2;
          }
        }
        break;
      case 2: // close
        if (this._demoT > 0.6) {
          this._demoT = 0;
          this._ctxMenu.hide();
          this._targetObj = (this._targetObj + 1) % this._objects.length;
          setText(this._statusLabel, 'Click an object');
          this._demoPhase = 0;
        }
        break;
    }
  }
}

register({
  id: 'context-menu',
  title: 'Context Menu',
  category: 'UI',
  tags: ['ui', 'menu', 'context', 'radial'],
  description: 'A context menu that opens near a clicked object, cycling through actions.',
  xr: 'vr',
  factory: (app) => new ContextMenuScene(app),
});
