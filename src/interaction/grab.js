// GrabSystem — attach/detach grabbable meshes to XR controllers.
// On squeezestart (or selectstart if usePrimary=true), the closest grabbable
// within reach is reparented to the controller, preserving world transform.
// On the matching end event it is reparented back to its original parent.
import * as THREE from 'three';

const _worldPos = new THREE.Vector3();
const _ctrlPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _worldScale = new THREE.Vector3();
const _mat = new THREE.Matrix4();

export class GrabSystem {
  /**
   * @param {object} opts
   * @param {import('../xr/controllers.js').Controllers} opts.controllers
   * @param {number} [opts.reach]       Max grab distance in metres (default 0.25)
   * @param {boolean} [opts.usePrimary] Use select instead of squeeze (default false)
   */
  constructor({ controllers, reach = 0.25, usePrimary = false } = {}) {
    this._controllers = controllers;
    this._reach = reach;
    this._meshes = [];
    // grabbed[i] = { mesh, origParent, origMatrix } or null
    this._grabbed = [null, null];

    const startEvent = usePrimary ? 'selectstart' : 'squeezestart';
    const endEvent = usePrimary ? 'selectend' : 'squeezeend';

    this._unsub = [
      controllers.events.on(startEvent, ({ index, controller }) => {
        this._tryGrab(index, controller);
      }),
      controllers.events.on(endEvent, ({ index }) => {
        this._release(index);
      }),
    ];
  }

  /** Register a mesh as grabbable. */
  add(mesh) {
    if (!this._meshes.includes(mesh)) this._meshes.push(mesh);
  }

  /** Unregister a mesh. */
  remove(mesh) {
    this._meshes = this._meshes.filter((m) => m !== mesh);
  }

  _tryGrab(index, controller) {
    if (this._grabbed[index]) return;

    controller.getWorldPosition(_ctrlPos);

    let closest = null;
    let closestDist = Infinity;
    for (const mesh of this._meshes) {
      // Skip meshes already held by the other controller.
      if (this._grabbed[1 - index]?.mesh === mesh) continue;
      mesh.getWorldPosition(_worldPos);
      const d = _ctrlPos.distanceTo(_worldPos);
      if (d < this._reach && d < closestDist) {
        closestDist = d;
        closest = mesh;
      }
    }
    if (!closest) return;

    // Save original parent & world transform.
    const origParent = closest.parent;
    const origMatrix = closest.matrixWorld.clone();

    // Reparent to controller, keeping world-space position/rotation/scale.
    origParent.remove(closest);
    controller.add(closest);

    // Convert world matrix into controller-local matrix.
    _mat.copy(controller.matrixWorld).invert().multiply(origMatrix);
    _mat.decompose(closest.position, closest.quaternion, closest.scale);

    this._grabbed[index] = { mesh: closest, origParent, origMatrix };
  }

  _release(index) {
    const g = this._grabbed[index];
    if (!g) return;

    const { mesh, origParent } = g;

    // Get current world transform before reparenting.
    mesh.getWorldPosition(_worldPos);
    mesh.getWorldQuaternion(_worldQuat);
    mesh.getWorldScale(_worldScale);

    mesh.parent.remove(mesh);
    origParent.add(mesh);

    // Re-apply world transform in new parent's local space.
    _mat.copy(origParent.matrixWorld).invert();
    mesh.position.setFromMatrixPosition(
      _mat.clone().multiply(new THREE.Matrix4().compose(_worldPos, _worldQuat, _worldScale))
    );
    mesh.quaternion.setFromRotationMatrix(
      _mat.clone().multiply(new THREE.Matrix4().makeRotationFromQuaternion(_worldQuat))
    );
    mesh.scale.copy(_worldScale);

    this._grabbed[index] = null;
  }

  /** Returns the mesh currently held by controller index (or null). */
  getGrabbed(index) {
    return this._grabbed[index]?.mesh ?? null;
  }

  dispose() {
    // Release any held objects.
    for (let i = 0; i < 2; i++) this._release(i);
    this._unsub.forEach((u) => u());
    this._unsub.length = 0;
    this._meshes = [];
  }
}
