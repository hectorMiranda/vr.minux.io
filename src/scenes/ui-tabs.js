// ui-tabs.js — a panel with 2–3 tabs switching visible content areas.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { makeLabel, setText } from '../ui/canvas-label.js';

const TAB_LABELS = ['Info', 'Stats', 'Help'];
const TAB_CONTENT = [
  'This is the Info tab.\nDisplay metadata here.',
  'FPS: 90\nDraw calls: 12\nPoly count: 4.2k',
  'Press trigger to select.\nPoint at UI to interact.',
];
const TAB_W = 0.16;
const TAB_H = 0.048;
const ACTIVE_COLOR = 0x3355cc;
const INACTIVE_COLOR = 0x223344;
const PANEL_COLOR = 0x1a2035;

class UITabsScene extends Scene {
  async init() {
    this._activeTab = 0;
    const panelW = 0.55;
    const panelH = 0.36;
    const origin = new THREE.Vector3(0, 1.45, -1.2);

    // Backing panel
    const panelGeo = new THREE.PlaneGeometry(panelW, panelH);
    const panelMat = new THREE.MeshStandardMaterial({
      color: PANEL_COLOR, roughness: 0.8, metalness: 0.1,
      transparent: true, opacity: 0.93,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.copy(origin);
    panel.position.y -= 0.01;
    panel.position.z -= 0.002;
    this.add(panel);

    // Tab buttons
    this._tabMeshes = [];
    this._tabMats = [];
    const tabsY = origin.y + panelH / 2;
    const tabsStartX = origin.x - (TAB_LABELS.length * (TAB_W + 0.006)) / 2 + TAB_W / 2;

    for (let i = 0; i < TAB_LABELS.length; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: i === 0 ? ACTIVE_COLOR : INACTIVE_COLOR,
        roughness: 0.5, metalness: 0.15,
      });
      const geo = new THREE.BoxGeometry(TAB_W, TAB_H, 0.016);
      const tab = new THREE.Mesh(geo, mat);
      tab.position.set(tabsStartX + i * (TAB_W + 0.006), tabsY + TAB_H / 2, origin.z);
      this.add(tab);
      this._tabMeshes.push(tab);
      this._tabMats.push(mat);
      tab.userData.tabIndex = i;

      const lbl = makeLabel(TAB_LABELS[i], {
        width: 96, height: 36, fontSize: 18,
        color: '#ffffff', background: 'rgba(0,0,0,0)',
        scale: TAB_W / 96,
      });
      lbl.position.copy(tab.position);
      lbl.position.z += 0.01;
      this.add(lbl);
    }

    // Content label
    this._contentLabel = makeLabel(TAB_CONTENT[0], {
      width: 320, height: 160, fontSize: 18,
      color: '#cce0ff', background: 'rgba(0,0,0,0)',
      scale: panelW / 320,
    });
    this._contentLabel.position.copy(origin);
    this.add(this._contentLabel);

    // Auto-cycle tabs
    this._cycleT = 0;
  }

  _setTab(i) {
    this._activeTab = i;
    for (let t = 0; t < this._tabMats.length; t++) {
      this._tabMats[t].color.setHex(t === i ? ACTIVE_COLOR : INACTIVE_COLOR);
    }
    setText(this._contentLabel, TAB_CONTENT[i]);
  }

  update(dt) {
    this._cycleT += dt;
    if (this._cycleT > 2.2) {
      this._cycleT = 0;
      this._setTab((this._activeTab + 1) % TAB_LABELS.length);
    }
  }

  dispose() {
    super.dispose();
    for (const m of this._tabMats) m.dispose();
  }
}

register({
  id: 'ui-tabs',
  title: 'UI Tabs',
  category: 'UI',
  tags: ['ui', 'tabs', 'panel'],
  description: 'A tabbed panel with three tabs that cycle through different content views.',
  xr: 'vr',
  factory: (app) => new UITabsScene(app),
});
