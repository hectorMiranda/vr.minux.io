// snap-turn-demo — pillars in a circle, snap-turn rotates the view, heading indicator shown.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { SnapTurn } from '../locomotion/snap-turn.js';

const PILLAR_COUNT = 12;
const RING_RADIUS  = 6;
const SNAP_DEG     = 30;

// Build a canvas texture heading compass
function makeCompassTexture(headingDeg) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = 'rgba(10,12,20,0.85)';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  // Tick marks every 30 degrees
  ctx.strokeStyle = '#aabbcc';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - headingDeg) * Math.PI / 180;
    const r0 = i % 3 === 0 ? 100 : 108;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0);
    ctx.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116);
    ctx.stroke();
  }

  // Cardinal labels
  const cardinals = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, deg] of cardinals) {
    const a = (deg - headingDeg) * Math.PI / 180;
    const x = 128 + Math.cos(a - Math.PI / 2) * 82;
    const y = 128 + Math.sin(a - Math.PI / 2) * 82;
    ctx.fillStyle = label === 'N' ? '#ff4444' : '#ffffff';
    ctx.fillText(label, x, y);
  }

  // Center fixed arrow (always pointing up = current heading)
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.moveTo(128, 28);
  ctx.lineTo(118, 52);
  ctx.lineTo(138, 52);
  ctx.closePath();
  ctx.fill();

  // Heading number
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(headingDeg % 360)}°`, 128, 148);

  return canvas;
}

class SnapTurnDemoScene extends Scene {
  async init() {
    // Floor
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(RING_RADIUS + 2, RING_RADIUS + 2, 0.1, 36),
      new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.8 }),
    );
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    this.add(floor);

    // Pillars in a ring
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.15, 2.8, 8);
    const capGeo    = new THREE.SphereGeometry(0.18, 8, 6);
    const colors    = [
      0xff4444, 0xff8844, 0xffcc44, 0x88ff44,
      0x44ffcc, 0x44aaff, 0x8844ff, 0xff44aa,
      0xff4444, 0xff8844, 0xffcc44, 0x88ff44,
    ];

    for (let i = 0; i < PILLAR_COUNT; i++) {
      const angle = (i / PILLAR_COUNT) * Math.PI * 2;
      const x = Math.cos(angle) * RING_RADIUS;
      const z = Math.sin(angle) * RING_RADIUS;
      const color = colors[i % colors.length];

      const pillar = new THREE.Mesh(
        pillarGeo,
        new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
      );
      pillar.position.set(x, 1.4, z);
      pillar.castShadow = true;
      this.add(pillar);

      const cap = new THREE.Mesh(
        capGeo,
        new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 }),
      );
      cap.position.set(x, 2.95, z);
      this.add(cap);

      // Pillar number label
      const numCanvas = document.createElement('canvas');
      numCanvas.width = 64;
      numCanvas.height = 64;
      const nc = numCanvas.getContext('2d');
      nc.fillStyle = '#000000';
      nc.beginPath();
      nc.arc(32, 32, 30, 0, Math.PI * 2);
      nc.fill();
      nc.fillStyle = '#ffffff';
      nc.font = 'bold 28px sans-serif';
      nc.textAlign = 'center';
      nc.textBaseline = 'middle';
      nc.fillText(String(i + 1), 32, 32);
      const numTex = new THREE.CanvasTexture(numCanvas);
      this.onDispose(() => numTex.dispose());
      const numMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        new THREE.MeshBasicMaterial({ map: numTex, transparent: true, side: THREE.DoubleSide }),
      );
      numMesh.position.set(x, 2.2, z);
      numMesh.lookAt(0, 2.2, 0);
      this.add(numMesh);
    }

    // Heading indicator (compass rose)
    const compassCanvas = makeCompassTexture(0);
    this._compassTex = new THREE.CanvasTexture(compassCanvas);
    this._compassCanvas = compassCanvas;
    this.onDispose(() => this._compassTex.dispose());

    const compassMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.8),
      new THREE.MeshBasicMaterial({ map: this._compassTex, transparent: true, side: THREE.DoubleSide }),
    );
    compassMesh.position.set(0, 1.65, -1.0);
    compassMesh.renderOrder = 5;
    this.add(compassMesh);
    this._compassMesh = compassMesh;

    // Snap-turn system
    this._snap = new SnapTurn(this.app, { angleDeg: SNAP_DEG, controllerIndex: 1 });
    this._snap.enable();
    this._snap.onSnap = () => this._updateCompass();
    this.onDispose(() => this._snap.dispose());

    // Desktop auto-rotate demo
    this._autoTime  = 0;
    this._autoAngle = 0;
    this._lastSnapTime = -2;
    this._heading = 0;
  }

  _updateCompass() {
    // Compute heading from rig rotation
    const euler = new THREE.Euler().setFromQuaternion(
      this.app.rig.group.quaternion, 'YXZ',
    );
    this._heading = ((-euler.y * 180 / Math.PI) % 360 + 360) % 360;
    const ctx = this._compassCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    const newCanvas = makeCompassTexture(this._heading);
    ctx.drawImage(newCanvas, 0, 0);
    this._compassTex.needsUpdate = true;
  }

  update(dt) {
    this._snap.update(dt);
    this._autoTime += dt;

    // Keep compass facing camera
    const cam = this.app.camera;
    const camWorldPos = cam.getWorldPosition(new THREE.Vector3());
    this._compassMesh.lookAt(camWorldPos);

    // Desktop: auto-snap every 1.8s so demo is not static
    if (!this.app.renderer.xr.isPresenting) {
      if (this._autoTime - this._lastSnapTime > 1.8) {
        this._lastSnapTime = this._autoTime;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const rad = (SNAP_DEG * Math.PI / 180) * dir;
        this.app.rig.rotateY(rad);
        this._updateCompass();
      }
    }
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'snap-turn-demo',
  title: 'Snap Turn',
  category: 'Locomotion',
  tags: ['locomotion', 'snap', 'turn', 'rotation'],
  description: 'Pillars arranged in a circle; snap-turn rotates the view 30° per flick with a compass heading indicator.',
  xr: 'vr',
  factory: (app) => new SnapTurnDemoScene(app),
});
