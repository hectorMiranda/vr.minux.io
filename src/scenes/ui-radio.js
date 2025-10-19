// ui-radio.js — a small group of mutually-exclusive option buttons.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { makeLabel, setText } from '../ui/canvas-label.js';

const OPTIONS = ['Option A', 'Option B', 'Option C'];
const SEL_COLOR = 0x3388ff;
const UNSEL_COLOR = 0x334455;
const INDICATOR_ON = 0x55ddff;
const INDICATOR_OFF = 0x223344;

class RadioOption {
  constructor(label, selected) {
    this.group = new THREE.Group();

    // background pill
    this._bgMat = new THREE.MeshStandardMaterial({
      color: selected ? SEL_COLOR : UNSEL_COLOR,
      roughness: 0.6, metalness: 0.1,
    });
    const bg = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.055, 0.014),
      this._bgMat,
    );
    this.group.add(bg);

    // radio dot
    this._dotMat = new THREE.MeshStandardMaterial({
      color: selected ? INDICATOR_ON : INDICATOR_OFF,
      roughness: 0.3, metalness: 0.5,
      emissive: selected ? 0x1144aa : 0x000000,
    });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), this._dotMat);
    dot.position.set(-0.10, 0, 0.01);
    this.group.add(dot);

    // text label
    this._lbl = makeLabel(label, {
      width: 160, height: 36, fontSize: 18,
      color: '#ffffff', background: 'rgba(0,0,0,0)',
      scale: 0.18 / 160,
    });
    this._lbl.position.set(0.03, 0, 0.012);
    this.group.add(this._lbl);

    this.bg = bg;
  }

  setSelected(v) {
    this._bgMat.color.setHex(v ? SEL_COLOR : UNSEL_COLOR);
    this._dotMat.color.setHex(v ? INDICATOR_ON : INDICATOR_OFF);
    this._dotMat.emissive.setHex(v ? 0x1144aa : 0x000000);
  }

  dispose() {
    this.bg.geometry.dispose();
    this._bgMat.dispose();
    this._dotMat.dispose();
    this._lbl.geometry.dispose();
    this._lbl.material.map.dispose();
    this._lbl.material.dispose();
  }
}

class UIRadioScene extends Scene {
  async init() {
    this._selected = 0;
    this._options = [];

    // Status label
    this._statusLabel = makeLabel(`Selected: ${OPTIONS[0]}`, {
      width: 280, height: 44, fontSize: 22,
      color: '#eeeeff', background: 'rgba(0,0,0,0.5)',
      scale: 0.001,
    });
    this._statusLabel.position.set(0, 1.72, -1.2);
    this.add(this._statusLabel);

    const spacing = 0.072;
    for (let i = 0; i < OPTIONS.length; i++) {
      const opt = new RadioOption(OPTIONS[i], i === 0);
      opt.group.position.set(0, 1.55 - i * spacing, -1.2);
      this.add(opt.group);
      this._options.push(opt);
      this.onDispose(() => opt.dispose());
    }

    // Auto-cycle
    this._cycleT = 0;
  }

  _setSelected(idx) {
    this._selected = idx;
    for (let i = 0; i < this._options.length; i++) {
      this._options[i].setSelected(i === idx);
    }
    setText(this._statusLabel, `Selected: ${OPTIONS[idx]}`);
  }

  update(dt) {
    this._cycleT += dt;
    if (this._cycleT > 1.4) {
      this._cycleT = 0;
      this._setSelected((this._selected + 1) % OPTIONS.length);
    }
  }
}

register({
  id: 'ui-radio',
  title: 'UI Radio',
  category: 'UI',
  tags: ['ui', 'radio', 'interaction'],
  description: 'Mutually-exclusive radio button options with a highlighted active state.',
  xr: 'vr',
  factory: (app) => new UIRadioScene(app),
});
