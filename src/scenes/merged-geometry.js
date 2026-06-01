// Performance test: build many shapes then merge with BufferGeometryUtils.mergeGeometries;
// try/catch fallback to a group. Shows triangle count.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const SHAPE_COUNT = 300;

function makeLabel(canvas, ctx, triCount, mode) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = mode === 'merged' ? 'rgba(0,60,0,0.85)' : 'rgba(60,30,0,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`Mode: ${mode}`, 16, 38);
  ctx.fillText(`Triangles: ${triCount.toLocaleString()}`, 16, 76);
  ctx.fillStyle = '#aaa';
  ctx.font = '20px monospace';
  ctx.fillText(`Shapes: ${SHAPE_COUNT}`, 16, 108);
}

function countTris(geo) {
  if (geo.index) return geo.index.count / 3;
  return (geo.attributes.position?.count || 0) / 3;
}

class MergedGeometryScene extends Scene {
  async init() {
    this._time = 0;
    this._mode = 'unknown';
    this._triCount = 0;
    this._rootMesh = null;

    // Canvas label.
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    this._labelCanvas = canvas;
    this._labelCtx = ctx;
    const tex = new THREE.CanvasTexture(canvas);
    this._labelTex = tex;
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.26),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    labelMesh.position.set(0, 2.8, -2);
    this.add(labelMesh);

    // Build variety of source geometries.
    const sourceGeos = [];
    const dummy = new THREE.Object3D();
    const spread = 6;

    const geoBuilders = [
      () => new THREE.BoxGeometry(0.12, 0.12, 0.12),
      () => new THREE.SphereGeometry(0.07, 6, 4),
      () => new THREE.ConeGeometry(0.07, 0.14, 6),
      () => new THREE.TetrahedronGeometry(0.09),
      () => new THREE.OctahedronGeometry(0.08),
      () => new THREE.CylinderGeometry(0.05, 0.05, 0.14, 6),
    ];

    for (let i = 0; i < SHAPE_COUNT; i++) {
      const builder = geoBuilders[i % geoBuilders.length];
      const geo = builder();
      dummy.position.set(
        (Math.random() - 0.5) * spread,
        1.5 + (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * spread - 2,
      );
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        0,
      );
      dummy.updateMatrix();
      geo.applyMatrix4(dummy.matrix);
      sourceGeos.push(geo);
    }

    // Try mergeGeometries.
    let merged = null;
    let modeStr = 'fallback-group';
    try {
      const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
      merged = mergeGeometries(sourceGeos);
      modeStr = 'merged';
    } catch (_e) {
      // Fallback: use a Group.
    }

    if (merged) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        roughness: 0.4,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(merged, mat);
      this.add(mesh);
      this._rootMesh = mesh;
      this._triCount = countTris(merged);
      // Dispose source geos — they're baked in.
      for (const g of sourceGeos) g.dispose();
    } else {
      // Fallback: group.
      const group = new THREE.Group();
      let totalTris = 0;
      for (const geo of sourceGeos) {
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
        totalTris += countTris(geo);
      }
      this.add(group);
      this._rootMesh = group;
      this._triCount = totalTris;
    }

    this._mode = modeStr;
    makeLabel(canvas, ctx, this._triCount, this._mode);
    tex.needsUpdate = true;
  }

  update(dt) {
    this._time += dt;
    if (this._rootMesh) {
      this._rootMesh.rotation.y = this._time * 0.15;
    }
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'merged-geometry',
  title: 'Merged Geometry',
  category: 'Performance',
  tags: ['merge', 'BufferGeometryUtils', 'triangles', 'performance'],
  description: `Builds ${SHAPE_COUNT} varied shapes and merges them with BufferGeometryUtils.mergeGeometries (falls back to a Group if unavailable); shows triangle count.`,
  xr: 'vr',
  factory: (app) => new MergedGeometryScene(app),
});
