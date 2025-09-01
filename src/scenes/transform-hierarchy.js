// Sun / planet / moon transform hierarchy demonstrating nested rotations.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class TransformHierarchyScene extends Scene {
  async init() {
    // Root pivot sitting at eye level in front of the camera.
    this._pivot = new THREE.Group();
    this._pivot.position.set(0, 1.5, -2.0);
    this.add(this._pivot);

    // Sun (centre).
    const sunGeo = new THREE.SphereGeometry(0.18, 32, 16);
    const sunMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.5 });
    this._sun = new THREE.Mesh(sunGeo, sunMat);
    this._pivot.add(this._sun);

    // Planet orbit pivot and mesh.
    this._orbitPlanet = new THREE.Group();
    this._pivot.add(this._orbitPlanet);

    const planetGeo = new THREE.SphereGeometry(0.09, 24, 12);
    const planetMat = new THREE.MeshStandardMaterial({ color: 0x3388ff, roughness: 0.6 });
    this._planet = new THREE.Mesh(planetGeo, planetMat);
    this._planet.position.set(0.55, 0, 0);
    this._orbitPlanet.add(this._planet);

    // Moon orbit pivot (child of planet) and mesh.
    this._orbitMoon = new THREE.Group();
    this._orbitMoon.position.set(0.55, 0, 0); // same offset as planet
    this._orbitPlanet.add(this._orbitMoon);

    const moonGeo = new THREE.SphereGeometry(0.04, 16, 8);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
    this._moon = new THREE.Mesh(moonGeo, moonMat);
    this._moon.position.set(0.18, 0, 0);
    this._orbitMoon.add(this._moon);

    // Faint orbit rings (visual only, not children of pivots).
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true });
    const planetRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.004, 8, 64), ringMat);
    planetRing.rotation.x = Math.PI / 2;
    this._pivot.add(planetRing);

    const moonRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.003, 8, 48), ringMat);
    moonRing.rotation.x = Math.PI / 2;
    moonRing.position.set(0.55, 0, 0);
    this._pivot.add(moonRing);
  }

  update(dt) {
    this._sun.rotation.y      += dt * 0.3;
    this._orbitPlanet.rotation.y += dt * 0.7;
    this._planet.rotation.y   += dt * 1.2;
    this._orbitMoon.rotation.y   += dt * 2.1;
    this._moon.rotation.y     += dt * 0.5;
  }
}

register({
  id: 'transform-hierarchy',
  title: 'Transform Hierarchy',
  category: 'Basics',
  tags: ['hierarchy', 'parenting', 'orbit'],
  description: 'Sun, planet, and moon demonstrating nested parent-child Transform rotations.',
  xr: 'vr',
  factory: (app) => new TransformHierarchyScene(app),
});
