// AR Shadow Catcher: a ShadowMaterial ground plane so a virtual object casts
// a believable shadow onto the real floor. A key light and a hovering object.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class ArShadowCatcherScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    this._time = 0;
    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._placed = false;

    // ------ Shadow catcher ground plane ------
    const catcherGeo = new THREE.PlaneGeometry(1.5, 1.5);
    catcherGeo.rotateX(-Math.PI / 2);
    const catcherMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    this._catcher = new THREE.Mesh(catcherGeo, catcherMat);
    this._catcher.position.set(0, 0, -1.0);
    this._catcher.receiveShadow = true;
    this.add(this._catcher);

    // ------ Hovering object (icosahedron) ------
    const objMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      roughness: 0.25,
      metalness: 0.45,
    });
    this._hoverObj = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.12, 1),
      objMat,
    );
    this._hoverObj.position.set(0, 0.35, -1.0);
    this._hoverObj.castShadow = true;
    this.add(this._hoverObj);

    // Small pedestal / shadow anchor disc (just for desktop context)
    const pedestalGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.01, 24);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
    this._pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    this._pedestal.position.set(0, 0.005, -1.0);
    this._pedestal.receiveShadow = true;
    this.add(this._pedestal);

    // ------ Key light (casting shadows) ------
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(1.5, 3, 1.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 8;
    keyLight.shadow.camera.left = -1;
    keyLight.shadow.camera.right = 1;
    keyLight.shadow.camera.top = 1;
    keyLight.shadow.camera.bottom = -1;
    keyLight.shadow.bias = -0.002;
    this.add(keyLight);
    this._keyLight = keyLight;

    // Enable shadows on renderer
    this.app.renderer.shadowMap.enabled = true;
    this.app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Soft fill
    const fill = new THREE.AmbientLight(0xffffff, 0.3);
    this.add(fill);

    // Reticle (for AR placement)
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

    this._reticlePos = new THREE.Vector3();
    this._reticleQuat = new THREE.Quaternion();
    this._reticleScale = new THREE.Vector3(1, 1, 1);

    this.onDispose(
      this.app.controllers.events.on('select', () => this._placeOnSurface()),
    );
  }

  _placeOnSurface() {
    if (!this._reticle.visible) return;
    const pos = this._reticlePos.clone();
    this._catcher.position.set(pos.x, pos.y, pos.z);
    this._hoverObj.position.set(pos.x, pos.y + 0.35, pos.z);
    this._pedestal.position.set(pos.x, pos.y + 0.005, pos.z);
    this._placed = true;
  }

  onSessionStart() {
    this.app.scene.background = null;
    this._hitTestRequested = false;
    this._hitTestSource = null;
    this._placed = false;
  }

  onSessionEnd() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    this._hitTestRequested = false;
    this._reticle.visible = false;
  }

  update(dt, frame) {
    this._time += dt;

    // Hover animation
    const hover = Math.sin(this._time * 1.4) * 0.04;
    this._hoverObj.position.y = (this._catcher.position.y + 0.35) + hover;
    this._hoverObj.rotation.y += dt * 0.6;
    this._hoverObj.rotation.x += dt * 0.3;

    // Soft shadow movement: key light orbits gently
    const lightAngle = this._time * 0.3;
    this._keyLight.position.set(
      1.5 * Math.cos(lightAngle),
      3,
      1.0 * Math.sin(lightAngle),
    );

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

    if (this._hitTestSource && !this._placed) {
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
    if (!this._placed) this._reticle.visible = false;
  }

  dispose() {
    this._hitTestSource?.cancel?.();
    this._hitTestSource = null;
    super.dispose();
  }
}

register({
  id: 'ar-shadow-catcher',
  title: 'AR Shadow Catcher',
  category: 'AR',
  tags: ['ar', 'shadow', 'ShadowMaterial', 'shadow-catcher', 'lighting'],
  description: 'A ShadowMaterial ground plane catches the shadow of a hovering virtual object, blending it with the real floor.',
  xr: 'ar',
  factory: (app) => new ArShadowCatcherScene(app),
});
