// Performance test: a field of THREE.LOD objects switching detail by distance
// as a virtual camera orbits; FPS label.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { fps } from '../util/format.js';

const LOD_COUNT = 150;

function makeLabel(canvas, ctx, fpsValue, camDist) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff0';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`LODs: ${LOD_COUNT}`, 16, 38);
  ctx.fillText(`FPS: ${fps(fpsValue)}`, 16, 76);
  ctx.fillStyle = '#ccc';
  ctx.font = '20px monospace';
  ctx.fillText(`Cam dist: ${camDist.toFixed(1)}m`, 16, 108);
}

function makeGeo(detail) {
  // detail: 2 = low, 8 = high
  return new THREE.SphereGeometry(0.15, detail, detail);
}

class LodStressScene extends Scene {
  async init() {
    this._time = 0;
    this._lods = [];

    const matHigh = new THREE.MeshStandardMaterial({ color: 0x44aaff, roughness: 0.3 });
    const matMed = new THREE.MeshStandardMaterial({ color: 0x88cc44, roughness: 0.5 });
    const matLow = new THREE.MeshStandardMaterial({ color: 0xff6644, roughness: 0.8 });

    const geoHigh = makeGeo(12);
    const geoMed = makeGeo(6);
    const geoLow = makeGeo(3);

    const spread = 12;
    for (let i = 0; i < LOD_COUNT; i++) {
      const lod = new THREE.LOD();
      lod.addLevel(new THREE.Mesh(geoHigh, matHigh), 0);
      lod.addLevel(new THREE.Mesh(geoMed, matMed), 4);
      lod.addLevel(new THREE.Mesh(geoLow, matLow), 8);

      const angle = (i / LOD_COUNT) * Math.PI * 2 * 3;
      const r = 1.5 + (i / LOD_COUNT) * 5;
      lod.position.set(
        Math.cos(angle) * r,
        1.2 + Math.sin(i * 0.8) * 1.5,
        Math.sin(angle) * r - 4,
      );
      this.add(lod);
      this._lods.push(lod);
    }

    // Canvas label.
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    this._labelCanvas = canvas;
    this._labelCtx = ctx;
    const tex = new THREE.CanvasTexture(canvas);
    this._labelTex = tex;
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.28),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    labelMesh.position.set(0, 3.0, -2);
    this.add(labelMesh);

    this._fpsAcc = 0;
    this._fpsCount = 0;
    this._displayFps = 0;

    // Virtual orbit position for LOD distance updates.
    this._orbitPos = new THREE.Vector3();

    makeLabel(canvas, ctx, 0, 0);
    tex.needsUpdate = true;
  }

  update(dt) {
    this._time += dt;
    this._fpsAcc += (dt > 0 ? 1 / dt : 0);
    this._fpsCount += 1;

    // Orbit position sweeps through the field to trigger LOD transitions.
    const t = this._time;
    const orbitR = 3 + Math.sin(t * 0.3) * 2.5;
    this._orbitPos.set(
      Math.cos(t * 0.4) * orbitR,
      1.5,
      Math.sin(t * 0.4) * orbitR - 4,
    );

    // Update LOD levels using the camera position.
    const cam = this.app.camera;
    for (const lod of this._lods) {
      lod.update(cam);
    }

    const camDist = this._orbitPos.distanceTo(new THREE.Vector3(0, 1.5, -4));

    if (this._fpsCount >= 20) {
      this._displayFps = this._fpsAcc / this._fpsCount;
      this._fpsAcc = 0;
      this._fpsCount = 0;
      makeLabel(this._labelCanvas, this._labelCtx, this._displayFps, camDist);
      this._labelTex.needsUpdate = true;
    }
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'lod-stress',
  title: 'LOD Stress',
  category: 'Performance',
  tags: ['lod', 'performance', 'fps', 'detail'],
  description: `${LOD_COUNT} THREE.LOD objects switching between 3 detail levels as camera distance changes; FPS label.`,
  xr: 'vr',
  factory: (app) => new LodStressScene(app),
});
