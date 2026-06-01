// Performance test: InstancedMesh of N cubes animating, canvas label showing
// instance count + live FPS.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { fps } from '../util/format.js';

const INSTANCE_COUNT = 5000;

function makeLabel(canvas, ctx, count, fpsValue) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`Instances: ${count}`, 16, 44);
  ctx.fillText(`FPS: ${fps(fpsValue)}`, 16, 84);
}

class InstancedStressScene extends Scene {
  async init() {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3399ff, roughness: 0.5 });
    const mesh = new THREE.InstancedMesh(geo, mat, INSTANCE_COUNT);
    mesh.castShadow = false;

    const dummy = new THREE.Object3D();
    const spread = 8;
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.5 + 1.5,
        (Math.random() - 0.5) * spread - 2,
      );
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.add(mesh);
    this._mesh = mesh;

    // Store per-instance random phase offsets.
    this._phases = new Float32Array(INSTANCE_COUNT);
    this._axes = [];
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      this._phases[i] = Math.random() * Math.PI * 2;
      this._axes.push(
        new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).normalize(),
      );
    }

    // Canvas label sprite.
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
    labelMesh.position.set(0, 2.6, -2);
    this.add(labelMesh);
    this._labelMesh = labelMesh;

    this._time = 0;
    this._fpsAcc = 0;
    this._fpsCount = 0;
    this._displayFps = 0;
    makeLabel(canvas, ctx, INSTANCE_COUNT, 0);
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
      makeLabel(this._labelCanvas, this._labelCtx, INSTANCE_COUNT, this._displayFps);
      this._labelTex.needsUpdate = true;
    }

    const dummy = new THREE.Object3D();
    const t = this._time;
    const mesh = this._mesh;
    const mat = new THREE.Matrix4();

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      mesh.getMatrixAt(i, mat);
      dummy.matrix.copy(mat);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      const angle = t * 0.4 + this._phases[i];
      dummy.position.y = 1.5 + Math.sin(angle * 0.7 + this._phases[i]) * 2;
      dummy.rotateOnAxis(this._axes[i], dt * 1.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'instanced-stress',
  title: 'Instanced Stress',
  category: 'Performance',
  tags: ['instanced', 'performance', 'fps'],
  description: `Renders ${INSTANCE_COUNT} animated cubes via InstancedMesh; a canvas label shows instance count and live FPS.`,
  xr: 'vr',
  factory: (app) => new InstancedStressScene(app),
});
