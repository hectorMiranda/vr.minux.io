// Effects: hand-rolled physics — a stack of boxes settling with gravity,
// floor collision, and basic damping (no physics library).
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { clamp } from '../util/math.js';

const BOX_COUNT = 12;
const BOX_SIZE = 0.18;
const GRAVITY = -9.8;
const FLOOR_Y = 0.0;
const DAMPING = 0.55;         // velocity damping on bounce
const ANGULAR_DAMPING = 0.85; // per-frame angular velocity multiplier
const RESTITUTION = 0.3;

class PhysicsBox {
  constructor(pos, half) {
    this.pos = pos.clone();
    this.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      0,
      (Math.random() - 0.5) * 0.5,
    );
    this.euler = new THREE.Euler(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    this.angVel = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
    );
    this.half = half; // half-extent (scalar, assumes cube)
    this.resting = false;
  }
}

class PhysicsStackScene extends Scene {
  async init() {
    this._time = 0;
    this._resetTimer = 0;
    this._RESET_INTERVAL = 8.0;
    this._bodies = [];
    this._meshes = [];

    const geo = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
    const colors = [0xff4444, 0x44aaff, 0x44ff88, 0xffaa00, 0xff44aa, 0xaaff44];
    this._geo = geo;

    const stackBaseX = 0;
    const stackBaseZ = -2;
    for (let i = 0; i < BOX_COUNT; i++) {
      // Stack them in a column with a small random offset.
      const startY = FLOOR_Y + BOX_SIZE * (BOX_COUNT - i - 0.5) + 0.5;
      const pos = new THREE.Vector3(
        stackBaseX + (Math.random() - 0.5) * 0.1,
        startY,
        stackBaseZ + (Math.random() - 0.5) * 0.1,
      );
      const body = new PhysicsBox(pos, BOX_SIZE * 0.5);
      this._bodies.push(body);

      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      this.add(mesh);
      this._meshes.push(mesh);
    }

    // Floor indicator.
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 3),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, FLOOR_Y, -2);
    this.add(floorMesh);
  }

  _resetBodies() {
    for (let i = 0; i < BOX_COUNT; i++) {
      const body = this._bodies[i];
      const startY = FLOOR_Y + BOX_SIZE * (BOX_COUNT - i - 0.5) + 0.5;
      body.pos.set(
        (Math.random() - 0.5) * 0.1,
        startY,
        (Math.random() - 0.5) * 0.1 - 2,
      );
      body.vel.set(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5,
      );
      body.angVel.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
      );
      body.resting = false;
    }
  }

  update(dt) {
    this._time += dt;
    this._resetTimer += dt;
    if (this._resetTimer >= this._RESET_INTERVAL) {
      this._resetTimer = 0;
      this._resetBodies();
    }

    const subSteps = 2;
    const sDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      for (let i = 0; i < BOX_COUNT; i++) {
        const b = this._bodies[i];
        if (b.resting) continue;

        // Gravity.
        b.vel.y += GRAVITY * sDt;

        // Integrate position.
        b.pos.x += b.vel.x * sDt;
        b.pos.y += b.vel.y * sDt;
        b.pos.z += b.vel.z * sDt;

        // Integrate rotation.
        b.euler.x += b.angVel.x * sDt;
        b.euler.y += b.angVel.y * sDt;
        b.euler.z += b.angVel.z * sDt;
        b.angVel.multiplyScalar(ANGULAR_DAMPING);

        // Floor collision.
        const floorContact = FLOOR_Y + b.half;
        if (b.pos.y < floorContact) {
          b.pos.y = floorContact;
          b.vel.y = -b.vel.y * RESTITUTION;
          b.vel.x *= DAMPING;
          b.vel.z *= DAMPING;
          if (Math.abs(b.vel.y) < 0.05 && Math.abs(b.vel.x) < 0.02 && Math.abs(b.vel.z) < 0.02) {
            b.resting = true;
            b.vel.set(0, 0, 0);
            b.angVel.set(0, 0, 0);
          }
        }

        // Simple box-box collision (AABB, approximate impulse).
        for (let j = i + 1; j < BOX_COUNT; j++) {
          const c = this._bodies[j];
          const dx = b.pos.x - c.pos.x;
          const dy = b.pos.y - c.pos.y;
          const dz = b.pos.z - c.pos.z;
          const minDist = b.half + c.half;
          if (Math.abs(dx) < minDist && Math.abs(dy) < minDist && Math.abs(dz) < minDist) {
            // Push apart along smallest overlap axis.
            const ox = minDist - Math.abs(dx);
            const oy = minDist - Math.abs(dy);
            const oz = minDist - Math.abs(dz);
            if (oy <= ox && oy <= oz) {
              const sign = dy > 0 ? 1 : -1;
              b.pos.y += sign * oy * 0.5;
              c.pos.y -= sign * oy * 0.5;
              const relVy = b.vel.y - c.vel.y;
              const imp = relVy * (1 + RESTITUTION) * 0.5;
              b.vel.y -= imp;
              c.vel.y += imp;
              b.resting = false;
              c.resting = false;
            } else if (ox <= oz) {
              const sign = dx > 0 ? 1 : -1;
              b.pos.x += sign * ox * 0.5;
              c.pos.x -= sign * ox * 0.5;
              b.vel.x = -b.vel.x * RESTITUTION;
              c.vel.x = -c.vel.x * RESTITUTION;
            } else {
              const sign = dz > 0 ? 1 : -1;
              b.pos.z += sign * oz * 0.5;
              c.pos.z -= sign * oz * 0.5;
              b.vel.z = -b.vel.z * RESTITUTION;
              c.vel.z = -c.vel.z * RESTITUTION;
            }
          }
        }
      }
    }

    // Sync meshes.
    for (let i = 0; i < BOX_COUNT; i++) {
      const b = this._bodies[i];
      const m = this._meshes[i];
      m.position.copy(b.pos);
      m.rotation.copy(b.euler);
    }
  }

  dispose() {
    this._geo?.dispose?.();
    super.dispose();
  }
}

register({
  id: 'physics-stack',
  title: 'Physics Stack',
  category: 'Effects',
  tags: ['physics', 'boxes', 'gravity', 'collision'],
  description: `A stack of ${BOX_COUNT} boxes with hand-rolled gravity, floor collision, box-box AABB response, and angular damping; resets every few seconds.`,
  xr: 'vr',
  factory: (app) => new PhysicsStackScene(app),
});
