// Effects: verlet-integration cloth grid (points + distance constraints)
// waving in wind, rendered as a mesh.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const COLS = 20;
const ROWS = 16;
const CLOTH_W = 1.2;
const CLOTH_H = 0.9;
const GRAVITY = -3.0;
const DAMPING = 0.98;
const CONSTRAINT_ITER = 5;

class Particle {
  constructor(x, y, z, pinned) {
    this.pos = new THREE.Vector3(x, y, z);
    this.prev = new THREE.Vector3(x, y, z);
    this.acc = new THREE.Vector3(0, 0, 0);
    this.pinned = pinned;
  }
}

class ClothSimScene extends Scene {
  async init() {
    this._time = 0;
    this._particles = [];
    this._constraints = [];

    const dx = CLOTH_W / (COLS - 1);
    const dy = CLOTH_H / (ROWS - 1);
    const originX = -CLOTH_W / 2;
    const originY = 2.0;
    const originZ = -2.0;

    // Create particles.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const pinned = r === 0 && (c === 0 || c === COLS - 1 || c % 5 === 0);
        const p = new Particle(
          originX + c * dx,
          originY - r * dy,
          originZ + Math.random() * 0.01,
          pinned,
        );
        this._particles.push(p);
      }
    }

    const idx = (r, c) => r * COLS + c;

    // Structural constraints (horizontal + vertical).
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c < COLS - 1) {
          this._constraints.push([idx(r, c), idx(r, c + 1), dx]);
        }
        if (r < ROWS - 1) {
          this._constraints.push([idx(r, c), idx(r + 1, c), dy]);
        }
      }
    }
    // Shear constraints.
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        this._constraints.push([idx(r, c), idx(r + 1, c + 1), d]);
        this._constraints.push([idx(r, c + 1), idx(r + 1, c), d]);
      }
    }

    // Build render mesh.
    const vertCount = ROWS * COLS;
    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const triIndices = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = idx(r, c);
        const p = this._particles[i];
        positions[i * 3] = p.pos.x;
        positions[i * 3 + 1] = p.pos.y;
        positions[i * 3 + 2] = p.pos.z;
        normals[i * 3] = 0; normals[i * 3 + 1] = 0; normals[i * 3 + 2] = 1;
        uvs[i * 2] = c / (COLS - 1);
        uvs[i * 2 + 1] = 1 - r / (ROWS - 1);
      }
    }
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const a = idx(r, c);
        const b = idx(r, c + 1);
        const cc = idx(r + 1, c);
        const d = idx(r + 1, c + 1);
        triIndices.push(a, b, cc, b, d, cc);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(triIndices);

    // Checkerboard DataTexture.
    const texSize = 64;
    const texData = new Uint8Array(texSize * texSize * 4);
    for (let py = 0; py < texSize; py++) {
      for (let px = 0; px < texSize; px++) {
        const chk = ((px >> 3) + (py >> 3)) & 1;
        const off = (py * texSize + px) * 4;
        texData[off] = chk ? 220 : 60;
        texData[off + 1] = chk ? 80 : 180;
        texData[off + 2] = chk ? 80 : 220;
        texData[off + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(texData, texSize, texSize);
    tex.needsUpdate = true;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });

    const mesh = new THREE.Mesh(geo, mat);
    this.add(mesh);
    this._clothMesh = mesh;
    this._clothGeo = geo;
    this._clothPositions = positions;
    this._clothNormals = normals;
    this._posTmp = new THREE.Vector3();
  }

  _satisfyConstraints() {
    const pts = this._particles;
    for (let iter = 0; iter < CONSTRAINT_ITER; iter++) {
      for (const [ai, bi, restLen] of this._constraints) {
        const a = pts[ai];
        const b = pts[bi];
        const delta = new THREE.Vector3().subVectors(b.pos, a.pos);
        const curLen = delta.length();
        if (curLen < 0.00001) continue;
        const correction = delta.multiplyScalar((curLen - restLen) / curLen);
        if (!a.pinned && !b.pinned) {
          a.pos.addScaledVector(correction, 0.5);
          b.pos.addScaledVector(correction, -0.5);
        } else if (!a.pinned) {
          a.pos.add(correction);
        } else if (!b.pinned) {
          b.pos.addScaledVector(correction, -1);
        }
      }
    }
  }

  update(dt) {
    this._time += dt;
    const t = this._time;

    // Wind force: sinusoidal, slight turbulence.
    const windX = Math.sin(t * 0.7) * 1.5 + Math.sin(t * 2.3) * 0.4;
    const windZ = Math.cos(t * 0.5) * 0.8;

    // Verlet integration.
    for (const p of this._particles) {
      if (p.pinned) continue;
      const vel = new THREE.Vector3().subVectors(p.pos, p.prev);
      vel.multiplyScalar(DAMPING);
      p.prev.copy(p.pos);
      p.acc.set(windX, GRAVITY, windZ);
      p.pos.add(vel).addScaledVector(p.acc, dt * dt);
    }

    this._satisfyConstraints();

    // Update geometry.
    const pos = this._clothPositions;
    const nrm = this._clothNormals;
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      pos[i * 3] = p.pos.x;
      pos[i * 3 + 1] = p.pos.y;
      pos[i * 3 + 2] = p.pos.z;
    }

    // Recompute normals per-face (approximate).
    nrm.fill(0);
    const idx = (r, c) => r * COLS + c;
    const _n = new THREE.Vector3();
    const _ab = new THREE.Vector3();
    const _ac = new THREE.Vector3();
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const ai = idx(r, c);
        const bi = idx(r, c + 1);
        const ci = idx(r + 1, c);
        const ap = this._particles[ai].pos;
        const bp = this._particles[bi].pos;
        const cp = this._particles[ci].pos;
        _ab.subVectors(bp, ap);
        _ac.subVectors(cp, ap);
        _n.crossVectors(_ab, _ac).normalize();
        for (const ni of [ai, bi, ci]) {
          nrm[ni * 3] += _n.x;
          nrm[ni * 3 + 1] += _n.y;
          nrm[ni * 3 + 2] += _n.z;
        }
      }
    }
    // Normalize accumulated normals.
    for (let i = 0; i < this._particles.length; i++) {
      const nx = nrm[i * 3];
      const ny = nrm[i * 3 + 1];
      const nz = nrm[i * 3 + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nrm[i * 3] = nx / len;
      nrm[i * 3 + 1] = ny / len;
      nrm[i * 3 + 2] = nz / len;
    }

    this._clothGeo.attributes.position.needsUpdate = true;
    this._clothGeo.attributes.normal.needsUpdate = true;
    this._clothGeo.computeBoundingSphere();
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'cloth-sim',
  title: 'Cloth Simulation',
  category: 'Effects',
  tags: ['cloth', 'verlet', 'physics', 'simulation'],
  description: `A verlet-integration cloth grid (${COLS}x${ROWS} particles, distance constraints, wind + gravity) rendered as a double-sided mesh with per-frame normal recomputation.`,
  xr: 'vr',
  factory: (app) => new ClothSimScene(app),
});
