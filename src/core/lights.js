// Default three-point-ish lighting suitable for most test scenes.
import * as THREE from 'three';

export function createLights() {
  const group = new THREE.Group();
  group.name = 'lights';

  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x202830, 0.9);
  group.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  group.add(key);

  const fill = new THREE.DirectionalLight(0x7c9cff, 0.4);
  fill.position.set(-4, 3, -2);
  group.add(fill);

  return group;
}
