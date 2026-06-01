// Hundreds of low-poly trees on a patch using InstancedMesh with wind sway.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const TREE_COUNT = 300;
const PATCH_SIZE = 4.0;

function seedRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

class InstancedForestScene extends Scene {
  async init() {
    const rng = seedRng(42);

    // Trunk: thin brown cylinder.
    const trunkGeo = new THREE.CylinderGeometry(0.018, 0.025, 0.22, 6);
    trunkGeo.translate(0, 0.11, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2e, roughness: 0.9 });

    // Crown: green cone.
    const crownGeo = new THREE.ConeGeometry(0.09, 0.28, 6);
    crownGeo.translate(0, 0.36, 0); // sit on top of trunk
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x2d6a2d, roughness: 0.85 });

    this._trunkMesh  = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);
    this._crownMesh  = new THREE.InstancedMesh(crownGeo, crownMat, TREE_COUNT);
    this._trunkMesh.castShadow = true;
    this._crownMesh.castShadow = true;

    // Store per-tree data for sway animation.
    this._treeData = [];
    const dummy = new THREE.Object3D();
    const halfPatch = PATCH_SIZE / 2;

    for (let i = 0; i < TREE_COUNT; i++) {
      const x = (rng() - 0.5) * PATCH_SIZE;
      const z = (rng() - 0.5) * PATCH_SIZE;
      const scale = 0.7 + rng() * 0.6;
      const phase = rng() * Math.PI * 2;

      dummy.position.set(x, 0, z);
      dummy.scale.setScalar(scale);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.updateMatrix();

      this._trunkMesh.setMatrixAt(i, dummy.matrix);
      this._crownMesh.setMatrixAt(i, dummy.matrix);

      this._treeData.push({ x, z, scale, phase, baseRotY: dummy.rotation.y });
    }
    void halfPatch;

    this._trunkMesh.instanceMatrix.needsUpdate = true;
    this._crownMesh.instanceMatrix.needsUpdate = true;

    // Ground patch.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(PATCH_SIZE, PATCH_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x4a7c40, roughness: 0.9 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;

    const group = new THREE.Group();
    group.add(ground, this._trunkMesh, this._crownMesh);
    group.position.set(0, 1.2, -2.5);
    this.add(group);

    this._dummy = dummy;
    this._t = 0;
  }

  update(dt) {
    this._t += dt;
    const dummy = this._dummy;
    const swayAmp = 0.06;

    for (let i = 0; i < TREE_COUNT; i++) {
      const { x, z, scale, phase, baseRotY } = this._treeData[i];
      const sway = Math.sin(this._t * 1.2 + phase) * swayAmp;
      dummy.position.set(x, 0, z);
      dummy.scale.setScalar(scale);
      dummy.rotation.set(sway, baseRotY, 0);
      dummy.updateMatrix();
      this._trunkMesh.setMatrixAt(i, dummy.matrix);
      this._crownMesh.setMatrixAt(i, dummy.matrix);
    }
    this._trunkMesh.instanceMatrix.needsUpdate = true;
    this._crownMesh.instanceMatrix.needsUpdate = true;
  }
}

register({
  id: 'instanced-forest',
  title: 'Instanced Forest',
  category: 'Geometry',
  tags: ['instancing', 'instancedmesh', 'forest', 'wind'],
  description: 'Hundreds of low-poly instanced trees with gentle wind-sway animation.',
  xr: 'vr',
  factory: (app) => new InstancedForestScene(app),
});
