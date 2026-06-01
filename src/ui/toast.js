// toast.js — a short-lived label that fades out.
// toast.show(text, duration?)  -> display for `duration` seconds (default 2.5)
// toast.update(dt)             -> call every frame to animate
import * as THREE from 'three';
import { makeLabel, setText } from './canvas-label.js';

export class Toast {
  constructor(opts = {}) {
    const {
      width = 256,
      height = 56,
      fontSize = 22,
      color = '#ffffff',
      background = 'rgba(20,20,40,0.85)',
    } = opts;

    this.group = new THREE.Group();
    this.group.visible = false;

    this._label = makeLabel('', {
      width,
      height,
      fontSize,
      color,
      background,
      scale: 0.001,
    });
    this._label.material.transparent = true;
    this.group.add(this._label);

    this._timer = 0;
    this._duration = 2.5;
    this._fadeDur = 0.4;
  }

  show(text, duration = 2.5) {
    setText(this._label, text);
    this._timer = duration + this._fadeDur;
    this._duration = duration;
    this._label.material.opacity = 1;
    this.group.visible = true;
  }

  /** Call once per frame with dt in seconds. */
  update(dt) {
    if (!this.group.visible) return;
    this._timer -= dt;
    if (this._timer <= 0) {
      this.group.visible = false;
      return;
    }
    if (this._timer < this._fadeDur) {
      this._label.material.opacity = Math.max(0, this._timer / this._fadeDur);
    }
  }

  dispose() {
    this._label.geometry.dispose();
    this._label.material.map.dispose();
    this._label.material.dispose();
  }
}
