// Effects: a moving emitter leaving a ribbon trail (BufferGeometry strip updated
// each frame).
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const TRAIL_LENGTH = 120;  // number of segments
const RIBBON_WIDTH = 0.06;

class TrailRibbonScene extends Scene {
  async init() {
    this._time = 0;

    // Ring of previous positions (circular buffer).
    this._history = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this._history.push(new THREE.Vector3(0, 1.5, -2));
    }
    this._head = 0;

    // Build ribbon geometry: 2 verts per segment = triangle strip.
    const vertCount = TRAIL_LENGTH * 2;
    const positions = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const indices = [];
    for (let i = 0; i < TRAIL_LENGTH - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    const ribbon = new THREE.Mesh(geo, mat);
    this.add(ribbon);
    this._geo = geo;
    this._positions = positions;
    this._colors = colors;

    // Emitter sphere.
    const emitter = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 0.8 }),
    );
    this.add(emitter);
    this._emitter = emitter;

    // Camera-up helper for ribbon orientation.
    this._up = new THREE.Vector3(0, 1, 0);
    this._prevPos = new THREE.Vector3(0, 1.5, -2);
  }

  _emitterPosition(t) {
    // Figure-eight Lissajous path.
    return new THREE.Vector3(
      Math.sin(t * 0.7) * 1.4,
      1.5 + Math.sin(t * 1.1) * 0.7,
      Math.sin(t * 0.5) * 1.2 - 2,
    );
  }

  update(dt) {
    this._time += dt;
    const t = this._time;

    const pos = this._emitterPosition(t);
    this._emitter.position.copy(pos);

    // Store in circular buffer.
    this._history[this._head] = pos.clone();
    this._head = (this._head + 1) % TRAIL_LENGTH;

    // Build ribbon verts from history, oldest to newest.
    const cam = this.app.camera;
    const camWorldPos = new THREE.Vector3();
    cam.getWorldPosition(camWorldPos);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const idx = (this._head + i) % TRAIL_LENGTH;
      const center = this._history[idx];

      // Tangent: direction toward next sample.
      const nextIdx = (this._head + i + 1) % TRAIL_LENGTH;
      const next = this._history[nextIdx];
      const tangent = new THREE.Vector3().subVectors(next, center);
      if (tangent.lengthSq() < 0.00001) tangent.set(1, 0, 0);
      tangent.normalize();

      // Binormal: tangent x (center -> camera).
      const toCamera = new THREE.Vector3().subVectors(camWorldPos, center).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, toCamera).normalize();
      if (binormal.lengthSq() < 0.0001) binormal.set(0, 1, 0);

      const t_norm = i / (TRAIL_LENGTH - 1);
      const halfW = RIBBON_WIDTH * 0.5 * (0.2 + t_norm * 0.8);

      const v0 = center.clone().addScaledVector(binormal, halfW);
      const v1 = center.clone().addScaledVector(binormal, -halfW);

      const base = i * 2;
      this._positions[(base) * 3] = v0.x;
      this._positions[(base) * 3 + 1] = v0.y;
      this._positions[(base) * 3 + 2] = v0.z;
      this._positions[(base + 1) * 3] = v1.x;
      this._positions[(base + 1) * 3 + 1] = v1.y;
      this._positions[(base + 1) * 3 + 2] = v1.z;

      // Color: gradient from tail (dim blue) to head (bright yellow-white).
      const r = t_norm;
      const g = t_norm * 0.8;
      const b = 1 - t_norm;
      this._colors[(base) * 3] = r;
      this._colors[(base) * 3 + 1] = g;
      this._colors[(base) * 3 + 2] = b;
      this._colors[(base + 1) * 3] = r;
      this._colors[(base + 1) * 3 + 1] = g;
      this._colors[(base + 1) * 3 + 2] = b;
    }

    this._geo.attributes.position.needsUpdate = true;
    this._geo.attributes.color.needsUpdate = true;
    this._geo.computeBoundingSphere();
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'trail-ribbon',
  title: 'Trail Ribbon',
  category: 'Effects',
  tags: ['trail', 'ribbon', 'geometry', 'particles'],
  description: 'A moving emitter traces a Lissajous path and leaves a dynamic ribbon trail with color gradient from tail to head.',
  xr: 'vr',
  factory: (app) => new TrailRibbonScene(app),
});
