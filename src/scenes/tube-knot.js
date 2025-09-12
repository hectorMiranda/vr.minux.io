// TubeGeometry following a CatmullRomCurve3 knot-like path.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

function makeKnotPoints(count = 120) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    // Trefoil-ish parametric knot.
    const x = Math.sin(t) + 2 * Math.sin(2 * t);
    const y = Math.cos(t) - 2 * Math.cos(2 * t);
    const z = -Math.sin(3 * t);
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

class TubeKnotScene extends Scene {
  async init() {
    const points = makeKnotPoints(120);
    const curve = new THREE.CatmullRomCurve3(points, true);
    const geo = new THREE.TubeGeometry(curve, 300, 0.055, 12, true);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xff5588,
      roughness: 0.3,
      metalness: 0.4,
    });

    const mesh = new THREE.Mesh(geo, mat);
    // Knot extends roughly ±3 in each axis; scale down to fit the scene.
    mesh.scale.setScalar(0.19);
    mesh.position.set(0, 1.5, -2.0);
    mesh.castShadow = true;
    this.add(mesh);
    this._mesh = mesh;
  }

  update(dt) {
    this._mesh.rotation.x += dt * 0.2;
    this._mesh.rotation.y += dt * 0.35;
  }
}

register({
  id: 'tube-knot',
  title: 'Tube Knot',
  category: 'Geometry',
  tags: ['tube', 'curve', 'catmullrom', 'knot'],
  description: 'A TubeGeometry swept along a CatmullRomCurve3 trefoil path, gently spinning.',
  xr: 'vr',
  factory: (app) => new TubeKnotScene(app),
});
