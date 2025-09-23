// Hand Skeleton — connect hand joints with line segments to draw a skeleton.
// Desktop: shows placeholder and animates a fake skeleton.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Hands } from '../xr/hands.js';

// Bone connections: [jointA, jointB] by index in JOINT_NAMES order.
// Wrist=0, thumb chain=1-4, index=5-9, middle=10-14, ring=15-19, pinky=20-24
const BONES = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8], [8, 9],
  // Middle
  [0, 10], [10, 11], [11, 12], [12, 13], [13, 14],
  // Ring
  [0, 15], [15, 16], [16, 17], [17, 18], [18, 19],
  // Pinky
  [0, 20], [20, 21], [21, 22], [22, 23], [23, 24],
  // Knuckle bar
  [5, 10], [10, 15], [15, 20],
];

const JOINT_NAMES = [
  'wrist', 'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
];

class HandSkeletonScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 1.0, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    this._hands = new Hands(this.app.renderer, this.app.rig.group);
    this.onDispose(() => this._hands.dispose());

    // Build line sets per hand
    this._skeletons = [];
    const colors = [0x88ccff, 0xff8844];

    for (let h = 0; h < 2; h++) {
      const lines = [];
      for (const bone of BONES) {
        const pts = [new THREE.Vector3(), new THREE.Vector3()];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color: colors[h],
          transparent: true,
          opacity: 0.85,
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        this.app.rig.group.add(line);
        this.onDispose(() => {
          this.app.rig.group.remove(line);
          geo.dispose();
          mat.dispose();
        });
        lines.push({ line, geo, bone });
      }
      this._skeletons.push({ lines, active: false });
    }

    // Desktop placeholder
    this._placeholder = this._makePlaceholder();
    this._placeholder.position.set(0, 1.55, -1.2);
    this.add(this._placeholder);

    // Fake joint positions for desktop
    this._fakePos = [];
    for (let i = 0; i < 25; i++) this._fakePos.push(new THREE.Vector3());

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
    ctx.fillText('Hand Skeleton', 256, 32);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '22px sans-serif';
    ctx.fillText('Enable hand tracking to see your skeleton', 256, 68);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.1, 0.21);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  _buildFakePositions(t, handIndex) {
    const ox = handIndex === 0 ? -0.18 : 0.18;
    const oy = 1.3;
    const oz = -0.9;
    // Wrist
    this._fakePos[0].set(ox, oy, oz);
    // Build finger chains
    for (let f = 0; f < 5; f++) {
      const spread = ((f - 2) * 0.028);
      for (let j = 0; j < 5; j++) {
        const idx = f * 5 + j;
        if (idx === 0) continue;
        const t2 = t + j * 0.15 + f * 0.3;
        const curl = Math.sin(t2 * 1.5) * 0.01 * j;
        this._fakePos[idx].set(
          ox + spread + Math.sin(t * 0.5) * 0.003,
          oy + 0.018 * j + curl,
          oz + 0.005 * j,
        );
      }
    }
  }

  _getJointWorldPos(h, jointIdx) {
    const name = JOINT_NAMES[jointIdx];
    return this._hands.getJointPosition(h, name);
  }

  update(dt, frame) {
    this._t += dt;
    this._hands.update(frame);

    const anyActive = this._hands.isActive(0) || this._hands.isActive(1);
    this._placeholder.visible = !anyActive;

    for (let h = 0; h < 2; h++) {
      const skel = this._skeletons[h];
      const active = this._hands.isActive(h);

      if (!active) {
        // Use fake positions
        this._buildFakePositions(this._t, h);
      }

      for (const { line, geo, bone } of skel.lines) {
        let posA, posB;
        if (active) {
          posA = this._getJointWorldPos(h, bone[0]);
          posB = this._getJointWorldPos(h, bone[1]);
        } else {
          posA = this._fakePos[bone[0]];
          posB = this._fakePos[bone[1]];
        }
        if (!posA || !posB) { line.visible = false; continue; }
        line.visible = true;
        const pos = geo.attributes.position;
        pos.setXYZ(0, posA.x, posA.y, posA.z);
        pos.setXYZ(1, posB.x, posB.y, posB.z);
        pos.needsUpdate = true;
      }
    }
  }
}

register({
  id: 'hand-skeleton',
  title: 'Hand Skeleton',
  category: 'Hands',
  tags: ['hands', 'skeleton', 'bones', 'hand-tracking'],
  description: 'Connects hand joints with line segments forming a full hand skeleton.',
  xr: 'vr',
  factory: (app) => new HandSkeletonScene(app),
});
