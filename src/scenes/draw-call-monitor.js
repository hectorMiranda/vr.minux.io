// Performance test: toggle between many separate meshes vs one merged geometry;
// a label reports renderer.info.render.calls.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const OBJECT_COUNT = 200;
const TOGGLE_INTERVAL = 3.0; // seconds

function makeLabel(canvas, ctx, calls, mode) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = mode === 'merged' ? 'rgba(0,80,0,0.85)' : 'rgba(80,0,0,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`Mode: ${mode}`, 16, 38);
  ctx.fillText(`Draw calls: ${calls}`, 16, 76);
  ctx.font = '20px monospace';
  ctx.fillStyle = '#ccc';
  ctx.fillText(`Objects: ${OBJECT_COUNT}`, 16, 110);
}

class DrawCallMonitorScene extends Scene {
  async init() {
    this._time = 0;
    this._mode = 'separate'; // 'separate' | 'merged'
    this._separateGroup = null;
    this._mergedMesh = null;
    this._timer = 0;

    // Build separate meshes group.
    this._buildSeparate();

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
    labelMesh.position.set(0, 2.8, -2);
    this.add(labelMesh);
    this._labelMesh = labelMesh;

    makeLabel(canvas, ctx, 0, this._mode);
    tex.needsUpdate = true;
  }

  _buildSeparate() {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    for (let i = 0; i < OBJECT_COUNT; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / OBJECT_COUNT, 0.8, 0.5),
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i / OBJECT_COUNT) * Math.PI * 2;
      const r = 1.0 + (i % 5) * 0.3;
      mesh.position.set(
        Math.cos(angle) * r,
        1.5 + Math.sin(i * 0.4) * 0.8,
        Math.sin(angle) * r - 2,
      );
      group.add(mesh);
    }
    this._separateGroup = group;
    this.group.add(group);
    this._separateMat = new THREE.MeshStandardMaterial({ color: 0x3399ff });
    this._separateGeo = geo;
  }

  _buildMerged() {
    // Build a merged geometry from all OBJECT_COUNT boxes.
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const dummy = new THREE.Object3D();
    const merged = new THREE.BufferGeometry();
    const posArrays = [];
    const normalArrays = [];
    const uvArrays = [];
    const posAttr = geo.attributes.position;
    const normalAttr = geo.attributes.normal;
    const uvAttr = geo.attributes.uv;
    const indexAttr = geo.index;

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let vertexOffset = 0;

    for (let i = 0; i < OBJECT_COUNT; i++) {
      const angle = (i / OBJECT_COUNT) * Math.PI * 2;
      const r = 1.0 + (i % 5) * 0.3;
      dummy.position.set(
        Math.cos(angle) * r,
        1.5 + Math.sin(i * 0.4) * 0.8,
        Math.sin(angle) * r - 2,
      );
      dummy.updateMatrix();
      const mat4 = dummy.matrix;
      const normalMat = new THREE.Matrix3().getNormalMatrix(mat4);

      for (let v = 0; v < posAttr.count; v++) {
        const px = posAttr.getX(v);
        const py = posAttr.getY(v);
        const pz = posAttr.getZ(v);
        const vp = new THREE.Vector3(px, py, pz).applyMatrix4(mat4);
        positions.push(vp.x, vp.y, vp.z);

        const nx = normalAttr.getX(v);
        const ny = normalAttr.getY(v);
        const nz = normalAttr.getZ(v);
        const vn = new THREE.Vector3(nx, ny, nz).applyMatrix3(normalMat).normalize();
        normals.push(vn.x, vn.y, vn.z);

        uvs.push(uvAttr.getX(v), uvAttr.getY(v));
      }
      if (indexAttr) {
        for (let j = 0; j < indexAttr.count; j++) {
          indices.push(indexAttr.getX(j) + vertexOffset);
        }
      }
      vertexOffset += posAttr.count;
    }

    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    merged.setIndex(indices);

    const mat = new THREE.MeshStandardMaterial({ color: 0x44cc88 });
    const mesh = new THREE.Mesh(merged, mat);
    this._mergedMesh = mesh;
    this._mergedGeo = merged;
    this._mergedMat = mat;
    this.group.add(mesh);
    geo.dispose();
  }

  _switchToMerged() {
    if (this._separateGroup) {
      this._separateGroup.traverse((obj) => {
        obj.geometry?.dispose?.();
        obj.material?.dispose?.();
      });
      this.group.remove(this._separateGroup);
      this._separateGroup = null;
    }
    this._buildMerged();
    this._mode = 'merged';
  }

  _switchToSeparate() {
    if (this._mergedMesh) {
      this._mergedGeo?.dispose?.();
      this._mergedMat?.dispose?.();
      this.group.remove(this._mergedMesh);
      this._mergedMesh = null;
    }
    this._buildSeparate();
    this._mode = 'separate';
  }

  update(dt) {
    this._time += dt;
    this._timer += dt;

    if (this._timer >= TOGGLE_INTERVAL) {
      this._timer = 0;
      if (this._mode === 'separate') {
        this._switchToMerged();
      } else {
        this._switchToSeparate();
      }
    }

    // Rotate the active geometry.
    if (this._separateGroup) {
      this._separateGroup.children.forEach((child, i) => {
        child.rotation.y = this._time * 0.5 + i * 0.05;
      });
    }
    if (this._mergedMesh) {
      this._mergedMesh.rotation.y = this._time * 0.2;
    }

    // Get draw calls from renderer.
    const calls = this.app.renderer.info.render.calls;
    makeLabel(this._labelCanvas, this._labelCtx, calls, this._mode);
    this._labelTex.needsUpdate = true;
  }

  dispose() {
    if (this._separateGroup) {
      this._separateGroup.traverse((obj) => {
        obj.geometry?.dispose?.();
        obj.material?.dispose?.();
      });
    }
    if (this._mergedMesh) {
      this._mergedGeo?.dispose?.();
      this._mergedMat?.dispose?.();
    }
    this._separateGeo?.dispose?.();
    super.dispose();
  }
}

register({
  id: 'draw-call-monitor',
  title: 'Draw Call Monitor',
  category: 'Performance',
  tags: ['draw-calls', 'performance', 'merge', 'geometry'],
  description: `Toggles every ${TOGGLE_INTERVAL}s between ${OBJECT_COUNT} separate meshes and one merged geometry; a label shows live renderer draw call count.`,
  xr: 'vr',
  factory: (app) => new DrawCallMonitorScene(app),
});
