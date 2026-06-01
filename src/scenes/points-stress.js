// Performance test: 100k+ THREE.Points animating in a vortex; FPS label.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { fps } from '../util/format.js';

const POINT_COUNT = 120000;

function makeLabel(canvas, ctx, fpsValue) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0ff';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`Points: ${POINT_COUNT.toLocaleString()}`, 16, 44);
  ctx.fillText(`FPS: ${fps(fpsValue)}`, 16, 84);
}

class PointsStressScene extends Scene {
  async init() {
    const positions = new Float32Array(POINT_COUNT * 3);
    const colors = new Float32Array(POINT_COUNT * 3);
    const radii = new Float32Array(POINT_COUNT);
    const anglesBase = new Float32Array(POINT_COUNT);
    const heights = new Float32Array(POINT_COUNT);
    const speeds = new Float32Array(POINT_COUNT);

    for (let i = 0; i < POINT_COUNT; i++) {
      const r = 0.2 + Math.random() * 3.5;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 4;
      radii[i] = r;
      anglesBase[i] = a;
      heights[i] = y;
      speeds[i] = 0.3 + Math.random() * 1.2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = y + 1.5;
      positions[i * 3 + 2] = Math.sin(a) * r - 2;
      const hue = (r / 3.7);
      colors[i * 3] = hue;
      colors[i * 3 + 1] = 0.3 + (1 - hue) * 0.7;
      colors[i * 3 + 2] = 1 - hue;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.add(points);

    this._geo = geo;
    this._positions = positions;
    this._radii = radii;
    this._anglesBase = anglesBase;
    this._heights = heights;
    this._speeds = speeds;
    this._time = 0;
    this._fpsAcc = 0;
    this._fpsCount = 0;
    this._displayFps = 0;

    // Canvas label.
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    this._labelCanvas = canvas;
    this._labelCtx = ctx;
    const tex = new THREE.CanvasTexture(canvas);
    this._labelTex = tex;
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.19),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    labelMesh.position.set(0, 3.2, -2);
    this.add(labelMesh);

    makeLabel(canvas, ctx, 0);
    tex.needsUpdate = true;
  }

  update(dt) {
    this._time += dt;
    this._fpsAcc += (dt > 0 ? 1 / dt : 0);
    this._fpsCount += 1;
    if (this._fpsCount >= 20) {
      this._displayFps = this._fpsAcc / this._fpsCount;
      this._fpsAcc = 0;
      this._fpsCount = 0;
      makeLabel(this._labelCanvas, this._labelCtx, this._displayFps);
      this._labelTex.needsUpdate = true;
    }

    const t = this._time;
    const pos = this._positions;
    for (let i = 0; i < POINT_COUNT; i++) {
      const angle = this._anglesBase[i] + t * this._speeds[i];
      const r = this._radii[i];
      // Vortex: radius shrinks toward center then expands
      const rMod = r * (0.7 + 0.3 * Math.sin(t * 0.5 + this._anglesBase[i]));
      pos[i * 3] = Math.cos(angle) * rMod;
      pos[i * 3 + 1] = this._heights[i] + 1.5 + Math.sin(t * 0.3 + r) * 0.4;
      pos[i * 3 + 2] = Math.sin(angle) * rMod - 2;
    }
    this._geo.attributes.position.needsUpdate = true;
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'points-stress',
  title: 'Points Stress',
  category: 'Performance',
  tags: ['points', 'performance', 'fps', 'vortex'],
  description: `Animates ${POINT_COUNT.toLocaleString()} THREE.Points in a vortex formation; displays live FPS.`,
  xr: 'vr',
  factory: (app) => new PointsStressScene(app),
});
