// snap-points — draggable pieces snap to the nearest socket when released.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const SNAP_RADIUS = 0.15;
const COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6];

// Socket positions (world).
const SOCKET_POSITIONS = [
  new THREE.Vector3(-0.4, 1.4, -1.5),
  new THREE.Vector3(-0.2, 1.4, -1.5),
  new THREE.Vector3(0.0,  1.4, -1.5),
  new THREE.Vector3(0.2,  1.4, -1.5),
  new THREE.Vector3(0.4,  1.4, -1.5),
];

class SnapPointsScene extends Scene {
  async init() {
    // Socket indicators.
    this._sockets = [];
    for (const pos of SOCKET_POSITIONS) {
      const sock = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.008, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0x888888 }),
      );
      sock.position.copy(pos);
      sock.rotation.x = Math.PI / 2;
      this.add(sock);
      this._sockets.push({ pos: pos.clone(), ring: sock, occupied: false });
    }

    // Draggable pieces.
    this._pieces = [];
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 12),
        new THREE.MeshStandardMaterial({ color: COLORS[i], roughness: 0.4, metalness: 0.3 }),
      );
      // Start slightly in front of sockets.
      mesh.position.set((i - 2) * 0.2, 1.2, -1.2);
      mesh.castShadow = true;
      this.add(mesh);
      this._pieces.push({
        mesh,
        grabbed: false,
        snapped: false,
        snapIndex: -1,
        targetPos: mesh.position.clone(),
      });
    }

    this._grabbed = [null, null]; // grabbed[controllerIndex] = piece or null

    if (this.app.controllers) {
      this.onDispose(
        this.app.controllers.events.on('squeezestart', ({ index, controller }) => {
          this._tryGrab(index, controller);
        }),
      );
      this.onDispose(
        this.app.controllers.events.on('squeezeend', ({ index }) => {
          this._tryRelease(index);
        }),
      );
    }

    this._t = 0;
  }

  _tryGrab(index, controller) {
    if (this._grabbed[index]) return;
    const cPos = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    let best = null;
    let bestD = 0.25;
    for (const p of this._pieces) {
      if (p.grabbed) continue;
      const d = p.mesh.position.distanceTo(cPos);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) return;
    // Free from current socket.
    if (best.snapped && best.snapIndex >= 0) {
      this._sockets[best.snapIndex].occupied = false;
      this._sockets[best.snapIndex].ring.material.color.setHex(0x888888);
    }
    best.snapped = false;
    best.snapIndex = -1;
    best.grabbed = true;
    this._grabbed[index] = best;
  }

  _tryRelease(index) {
    const p = this._grabbed[index];
    if (!p) return;
    p.grabbed = false;
    this._grabbed[index] = null;

    // Find nearest free socket.
    let bestSock = null;
    let bestD = SNAP_RADIUS;
    for (let i = 0; i < this._sockets.length; i++) {
      const s = this._sockets[i];
      if (s.occupied) continue;
      const d = p.mesh.position.distanceTo(s.pos);
      if (d < bestD) { bestD = d; bestSock = { s, i }; }
    }

    if (bestSock) {
      bestSock.s.occupied = true;
      bestSock.s.ring.material.color.setHex(COLORS[this._pieces.indexOf(p)]);
      p.snapped = true;
      p.snapIndex = bestSock.i;
      p.targetPos.copy(bestSock.s.pos);
    } else {
      p.targetPos.copy(p.mesh.position);
    }
  }

  update(dt) {
    this._t += dt;

    const controllers = this.app.controllers?.controllers;

    for (let i = 0; i < 2; i++) {
      const p = this._grabbed[i];
      if (!p || !controllers) continue;
      const cPos = new THREE.Vector3().setFromMatrixPosition(controllers[i].matrixWorld);
      p.mesh.position.lerp(cPos, Math.min(1, dt * 18));
    }

    // Animate pieces toward their target.
    for (const p of this._pieces) {
      if (p.grabbed) continue;
      p.mesh.position.lerp(p.targetPos, Math.min(1, dt * 10));
      if (!p.snapped) {
        // Idle float.
        p.mesh.position.y = p.targetPos.y + Math.sin(this._t * 0.9 + this._pieces.indexOf(p)) * 0.03;
      }
      p.mesh.rotation.y += dt * 0.5;
    }
  }
}

register({
  id: 'snap-points',
  title: 'Snap Points',
  category: 'Interaction',
  tags: ['snap', 'drag', 'grab', 'controller'],
  description: 'Draggable pieces that snap to the nearest of several socket positions when released.',
  xr: 'vr',
  factory: (app) => new SnapPointsScene(app),
});
