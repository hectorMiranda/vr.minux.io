// world-label.js — floating CanvasTexture labels over objects.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { makeLabel } from '../ui/canvas-label.js';

const OBJECTS = [
  { label: 'Sphere', color: 0xff6644, geo: new THREE.SphereGeometry(0.1, 32, 24), pos: [-0.35, 1.5, -1.2] },
  { label: 'Cube', color: 0x44aaff, geo: new THREE.BoxGeometry(0.18, 0.18, 0.18), pos: [0, 1.5, -1.2] },
  { label: 'Cone', color: 0x88dd44, geo: new THREE.ConeGeometry(0.1, 0.22, 16), pos: [0.35, 1.5, -1.2] },
];

class WorldLabelScene extends Scene {
  async init() {
    this._meshes = [];

    for (const o of OBJECTS) {
      const mat = new THREE.MeshStandardMaterial({
        color: o.color, roughness: 0.4, metalness: 0.1,
      });
      const mesh = new THREE.Mesh(o.geo, mat);
      mesh.position.set(...o.pos);
      mesh.castShadow = true;
      this.add(mesh);
      this._meshes.push(mesh);

      // Floating label slightly above the object
      const lbl = makeLabel(o.label, {
        width: 128, height: 36, fontSize: 20,
        color: '#ffffff', background: 'rgba(0,0,0,0.65)',
        scale: 0.001,
      });
      lbl.position.set(o.pos[0], o.pos[1] + 0.18, o.pos[2]);
      this.add(lbl);
    }
  }

  update(dt) {
    for (const m of this._meshes) {
      m.rotation.y += dt * 0.6;
    }
  }
}

register({
  id: 'world-label',
  title: 'World Labels',
  category: 'Text',
  tags: ['text', 'canvas', 'label', 'world-space'],
  description: 'Floating CanvasTexture labels rendered above world-space objects.',
  xr: 'vr',
  factory: (app) => new WorldLabelScene(app),
});
