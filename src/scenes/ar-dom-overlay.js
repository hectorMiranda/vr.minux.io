// AR DOM Overlay: creates a div appended to document.body (removed on dispose)
// showing AR controls/instructions over the camera feed.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

function buildOverlayDOM() {
  const el = document.createElement('div');
  el.id = 'ar-dom-overlay';
  Object.assign(el.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '9999',
    fontFamily: 'sans-serif',
  });

  // Top bar
  const topBar = document.createElement('div');
  Object.assign(topBar.style, {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    borderRadius: '12px',
    padding: '8px 20px',
    fontSize: '15px',
    letterSpacing: '0.5px',
    pointerEvents: 'none',
    backdropFilter: 'blur(4px)',
  });
  topBar.textContent = 'AR DOM Overlay Active';
  el.appendChild(topBar);

  // Bottom instruction card
  const card = document.createElement('div');
  Object.assign(card.style, {
    position: 'absolute',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.60)',
    color: '#fff',
    borderRadius: '14px',
    padding: '12px 24px',
    fontSize: '14px',
    lineHeight: '1.6',
    maxWidth: '320px',
    textAlign: 'center',
    pointerEvents: 'none',
    backdropFilter: 'blur(6px)',
  });
  card.innerHTML = [
    '<strong>Controls</strong>',
    '&#x25CF; Tap surface to interact',
    '&#x25CF; Pinch to scale',
    '&#x25CF; Two-finger drag to move',
  ].join('<br>');
  el.appendChild(card);

  // Counter badge (updated externally)
  const badge = document.createElement('div');
  badge.id = 'ar-dom-badge';
  Object.assign(badge.style, {
    position: 'absolute',
    top: '16px',
    right: '20px',
    background: 'rgba(0,180,150,0.75)',
    color: '#fff',
    borderRadius: '999px',
    padding: '4px 14px',
    fontSize: '13px',
    fontWeight: 'bold',
    pointerEvents: 'none',
  });
  badge.textContent = 'Objects: 0';
  el.appendChild(badge);

  return { el, badge };
}

class ArDomOverlayScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    this._overlayEl = null;
    this._badge = null;
    this._objectCount = 0;
    this._time = 0;
    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._reticlePos = new THREE.Vector3();
    this._reticleQuat = new THREE.Quaternion();

    // Reticle
    const rGeo = new THREE.RingGeometry(0.08, 0.12, 32);
    rGeo.rotateX(-Math.PI / 2);
    this._reticle = new THREE.Mesh(rGeo, new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }));
    this._reticle.matrixAutoUpdate = false;
    this._reticle.visible = false;
    this.add(this._reticle);

    // Floating cubes group
    this._objGroup = new THREE.Group();
    this.add(this._objGroup);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 3, 2);
    this.add(dir);

    // Desktop: a couple of cubes visible without AR
    this._addCube(new THREE.Vector3(-0.3, 1.4, -1.0));
    this._addCube(new THREE.Vector3( 0.3, 1.5, -1.1));

    this.onDispose(
      this.app.controllers.events.on('select', () => this._onSelect()),
    );
  }

  _addCube(position) {
    const colors = [0x64b5f6, 0xef9a9a, 0xa5d6a7, 0xce93d8, 0xffcc80, 0x80deea];
    const color = colors[this._objectCount % colors.length];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 }),
    );
    mesh.position.copy(position);
    mesh.userData.phase = Math.random() * Math.PI * 2;
    this._objGroup.add(mesh);
    this._disposables.push(mesh);
    this._objectCount++;
    if (this._badge) this._badge.textContent = `Objects: ${this._objectCount}`;
  }

  _onSelect() {
    if (!this._reticle.visible) return;
    const m = this._reticle.matrix;
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    pos.y += 0.05;
    this._addCube(pos);
  }

  onSessionStart(session) {
    this.app.scene.background = null;
    this._hitTestRequested = false;
    this._hitTestSource = null;

    // Create DOM overlay
    if (!this._overlayEl) {
      const { el, badge } = buildOverlayDOM();
      this._overlayEl = el;
      this._badge = badge;
      document.body.appendChild(el);
      if (this._badge) this._badge.textContent = `Objects: ${this._objectCount}`;
    }
    this._overlayEl.style.display = 'block';
  }

  onSessionEnd() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._reticle.visible = false;
    if (this._overlayEl) this._overlayEl.style.display = 'none';
  }

  update(dt, frame) {
    this._time += dt;

    // Animate placed cubes
    let i = 0;
    for (const child of this._objGroup.children) {
      const base = child.userData.baseY ?? (child.userData.baseY = child.position.y);
      child.position.y = base + Math.sin(this._time * 1.0 + (child.userData.phase ?? i)) * 0.03;
      child.rotation.y += dt * 0.6;
      i++;
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
            return;
          }
        }
      }
    }
    this._reticle.visible = false;
  }

  dispose() {
    if (this._overlayEl) {
      this._overlayEl.remove();
      this._overlayEl = null;
      this._badge = null;
    }
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    super.dispose();
  }
}

register({
  id: 'ar-dom-overlay',
  title: 'AR DOM Overlay',
  category: 'AR',
  tags: ['ar', 'dom-overlay', 'ui', 'hud'],
  description: 'Uses a DOM overlay element to show AR controls and instructions over the camera feed; element is removed on dispose.',
  xr: 'ar',
  factory: (app) => new ArDomOverlayScene(app),
});
