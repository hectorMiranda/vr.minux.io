// Controller Rays — both controllers cast colored ray lines;
// a canvas label reports which hands are connected.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { buildHandRayLine } from '../xr/controller-models.js';

const COLORS = [0x44aaff, 0xff6644];
const LABELS = ['Left', 'Right'];

class ControllerRaysScene extends Scene {
  async init() {
    // Ambient light already added by app, but add a helper point light
    const pl = new THREE.PointLight(0xffffff, 0.8, 6);
    pl.position.set(0, 2, -1);
    this.add(pl);

    // Ray lines — one per controller
    this._rays = [];
    for (let i = 0; i < 2; i++) {
      const line = buildHandRayLine(COLORS[i]);
      this.app.controllers.controllers[i].add(line);
      this._rays.push(line);
    }

    // Canvas label panel showing connection status
    this._labelMesh = this._makeLabelMesh();
    this._labelMesh.position.set(0, 1.7, -1.4);
    this.add(this._labelMesh);

    // Connection state
    this._connected = [false, false];

    this.onDispose(
      this.app.controllers.events.on('connected', ({ index }) => {
        this._connected[index] = true;
        this._updateLabel();
      }),
    );
    this.onDispose(
      this.app.controllers.events.on('disconnected', ({ index }) => {
        this._connected[index] = false;
        this._updateLabel();
      }),
    );

    // Desktop auto-animation: swing a dummy target sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xeecc44, roughness: 0.4 }),
    );
    sphere.position.set(0, 1.5, -1.2);
    this.add(sphere);
    this._sphere = sphere;
    this._t = 0;

    this._updateLabel();
  }

  _makeLabelMesh() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    this._labelCanvas = canvas;
    this._labelCtx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    this._labelTex = tex;
    const geo = new THREE.PlaneGeometry(0.9, 0.22);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => {
      geo.dispose();
      mat.dispose();
      tex.dispose();
    });
    return mesh;
  }

  _updateLabel() {
    const ctx = this._labelCtx;
    const canvas = this._labelCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 12);
    ctx.fill();

    ctx.font = 'bold 28px sans-serif';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = this._connected[i] ? '#44ff88' : '#ff4444';
      const hex = COLORS[i].toString(16).padStart(6, '0');
      ctx.fillStyle = `#${hex}`;
      const label = `${LABELS[i]}: ${this._connected[i] ? 'Connected' : 'Disconnected'}`;
      ctx.fillText(label, 20, 36 + i * 56);
    }
    this._labelTex.needsUpdate = true;
  }

  update(dt) {
    this._t += dt;
    // Auto-swing the sphere on desktop
    if (this._sphere) {
      this._sphere.position.x = Math.sin(this._t * 0.7) * 0.5;
      this._sphere.position.y = 1.4 + Math.sin(this._t * 1.1) * 0.15;
    }
  }

  dispose() {
    // Remove ray lines from controller objects
    for (let i = 0; i < 2; i++) {
      const line = this._rays[i];
      if (line) {
        this.app.controllers.controllers[i].remove(line);
        line.geometry?.dispose();
        line.material?.dispose();
      }
    }
    super.dispose();
  }
}

register({
  id: 'controller-rays',
  title: 'Controller Rays',
  category: 'Input',
  tags: ['controller', 'ray', 'input'],
  description: 'Both controllers cast colored ray lines; a canvas label reports which hands are connected.',
  xr: 'vr',
  factory: (app) => new ControllerRaysScene(app),
});
