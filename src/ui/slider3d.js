// slider3d.js — a track + draggable knob, value 0..1, onChange callback.
import * as THREE from 'three';
import { clamp } from '../util/math.js';

export class Slider3D {
  constructor(opts = {}) {
    const {
      length = 0.3,
      trackColor = 0x334455,
      knobColor = 0x66aaff,
      value = 0.5,
      onChange = null,
    } = opts;

    this.length = length;
    this.onChange = onChange;
    this._value = clamp(value, 0, 1);

    this.group = new THREE.Group();

    // Track
    const trackGeo = new THREE.BoxGeometry(length, 0.012, 0.012);
    const trackMat = new THREE.MeshStandardMaterial({
      color: trackColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.track = new THREE.Mesh(trackGeo, trackMat);
    this.group.add(this.track);

    // Fill bar
    this._fillMat = new THREE.MeshStandardMaterial({
      color: 0x4488cc,
      roughness: 0.5,
      metalness: 0.2,
    });
    this._fillGeo = new THREE.BoxGeometry(1, 0.014, 0.014);
    this.fill = new THREE.Mesh(this._fillGeo, this._fillMat);
    this.group.add(this.fill);

    // Knob
    const knobGeo = new THREE.SphereGeometry(0.022, 16, 12);
    const knobMat = new THREE.MeshStandardMaterial({
      color: knobColor,
      roughness: 0.3,
      metalness: 0.4,
    });
    this.knob = new THREE.Mesh(knobGeo, knobMat);
    this.group.add(this.knob);

    // expose for raycasting
    this.knob.userData.slider = this;
    this.track.userData.slider = this;

    this._updateVisuals();
  }

  get value() { return this._value; }

  setValue(v, silent = false) {
    this._value = clamp(v, 0, 1);
    this._updateVisuals();
    if (!silent && this.onChange) this.onChange(this._value);
  }

  _updateVisuals() {
    const halfL = this.length / 2;
    const x = -halfL + this._value * this.length;
    this.knob.position.x = x;

    const fillW = this._value * this.length;
    this.fill.scale.x = Math.max(fillW, 0.001);
    this.fill.position.x = -halfL + fillW / 2;
  }

  /** Returns meshes that should participate in raycasting. */
  get hitTargets() { return [this.knob, this.track]; }

  dispose() {
    this.track.geometry.dispose();
    this.track.material.dispose();
    this._fillGeo.dispose();
    this._fillMat.dispose();
    this.knob.geometry.dispose();
    this.knob.material.dispose();
  }
}
