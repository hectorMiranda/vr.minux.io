// toggle3d.js — an on/off switch mesh, onChange(bool) callback.
import * as THREE from 'three';

const OFF_COLOR = 0x555566;
const ON_COLOR = 0x44cc77;
const KNOB_OFF_X = -0.028;
const KNOB_ON_X = 0.028;

export class Toggle3D {
  constructor(opts = {}) {
    const {
      state = false,
      onChange = null,
    } = opts;

    this.onChange = onChange;
    this._state = state;

    this.group = new THREE.Group();

    // Track (pill shape approximated with a box + rounded ends via capsule)
    this._trackMat = new THREE.MeshStandardMaterial({
      color: state ? ON_COLOR : OFF_COLOR,
      roughness: 0.6,
      metalness: 0.1,
    });
    const trackGeo = new THREE.CapsuleGeometry(0.022, 0.056, 6, 8);
    trackGeo.rotateZ(Math.PI / 2);
    this.track = new THREE.Mesh(trackGeo, this._trackMat);
    this.group.add(this.track);

    // Knob
    const knobGeo = new THREE.SphereGeometry(0.018, 16, 12);
    this._knobMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.3,
    });
    this.knob = new THREE.Mesh(knobGeo, this._knobMat);
    this.knob.position.x = state ? KNOB_ON_X : KNOB_OFF_X;
    this.knob.position.z = 0.016;
    this.group.add(this.knob);

    this.track.userData.toggle = this;
    this.knob.userData.toggle = this;
  }

  get state() { return this._state; }

  toggle(silent = false) {
    this._state = !this._state;
    this._updateVisuals();
    if (!silent && this.onChange) this.onChange(this._state);
  }

  setState(v, silent = false) {
    this._state = !!v;
    this._updateVisuals();
    if (!silent && this.onChange) this.onChange(this._state);
  }

  _updateVisuals() {
    this._trackMat.color.setHex(this._state ? ON_COLOR : OFF_COLOR);
    this.knob.position.x = this._state ? KNOB_ON_X : KNOB_OFF_X;
  }

  get hitTargets() { return [this.track, this.knob]; }

  dispose() {
    this.track.geometry.dispose();
    this._trackMat.dispose();
    this.knob.geometry.dispose();
    this._knobMat.dispose();
  }
}
