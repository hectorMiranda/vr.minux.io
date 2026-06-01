// AR Place Objects: tap (select) to place a small procedural robot made of
// primitives at the reticle. Desktop auto-places a few robots.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

// Build a tiny robot from primitives. Returns a Group.
function makeRobot(color = 0x4fc3f7) {
  const group = new THREE.Group();
  const mat = (c) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.3 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.06), mat(color));
  body.position.y = 0.09;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), mat(color));
  head.position.y = 0.17;
  group.add(head);

  // Eyes
  const eyeMat = mat(0xffffff);
  const pupilMat = mat(0x111111);
  for (const side of [-0.018, 0.018]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.010, 8, 8), eyeMat);
    eye.position.set(side, 0.175, 0.031);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), pupilMat);
    pupil.position.set(side, 0.175, 0.039);
    group.add(pupil);
  }

  // Antenna
  const antStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6),
    mat(0xaaaaaa),
  );
  antStick.position.set(0, 0.22, 0);
  group.add(antStick);
  const antBall = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), mat(0xff5722));
  antBall.position.set(0, 0.245, 0);
  group.add(antBall);

  // Arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.07, 0.015),
      mat(0xaaaaaa),
    );
    arm.position.set(side * 0.054, 0.085, 0);
    group.add(arm);
  }

  // Legs
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.06, 0.022),
      mat(0x555555),
    );
    leg.position.set(side * 0.025, 0.03, 0);
    group.add(leg);
    // Foot
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.012, 0.04),
      mat(0x222222),
    );
    foot.position.set(side * 0.025, 0.006, 0.009);
    group.add(foot);
  }

  return group;
}

const ROBOT_COLORS = [0x4fc3f7, 0xef9a9a, 0xa5d6a7, 0xce93d8, 0xffcc80];
let _colorIdx = 0;

class ArPlaceObjectsScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._desktopAngle = 0;
    this._placedCount = 0;

    // Reticle
    const rGeo = new THREE.RingGeometry(0.08, 0.115, 32);
    rGeo.rotateX(-Math.PI / 2);
    this._reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    this._reticle = new THREE.Mesh(rGeo, this._reticleMat);
    this._reticle.matrixAutoUpdate = false;
    this._reticle.visible = false;
    this.add(this._reticle);

    this._reticlePos = new THREE.Vector3();
    this._reticleQuat = new THREE.Quaternion();

    // Container for placed robots
    this._robotGroup = new THREE.Group();
    this.add(this._robotGroup);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(1, 3, 2);
    this.add(dir);

    // Controller select
    this.onDispose(
      this.app.controllers.events.on('select', () => this._placeRobot()),
    );
  }

  _placeRobot() {
    const robot = makeRobot(ROBOT_COLORS[_colorIdx % ROBOT_COLORS.length]);
    _colorIdx++;

    if (this._reticle.visible || this._reticlePos.length() > 0) {
      // Use reticle pose if available
      const pos = this._reticlePos.clone();
      robot.position.copy(pos);
    } else {
      // Fallback: place in front of camera
      robot.position.set(
        (Math.random() - 0.5) * 1.2,
        0,
        -1 - Math.random() * 0.5,
      );
    }
    this._robotGroup.add(robot);
    this._placedCount++;
    // track for disposal
    this._disposables.push(robot);
  }

  onSessionStart(session) {
    this.app.scene.background = null;
    this._hitTestRequested = false;
    this._hitTestSource = null;
  }

  onSessionEnd() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._reticle.visible = false;
  }

  _autoPlaceDesktop() {
    // Place 3 robots at fixed spots for desktop preview
    const spots = [
      new THREE.Vector3(-0.55, 0, -1.1),
      new THREE.Vector3(0, 0, -1.3),
      new THREE.Vector3(0.55, 0, -1.0),
    ];
    for (const pos of spots) {
      const robot = makeRobot(ROBOT_COLORS[_colorIdx % ROBOT_COLORS.length]);
      _colorIdx++;
      robot.position.copy(pos);
      this._robotGroup.add(robot);
      this._disposables.push(robot);
    }
  }

  update(dt, frame) {
    // Auto-place on desktop (once)
    if (!this._autoPlaced && !frame) {
      this._autoPlaced = true;
      this._autoPlaceDesktop();
    }

    // Gentle bob on placed robots
    const t = performance.now() / 1000;
    let i = 0;
    this._robotGroup.children.forEach((r) => {
      const base = r.userData.baseY ?? (r.userData.baseY = r.position.y);
      r.position.y = base + Math.sin(t * 1.2 + i * 1.1) * 0.008;
      r.rotation.y += dt * 0.4;
      i++;
    });

    const xr = this.app.renderer.xr;
    const session = xr.getSession?.();
    if (!session || !frame) return;

    if (!this._hitTestRequested) {
      this._hitTestRequested = true;
      session.requestReferenceSpace('viewer').then((vs) => {
        session.requestHitTestSource({ space: vs }).then((src) => {
          this._hitTestSource = src;
        }).catch(() => {});
      }).catch(() => {});
      session.addEventListener('end', () => {
        this._hitTestRequested = false;
        this._hitTestSource = null;
      }, { once: true });
    }

    if (this._hitTestSource) {
      const refSpace = xr.getReferenceSpace?.();
      if (refSpace) {
        const hits = frame.getHitTestResults?.(this._hitTestSource);
        if (hits && hits.length > 0) {
          const pose = hits[0].getPose(refSpace);
          if (pose) {
            this._reticle.visible = true;
            this._reticle.matrixAutoUpdate = false;
            this._reticle.matrix.fromArray(pose.transform.matrix);
            this._reticle.matrix.decompose(
              this._reticlePos,
              this._reticleQuat,
              new THREE.Vector3(),
            );
            return;
          }
        }
      }
    }
    this._reticle.visible = false;
  }

  dispose() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    super.dispose();
  }
}

register({
  id: 'ar-place-objects',
  title: 'AR Place Objects',
  category: 'AR',
  tags: ['ar', 'placement', 'hit-test', 'robot', 'primitives'],
  description: 'Tap to place a tiny procedural robot at the hit-test reticle; keep multiple placed objects.',
  xr: 'ar',
  factory: (app) => new ArPlaceObjectsScene(app),
});
