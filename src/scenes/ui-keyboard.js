// ui-keyboard.js — a 3D QWERTY-ish key grid that appends characters to a label.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { makeLabel, setText } from '../ui/canvas-label.js';

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M','⌫'],
  ['SPACE'],
];

const KEY_W = 0.048;
const KEY_H = 0.048;
const KEY_D = 0.016;
const GAP = 0.006;
const KEY_COLOR = 0x2a3050;
const KEY_HOVER = 0x4460aa;
const KEY_PRESS = 0x1a2030;

class Key3D {
  constructor(char, w = KEY_W) {
    this.char = char;
    this.group = new THREE.Group();

    this._mat = new THREE.MeshStandardMaterial({
      color: KEY_COLOR, roughness: 0.5, metalness: 0.2,
    });
    const geo = new THREE.BoxGeometry(w, KEY_H, KEY_D);
    this.body = new THREE.Mesh(geo, this._mat);
    this.group.add(this.body);

    const lblText = char === 'SPACE' ? '________' : char;
    const lbl = makeLabel(lblText, {
      width: 48, height: 36, fontSize: char === 'SPACE' ? 12 : 18,
      color: '#ffffff', background: 'rgba(0,0,0,0)',
      scale: w / 48,
    });
    lbl.position.z = KEY_D / 2 + 0.001;
    this.group.add(lbl);

    this.body.userData.key = this;
  }

  flash() {
    this._mat.color.setHex(KEY_PRESS);
    setTimeout(() => this._mat.color.setHex(KEY_COLOR), 120);
  }

  dispose() {
    this.body.geometry.dispose();
    this._mat.dispose();
  }
}

class UIKeyboardScene extends Scene {
  async init() {
    this._buffer = '';
    this._keys = [];

    const kbGroup = new THREE.Group();
    kbGroup.position.set(0, 1.15, -1.18);

    // Build rows
    const totalH = ROWS.length * (KEY_H + GAP);
    for (let r = 0; r < ROWS.length; r++) {
      const row = ROWS[r];
      const rowW = row.reduce((s, k) => {
        const kw = k === 'SPACE' ? KEY_W * 5 : KEY_W;
        return s + kw + GAP;
      }, -GAP);

      let x = -rowW / 2;
      const y = totalH / 2 - r * (KEY_H + GAP);
      for (const char of row) {
        const kw = char === 'SPACE' ? KEY_W * 5 : KEY_W;
        const key = new Key3D(char, kw);
        key.group.position.set(x + kw / 2, y, 0);
        kbGroup.add(key.group);
        this._keys.push(key);
        this.onDispose(() => key.dispose());
        x += kw + GAP;
      }
    }

    this.add(kbGroup);

    // Text display
    this._displayLabel = makeLabel('Hello VR!', {
      width: 320, height: 52, fontSize: 24,
      color: '#ffffff', background: 'rgba(10,10,30,0.85)',
      scale: 0.001,
    });
    this._displayLabel.position.set(0, 1.58, -1.2);
    this.add(this._displayLabel);
    this._buffer = 'Hello VR!';

    // Auto-type on desktop
    this._autoT = 0;
    this._phrase = 'HELLO WORLD';
    this._phraseIdx = 0;
  }

  _typeChar(char) {
    if (char === '⌫') {
      this._buffer = this._buffer.slice(0, -1);
    } else if (char === 'SPACE') {
      this._buffer += ' ';
    } else {
      this._buffer += char;
    }
    if (this._buffer.length > 20) this._buffer = this._buffer.slice(-20);
    setText(this._displayLabel, this._buffer);
  }

  update(dt) {
    this._autoT += dt;
    if (this._autoT > 0.35) {
      this._autoT = 0;
      const ch = this._phrase[this._phraseIdx % this._phrase.length];
      // find the key and flash it
      const key = this._keys.find(k =>
        k.char === ch || (ch === ' ' && k.char === 'SPACE')
      );
      if (key) { key.flash(); this._typeChar(key.char); }
      this._phraseIdx++;
      if (this._phraseIdx > this._phrase.length + 4) {
        this._phraseIdx = 0;
        this._buffer = '';
        // add a backspace phase
      }
    }
  }
}

register({
  id: 'ui-keyboard',
  title: 'UI Keyboard',
  category: 'UI',
  tags: ['ui', 'keyboard', 'input', 'text'],
  description: 'A 3D QWERTY key grid that appends characters to a canvas-label display.',
  xr: 'vr',
  factory: (app) => new UIKeyboardScene(app),
});
