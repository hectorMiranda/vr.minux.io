// menu.js — a vertical list of selectable items with a highlight cursor.
// Menu({ items, onSelect })
// menu.moveCursor(delta)   -> move cursor by ±1
// menu.select()            -> confirm current item
import * as THREE from 'three';
import { makeLabel, setText } from './canvas-label.js';

const ITEM_H = 0.065;
const ITEM_W = 0.28;
const HIGHLIGHT_COLOR = 0x3366cc;
const BG_COLOR = 0x1a1a2e;

export class Menu {
  constructor(opts = {}) {
    const {
      items = [],
      onSelect = null,
    } = opts;

    this.items = items.slice();
    this.onSelect = onSelect;
    this._cursor = 0;

    this.group = new THREE.Group();

    // backing panel
    const panelH = items.length * ITEM_H + 0.02;
    const panelGeo = new THREE.PlaneGeometry(ITEM_W + 0.02, panelH);
    const panelMat = new THREE.MeshStandardMaterial({
      color: BG_COLOR,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.z = -0.002;
    this.group.add(panel);

    // highlight quad
    const hlGeo = new THREE.PlaneGeometry(ITEM_W, ITEM_H - 0.004);
    const hlMat = new THREE.MeshStandardMaterial({
      color: HIGHLIGHT_COLOR,
      roughness: 0.5,
      metalness: 0.2,
    });
    this._highlight = new THREE.Mesh(hlGeo, hlMat);
    this._highlight.position.z = -0.001;
    this.group.add(this._highlight);

    // item labels
    this._labels = [];
    for (let i = 0; i < this.items.length; i++) {
      const lbl = makeLabel(this.items[i], {
        width: 256,
        height: 48,
        fontSize: 20,
        color: '#eeeeee',
        scale: ITEM_W / 256,
      });
      lbl.position.y = this._itemY(i);
      lbl.position.z = 0.001;
      this.group.add(lbl);
      this._labels.push(lbl);
    }

    this._refreshCursor();
  }

  _itemY(i) {
    const totalH = this.items.length * ITEM_H;
    return totalH / 2 - ITEM_H / 2 - i * ITEM_H;
  }

  _refreshCursor() {
    this._highlight.position.y = this._itemY(this._cursor);
  }

  moveCursor(delta) {
    this._cursor = (this._cursor + delta + this.items.length) % this.items.length;
    this._refreshCursor();
  }

  select() {
    if (this.onSelect) this.onSelect(this.items[this._cursor], this._cursor);
  }

  setCursor(i) {
    this._cursor = Math.max(0, Math.min(this.items.length - 1, i));
    this._refreshCursor();
  }

  dispose() {
    for (const lbl of this._labels) {
      lbl.geometry.dispose();
      lbl.material.map.dispose();
      lbl.material.dispose();
    }
    this._highlight.geometry.dispose();
    this._highlight.material.dispose();
  }
}
