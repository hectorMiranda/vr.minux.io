// button3d.js — a labeled box that visually depresses and calls onClick.
// Supports hover state via pointer / raycaster proximity.
import * as THREE from 'three';
import { makeLabel } from './canvas-label.js';

const BASE_Z = 0;
const PRESS_Z = -0.015; // depressed offset
const HOVER_SCALE = 1.05;

export class Button3D {
  constructor(opts = {}) {
    const {
      label = 'OK',
      width = 0.18,
      height = 0.07,
      depth = 0.03,
      color = 0x3355aa,
      hoverColor = 0x4477dd,
      pressColor = 0x224499,
      onClick = null,
    } = opts;

    this.onClick = onClick;
    this._color = color;
    this._hoverColor = hoverColor;
    this._pressColor = pressColor;
    this._isHovered = false;
    this._isPressed = false;

    this.group = new THREE.Group();

    this._mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.15,
    });

    const geo = new THREE.BoxGeometry(width, height, depth);
    this.body = new THREE.Mesh(geo, this._mat);
    this.body.castShadow = true;
    this.group.add(this.body);

    this._labelMesh = makeLabel(label, {
      width: 128,
      height: 48,
      fontSize: 22,
      color: '#ffffff',
      scale: width / 128,
    });
    this._labelMesh.position.set(0, 0, depth / 2 + 0.001);
    this.group.add(this._labelMesh);

    // expose for raycasting
    this.body.userData.button = this;
  }

  setHovered(v) {
    this._isHovered = v;
    this._refresh();
  }

  setPressed(v) {
    this._isPressed = v;
    this._refresh();
    if (!v && this.onClick) this.onClick();
  }

  _refresh() {
    if (this._isPressed) {
      this._mat.color.setHex(this._pressColor);
      this.body.position.z = PRESS_Z;
    } else if (this._isHovered) {
      this._mat.color.setHex(this._hoverColor);
      this.body.scale.setScalar(HOVER_SCALE);
      this.body.position.z = BASE_Z;
    } else {
      this._mat.color.setHex(this._color);
      this.body.scale.setScalar(1);
      this.body.position.z = BASE_Z;
    }
  }

  /** Returns meshes that should participate in raycasting. */
  get hitTargets() { return [this.body]; }

  dispose() {
    this.body.geometry.dispose();
    this._mat.dispose();
    this._labelMesh.geometry.dispose();
    this._labelMesh.material.map.dispose();
    this._labelMesh.material.dispose();
  }
}
