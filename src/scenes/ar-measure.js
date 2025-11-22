// AR Measure: place two points with select and draw a line + distance label
// between them (meters). Desktop demo places sample points automatically.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

function makeLabel(canvas, text) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, 10);
    ctx.fill();
  } else {
    ctx.fillRect(4, 4, w - 8, h - 8);
  }
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ffe082';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
}

function makePinMesh(color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });

  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 12), mat);
  pin.position.y = 0;
  group.add(pin);

  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.08, 8),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 }),
  );
  stick.position.y = 0.04;
  group.add(stick);

  return group;
}

class ArMeasureScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._points = []; // up to 2 { pos: Vector3, pin: Group }
    this._lineGroup = new THREE.Group();
    this.add(this._lineGroup);

    // Reticle
    const rGeo = new THREE.RingGeometry(0.06, 0.09, 32);
    rGeo.rotateX(-Math.PI / 2);
    this._reticle = new THREE.Mesh(rGeo, new THREE.MeshBasicMaterial({
      color: 0xffd740,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }));
    this._reticle.matrixAutoUpdate = false;
    this._reticle.visible = false;
    this.add(this._reticle);

    this._reticlePos = new THREE.Vector3();
    this._reticleQuat = new THREE.Quaternion();
    this._reticleScale = new THREE.Vector3(1, 1, 1);

    // Label
    this._labelCanvas = document.createElement('canvas');
    this._labelCanvas.width = 256;
    this._labelCanvas.height = 56;
    makeLabel(this._labelCanvas, 'Place 1st point');
    this._labelTex = new THREE.CanvasTexture(this._labelCanvas);
    this._labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.083),
      new THREE.MeshBasicMaterial({ map: this._labelTex, transparent: true, depthWrite: false }),
    );
    this._labelMesh.position.set(0, 1.9, -1.0);
    this.add(this._labelMesh);

    // Line geometry (two endpoints)
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(6); // 2 vec3
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this._lineMesh = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0xffd740, linewidth: 2 }),
    );
    this._lineMesh.visible = false;
    this.add(this._lineMesh);
    this._linePositions = linePositions;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 3, 2);
    this.add(dir);

    this.onDispose(
      this.app.controllers.events.on('select', () => this._placePoint()),
    );
  }

  _placePoint() {
    if (!this._reticle.visible && this._points.length === 0) return;

    if (this._points.length >= 2) {
      // Reset
      for (const { pin } of this._points) this.group.remove(pin);
      this._points = [];
      this._lineMesh.visible = false;
      makeLabel(this._labelCanvas, 'Place 1st point');
      this._labelTex.needsUpdate = true;
      return;
    }

    const pos = this._reticlePos.clone();
    const color = this._points.length === 0 ? 0x4fc3f7 : 0xff7043;
    const pin = makePinMesh(color);
    pin.position.copy(pos);
    this.group.add(pin);
    this._disposables.push(pin);
    this._points.push({ pos, pin });

    if (this._points.length === 1) {
      makeLabel(this._labelCanvas, 'Place 2nd point');
      this._labelTex.needsUpdate = true;
    } else if (this._points.length === 2) {
      this._updateMeasurement();
    }
  }

  _updateMeasurement() {
    if (this._points.length < 2) return;
    const a = this._points[0].pos;
    const b = this._points[1].pos;

    this._linePositions[0] = a.x;
    this._linePositions[1] = a.y;
    this._linePositions[2] = a.z;
    this._linePositions[3] = b.x;
    this._linePositions[4] = b.y;
    this._linePositions[5] = b.z;
    this._lineMesh.geometry.attributes.position.needsUpdate = true;
    this._lineMesh.visible = true;

    const dist = a.distanceTo(b);
    makeLabel(this._labelCanvas, `${dist.toFixed(3)} m  (tap to reset)`);
    this._labelTex.needsUpdate = true;

    // Move label to midpoint
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 0.12;
    this._labelMesh.position.copy(mid);
  }

  _autoPlaceDesktop() {
    const pa = new THREE.Vector3(-0.4, 0, -1.0);
    const pb = new THREE.Vector3(0.5, 0.0, -1.5);

    const pinA = makePinMesh(0x4fc3f7);
    pinA.position.copy(pa);
    this.group.add(pinA);
    this._disposables.push(pinA);

    const pinB = makePinMesh(0xff7043);
    pinB.position.copy(pb);
    this.group.add(pinB);
    this._disposables.push(pinB);

    this._points = [{ pos: pa, pin: pinA }, { pos: pb, pin: pinB }];
    this._reticlePos.copy(pa);
    this._reticle.visible = false;
    this._reticle.matrixAutoUpdate = true;
    this._reticle.position.copy(pa);
    this._updateMeasurement();
  }

  onSessionStart() {
    this.app.scene.background = null;
    this._hitTestRequested = false;
    this._hitTestSource = null;
    // Reset points
    for (const { pin } of this._points) this.group.remove(pin);
    this._points = [];
    this._lineMesh.visible = false;
    makeLabel(this._labelCanvas, 'Place 1st point');
    this._labelTex.needsUpdate = true;
  }

  onSessionEnd() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._reticle.visible = false;
  }

  update(dt, frame) {
    // Billboard label
    const cam = this.app.camera;
    this._labelMesh.lookAt(cam.getWorldPosition(new THREE.Vector3()));

    // Desktop
    if (!frame) {
      if (!this._desktopDone) {
        this._desktopDone = true;
        this._autoPlaceDesktop();
      }
      return;
    }

    const xr = this.app.renderer.xr;
    const session = xr.getSession?.();
    if (!session) return;

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
            this._reticle.matrix.decompose(this._reticlePos, this._reticleQuat, this._reticleScale);
            // Live second-point measurement preview
            if (this._points.length === 1) {
              this._points.push({ pos: this._reticlePos.clone(), pin: null });
              this._updateMeasurement();
              this._points.pop();
            }
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
    this._labelTex.dispose();
    super.dispose();
  }
}

register({
  id: 'ar-measure',
  title: 'AR Measure',
  category: 'AR',
  tags: ['ar', 'measure', 'distance', 'hit-test', 'label'],
  description: 'Place two points with select to draw a line and display the distance in meters between them.',
  xr: 'ar',
  factory: (app) => new ArMeasureScene(app),
});
