// The shared root THREE.Scene with a default environment (sky + floor grid).
import * as THREE from 'three';

export function createScene({ background = 0x0b0e14, fog = true } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  if (fog) scene.fog = new THREE.Fog(background, 8, 30);
  return scene;
}

/** A reference floor: subtle grid + a physical ground plane for shadows. */
export function createFloor({ size = 20, divisions = 20 } = {}) {
  const group = new THREE.Group();
  group.name = 'floor';

  const grid = new THREE.GridHelper(size, divisions, 0x4ad0c8, 0x243044);
  grid.material.opacity = 0.4;
  grid.material.transparent = true;
  group.add(grid);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.ShadowMaterial({ opacity: 0.25 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  return group;
}
