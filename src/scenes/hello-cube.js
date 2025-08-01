// The smallest possible scene: one rotating cube. Serves as the reference
// implementation of the scene contract.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class HelloCubeScene extends Scene {
  async init() {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x44aa88, roughness: 0.4, metalness: 0.1 }),
    );
    cube.position.set(0, 1.5, -1);
    cube.castShadow = true;
    this.add(cube);
    this.cube = cube;
  }

  update(dt) {
    this.cube.rotation.x += dt * 0.5;
    this.cube.rotation.y += dt;
  }
}

register({
  id: 'hello-cube',
  title: 'Hello Cube',
  category: 'Basics',
  tags: ['mesh', 'basics'],
  description: 'A single rotating cube — the smallest possible scene.',
  factory: (app) => new HelloCubeScene(app),
});
