// Day-Night — a scene whose lighting/sky colour cycles dawn→noon→dusk→night.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { lerp, clamp } from '../util/math.js';

// Keyframe data: [sky bg, ambient colour/intensity, sun colour/intensity]
const KEYS = [
  // dawn
  {
    t: 0,
    bg: new THREE.Color(0xf08060),
    ambient: { color: new THREE.Color(0x553322), intensity: 0.4 },
    sun: { color: new THREE.Color(0xff8030), intensity: 0.8, pos: new THREE.Vector3(-3, 0.5, -3) },
  },
  // noon
  {
    t: 0.25,
    bg: new THREE.Color(0x78b4f0),
    ambient: { color: new THREE.Color(0x334466), intensity: 0.8 },
    sun: { color: new THREE.Color(0xfff8e8), intensity: 3.0, pos: new THREE.Vector3(0, 5, -1) },
  },
  // dusk
  {
    t: 0.5,
    bg: new THREE.Color(0xe05020),
    ambient: { color: new THREE.Color(0x441122), intensity: 0.4 },
    sun: { color: new THREE.Color(0xff5010), intensity: 0.9, pos: new THREE.Vector3(3, 0.4, -3) },
  },
  // night
  {
    t: 0.75,
    bg: new THREE.Color(0x050816),
    ambient: { color: new THREE.Color(0x0a0e2a), intensity: 0.2 },
    sun: { color: new THREE.Color(0x3355aa), intensity: 0.15, pos: new THREE.Vector3(0, 5, -1) },
  },
  // back to dawn (wrap)
  {
    t: 1.0,
    bg: new THREE.Color(0xf08060),
    ambient: { color: new THREE.Color(0x553322), intensity: 0.4 },
    sun: { color: new THREE.Color(0xff8030), intensity: 0.8, pos: new THREE.Vector3(-3, 0.5, -3) },
  },
];

function lerpKey(a, b, lt) {
  return {
    bg: new THREE.Color().lerpColors(a.bg, b.bg, lt),
    ambient: {
      color: new THREE.Color().lerpColors(a.ambient.color, b.ambient.color, lt),
      intensity: lerp(a.ambient.intensity, b.ambient.intensity, lt),
    },
    sun: {
      color: new THREE.Color().lerpColors(a.sun.color, b.sun.color, lt),
      intensity: lerp(a.sun.intensity, b.sun.intensity, lt),
      pos: new THREE.Vector3().lerpVectors(a.sun.pos, b.sun.pos, lt),
    },
  };
}

function getFrame(cycle) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i], b = KEYS[i + 1];
    if (cycle >= a.t && cycle < b.t) {
      const lt = (cycle - a.t) / (b.t - a.t);
      return lerpKey(a, b, lt);
    }
  }
  return lerpKey(KEYS[KEYS.length - 2], KEYS[KEYS.length - 1], 1);
}

class DayNightScene extends Scene {
  async init() {
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x335522, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.add(ground);

    // House
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a0, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b3a2a, roughness: 0.7 });

    const walls = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.0), wallMat);
    walls.position.set(0, 0.45, -2.5);
    walls.castShadow = true;
    walls.receiveShadow = true;
    this.add(walls);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.7, 4), roofMat);
    roof.position.set(0, 1.25, -2.5);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.add(roof);

    // Door
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.4, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x6a3a1a, roughness: 0.7 }),
    );
    door.position.set(0, 0.2, -2.0);
    this.add(door);

    // Trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1a, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a1a, roughness: 0.85 });
    [[-1.2, -2.2], [1.2, -2.8], [-1.8, -3.5]].forEach(([x, z]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.6, 8), trunkMat);
      trunk.position.set(x, 0.3, z);
      trunk.castShadow = true;
      this.add(trunk);
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), leafMat);
      leaves.position.set(x, 0.85, z);
      leaves.castShadow = true;
      this.add(leaves);
    });

    // Stars (particles visible at night)
    const starCount = 200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5; // upper hemisphere
      const r = 18;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, sizeAttenuation: true });
    const stars = new THREE.Points(starGeo, starMat);
    this.add(stars);
    this._stars = stars;
    this._starMat = starMat;

    // Moon disc
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0xeeeedd }),
    );
    this.add(moon);
    this._moon = moon;

    // Lights
    this._sun = new THREE.DirectionalLight(0xffffff, 2);
    this._sun.position.set(0, 5, -1);
    this._sun.castShadow = true;
    this._sun.shadow.mapSize.set(1024, 1024);
    this._sun.shadow.camera.far = 25;
    this._sun.shadow.camera.left = -6;
    this._sun.shadow.camera.right = 6;
    this._sun.shadow.camera.top = 6;
    this._sun.shadow.camera.bottom = -6;
    this.add(this._sun);

    this._ambient = new THREE.AmbientLight(0x334466, 0.8);
    this.add(this._ambient);

    // Store previous fog & bg
    this._prevBg = this.app.scene.background;
    this.app.scene.background = new THREE.Color(0x78b4f0);
    this.onDispose(() => {
      this.app.scene.background = this._prevBg;
    });

    this.app.renderer.shadowMap.enabled = true;
    this.app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this._time = 0;
    this._cycleDuration = 24; // seconds for a full day
  }

  update(dt) {
    this._time += dt;
    const cycle = (this._time % this._cycleDuration) / this._cycleDuration;
    const frame = getFrame(cycle);

    // Apply
    this.app.scene.background = frame.bg;
    this._ambient.color.copy(frame.ambient.color);
    this._ambient.intensity = frame.ambient.intensity;
    this._sun.color.copy(frame.sun.color);
    this._sun.intensity = frame.sun.intensity;
    this._sun.position.copy(frame.sun.pos);
    this._sun.shadow.camera.updateProjectionMatrix();

    // Stars and moon at night
    const nightness = clamp(1 - (cycle < 0.5 ? cycle : 1 - cycle) * 4, 0, 1);
    this._starMat.opacity = nightness;
    this._starMat.transparent = true;

    // Moon position — opposite sun arc
    const moonAngle = cycle * Math.PI * 2 + Math.PI;
    this._moon.position.set(
      Math.cos(moonAngle) * 6,
      Math.abs(Math.sin(moonAngle)) * 8 + 1,
      -5,
    );
    this._moon.material.opacity = nightness;
    this._moon.material.transparent = true;
  }

  dispose() {
    this.app.scene.background = this._prevBg;
    super.dispose();
  }
}

register({
  id: 'day-night',
  title: 'Day-Night Cycle',
  category: 'Rendering',
  tags: ['day-night', 'lighting', 'sky', 'time-of-day'],
  description: 'A scene cycles through dawn, noon, dusk, and night over 24 s; lighting, sky colour, stars, and moon all animate smoothly.',
  xr: 'vr',
  factory: (app) => new DayNightScene(app),
});
