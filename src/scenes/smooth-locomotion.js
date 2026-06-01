// smooth-locomotion — glide across a tiled plane using SmoothLocomotion.
// Auto-drifts forward slowly when no thumbstick input is detected.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { SmoothLocomotion } from '../locomotion/smooth-move.js';

const TILE_COUNT = 16;
const TILE_SIZE = 1.5;
const HALF = (TILE_COUNT * TILE_SIZE) / 2;
const AUTO_SPEED = 1.2; // m/s for desktop drift

// Generate a checkerboard canvas texture
function makeCheckerTexture(size = 256, tiles = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cell = size / tiles;
  for (let r = 0; r < tiles; r++) {
    for (let c = 0; c < tiles; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#334455' : '#223344';
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(TILE_COUNT, TILE_COUNT);
  return tex;
}

class SmoothLocomotionScene extends Scene {
  async init() {
    const checker = makeCheckerTexture();
    this.onDispose(() => checker.dispose());

    // Main floor
    const floorSize = TILE_COUNT * TILE_SIZE;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      new THREE.MeshStandardMaterial({ map: checker, roughness: 0.8 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.add(floor);

    // Boundary walls (visual only)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x446688, roughness: 0.6 });
    const wallPositions = [
      { pos: [0, 0.75, -HALF], size: [floorSize, 1.5, 0.15] },
      { pos: [0, 0.75,  HALF], size: [floorSize, 1.5, 0.15] },
      { pos: [-HALF, 0.75, 0], size: [0.15, 1.5, floorSize] },
      { pos: [ HALF, 0.75, 0], size: [0.15, 1.5, floorSize] },
    ];
    for (const { pos, size } of wallPositions) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
      wall.position.set(...pos);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.add(wall);
    }

    // Reference markers (colored poles) at tile corners
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, roughness: 0.5 });
    const polePositions = [
      [-6, 0, -6], [6, 0, -6], [-6, 0, 6], [6, 0, 6],
      [0, 0, -8], [0, 0, 8], [-8, 0, 0], [8, 0, 0],
    ];
    for (const [x, , z] of polePositions) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8),
        poleMat,
      );
      pole.position.set(x, 0.9, z);
      this.add(pole);
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff6622, roughness: 0.3 }),
      );
      ball.position.set(x, 1.9, z);
      this.add(ball);
    }

    // Speed indicator HUD (canvas label)
    const hudCanvas = document.createElement('canvas');
    hudCanvas.width = 256;
    hudCanvas.height = 64;
    this._hudCtx = hudCanvas.getContext('2d');
    this._hudTex = new THREE.CanvasTexture(hudCanvas);
    this.onDispose(() => this._hudTex.dispose());
    const hudMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.3),
      new THREE.MeshBasicMaterial({
        map: this._hudTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    hudMesh.renderOrder = 5;
    // Position HUD in front of camera (will update in update loop)
    hudMesh.position.set(0, 1.4, -1.5);
    this.add(hudMesh);
    this._hudMesh = hudMesh;
    this._drawHud(0);

    // Smooth locomotion system
    this._loco = new SmoothLocomotion(this.app, { speed: 4, controllerIndex: 0 });
    this._loco.enable();
    this.onDispose(() => this._loco.dispose());

    this._time = 0;
    this._autoDrift = true; // disabled once real input detected
  }

  _drawHud(speed) {
    const ctx = this._hudCtx;
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#aaffcc';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SmoothLocomotion', 8, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Speed: ${speed.toFixed(2)} m/s`, 8, 50);
    this._hudTex.needsUpdate = true;
  }

  update(dt) {
    this._time += dt;

    // Attempt real input
    const moved = this._loco.update(dt);
    if (moved) {
      this._autoDrift = false;
      const dist = Math.sqrt(moved.x * moved.x + moved.z * moved.z);
      this._drawHud(dist / dt);
    }

    // Auto-drift when no XR / no input
    if (this._autoDrift || !this.app.renderer.xr.isPresenting) {
      // Drift slowly forward and occasionally strafe
      const driftX = Math.sin(this._time * 0.25) * AUTO_SPEED * 0.15;
      const driftZ = -AUTO_SPEED * 0.4;
      this.app.rig.translate(driftX * dt, 0, driftZ * dt);

      // Wrap the rig position so it doesn't escape
      const pos = this.app.rig.group.position;
      if (pos.z < -HALF + 1) this.app.rig.moveTo(pos.x, pos.y, HALF - 1);
      if (pos.z > HALF - 1)  this.app.rig.moveTo(pos.x, pos.y, -HALF + 1);
      if (pos.x < -HALF + 1) this.app.rig.translate(TILE_SIZE, 0, 0);
      if (pos.x > HALF - 1)  this.app.rig.translate(-TILE_SIZE, 0, 0);

      this._drawHud(AUTO_SPEED * 0.4);
    }

    // Keep HUD in front of camera
    const cam = this.app.camera;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    fwd.y = 0;
    fwd.normalize();
    const worldPos = cam.getWorldPosition(new THREE.Vector3());
    this._hudMesh.position.set(
      worldPos.x + fwd.x * 1.5,
      worldPos.y - 0.15,
      worldPos.z + fwd.z * 1.5,
    );
    this._hudMesh.lookAt(worldPos);
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'smooth-locomotion',
  title: 'Smooth Locomotion',
  category: 'Locomotion',
  tags: ['locomotion', 'smooth', 'thumbstick'],
  description: 'Glide across a tiled plane using thumbstick input; auto-drifts forward on desktop.',
  xr: 'vr',
  factory: (app) => new SmoothLocomotionScene(app),
});
