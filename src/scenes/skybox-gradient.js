// Skybox Gradient — large inverted sphere sky with a sun disc; subtle time-of-day shift.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { lerp, clamp } from '../util/math.js';

// Time-of-day palette: [zenith, horizon, sun] for dawn, noon, dusk, night
const TOD = [
  { zenith: [0.05, 0.04, 0.12], horizon: [0.72, 0.38, 0.22], sun: [1.0, 0.75, 0.40] }, // dawn
  { zenith: [0.15, 0.40, 0.90], horizon: [0.60, 0.78, 0.98], sun: [1.0, 0.98, 0.80] }, // noon
  { zenith: [0.08, 0.06, 0.18], horizon: [0.80, 0.35, 0.10], sun: [1.0, 0.55, 0.15] }, // dusk
  { zenith: [0.01, 0.01, 0.06], horizon: [0.05, 0.05, 0.15], sun: [0.50, 0.55, 0.80] }, // night
];

function lerpPalette(a, b, t) {
  return {
    zenith: a.zenith.map((v, i) => lerp(v, b.zenith[i], t)),
    horizon: a.horizon.map((v, i) => lerp(v, b.horizon[i], t)),
    sun: a.sun.map((v, i) => lerp(v, b.sun[i], t)),
  };
}

class SkyboxGradientScene extends Scene {
  async init() {
    // Sky dome — inverted large sphere with vertex colours via shader
    const skyGeo = new THREE.SphereGeometry(40, 32, 16);
    skyGeo.scale(-1, 1, 1); // invert

    this._skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
        uSunColor: { value: new THREE.Color() },
        uSunSize: { value: 0.994 },
      },
      vertexShader: /* glsl */`
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uSunSize;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 sky = mix(uHorizon, uZenith, t * t);
          // Sun disc
          float d = dot(dir, uSunDir);
          float sun = smoothstep(uSunSize, uSunSize + 0.002, d);
          // Glow
          float glow = smoothstep(0.94, uSunSize, d) * 0.4;
          vec3 col = sky + uSunColor * (sun + glow);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeo, this._skyMat);
    sky.renderOrder = -1;
    this.add(sky);

    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x334422, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.add(ground);

    // A few trees (box + cone)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1a, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a1a, roughness: 0.85 });
    const treePositions = [[-4, 0, -6], [4, 0, -6], [-2.5, 0, -10], [3, 0, -12], [0, 0, -14]];
    treePositions.forEach(([x, , z]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 8), trunkMat);
      trunk.position.set(x, 0.35, z);
      this.add(trunk);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), leafMat);
      leaves.position.set(x, 1.25, z);
      this.add(leaves);
    });

    const sun = new THREE.DirectionalLight(0xfff8e0, 1.2);
    sun.position.set(-3, 4, -8);
    this.add(sun);
    this._sunLight = sun;

    const ambient = new THREE.AmbientLight(0x112233, 0.4);
    this.add(ambient);
    this._ambientLight = ambient;

    this._time = 0;
    this._todIndex = 0;
  }

  update(dt) {
    this._time += dt;

    // Full cycle: 20 seconds through all 4 phases
    const cycle = (this._time % 20) / 20; // 0..1
    const phaseF = cycle * TOD.length;
    const phaseIdx = Math.floor(phaseF) % TOD.length;
    const t = phaseF - Math.floor(phaseF);
    const a = TOD[phaseIdx];
    const b = TOD[(phaseIdx + 1) % TOD.length];
    const pal = lerpPalette(a, b, t);

    const u = this._skyMat.uniforms;
    u.uZenith.value.setRGB(...pal.zenith);
    u.uHorizon.value.setRGB(...pal.horizon);
    u.uSunColor.value.setRGB(...pal.sun);

    // Animate sun position (arc across sky)
    const angle = cycle * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunX = -Math.cos(angle);
    u.uSunDir.value.set(sunX * 0.5, sunY, -0.8).normalize();

    // Map sun to actual light
    this._sunLight.position.copy(u.uSunDir.value).multiplyScalar(10);
    this._sunLight.intensity = clamp(sunY * 2.5, 0, 2.5);
    this._sunLight.color.setRGB(...pal.sun);

    this._ambientLight.intensity = lerp(0.1, 0.5, clamp((sunY + 0.3) / 1.3, 0, 1));
  }

  dispose() { super.dispose(); }
}

register({
  id: 'skybox-gradient',
  title: 'Skybox Gradient',
  category: 'Rendering',
  tags: ['sky', 'gradient', 'shader', 'time-of-day'],
  description: 'An inverted sphere with a GLSL sky shader cycles through dawn, noon, dusk, and night with an animated sun disc and horizon glow.',
  xr: 'vr',
  factory: (app) => new SkyboxGradientScene(app),
});
