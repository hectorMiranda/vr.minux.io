// hud.js — text panel anchored to the camera (billboarded, fixed offset).
// HUD({ lines, offset, width, height })
// hud.setLines([...])  -> update displayed text lines
import * as THREE from 'three';
import { makeLabel, setText } from './canvas-label.js';

export class HUD {
  constructor(opts = {}) {
    const {
      lines = [],
      offset = new THREE.Vector3(0, -0.25, -0.6),
      width = 320,
      height = 96,
      fontSize = 18,
      background = 'rgba(0,0,0,0.6)',
      color = '#e0e0e0',
    } = opts;

    this._offset = offset.clone();
    this._lines = lines.slice();

    // The HUD group is meant to be added to the camera directly
    this.group = new THREE.Group();

    this._label = makeLabel(this._lines.join('\n'), {
      width,
      height,
      fontSize,
      background,
      color,
      scale: 0.001,
    });
    this._label.renderOrder = 999;
    this._label.material.depthTest = false;
    this.group.add(this._label);
    this._label.position.copy(this._offset);
  }

  setLines(lines) {
    this._lines = lines.slice();
    setText(this._label, this._lines.join('\n'));
  }

  dispose() {
    this._label.geometry.dispose();
    this._label.material.map.dispose();
    this._label.material.dispose();
  }
}
