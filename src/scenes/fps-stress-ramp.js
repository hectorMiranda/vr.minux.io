// Performance test: progressively adds objects over time until FPS drops,
// then reports the count where it crossed a threshold; resets and repeats.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { fps } from '../util/format.js';

const ADD_RATE = 20;          // objects added per second
const FPS_THRESHOLD = 30;     // FPS below which we flag the drop
const RESET_HOLD = 4.0;       // seconds to show result before resetting
const MAX_OBJECTS = 8000;

function makeLabel(canvas, ctx, count, fpsValue, phase, dropCount) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = phase === 'hold'
    ? 'rgba(80,0,0,0.85)'
    : 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`Objects: ${count}`, 16, 36);
  ctx.fillText(`FPS: ${fps(fpsValue)}`, 16, 70);
  if (phase === 'hold' && dropCount > 0) {
    ctx.fillStyle = '#ff8888';
    ctx.fillText(`Drop at: ${dropCount} objs`, 16, 106);
  } else if (phase === 'ramp') {
    ctx.fillStyle = '#88ff88';
    ctx.fillText('Ramping up...', 16, 106);
  } else {
    ctx.fillStyle = '#8888ff';
    ctx.fillText('Resetting...', 16, 106);
  }
}

class FpsStressRampScene extends Scene {
  async init() {
    this._time = 0;
    this._phase = 'ramp'; // 'ramp' | 'hold' | 'reset'
    this._holdTimer = 0;
    this._dropCount = 0;
    this._fpsAcc = 0;
    this._fpsCount = 0;
    this._displayFps = 60;
    this._addAccum = 0;
    this._objects = [];
    this._objectGroup = new THREE.Group();
    this.group.add(this._objectGroup);

    this._geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    this._mat = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.5 });

    // Canvas label.
    const canvas = document.createElement('canvas');
    canvas.width = 340;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    this._labelCanvas = canvas;
    this._labelCtx = ctx;
    const tex = new THREE.CanvasTexture(canvas);
    this._labelTex = tex;
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.27),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    labelMesh.position.set(0, 2.8, -2);
    this.add(labelMesh);

    makeLabel(canvas, ctx, 0, 60, 'ramp', 0);
    tex.needsUpdate = true;
  }

  _addObject() {
    const mesh = new THREE.Mesh(this._geo, this._mat);
    const angle = Math.random() * Math.PI * 2;
    const r = 0.5 + Math.random() * 3;
    mesh.position.set(
      Math.cos(angle) * r,
      1.5 + (Math.random() - 0.5) * 2.5,
      Math.sin(angle) * r - 3,
    );
    this._objectGroup.add(mesh);
    this._objects.push(mesh);
  }

  _resetObjects() {
    for (const obj of this._objects) {
      this._objectGroup.remove(obj);
      // geometry/material shared, don't dispose them here
    }
    this._objects.length = 0;
  }

  update(dt) {
    this._time += dt;

    // FPS tracking.
    this._fpsAcc += dt > 0 ? 1 / dt : 0;
    this._fpsCount += 1;
    let updatedFps = false;
    if (this._fpsCount >= 10) {
      this._displayFps = this._fpsAcc / this._fpsCount;
      this._fpsAcc = 0;
      this._fpsCount = 0;
      updatedFps = true;
    }

    if (this._phase === 'ramp') {
      this._addAccum += ADD_RATE * dt;
      while (this._addAccum >= 1 && this._objects.length < MAX_OBJECTS) {
        this._addObject();
        this._addAccum -= 1;
      }
      // Rotate objects.
      this._objectGroup.rotation.y = this._time * 0.3;

      if (updatedFps && this._displayFps < FPS_THRESHOLD && this._objects.length > 10) {
        this._dropCount = this._objects.length;
        this._phase = 'hold';
        this._holdTimer = 0;
      }
      if (this._objects.length >= MAX_OBJECTS) {
        this._dropCount = this._objects.length;
        this._phase = 'hold';
        this._holdTimer = 0;
      }
    } else if (this._phase === 'hold') {
      this._holdTimer += dt;
      this._objectGroup.rotation.y = this._time * 0.3;
      if (this._holdTimer >= RESET_HOLD) {
        this._phase = 'reset';
      }
    } else if (this._phase === 'reset') {
      this._resetObjects();
      this._addAccum = 0;
      this._dropCount = 0;
      this._displayFps = 60;
      this._phase = 'ramp';
    }

    if (updatedFps || this._phase === 'reset') {
      makeLabel(
        this._labelCanvas,
        this._labelCtx,
        this._objects.length,
        this._displayFps,
        this._phase,
        this._dropCount,
      );
      this._labelTex.needsUpdate = true;
    }
  }

  dispose() {
    this._resetObjects();
    this._geo?.dispose?.();
    this._mat?.dispose?.();
    super.dispose();
  }
}

register({
  id: 'fps-stress-ramp',
  title: 'FPS Stress Ramp',
  category: 'Performance',
  tags: ['fps', 'performance', 'stress', 'ramp'],
  description: `Progressively adds up to ${MAX_OBJECTS} objects until FPS drops below ${FPS_THRESHOLD}; reports the drop count, resets, and repeats.`,
  xr: 'vr',
  factory: (app) => new FpsStressRampScene(app),
});
