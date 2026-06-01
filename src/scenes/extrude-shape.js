// An extruded 2-D star shape with bevel using THREE.ExtrudeGeometry.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

function makeStar(outerR, innerR, points) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

class ExtrudeShapeScene extends Scene {
  async init() {
    const shape = makeStar(0.28, 0.12, 5);

    const extrudeSettings = {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 4,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Centre the geometry.
    geo.center();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      roughness: 0.25,
      metalness: 0.55,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 1.5, -1.8);
    mesh.castShadow = true;
    this.add(mesh);
    this._mesh = mesh;
  }

  update(dt) {
    this._mesh.rotation.y += dt * 0.6;
    this._mesh.rotation.x += dt * 0.15;
  }
}

register({
  id: 'extrude-shape',
  title: 'Extruded Star Shape',
  category: 'Geometry',
  tags: ['extrude', 'shape', 'bevel', 'star'],
  description: 'A 5-pointed star shape extruded with bevel using THREE.ExtrudeGeometry.',
  xr: 'vr',
  factory: (app) => new ExtrudeShapeScene(app),
});
