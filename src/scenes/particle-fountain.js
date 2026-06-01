// Effects: GPU-ish points fountain with gravity + respawn, additive blending,
// color over life.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { clamp } from '../util/math.js';

const PARTICLE_COUNT = 4000;
const GRAVITY = -4.0;
const EMITTER_POS = new THREE.Vector3(0, 1.2, -2);

class ParticleFountainScene extends Scene {
  async init() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 4); // rgba
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const ages = new Float32Array(PARTICLE_COUNT);
    const lifetimes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this._spawnParticle(i, positions, velocities, ages, lifetimes, Math.random());
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    this.add(points);

    this._geo = geo;
    this._positions = positions;
    this._colors = colors;
    this._velocities = velocities;
    this._ages = ages;
    this._lifetimes = lifetimes;

    // Base emitter mesh.
    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 }),
    );
    baseMesh.position.copy(EMITTER_POS);
    baseMesh.position.y -= 0.03;
    this.add(baseMesh);
  }

  _spawnParticle(i, positions, velocities, ages, lifetimes, ageOffset) {
    const angle = Math.random() * Math.PI * 2;
    const spread = 0.12;
    const speed = 2.5 + Math.random() * 2.5;
    velocities[i * 3] = Math.cos(angle) * spread * speed;
    velocities[i * 3 + 1] = speed;
    velocities[i * 3 + 2] = Math.sin(angle) * spread * speed;
    positions[i * 3] = EMITTER_POS.x;
    positions[i * 3 + 1] = EMITTER_POS.y;
    positions[i * 3 + 2] = EMITTER_POS.z;
    lifetimes[i] = 1.0 + Math.random() * 1.5;
    ages[i] = ageOffset * lifetimes[i];
  }

  update(dt) {
    const pos = this._positions;
    const vel = this._velocities;
    const col = this._colors;
    const ages = this._ages;
    const lt = this._lifetimes;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      ages[i] += dt;
      if (ages[i] > lt[i]) {
        this._spawnParticle(i, pos, vel, ages, lt, 0);
        continue;
      }
      const t = clamp(ages[i] / lt[i], 0, 1);

      vel[i * 3 + 1] += GRAVITY * dt;

      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;

      // Color over life: blue -> cyan -> white -> fade out.
      const alpha = t < 0.8 ? 1.0 : 1.0 - (t - 0.8) / 0.2;
      col[i * 4] = t < 0.5 ? t * 2 : 1.0;      // R
      col[i * 4 + 1] = t < 0.3 ? 0 : (t - 0.3) / 0.7; // G
      col[i * 4 + 2] = 1.0 - t * 0.5;           // B
      col[i * 4 + 3] = alpha;
    }

    this._geo.attributes.position.needsUpdate = true;
    this._geo.attributes.color.needsUpdate = true;
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'particle-fountain',
  title: 'Particle Fountain',
  category: 'Effects',
  tags: ['particles', 'fountain', 'additive', 'gravity'],
  description: 'A particle fountain with gravity, respawn, additive blending, and color-over-life from blue to white.',
  xr: 'vr',
  factory: (app) => new ParticleFountainScene(app),
});
