// fly-move — free 6DoF flying controlled by controller orientation + trigger.
// Hold trigger to thrust in the direction the controller points.
// Features a floating ring course.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const FLY_SPEED   = 5;   // m/s max
const DRAG        = 2.5; // velocity damping per second
const RING_COUNT  = 8;

class FlyMoveScene extends Scene {
  async init() {
    // Skybox-like gradient background by coloring the scene
    this.app.scene.background = new THREE.Color(0x05080f);

    // Ground far below for reference
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -10;
    this.add(ground);

    // Stars (points)
    const starCount = 600;
    const starPos   = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 100;
      starPos[i * 3 + 1] = Math.random() * 30 - 5;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true }),
    );
    this.add(stars);

    // Floating ring course
    this._rings = [];
    const ringPath = [
      new THREE.Vector3(0,   2, -5),
      new THREE.Vector3(4,   4, -10),
      new THREE.Vector3(0,   6, -15),
      new THREE.Vector3(-5,  4, -20),
      new THREE.Vector3(-2,  2, -25),
      new THREE.Vector3(3,   5, -18),
      new THREE.Vector3(6,   3, -12),
      new THREE.Vector3(2,   1, -7),
    ];

    const ringColors = [
      0x44ffaa, 0xff4488, 0x44aaff, 0xffcc44,
      0xaa44ff, 0xff6644, 0x44ffcc, 0xffff44,
    ];

    for (let i = 0; i < RING_COUNT; i++) {
      const ringGeo = new THREE.TorusGeometry(0.9, 0.08, 8, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: ringColors[i % ringColors.length],
        roughness: 0.3,
        metalness: 0.7,
        emissive: ringColors[i % ringColors.length],
        emissiveIntensity: 0.4,
      });
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.position.copy(ringPath[i]);
      // Orient rings along the path
      if (i + 1 < RING_COUNT) {
        const dir = new THREE.Vector3().subVectors(ringPath[i + 1], ringPath[i]).normalize();
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      }
      ring.castShadow = true;
      this.add(ring);
      this._rings.push(ring);
    }

    // Velocity vector for 6DoF
    this._velocity = new THREE.Vector3();
    this._thrusting = [false, false]; // per controller

    // Controller events
    const { events } = this.app.controllers;
    this.onDispose(
      events.on('selectstart', ({ index }) => { this._thrusting[index] = true; }),
    );
    this.onDispose(
      events.on('selectend', ({ index }) => { this._thrusting[index] = false; }),
    );

    // Thrust direction indicator (line from controller)
    const thrustGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2),
    ]);
    this._thrustLine = new THREE.Line(
      thrustGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }),
    );
    this._thrustLine.renderOrder = 3;
    this._thrustLine.frustumCulled = false;
    this._thrustLine.visible = false;
    this.add(this._thrustLine);

    // Desktop auto-fly state
    this._autoTime   = 0;
    this._autoTarget = 0; // index into ring path
    this._ringPath   = ringPath;
    this._time       = 0;
  }

  update(dt) {
    this._time += dt;

    // Animate rings (gentle rotation)
    for (let i = 0; i < this._rings.length; i++) {
      this._rings[i].rotation.z += dt * 0.4 * (i % 2 === 0 ? 1 : -1);
    }

    // XR: thrust from controller direction
    if (this.app.renderer.xr.isPresenting) {
      const thrust = new THREE.Vector3();
      for (let i = 0; i < 2; i++) {
        if (!this._thrusting[i]) continue;
        const ctrl = this.app.controllers.controllers[i];
        if (!ctrl) continue;
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(
          ctrl.getWorldQuaternion(new THREE.Quaternion()),
        );
        thrust.addScaledVector(dir, FLY_SPEED * dt);
      }
      this._velocity.addScaledVector(this._velocity, -DRAG * dt);
      this._velocity.add(thrust);
      this.app.rig.translate(this._velocity.x * dt, this._velocity.y * dt, this._velocity.z * dt);
    } else {
      // Desktop: fly through the ring course automatically
      this._autoTime += dt;
      const target = this._ringPath[this._autoTarget % this._ringPath.length];
      const rigPos = this.app.rig.group.position;
      const toTarget = new THREE.Vector3().subVectors(target, rigPos);
      const dist = toTarget.length();

      if (dist < 1.2) {
        this._autoTarget = (this._autoTarget + 1) % this._ringPath.length;
      } else {
        const dir = toTarget.normalize();
        this._velocity.lerp(dir.multiplyScalar(FLY_SPEED), dt * 3);
        this.app.rig.translate(
          this._velocity.x * dt,
          this._velocity.y * dt,
          this._velocity.z * dt,
        );
      }
    }
  }

  dispose() {
    // Reset background
    this.app.scene.background = null;
    super.dispose();
  }
}

register({
  id: 'fly-move',
  title: 'Fly Move',
  category: 'Locomotion',
  tags: ['locomotion', 'fly', '6dof', 'controller'],
  description: 'Free 6DoF flight controlled by controller orientation and trigger; auto-flies through a ring course on desktop.',
  xr: 'vr',
  factory: (app) => new FlyMoveScene(app),
});
