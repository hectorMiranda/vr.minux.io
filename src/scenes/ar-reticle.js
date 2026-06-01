// AR Reticle scene: a nicely styled ring + crosshair reticle that follows
// the hit-test pose with a pulse animation. Desktop: reticle floats above a
// faux ground and pulses continuously.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class ArReticleScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._pulseTime = 0;
    this._reticleVisible = false;
    this._desktopAngle = 0;

    // --- Build reticle group ---
    this._reticleGroup = new THREE.Group();
    this._reticleGroup.visible = false;

    // Outer ring
    const outerRingGeo = new THREE.RingGeometry(0.10, 0.13, 48);
    outerRingGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, ringMat);
    this._reticleGroup.add(outerRing);

    // Inner filled disc (subtle)
    const innerDiscGeo = new THREE.CircleGeometry(0.06, 32);
    innerDiscGeo.rotateX(-Math.PI / 2);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const innerDisc = new THREE.Mesh(innerDiscGeo, discMat);
    innerDisc.position.y = 0.001;
    this._reticleGroup.add(innerDisc);

    // Crosshair lines
    const crossMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8 });
    const armLen = 0.15;
    const gapLen = 0.04;
    // Build 4 arms: +x, -x, +z, -z with a gap in the centre
    const crossPts = [];
    crossPts.push(new THREE.Vector3(gapLen, 0, 0), new THREE.Vector3(armLen, 0, 0));
    crossPts.push(new THREE.Vector3(-gapLen, 0, 0), new THREE.Vector3(-armLen, 0, 0));
    crossPts.push(new THREE.Vector3(0, 0, gapLen), new THREE.Vector3(0, 0, armLen));
    crossPts.push(new THREE.Vector3(0, 0, -gapLen), new THREE.Vector3(0, 0, -armLen));
    for (let i = 0; i < crossPts.length; i += 2) {
      const geo = new THREE.BufferGeometry().setFromPoints([crossPts[i], crossPts[i + 1]]);
      const line = new THREE.Line(geo, crossMat);
      this._reticleGroup.add(line);
    }

    // Corner tick marks at 45-degree positions outside the ring
    const tickMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const tickR = 0.155;
    const tickLen = 0.04;
    const tickAngles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
    for (const ang of tickAngles) {
      const cx = Math.cos(ang);
      const cz = Math.sin(ang);
      const p0 = new THREE.Vector3(cx * tickR, 0, cz * tickR);
      const p1 = new THREE.Vector3(cx * (tickR + tickLen), 0, cz * (tickR + tickLen));
      const tgeo = new THREE.BufferGeometry().setFromPoints([p0, p1]);
      const tline = new THREE.Line(tgeo, tickMat);
      this._reticleGroup.add(tline);
    }

    // Store refs for pulse animation
    this._ringMat = ringMat;
    this._discMat = discMat;

    this._reticleGroup.matrixAutoUpdate = false;
    this.add(this._reticleGroup);

    // Desktop faux ground ring
    const groundGeo = new THREE.RingGeometry(0.48, 0.5, 48);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x555555,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    this._groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this._groundMesh.position.set(0, 0.005, -1);
    this.add(this._groundMesh);
  }

  onSessionStart(session) {
    this.app.scene.background = null;
    this._hitTestRequested = false;
    this._hitTestSource = null;
    this._groundMesh.visible = false;
  }

  onSessionEnd() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._reticleGroup.visible = false;
    this._groundMesh.visible = true;
  }

  update(dt, frame) {
    this._pulseTime += dt;

    // Pulse: scale + opacity oscillation
    const pulse = 0.5 + 0.5 * Math.sin(this._pulseTime * 3.5);
    const scale = 0.9 + 0.1 * pulse;
    this._ringMat.opacity = 0.6 + 0.4 * pulse;
    this._discMat.opacity = 0.10 + 0.15 * pulse;

    const xr = this.app.renderer.xr;
    const session = xr.getSession?.();

    if (session && frame) {
      if (!this._hitTestRequested) {
        this._hitTestRequested = true;
        session.requestReferenceSpace('viewer').then((viewerSpace) => {
          session.requestHitTestSource({ space: viewerSpace }).then((src) => {
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
              this._reticleGroup.visible = true;
              this._reticleGroup.matrixAutoUpdate = false;
              this._reticleGroup.matrix.fromArray(pose.transform.matrix);
              // Apply pulse scale on top of hit-test matrix
              const pulseMat = new THREE.Matrix4().makeScale(scale, scale, scale);
              this._reticleGroup.matrix.multiply(pulseMat);
              return;
            }
          }
        }
      }
      this._reticleGroup.visible = false;
    } else {
      // Desktop: orbit reticle on faux ground
      this._desktopAngle += dt * 0.7;
      const r = 0.35;
      const x = Math.cos(this._desktopAngle) * r;
      const z = -1 + Math.sin(this._desktopAngle) * 0.25;
      this._reticleGroup.visible = true;
      this._reticleGroup.matrixAutoUpdate = true;
      this._reticleGroup.position.set(x, 0.01, z);
      this._reticleGroup.scale.setScalar(scale);
    }
  }

  dispose() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    super.dispose();
  }
}

register({
  id: 'ar-reticle',
  title: 'AR Reticle',
  category: 'AR',
  tags: ['ar', 'reticle', 'hit-test', 'pulse'],
  description: 'Styled ring + crosshair reticle that follows hit-test poses with a pulsing animation.',
  xr: 'ar',
  factory: (app) => new ArReticleScene(app),
});
