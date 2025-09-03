// Animated toggling between wireframe and solid render on an icosahedron.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class WireframeScene extends Scene {
  async init() {
    const geo = new THREE.IcosahedronGeometry(0.4, 2);

    this._solidMat = new THREE.MeshStandardMaterial({
      color: 0x2299ff,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 1.0,
    });

    this._wireMat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      wireframe: true,
    });

    this._solid = new THREE.Mesh(geo, this._solidMat);
    this._solid.position.set(0, 1.5, -1.8);
    this._solid.castShadow = true;
    this.add(this._solid);

    // Wireframe overlay always visible on top.
    this._wire = new THREE.Mesh(geo, this._wireMat);
    this._solid.add(this._wire);

    this._t = 0;
    this._cycleLen = 3.0; // seconds per full cycle
  }

  update(dt) {
    this._solid.rotation.x += dt * 0.3;
    this._solid.rotation.y += dt * 0.5;

    this._t = (this._t + dt) % this._cycleLen;
    // Smoothly oscillate the solid opacity so it fades in/out.
    const phase = this._t / this._cycleLen;
    const opacity = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    this._solidMat.opacity = opacity;
    this._wireMat.opacity = 1.0;
  }
}

register({
  id: 'wireframe',
  title: 'Wireframe Toggle',
  category: 'Basics',
  tags: ['wireframe', 'material', 'transparency'],
  description: 'An icosahedron that smoothly fades between solid and wireframe render modes.',
  xr: 'vr',
  factory: (app) => new WireframeScene(app),
});
