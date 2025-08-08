// PointerRaycaster — wraps THREE.Raycaster for controller or camera use.
// Emits 'enter', 'leave', 'select' via an Emitter.
// Includes a visible ray-line helper you can add to your scene.
import * as THREE from 'three';
import { Emitter } from '../util/events.js';

export class PointerRaycaster {
  /**
   * @param {object} opts
   * @param {THREE.Camera|THREE.Object3D} opts.source  controller or camera
   * @param {boolean} [opts.isCamera]  true when source is the camera
   * @param {number} [opts.rayLength]  visual ray length (default 3)
   * @param {number} [opts.rayColor]   hex color for the line (default 0x44ddff)
   */
  constructor({ source, isCamera = false, rayLength = 3, rayColor = 0x44ddff } = {}) {
    this.source = source;
    this.isCamera = isCamera;
    this.events = new Emitter();
    this._raycaster = new THREE.Raycaster();
    this._meshes = [];
    this._hovered = null;

    // Visible ray line
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -rayLength)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: rayColor });
    this.rayLine = new THREE.Line(geo, mat);
    this.rayLine.raycast = () => {}; // never hit-test the line itself
  }

  /** Replace the list of meshes to test against. */
  setTargets(meshes) {
    this._meshes = meshes;
  }

  /** Add a single mesh as a target. */
  addTarget(mesh) {
    this._meshes.push(mesh);
  }

  /** Remove a target mesh. */
  removeTarget(mesh) {
    this._meshes = this._meshes.filter((m) => m !== mesh);
  }

  /**
   * Call every frame. Updates the ray, checks intersections, emits events.
   * @param {THREE.Ray} [override]  supply a precomputed world-space ray
   */
  update(override) {
    const rc = this._raycaster;

    if (override) {
      rc.ray.copy(override);
    } else if (this.isCamera) {
      // Camera fires from its own position toward its look direction.
      rc.setFromCamera({ x: 0, y: 0 }, this.source);
    } else {
      // Controller: origin at world position, direction is -Z in world space.
      const origin = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      this.source.getWorldPosition(origin);
      this.source.getWorldQuaternion(quat);
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
      rc.ray.set(origin, dir);
    }

    const hits = rc.intersectObjects(this._meshes, false);
    const hit = hits.length > 0 ? hits[0] : null;
    const hitObj = hit ? hit.object : null;

    if (hitObj !== this._hovered) {
      if (this._hovered) {
        this.events.emit('leave', { mesh: this._hovered });
      }
      if (hitObj) {
        this.events.emit('enter', { mesh: hitObj, intersection: hit });
      }
      this._hovered = hitObj;
    }

    return hit;
  }

  /** Call when a 'select' controller event fires; re-emits as 'select'. */
  select() {
    if (this._hovered) {
      this.events.emit('select', { mesh: this._hovered });
    }
  }

  dispose() {
    this.rayLine.geometry.dispose();
    this.rayLine.material.dispose();
    this._meshes = [];
    this._hovered = null;
    this.events.clear();
  }
}
