// AR Anchors: place objects and (when supported) create XRAnchors so they stay
// put; fall back to fixed transforms. Shows an anchor count label on a canvas
// texture.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

// Simple canvas-texture label
function makeLabel(text, width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.roundRect
    ? ctx.roundRect(2, 2, width - 4, height - 4, 10)
    : ctx.fillRect(2, 2, width - 4, height - 4);
  ctx.fill();
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  return { canvas, tex };
}

function makePlacedObject(color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.02, 16), mat);
  group.add(base);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), mat);
  body.position.y = 0.07;
  group.add(body);

  // Tiny spike on top
  const spike = new THREE.Mesh(
    new THREE.ConeGeometry(0.015, 0.05, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.3, metalness: 0.5 }),
  );
  spike.position.y = 0.125;
  group.add(spike);

  return group;
}

const OBJ_COLORS = [0x64b5f6, 0xef9a9a, 0xa5d6a7, 0xce93d8, 0xffcc80, 0x80deea];

class ArAnchorsScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._anchors = []; // {anchor|null, mesh, fallbackMatrix}
    this._colorIdx = 0;

    // Reticle
    const rGeo = new THREE.RingGeometry(0.07, 0.10, 32);
    rGeo.rotateX(-Math.PI / 2);
    this._reticleMat = new THREE.MeshBasicMaterial({
      color: 0x69f0ae,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this._reticle = new THREE.Mesh(rGeo, this._reticleMat);
    this._reticle.matrixAutoUpdate = false;
    this._reticle.visible = false;
    this.add(this._reticle);

    this._reticlePos = new THREE.Vector3();
    this._reticleQuat = new THREE.Quaternion();
    this._reticleScale = new THREE.Vector3(1, 1, 1);

    // Label
    const { canvas: labelCanvas, tex: labelTex } = makeLabel('Anchors: 0');
    this._labelCanvas = labelCanvas;
    this._labelTex = labelTex;
    const labelGeo = new THREE.PlaneGeometry(0.4, 0.1);
    this._labelMesh = new THREE.Mesh(
      labelGeo,
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false }),
    );
    this._labelMesh.position.set(0, 1.8, -1.2);
    this.add(this._labelMesh);

    // Container for placed objects
    this._objGroup = new THREE.Group();
    this.add(this._objGroup);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(1, 3, 2);
    this.add(dir);

    this.onDispose(
      this.app.controllers.events.on('select', () => this._place()),
    );

    // Desktop: auto-place a couple
    this._autoPlaced = false;
  }

  _updateLabel() {
    const count = this._anchors.length;
    const anchored = this._anchors.filter((a) => a.anchor !== null).length;
    const ctx = this._labelCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(2, 2, 252, 60);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Anchors: ${anchored} / ${count}`, 128, 32);
    this._labelTex.needsUpdate = true;
  }

  async _place() {
    if (!this._reticle.visible) return;

    const pos = this._reticlePos.clone();
    const quat = this._reticleQuat.clone();

    const color = OBJ_COLORS[this._colorIdx % OBJ_COLORS.length];
    this._colorIdx++;
    const mesh = makePlacedObject(color);
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    this._objGroup.add(mesh);
    this._disposables.push(mesh);

    const entry = { anchor: null, mesh, pos: pos.clone(), quat: quat.clone() };
    this._anchors.push(entry);
    this._updateLabel();

    // Try to create XRanchor
    const session = this.app.renderer.xr.getSession?.();
    if (session && typeof session.createAnchor === 'function') {
      try {
        const refSpace = this.app.renderer.xr.getReferenceSpace?.();
        if (refSpace) {
          const transform = new XRRigidTransform(
            { x: pos.x, y: pos.y, z: pos.z, w: 1 },
            { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
          );
          const anchor = await session.createAnchor(transform, refSpace);
          entry.anchor = anchor;
          this._updateLabel();
        }
      } catch (_e) {
        // Anchor API not available or failed — fallback to fixed transform
      }
    }
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
    // Delete anchors
    for (const entry of this._anchors) {
      entry.anchor?.delete?.();
      entry.anchor = null;
    }
    this._anchors.length = 0;
    this._updateLabel();
  }

  update(dt, frame) {
    // Update anchor-tracked meshes
    if (frame) {
      const refSpace = this.app.renderer.xr.getReferenceSpace?.();
      if (refSpace) {
        for (const entry of this._anchors) {
          if (entry.anchor) {
            const anchorPose = frame.getPose?.(entry.anchor.anchorSpace, refSpace);
            if (anchorPose) {
              entry.mesh.position.setFromMatrixPosition(
                new THREE.Matrix4().fromArray(anchorPose.transform.matrix),
              );
              entry.mesh.quaternion.setFromRotationMatrix(
                new THREE.Matrix4().fromArray(anchorPose.transform.matrix),
              );
            }
          }
        }
      }
    }

    // Label billboard
    const cam = this.app.camera;
    this._labelMesh.lookAt(cam.getWorldPosition(new THREE.Vector3()));

    // Desktop auto-place
    if (!this._autoPlaced && !frame) {
      this._autoPlaced = true;
      const spots = [new THREE.Vector3(-0.4, 0, -1.0), new THREE.Vector3(0.4, 0, -1.2)];
      for (const pos of spots) {
        const color = OBJ_COLORS[this._colorIdx % OBJ_COLORS.length];
        this._colorIdx++;
        const mesh = makePlacedObject(color);
        mesh.position.copy(pos);
        this._objGroup.add(mesh);
        this._disposables.push(mesh);
        this._anchors.push({ anchor: null, mesh, pos: pos.clone(), quat: new THREE.Quaternion() });
      }
      this._updateLabel();
    }

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
            this._reticle.matrix.decompose(this._reticlePos, this._reticleQuat, this._reticleScale);
            return;
          }
        }
      }
    }
    this._reticle.visible = false;
  }

  dispose() {
    for (const entry of this._anchors) {
      entry.anchor?.delete?.();
    }
    this._anchors.length = 0;
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    this._labelTex.dispose();
    super.dispose();
  }
}

register({
  id: 'ar-anchors',
  title: 'AR Anchors',
  category: 'AR',
  tags: ['ar', 'anchors', 'placement', 'hit-test', 'XRanchor'],
  description: 'Places objects using XRAnchors (when supported) so they stay fixed; falls back to world-space transforms; shows an anchor count label.',
  xr: 'ar',
  factory: (app) => new ArAnchorsScene(app),
});
