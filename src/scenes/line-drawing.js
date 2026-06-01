// Animated polylines: a static frame + a live Lissajous curve drawn with THREE.Line.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const SEGMENTS = 512;
const A = 3, B = 2; // Lissajous frequency ratio

class LineDrawingScene extends Scene {
  async init() {
    // Lissajous curve -- positions updated every frame.
    this._positions = new Float32Array((SEGMENTS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));

    const mat = new THREE.LineBasicMaterial({ color: 0x44ffcc, linewidth: 2 });
    this._line = new THREE.Line(geo, mat);
    this._line.position.set(0, 1.5, -2.0);
    this.add(this._line);
    this._geo = geo;

    // Static decorative frame.
    const frame = this._buildFrame();
    frame.position.set(0, 1.5, -2.0);
    this.add(frame);

    this._t = 0;
  }

  _buildFrame() {
    const pts = [];
    const w = 0.7, h = 0.5;
    pts.push(new THREE.Vector3(-w, -h, 0));
    pts.push(new THREE.Vector3( w, -h, 0));
    pts.push(new THREE.Vector3( w,  h, 0));
    pts.push(new THREE.Vector3(-w,  h, 0));
    pts.push(new THREE.Vector3(-w, -h, 0));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x335555 }));
  }

  update(dt) {
    this._t += dt * 0.7;
    const delta = (Math.PI * 2) / SEGMENTS;
    const scaleX = 0.65, scaleY = 0.45;
    const pos = this._positions;
    for (let i = 0; i <= SEGMENTS; i++) {
      const u = i * delta;
      const x = scaleX * Math.sin(A * u + this._t);
      const y = scaleY * Math.sin(B * u);
      pos[i * 3]     = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = 0;
    }
    this._geo.attributes.position.needsUpdate = true;
  }
}

register({
  id: 'line-drawing',
  title: 'Line Drawing',
  category: 'Basics',
  tags: ['line', 'lissajous', 'procedural'],
  description: 'An animated Lissajous figure drawn with THREE.Line updating its buffer each frame.',
  xr: 'vr',
  factory: (app) => new LineDrawingScene(app),
});
