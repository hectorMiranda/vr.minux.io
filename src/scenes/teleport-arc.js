// teleport-arc — a floor with scattered pillars; teleport around using TeleportControls.
// On desktop with no controller the arc sweeps automatically so it's visible.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { TeleportControls } from '../locomotion/teleport.js';

class TeleportArcScene extends Scene {
  async init() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x336644,
      roughness: 0.9,
      metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.add(floor);

    // Grid overlay on floor
    const gridHelper = new THREE.GridHelper(20, 20, 0x224433, 0x224433);
    gridHelper.position.y = 0.001;
    this.add(gridHelper);

    // Scattered pillars
    this._pillars = [];
    const pillarPositions = [
      [-3, 0, -4], [2, 0, -5], [5, 0, -2], [-5, 0, -7],
      [0, 0, -8], [4, 0, -9], [-2, 0, -3], [6, 0, -6],
    ];
    const pillarGeo = new THREE.CylinderGeometry(0.15, 0.18, 2.5, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8866aa, roughness: 0.7 });

    for (const [x, , z] of pillarPositions) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 1.25, z);
      pillar.castShadow = true;
      this.add(pillar);
      this._pillars.push(pillar);
    }

    // Cap tops on pillars
    const capGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 8);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xaa88cc, roughness: 0.5 });
    for (const [x, , z] of pillarPositions) {
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(x, 2.56, z);
      this.add(cap);
    }

    // Instructional label (simple floating text via canvas texture)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.roundRect(4, 4, 504, 120, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Squeeze or Select to aim, release to teleport', 256, 50);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#aaffcc';
    ctx.fillText('TeleportControls demo', 256, 90);
    const tex = new THREE.CanvasTexture(canvas);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.625),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }),
    );
    labelMesh.position.set(0, 2.0, -3);
    this.add(labelMesh);
    this.onDispose(() => tex.dispose());

    // Teleport system
    this._teleport = new TeleportControls(this.app, 0);
    this._teleport.setFloor(floor);
    this._teleport.enable();
    this.onDispose(() => this._teleport.dispose());

    // Desktop auto-sweep state
    this._sweepAngle = 0;
    this._floorRef = floor;
  }

  update(dt) {
    // Drive teleport logic (reads controller each frame)
    this._teleport.update(dt);

    // Desktop: animate a sweeping arc when no XR session
    if (!this.app.renderer.xr.isPresenting) {
      this._sweepAngle += dt * 0.6;
      const yaw = Math.sin(this._sweepAngle) * 0.5;
      const pitch = -0.55 + Math.sin(this._sweepAngle * 0.4) * 0.15;

      // Synthesize origin and direction from a slightly elevated position
      const origin = new THREE.Vector3(0, 1.5, 0);
      const dir = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch),
      );
      this._teleport.castArcFromRay(origin, dir);
    }
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'teleport-arc',
  title: 'Teleport Arc',
  category: 'Locomotion',
  tags: ['teleport', 'locomotion', 'arc'],
  description: 'A floor with scattered pillars; teleport around using a parabolic arc. Desktop shows an animated sweep.',
  xr: 'vr',
  factory: (app) => new TeleportArcScene(app),
});
