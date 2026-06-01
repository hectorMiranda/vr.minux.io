// PlaneDragger — drag a mesh along a world-space plane following the
// controller ray's intersection with that plane.
//
// Usage:
//   const dragger = new PlaneDragger({ mesh, planeNormal, planePoint });
//   // wire events:
//   controllers.events.on('selectstart', ({ index }) => dragger.startDrag(index, controllers.getRay(index)));
//   controllers.events.on('selectend',   ({ index }) => dragger.endDrag(index));
//   // in update(): dragger.update(controllers.getRay(activeIndex));
import * as THREE from 'three';

const _ray = new THREE.Ray();
const _target = new THREE.Vector3();

export class PlaneDragger {
  /**
   * @param {object} opts
   * @param {THREE.Mesh}   opts.mesh
   * @param {THREE.Vector3} [opts.planeNormal]  default: up (0,1,0)
   * @param {THREE.Vector3} [opts.planePoint]   defaults to mesh's world position
   * @param {boolean}      [opts.constrainY]    keep Y locked (default true for horizontal planes)
   */
  constructor({ mesh, planeNormal, planePoint, constrainY = true }) {
    this.mesh = mesh;
    this._plane = new THREE.Plane();
    this._constrainY = constrainY;
    this._activeIndex = -1;
    this._offset = new THREE.Vector3();
    this._lockedY = 0;

    const normal = planeNormal ? planeNormal.clone().normalize() : new THREE.Vector3(0, 1, 0);
    const point = planePoint ? planePoint.clone() : mesh.getWorldPosition(new THREE.Vector3());
    this._plane.setFromNormalAndCoplanarPoint(normal, point);
  }

  /**
   * Call on selectstart / squeezestart.
   * @param {number} index   controller index
   * @param {THREE.Ray} ray  world-space ray at the moment of press
   * @returns {boolean} true if drag started
   */
  startDrag(index, ray) {
    if (this._activeIndex !== -1) return false;

    if (ray.intersectPlane(this._plane, _target)) {
      this._activeIndex = index;
      const meshPos = this.mesh.getWorldPosition(new THREE.Vector3());
      this._offset.copy(meshPos).sub(_target);
      this._lockedY = meshPos.y;
      return true;
    }
    return false;
  }

  /**
   * Call on selectend / squeezeend.
   */
  endDrag(index) {
    if (this._activeIndex === index) this._activeIndex = -1;
  }

  /**
   * Call every frame with the active controller's ray.
   * @param {THREE.Ray} ray  world-space ray
   */
  update(ray) {
    if (this._activeIndex === -1) return;
    _ray.copy(ray);
    if (_ray.intersectPlane(this._plane, _target)) {
      _target.add(this._offset);
      if (this._constrainY) _target.y = this._lockedY;

      // Move the mesh in its parent's local space.
      const parent = this.mesh.parent;
      if (parent) {
        parent.worldToLocal(_target);
        this.mesh.position.copy(_target);
      } else {
        this.mesh.position.copy(_target);
      }
    }
  }

  /** Is a drag currently in progress? */
  get isDragging() {
    return this._activeIndex !== -1;
  }

  dispose() {
    this._activeIndex = -1;
  }
}
