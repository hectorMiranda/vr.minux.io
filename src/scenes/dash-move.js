// dash-move — quick eased dash from point to point toward where the controller points.
// Uses easeOutCubic from ../util/easing.js for the dash animation.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { easeOutCubic } from '../util/easing.js';

const DASH_DURATION = 0.22; // seconds
const DASH_DISTANCE = 5;    // max meters per dash

class DashMoveScene extends Scene {
  async init() {
    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.add(floor);

    // Create a hex grid pattern on the floor
    const lineMat = new THREE.LineBasicMaterial({ color: 0x334466 });
    for (let row = -10; row <= 10; row++) {
      for (let col = -10; col <= 10; col++) {
        const cx = col * 1.5;
        const cz = row * 1.732 + (col % 2) * 0.866;
        const hex = this._makeHexOutline(cx, cz, 0.8);
        if (hex) {
          hex.material = lineMat;
          this.add(hex);
        }
      }
    }

    // Target indicator (ghost ring that shows where you'll dash)
    const ringGeo = new THREE.RingGeometry(0.3, 0.4, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this._targetRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0x44aaff, side: THREE.DoubleSide, depthTest: false }),
    );
    this._targetRing.renderOrder = 2;
    this._targetRing.visible = false;
    this.add(this._targetRing);

    // Direction ray
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -DASH_DISTANCE),
    ]);
    this._rayLine = new THREE.Line(
      rayGeo,
      new THREE.LineBasicMaterial({ color: 0x44aaff, depthTest: false }),
    );
    this._rayLine.renderOrder = 2;
    this._rayLine.frustumCulled = false;
    this._rayLine.visible = false;
    this.add(this._rayLine);

    // Reference scenery
    const boxColors = [0xff6633, 0x33aaff, 0xffcc33, 0xaa33ff, 0x33ffaa];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const r = 6 + (i % 3) * 2;
      const h = 0.5 + (i % 4) * 0.5;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, h * 2, 0.8),
        new THREE.MeshStandardMaterial({ color: boxColors[i % boxColors.length], roughness: 0.6 }),
      );
      box.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      box.castShadow = true;
      this.add(box);
    }

    // Dash state
    this._dashing   = false;
    this._dashFrom  = new THREE.Vector3();
    this._dashTo    = new THREE.Vector3();
    this._dashT     = 0;

    // Controller events
    const { events } = this.app.controllers;
    this.onDispose(
      events.on('selectstart', ({ index }) => {
        if (index === 0) this._showRay();
      }),
    );
    this.onDispose(
      events.on('selectend', ({ index }) => {
        if (index === 0) this._triggerDash();
      }),
    );

    // Raycaster for finding dash target
    this._raycaster = new THREE.Raycaster();
    this._floorRef  = floor;

    // Desktop auto-dash
    this._autoTimer  = 0;
    this._autoAngle  = 0;
    this._showingRay = false;
    this._sweepAngle = 0;
  }

  _makeHexOutline(cx, cz, r) {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0.002, cz + Math.sin(a) * r));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts));
  }

  _getControllerDashTarget(index) {
    const ctrl = this.app.controllers.controllers[index];
    if (!ctrl) return null;

    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(
      ctrl.getWorldQuaternion(new THREE.Quaternion()),
    );

    // Only project horizontally (flatten Y)
    const flatDir = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    const target = origin.clone().addScaledVector(flatDir, DASH_DISTANCE);
    target.y = 0;
    return target;
  }

  _showRay() {
    this._showingRay = true;
    this._rayLine.visible = true;
    this._targetRing.visible = true;
  }

  _triggerDash() {
    this._showingRay = false;
    this._rayLine.visible = false;
    this._targetRing.visible = false;

    const target = this._getControllerDashTarget(0);
    if (!target) return;
    this._startDash(target);
  }

  _startDash(target) {
    if (this._dashing) return;
    this._dashing = true;
    this._dashT   = 0;
    this._dashFrom.copy(this.app.rig.group.position);
    this._dashTo.copy(target);
    this._dashTo.y = this._dashFrom.y;
  }

  update(dt) {
    this._autoTimer  += dt;
    this._sweepAngle += dt * 0.8;

    // Desktop: animate a direction ray sweeping
    if (!this.app.renderer.xr.isPresenting) {
      const yaw = Math.sin(this._sweepAngle * 0.5) * 1.0;
      const origin = new THREE.Vector3(0, 1.4, 0)
        .add(this.app.rig.group.position);
      const flatDir = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
      const target  = origin.clone().addScaledVector(flatDir, DASH_DISTANCE);
      target.y = 0;

      this._targetRing.visible = true;
      this._targetRing.position.copy(target);

      // Auto-dash every 2.5s
      if (this._autoTimer > 2.5 && !this._dashing) {
        this._autoTimer = 0;
        this._startDash(target);
      }
    }

    // Show ray from controller 0
    if (this._showingRay && this.app.renderer.xr.isPresenting) {
      const t = this._getControllerDashTarget(0);
      if (t) {
        this._targetRing.visible = true;
        this._targetRing.position.copy(t);
      }
    }

    // Animate dash
    if (this._dashing) {
      this._dashT += dt / DASH_DURATION;
      if (this._dashT >= 1) {
        this._dashT  = 1;
        this._dashing = false;
      }
      const eased = easeOutCubic(this._dashT);
      this.app.rig.moveTo(
        this._dashFrom.x + (this._dashTo.x - this._dashFrom.x) * eased,
        this._dashFrom.y,
        this._dashFrom.z + (this._dashTo.z - this._dashFrom.z) * eased,
      );
    }
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'dash-move',
  title: 'Dash Move',
  category: 'Locomotion',
  tags: ['locomotion', 'dash', 'easing', 'teleport'],
  description: 'Quick eased dash toward where the controller points using easeOutCubic.',
  xr: 'vr',
  factory: (app) => new DashMoveScene(app),
});
