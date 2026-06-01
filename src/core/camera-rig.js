// A camera "rig": a group that holds the camera so locomotion can move the
// player without touching the headset-driven camera transform directly.
import * as THREE from 'three';

export function createCamera(host) {
  const aspect = (host.clientWidth || 1) / (host.clientHeight || 1);
  const camera = new THREE.PerspectiveCamera(70, aspect, 0.01, 100);
  camera.position.set(0, 1.6, 0); // standing eye height as a non-XR default
  return camera;
}

export class CameraRig {
  constructor(camera) {
    this.group = new THREE.Group();
    this.group.name = 'camera-rig';
    this.camera = camera;
    this.group.add(camera);
  }

  /** World position the user is standing at. */
  get position() {
    return this.group.position;
  }

  /** Teleport the rig to a world position (keeps current height offset). */
  moveTo(x, y, z) {
    this.group.position.set(x, y, z);
  }

  /** Translate the rig by a world-space delta. */
  translate(dx, dy, dz) {
    this.group.position.x += dx;
    this.group.position.y += dy;
    this.group.position.z += dz;
  }

  /** Rotate the rig around its vertical axis (radians). */
  rotateY(angle) {
    this.group.rotateY(angle);
  }
}
