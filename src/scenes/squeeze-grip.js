// Squeeze Grip — a hand/sphere that "closes" with the squeeze value.
// Desktop auto-animates the squeeze.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { getSqueeze } from '../xr/input-sources.js';

const FINGER_COUNT = 4;

class SqueezeGripScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 1.0, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    // Two stylized hands (one per controller)
    this._hands = [];
    const xOffsets = [-0.35, 0.35];
    const colors = [0x4488ff, 0xff8844];
    const labels = ['Left Grip', 'Right Grip'];

    for (let ci = 0; ci < 2; ci++) {
      const group = new THREE.Group();
      group.position.set(xOffsets[ci], 1.45, -1.2);
      this.add(group);

      // Palm sphere
      const palmGeo = new THREE.SphereGeometry(0.06, 16, 12);
      const palmMat = new THREE.MeshStandardMaterial({
        color: colors[ci],
        roughness: 0.5,
        metalness: 0.2,
      });
      const palm = new THREE.Mesh(palmGeo, palmMat);
      group.add(palm);
      this.onDispose(() => { palmGeo.dispose(); palmMat.dispose(); });

      // Fingers: 4 cylinders that rotate inward on squeeze
      const fingers = [];
      for (let fi = 0; fi < FINGER_COUNT; fi++) {
        const pivot = new THREE.Group();
        const angle = ((fi - 1.5) / (FINGER_COUNT - 1)) * (Math.PI * 0.5);
        pivot.position.set(Math.sin(angle) * 0.06, 0.05, Math.cos(angle) * 0.03);
        group.add(pivot);

        const fGeo = new THREE.CapsuleGeometry(0.012, 0.06, 4, 8);
        fGeo.translate(0, 0.04, 0);
        const fMat = new THREE.MeshStandardMaterial({
          color: colors[ci],
          roughness: 0.6,
          metalness: 0.1,
        });
        const fMesh = new THREE.Mesh(fGeo, fMat);
        pivot.add(fMesh);
        this.onDispose(() => { fGeo.dispose(); fMat.dispose(); });

        fingers.push(pivot);
      }

      // Thumb
      const thumbPivot = new THREE.Group();
      thumbPivot.position.set(0.08, 0, 0);
      group.add(thumbPivot);
      const tGeo = new THREE.CapsuleGeometry(0.014, 0.04, 4, 8);
      tGeo.translate(0, 0.03, 0);
      const tMat = new THREE.MeshStandardMaterial({
        color: colors[ci],
        roughness: 0.6,
        metalness: 0.1,
      });
      const tMesh = new THREE.Mesh(tGeo, tMat);
      thumbPivot.add(tMesh);
      this.onDispose(() => { tGeo.dispose(); tMat.dispose(); });

      // Value label
      const labelMesh = this._makeLabel(labels[ci]);
      labelMesh.position.set(0, -0.14, 0);
      group.add(labelMesh);

      this._hands.push({ group, fingers, thumbPivot, palmMat });
    }

    this._t = 0;
  }

  _makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 48);
    ctx.fillStyle = '#dddddd';
    ctx.font = '22px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 24);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.28, 0.052);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  update(dt) {
    this._t += dt;

    for (let ci = 0; ci < 2; ci++) {
      const ctrl = this.app.controllers.controllers[ci];
      let squeeze = getSqueeze(ctrl);

      if (squeeze === 0) {
        squeeze = (Math.sin(this._t * 1.2 + ci * Math.PI) + 1) / 2;
      }

      const hand = this._hands[ci];
      // Fingers curl inward (rotate around X toward palm)
      const fingerAngle = squeeze * (Math.PI * 0.65);
      for (const finger of hand.fingers) {
        finger.rotation.x = -fingerAngle;
      }
      hand.thumbPivot.rotation.z = squeeze * (Math.PI * 0.35);

      // Tint palm based on squeeze
      hand.palmMat.emissiveIntensity = squeeze * 0.5;
      hand.palmMat.emissive.setScalar(squeeze * 0.3);
    }
  }
}

register({
  id: 'squeeze-grip',
  title: 'Squeeze Grip',
  category: 'Input',
  tags: ['controller', 'squeeze', 'grip', 'analog', 'input'],
  description: 'A stylized hand that closes its fingers proportionally to the squeeze/grip value.',
  xr: 'vr',
  factory: (app) => new SqueezeGripScene(app),
});
