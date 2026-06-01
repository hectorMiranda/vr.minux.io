// Hand Joints — render all 25 hand joints as spheres (uses hands.js).
// On desktop (no hands): shows a labeled placeholder and animates a fake joint cluster.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Hands } from '../xr/hands.js';

const JOINT_COUNT = 25;

class HandJointsScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 1.0, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    // Hands system — group is added to rig parent, which is fine for tracking
    this._hands = new Hands(this.app.renderer, this.app.rig.group);
    this.onDispose(() => this._hands.dispose());

    // Desktop placeholder
    this._placeholder = this._makePlaceholder();
    this._placeholder.position.set(0, 1.5, -1.2);
    this.add(this._placeholder);

    // Fake joint cluster for desktop animation
    this._fakeJoints = [];
    const colors = [0x88ccff, 0xff8844];
    for (let h = 0; h < 2; h++) {
      const handGroup = new THREE.Group();
      handGroup.position.set(h === 0 ? -0.2 : 0.2, 1.3, -1.2);
      this.add(handGroup);
      const clr = colors[h];
      const jointMeshes = [];
      for (let j = 0; j < JOINT_COUNT; j++) {
        const geo = new THREE.SphereGeometry(0.008, 6, 6);
        const mat = new THREE.MeshStandardMaterial({
          color: clr,
          emissive: clr,
          emissiveIntensity: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        handGroup.add(mesh);
        jointMeshes.push(mesh);
        this.onDispose(() => { geo.dispose(); mat.dispose(); });
      }
      this._fakeJoints.push({ group: handGroup, meshes: jointMeshes });
    }

    this._t = 0;
  }

  _makePlaceholder() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(20,20,40,0.8)';
    ctx.roundRect(4, 4, 504, 88, 12);
    ctx.fill();
    ctx.fillStyle = '#88ccff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Hand Joints (25 per hand)', 256, 32);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '22px sans-serif';
    ctx.fillText('Hand tracking not detected — desktop preview', 256, 66);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.1, 0.21);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  update(dt, frame) {
    this._t += dt;

    // Update real hand tracking
    this._hands.update(frame);

    const anyActive = this._hands.isActive(0) || this._hands.isActive(1);
    this._placeholder.visible = !anyActive;

    for (let h = 0; h < 2; h++) {
      const { group, meshes } = this._fakeJoints[h];
      if (this._hands.isActive(h)) {
        group.visible = false;
        continue;
      }
      group.visible = true;

      // Animate fake joints as a rippling hand shape
      for (let j = 0; j < JOINT_COUNT; j++) {
        const col = Math.floor(j / 5); // 0-4 fingers
        const row = j % 5;             // 0-4 joints along finger
        const baseX = (col - 2) * 0.025;
        const baseY = row * 0.03;
        const wave = Math.sin(this._t * 2 + j * 0.3) * 0.005;
        meshes[j].position.set(baseX + wave, baseY, 0);
      }

      // Pulse emissive
      const ping = this._hands.getPinch(h);
      for (const mesh of meshes) {
        mesh.material.emissiveIntensity = 0.2 + ping * 0.6 + Math.sin(this._t * 3) * 0.05;
      }
    }
  }
}

register({
  id: 'hand-joints',
  title: 'Hand Joints',
  category: 'Hands',
  tags: ['hands', 'joints', 'hand-tracking'],
  description: 'Renders all 25 hand joints as colored spheres; pulses when tracking is active.',
  xr: 'vr',
  factory: (app) => new HandJointsScene(app),
});
