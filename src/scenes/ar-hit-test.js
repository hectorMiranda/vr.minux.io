// AR Hit-Test scene: request a hit-test source on session start;
// place a reticle where the hit-test ray meets a surface;
// on select drop a marker. Desktop: show a moving reticle on a faux ground.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class ArHitTestScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    // Reticle: ring on a flat disc
    const reticleGeo = new THREE.RingGeometry(0.08, 0.12, 32);
    reticleGeo.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.reticle = new THREE.Mesh(reticleGeo, reticleMat);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.add(this.reticle);

    // Container for dropped markers
    this.markers = new THREE.Group();
    this.add(this.markers);

    // Internal state
    this._hitTestSource = null;
    this._hitTestSourceRequested = false;
    this._desktopAngle = 0;
    this._desktopRadius = 0.6;
    this._reticleHit = false;

    // Desktop faux ground indicator
    const groundRingGeo = new THREE.RingGeometry(0.55, 0.6, 48);
    groundRingGeo.rotateX(-Math.PI / 2);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0x444444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    this._groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    this._groundRing.position.set(0, 0.01, -1);
    this.add(this._groundRing);

    // Controller select to drop marker
    this.onDispose(
      this.app.controllers.events.on('select', () => this._dropMarker()),
    );
  }

  _makeMarker(position, quaternion) {
    const geo = new THREE.ConeGeometry(0.04, 0.15, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff5722,
      roughness: 0.5,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.075; // lift above surface
    if (quaternion) mesh.quaternion.copy(quaternion);
    this.markers.add(mesh);
    // track for disposal
    this._disposables.push(mesh);
    return mesh;
  }

  _dropMarker() {
    if (!this.reticle.visible) return;
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    this.reticle.matrix.decompose(pos, quat, new THREE.Vector3());
    this._makeMarker(pos, quat);
  }

  onSessionStart(session) {
    // AR: transparent background during session
    this.app.scene.background = null;
    this._hitTestSourceRequested = false;
    this._hitTestSource = null;
    this._groundRing.visible = false;
  }

  onSessionEnd() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    this._hitTestSourceRequested = false;
    this.reticle.visible = false;
    this._groundRing.visible = true;
  }

  update(dt, frame) {
    const xr = this.app.renderer.xr;
    const session = xr.getSession?.();

    if (session && frame) {
      // Request hit-test source once
      if (!this._hitTestSourceRequested) {
        this._hitTestSourceRequested = true;
        session.requestReferenceSpace('viewer').then((refSpace) => {
          session.requestHitTestSource({ space: refSpace }).then((source) => {
            this._hitTestSource = source;
          }).catch(() => {});
        }).catch(() => {});

        session.addEventListener('end', () => {
          this._hitTestSourceRequested = false;
          this._hitTestSource = null;
        }, { once: true });
      }

      // Update reticle from hit-test
      if (this._hitTestSource) {
        const refSpace = xr.getReferenceSpace?.();
        if (refSpace) {
          const hits = frame.getHitTestResults?.(this._hitTestSource);
          if (hits && hits.length > 0) {
            const pose = hits[0].getPose(refSpace);
            if (pose) {
              this.reticle.visible = true;
              this.reticle.matrix.fromArray(pose.transform.matrix);
            } else {
              this.reticle.visible = false;
            }
          } else {
            this.reticle.visible = false;
          }
        }
      }
    } else {
      // Desktop: animate reticle on faux ground plane
      this._desktopAngle += dt * 0.8;
      const r = this._desktopRadius;
      const x = Math.cos(this._desktopAngle) * r;
      const z = -1 + Math.sin(this._desktopAngle) * r * 0.5;
      this.reticle.visible = true;
      this.reticle.matrixAutoUpdate = true;
      this.reticle.position.set(x, 0.01, z);
      this.reticle.rotation.set(-Math.PI / 2, 0, 0);
    }
  }

  dispose() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    super.dispose();
  }
}

register({
  id: 'ar-hit-test',
  title: 'AR Hit-Test',
  category: 'AR',
  tags: ['ar', 'hit-test', 'reticle', 'placement'],
  description: 'Requests a hit-test source and places a reticle on detected surfaces; tap to drop a marker.',
  xr: 'ar',
  factory: (app) => new ArHitTestScene(app),
});
