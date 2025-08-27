// A working 3-D analog clock with hour, minute, and second hands.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const TAU = Math.PI * 2;

function makeHand(length, width, height, color) {
  const geo = new THREE.BoxGeometry(width, length, height);
  // Pivot is at the base: shift geometry up so the box extends from 0 to length.
  geo.translate(0, length / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
  return new THREE.Mesh(geo, mat);
}

class Clock3dScene extends Scene {
  async init() {
    const root = new THREE.Group();
    root.position.set(0, 1.5, -1.8);
    this.add(root);

    // Clock face — dark disc.
    const faceGeo = new THREE.CircleGeometry(0.38, 64);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.7 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    root.add(face);

    // Rim.
    const rimGeo = new THREE.TorusGeometry(0.38, 0.025, 8, 64);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    root.add(rim);

    // Hour tick marks.
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * TAU;
      const isQuarter = i % 3 === 0;
      const w = isQuarter ? 0.025 : 0.012;
      const l = isQuarter ? 0.06 : 0.04;
      const tickGeo = new THREE.BoxGeometry(w, l, 0.01);
      const tick = new THREE.Mesh(tickGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
      tick.position.set(Math.sin(ang) * 0.32, Math.cos(ang) * 0.32, 0.005);
      root.add(tick);
    }

    // Hands (pivot at origin, extend upward before rotation).
    this._hourHand   = makeHand(0.18, 0.022, 0.015, 0xffffff);
    this._minuteHand = makeHand(0.26, 0.014, 0.012, 0xdddddd);
    this._secondHand = makeHand(0.30, 0.007, 0.010, 0xff3333);

    // Slight z-offset so hands don't z-fight.
    this._hourHand.position.z   = 0.012;
    this._minuteHand.position.z = 0.018;
    this._secondHand.position.z = 0.024;

    root.add(this._hourHand, this._minuteHand, this._secondHand);

    // Centre cap.
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0xff3333, metalness: 0.5 }),
    );
    cap.rotation.x = Math.PI / 2;
    cap.position.z = 0.03;
    root.add(cap);
  }

  update() {
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;

    // Three.js rotates around local Y; clock "12" is up (+Y).
    // We want clockwise rotation, so negate.
    this._secondHand.rotation.z = -(s / 60) * TAU;
    this._minuteHand.rotation.z = -(m / 60) * TAU;
    this._hourHand.rotation.z   = -(h / 12) * TAU;
  }
}

register({
  id: 'clock-3d',
  title: '3D Analog Clock',
  category: 'Basics',
  tags: ['clock', 'time', 'analog'],
  description: 'A working 3-D analog clock whose hands track the real wall-clock time.',
  xr: 'vr',
  factory: (app) => new Clock3dScene(app),
});
