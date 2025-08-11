// transform-handles.js — helpers to build rotate / scale gizmo handles.
//
// buildRotateHandle(target, opts) → THREE.Mesh  (torus ring)
//   Attach the returned handle mesh to your scene.  Call
//   rotateHandle.update(dt, ray, isDragging) each frame.
//
// buildScaleHandle(target, axis, opts) → THREE.Mesh  (small sphere)
//   Returns a sphere you position at one end of the target; dragging it
//   scales the target along `axis`.
import * as THREE from 'three';

const _tmp = new THREE.Vector3();
const _qStart = new THREE.Quaternion();
const _rayDir = new THREE.Vector3();
const _origin = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Rotate handle — a torus ring around the target.
// ---------------------------------------------------------------------------
export function buildRotateHandle(target, {
  axis = new THREE.Vector3(0, 1, 0),
  radius = 0.3,
  tube = 0.018,
  color = 0x00ccff,
  segments = 48,
} = {}) {
  const geo = new THREE.TorusGeometry(radius, tube, 8, segments);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 });
  const ring = new THREE.Mesh(geo, mat);
  ring.castShadow = false;
  ring.receiveShadow = false;

  // Orient the ring so its flat face is perpendicular to `axis`.
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis.clone().normalize());

  // Keep handle co-located with the target each frame.
  ring._target = target;
  ring._axis = axis.clone().normalize();
  ring._dragging = false;
  ring._dragStartAngle = 0;
  ring._targetStartQuat = new THREE.Quaternion();

  /**
   * Call every frame.
   * @param {boolean}    dragging   whether the grab/select is active
   * @param {THREE.Ray}  [ray]      current controller ray (world space)
   */
  ring.updateHandle = function (dragging, ray) {
    // Track target position.
    target.getWorldPosition(_tmp);
    this.position.copy(_tmp);
    if (this.parent) this.parent.worldToLocal(this.position);

    if (dragging && !this._dragging) {
      // Drag started — record start quaternion.
      this._targetStartQuat.copy(target.quaternion);
      if (ray) {
        this._dragStartAngle = _angleOnPlane(ray, _tmp, this._axis);
      }
    }
    this._dragging = dragging;

    if (dragging && ray) {
      const angle = _angleOnPlane(ray, _tmp, this._axis);
      const delta = angle - this._dragStartAngle;
      target.quaternion.copy(this._targetStartQuat).multiply(
        new THREE.Quaternion().setFromAxisAngle(this._axis, delta)
      );
    }
  };

  return ring;
}

/** Project a ray onto a plane defined by (point, normal) and return the angle. */
function _angleOnPlane(ray, planePoint, planeNormal) {
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
  const hit = new THREE.Vector3();
  if (!ray.intersectPlane(plane, hit)) return 0;
  hit.sub(planePoint);
  // Build two axes in the plane.
  const u = new THREE.Vector3(1, 0, 0);
  if (Math.abs(planeNormal.dot(u)) > 0.9) u.set(0, 1, 0);
  const v = u.clone().cross(planeNormal).normalize();
  u.crossVectors(planeNormal, v).normalize();
  return Math.atan2(hit.dot(v), hit.dot(u));
}

// ---------------------------------------------------------------------------
// Scale handle — a draggable sphere that resizes the target.
// ---------------------------------------------------------------------------
export function buildScaleHandle(target, axis = new THREE.Vector3(1, 0, 0), {
  color = 0xff6600,
  size = 0.04,
  distance = 0.35,
} = {}) {
  const geo = new THREE.SphereGeometry(size, 12, 8);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 });
  const sphere = new THREE.Mesh(geo, mat);

  const norm = axis.clone().normalize();
  sphere._axis = norm;
  sphere._target = target;
  sphere._distance = distance;
  sphere._dragging = false;
  sphere._startScale = new THREE.Vector3();
  sphere._startHit = new THREE.Vector3();
  sphere._plane = new THREE.Plane();

  // Position the sphere along the axis.
  sphere.position.copy(
    target.position.clone().add(norm.clone().multiplyScalar(distance))
  );

  /**
   * @param {boolean}   dragging
   * @param {THREE.Ray} [ray]
   */
  sphere.updateHandle = function (dragging, ray) {
    // Keep sphere tracking target + offset.
    const targetPos = target.getWorldPosition(_tmp.clone());

    if (dragging && !this._dragging) {
      this._startScale.copy(target.scale);
      if (ray) {
        this._plane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          targetPos
        );
        ray.intersectPlane(this._plane, this._startHit);
      }
    }
    this._dragging = dragging;

    if (dragging && ray) {
      const hit = new THREE.Vector3();
      if (ray.intersectPlane(this._plane, hit)) {
        const dist = hit.distanceTo(targetPos);
        const startDist = this._startHit.distanceTo(targetPos) || 0.001;
        const factor = Math.max(0.1, dist / startDist);
        target.scale.copy(this._startScale).multiplyScalar(factor);
      }
    }

    // Reposition sphere to follow target.
    this.position.copy(targetPos.add(this._axis.clone().multiplyScalar(this._distance * target.scale.x)));
    if (this.parent) this.parent.worldToLocal(this.position);
  };

  return sphere;
}
