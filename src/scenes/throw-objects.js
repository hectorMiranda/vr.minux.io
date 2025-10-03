// throw-objects — grabbed objects keep velocity on release and arc under gravity.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const GRAVITY = -4.0;          // m/s² (lighter than real for comfort)
const HISTORY = 6;             // frames to average for velocity
const FLOOR_Y = 0.05;

const COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22];

class ThrowObjectsScene extends Scene {
  async init() {
    // Floor indicator.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x446644, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, FLOOR_Y, -1.5);
    floor.receiveShadow = true;
    this.add(floor);

    // Throwable balls.
    this._balls = [];
    for (let i = 0; i < 6; i++) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 12),
        new THREE.MeshStandardMaterial({ color: COLORS[i], roughness: 0.4, metalness: 0.2 }),
      );
      ball.position.set((i - 2.5) * 0.28, 1.2, -1.5);
      ball.castShadow = true;
      this.add(ball);
      this._balls.push({
        mesh: ball,
        vel: new THREE.Vector3(),
        flying: false,
        grabbed: false,
        prevPos: [],
      });
    }

    // Controller tracking.
    // grabbed[i] = ball data or null
    this._grabbed = [null, null];

    if (this.app.controllers) {
      this.onDispose(
        this.app.controllers.events.on('squeezestart', ({ index, controller }) => {
          this._tryGrab(index, controller);
        }),
      );
      this.onDispose(
        this.app.controllers.events.on('squeezeend', ({ index, controller }) => {
          this._release(index, controller);
        }),
      );
    }

    this._t = 0;
  }

  _tryGrab(index, controller) {
    if (this._grabbed[index]) return;
    const ctrlPos = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    let closest = null;
    let dist = 0.3;
    for (const b of this._balls) {
      if (b.grabbed || b.flying) continue;
      const d = b.mesh.position.distanceTo(ctrlPos);
      if (d < dist) { dist = d; closest = b; }
    }
    if (!closest) return;
    closest.grabbed = true;
    closest.flying = false;
    closest.vel.set(0, 0, 0);
    closest.prevPos = [];
    this._grabbed[index] = closest;
  }

  _release(index, controller) {
    const b = this._grabbed[index];
    if (!b) return;
    b.grabbed = false;
    // Estimate velocity from last few positions.
    if (b.prevPos.length >= 2) {
      const last = b.prevPos[b.prevPos.length - 1];
      const prev = b.prevPos[Math.max(0, b.prevPos.length - 4)];
      const dt = last.t - prev.t;
      if (dt > 0.001) {
        b.vel.copy(last.p).sub(prev.p).divideScalar(dt);
        // Cap velocity.
        const speed = b.vel.length();
        if (speed > 12) b.vel.multiplyScalar(12 / speed);
      }
    } else {
      b.vel.set(0, 2, -3);
    }
    b.flying = true;
    b.prevPos = [];
    this._grabbed[index] = null;
  }

  update(dt) {
    this._t += dt;

    for (let i = 0; i < 2; i++) {
      const b = this._grabbed[i];
      if (!b) continue;
      const ctrl = this.app.controllers?.controllers?.[i];
      if (ctrl) {
        const wp = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
        // Track ball to controller.
        b.mesh.position.lerp(wp, Math.min(1, dt * 20));
        b.prevPos.push({ p: b.mesh.position.clone(), t: this._t });
        if (b.prevPos.length > HISTORY) b.prevPos.shift();
      }
    }

    for (const b of this._balls) {
      if (b.grabbed) continue;
      if (b.flying) {
        b.vel.y += GRAVITY * dt;
        b.mesh.position.addScaledVector(b.vel, dt);
        b.mesh.rotation.x += b.vel.z * dt * 3;
        b.mesh.rotation.z -= b.vel.x * dt * 3;
        // Bounce off floor.
        if (b.mesh.position.y < FLOOR_Y + 0.07) {
          b.mesh.position.y = FLOOR_Y + 0.07;
          b.vel.y = Math.abs(b.vel.y) * 0.45;
          b.vel.x *= 0.85;
          b.vel.z *= 0.85;
          if (Math.abs(b.vel.y) < 0.3) {
            b.flying = false;
            b.vel.set(0, 0, 0);
          }
        }
        // Fade if out of range — reset.
        if (b.mesh.position.distanceTo(new THREE.Vector3(0, 1, -1.5)) > 8) {
          b.mesh.position.set(
            (Math.random() - 0.5) * 1.2,
            1.2,
            -1.5,
          );
          b.vel.set(0, 0, 0);
          b.flying = false;
        }
      } else {
        // Gentle idle animation.
        const idx = this._balls.indexOf(b);
        b.mesh.position.y = 1.2 + Math.sin(this._t * 0.8 + idx * 1.1) * 0.04;
        b.mesh.rotation.y += dt * 0.4;
      }
    }
  }
}

register({
  id: 'throw-objects',
  title: 'Throw Objects',
  category: 'Interaction',
  tags: ['grab', 'physics', 'throw', 'velocity'],
  description: 'Grabbed objects keep velocity on release and arc under gravity.',
  xr: 'vr',
  factory: (app) => new ThrowObjectsScene(app),
});
