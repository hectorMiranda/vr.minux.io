// AR Light Estimation: drive ambient/directional lights from the XR light
// estimate when available. Show estimated intensity on a label. Desktop
// animates a day/night cycle.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

function makeLabel(canvas, text) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 12);
  } else {
    ctx.rect(4, 4, canvas.width - 8, canvas.height - 8);
  }
  ctx.fill();
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#ffe082';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

class ArLightEstimationScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    this._time = 0;
    this._lightProbe = null;
    this._xrLightSource = null;

    // Ambient driven by estimate
    this._ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.add(this._ambient);

    // Directional driven by estimate direction
    this._dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this._dirLight.position.set(2, 3, 2);
    this._dirLight.castShadow = false;
    this.add(this._dirLight);

    // Demo object: a sphere that shows the light
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.2, metalness: 0.4 }),
    );
    sphere.position.set(0, 1.5, -1.0);
    this.add(sphere);
    this._sphere = sphere;

    // Small satellite sphere to show direction
    const indicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.3, metalness: 0.6 }),
    );
    indicator.position.set(0.3, 1.7, -0.85);
    this.add(indicator);
    this._indicator = indicator;

    // Label
    this._labelCanvas = document.createElement('canvas');
    this._labelCanvas.width = 320;
    this._labelCanvas.height = 64;
    makeLabel(this._labelCanvas, 'Light: —');
    this._labelTex = new THREE.CanvasTexture(this._labelCanvas);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.096),
      new THREE.MeshBasicMaterial({
        map: this._labelTex,
        transparent: true,
        depthWrite: false,
      }),
    );
    labelMesh.position.set(0, 1.9, -1.0);
    this.add(labelMesh);
    this._labelMesh = labelMesh;
  }

  _updateLabel(intensity, temperature) {
    const tempStr = temperature != null ? `  ${Math.round(temperature)}K` : '';
    makeLabel(this._labelCanvas, `Light: ${intensity.toFixed(2)} lm${tempStr}`);
    this._labelTex.needsUpdate = true;
  }

  onSessionStart(session) {
    this.app.scene.background = null;

    // Request light-estimation feature
    if (typeof XRLightProbe !== 'undefined' && session.requestLightProbe) {
      session.requestLightProbe().then((probe) => {
        this._lightProbe = probe;
        probe.addEventListener('reflectionchange', () => {
          // Update env map from probe when supported
          const renderer = this.app.renderer;
          if (probe.probeSpace) {
            const env = this._xrLightSource?.environmentMap;
            if (env) this.app.scene.environment = env;
          }
        });
      }).catch(() => {});
    }
  }

  onSessionEnd() {
    this._lightProbe = null;
    this._xrLightSource = null;
    this.app.scene.environment = null;
  }

  update(dt, frame) {
    this._time += dt;

    // Billboard label
    const cam = this.app.camera;
    this._labelMesh.lookAt(cam.getWorldPosition(new THREE.Vector3()));

    if (frame && this._lightProbe) {
      // Get light estimate from XR frame
      const estimate = frame.getLightEstimate?.(this._lightProbe);
      if (estimate) {
        // Primary light direction
        const d = estimate.primaryLightDirection;
        if (d) this._dirLight.position.set(d.x, d.y, d.z);

        // Primary light intensity (linear)
        const i = estimate.primaryLightIntensity;
        if (i) {
          // intensity is XRLightProbe linear value; scale to Three's range
          this._dirLight.intensity = Math.max(0, i.y) * 0.001;
          this._dirLight.color.setRGB(
            Math.max(0, i.x) / Math.max(0.001, i.y),
            1,
            Math.max(0, i.z) / Math.max(0.001, i.y),
          );
        }

        // Spherical harmonics for ambient
        const sh = estimate.sphericalHarmonicsCoefficients;
        if (sh && sh.length >= 3) {
          // L0 coefficient approximates overall ambient
          const l0 = Math.sqrt(sh[0] * sh[0] + sh[1] * sh[1] + sh[2] * sh[2]);
          this._ambient.intensity = Math.max(0.05, l0 * 0.3);
        }

        const lm = estimate.primaryLightIntensity?.y ?? 1000;
        this._updateLabel(lm, null);

        // Move indicator to show direction
        const normDir = new THREE.Vector3(d?.x ?? 0.5, d?.y ?? 1, d?.z ?? 0.5).normalize();
        this._indicator.position.set(
          this._sphere.position.x + normDir.x * 0.35,
          this._sphere.position.y + normDir.y * 0.2,
          this._sphere.position.z + normDir.z * 0.35,
        );
        return;
      }
    }

    // Desktop / fallback: day cycle
    const cycle = (Math.sin(this._time * 0.25) + 1) * 0.5; // 0..1
    const sunAngle = this._time * 0.25;
    this._dirLight.position.set(
      Math.cos(sunAngle) * 2,
      Math.abs(Math.sin(sunAngle)) * 3 + 0.3,
      Math.sin(sunAngle) * 1.5,
    );

    // Warm at sunrise/sunset, white at noon
    const warmth = 1 - Math.abs(cycle - 0.5) * 1.6;
    this._dirLight.color.setRGB(1, 0.75 + 0.25 * cycle, 0.5 + 0.5 * cycle);
    this._dirLight.intensity = 0.3 + cycle * 1.0;
    this._ambient.intensity = 0.1 + cycle * 0.5;

    // Sky background colour on desktop
    const sky = new THREE.Color().setHSL(0.58, 0.5, 0.15 + cycle * 0.5);
    this.app.scene.background = sky;

    const lm = 800 + cycle * 2000;
    this._updateLabel(lm, 3000 + warmth * 3500);

    // Move indicator with sun
    this._indicator.position.copy(this._dirLight.position).multiplyScalar(0.25).add(this._sphere.position);
  }

  dispose() {
    this._labelTex.dispose();
    this.app.scene.environment = null;
    this.app.scene.background = null;
    super.dispose();
  }
}

register({
  id: 'ar-light-estimation',
  title: 'AR Light Estimation',
  category: 'AR',
  tags: ['ar', 'light-estimation', 'XRLightProbe', 'lighting'],
  description: 'Drives ambient and directional lights from the XR light estimate; shows estimated intensity; desktop animates a day/night cycle.',
  xr: 'ar',
  factory: (app) => new ArLightEstimationScene(app),
});
