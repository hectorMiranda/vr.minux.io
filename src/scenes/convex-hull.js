// A ConvexGeometry around random points, rotating.
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { register } from './registry.js';
import { Scene } from './base.js';

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

class ConvexHullScene extends Scene {
  async init() {
    const rng = seededRng(99);
    const points = [];
    for (let i = 0; i < 30; i++) {
      points.push(new THREE.Vector3(
        (rng() - 0.5) * 0.6,
        (rng() - 0.5) * 0.6,
        (rng() - 0.5) * 0.6,
      ));
    }

    let geo;
    try {
      geo = new ConvexGeometry(points);
    } catch (e) {
      // Fallback: icosahedron.
      geo = new THREE.IcosahedronGeometry(0.28, 1);
    }

    const solidMat = new THREE.MeshStandardMaterial({
      color: 0xff7733,
      roughness: 0.3,
      metalness: 0.3,
      transparent: true,
      opacity: 0.75,
    });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xffaa66, wireframe: true });

    const solid = new THREE.Mesh(geo, solidMat);
    const wire  = new THREE.Mesh(geo, wireMat);
    solid.position.set(0, 1.5, -1.8);
    solid.castShadow = true;
    solid.add(wire);
    this.add(solid);

    // Show the input points.
    const ptGeo = new THREE.BufferGeometry().setFromPoints(points);
    const ptMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.025 });
    const ptMesh = new THREE.Points(ptGeo, ptMat);
    solid.add(ptMesh);

    this._solid = solid;
  }

  update(dt) {
    this._solid.rotation.x += dt * 0.25;
    this._solid.rotation.y += dt * 0.4;
  }
}

register({
  id: 'convex-hull',
  title: 'Convex Hull',
  category: 'Geometry',
  tags: ['convex', 'hull', 'geometry', 'points'],
  description: 'A ConvexGeometry built around 30 random points, shown semi-transparent with wireframe overlay.',
  xr: 'vr',
  factory: (app) => new ConvexHullScene(app),
});
