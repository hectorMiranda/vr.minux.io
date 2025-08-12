// TeleportControls — parabolic arc raycaster for VR teleportation.
// Usage:
//   const tp = new TeleportControls(app);
//   tp.setFloor(floorMesh);
//   tp.enable();
//   // in update loop:
//   tp.update(dt);
//   // cleanup:
//   tp.disable(); tp.dispose();
import * as THREE from 'three';

const GRAVITY = 9.8;
const INITIAL_SPEED = 8;     // m/s launch speed along ray direction
const ARC_SEGMENTS = 32;     // line vertices

export class TeleportControls {
  /**
   * @param {object} app - the App instance
   * @param {number} [controllerIndex=0] - which controller drives the teleport
   */
  constructor(app, controllerIndex = 0) {
    this._app = app;
    this._index = controllerIndex;
    this._enabled = false;
    this._active = false;      // arc currently being cast
    this._floorMeshes = [];
    this._target = new THREE.Vector3();
    this._hasTarget = false;
    this._unsubs = [];

    // --- Arc line ---
    const arcPositions = new Float32Array(ARC_SEGMENTS * 3);
    this._arcGeo = new THREE.BufferGeometry();
    this._arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPositions, 3));
    this._arcLine = new THREE.Line(
      this._arcGeo,
      new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false }),
    );
    this._arcLine.renderOrder = 1;
    this._arcLine.visible = false;
    this._arcLine.frustumCulled = false;
    app.scene.add(this._arcLine);

    // --- Landing marker (ring) ---
    const ringGeo = new THREE.RingGeometry(0.25, 0.35, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this._marker = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, depthTest: false }),
    );
    this._marker.renderOrder = 1;
    this._marker.visible = false;
    app.scene.add(this._marker);

    // Raycaster for floor intersection
    this._raycaster = new THREE.Raycaster();

    // Temp vectors reused each frame
    this._v0 = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._pos = new THREE.Vector3();
  }

  /** Mesh(es) the arc will land on. Pass the floor or an array. */
  setFloor(meshOrArray) {
    this._floorMeshes = Array.isArray(meshOrArray) ? meshOrArray : [meshOrArray];
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;

    const { events } = this._app.controllers;
    this._unsubs.push(
      events.on('squeezestart', ({ index }) => {
        if (index === this._index) this._startArc();
      }),
      events.on('squeezeend', ({ index }) => {
        if (index === this._index) this._confirm();
      }),
      // Also support selectstart/selectend as a fallback
      events.on('selectstart', ({ index }) => {
        if (index === this._index) this._startArc();
      }),
      events.on('selectend', ({ index }) => {
        if (index === this._index) this._confirm();
      }),
    );
  }

  disable() {
    if (!this._enabled) return;
    this._enabled = false;
    this._unsubs.forEach((u) => u());
    this._unsubs.length = 0;
    this._hideArc();
  }

  _startArc() {
    this._active = true;
    this._arcLine.visible = true;
  }

  _confirm() {
    if (this._hasTarget) {
      const rigPos = this._app.rig.group.position;
      this._app.rig.moveTo(this._target.x, rigPos.y, this._target.z);
    }
    this._hideArc();
  }

  _hideArc() {
    this._active = false;
    this._arcLine.visible = false;
    this._marker.visible = false;
    this._hasTarget = false;
  }

  /**
   * Compute parabolic arc from the controller, test against floor meshes.
   * @param {number} dt - delta time in seconds
   */
  update(dt) { // eslint-disable-line no-unused-vars
    if (!this._active) return;

    const controller = this._app.controllers.controllers[this._index];
    if (!controller) return;

    // Launch origin and direction from controller world space
    this._v0.setFromMatrixPosition(controller.matrixWorld);
    this._dir.set(0, 0, -1).applyQuaternion(
      controller.getWorldQuaternion(new THREE.Quaternion()),
    );

    this._castArc(this._v0, this._dir);
  }

  /**
   * Public for desktop auto-demo use (called with synthetic origin/dir).
   */
  castArcFromRay(origin, direction) {
    this._v0.copy(origin);
    this._dir.copy(direction);
    this._castArc(this._v0, this._dir);
    this._arcLine.visible = true;
  }

  _castArc(origin, dir) {
    // Initial velocity: scale direction to launch speed, subtract vertical bias
    const speed = INITIAL_SPEED;
    const vx = dir.x * speed;
    const vy = dir.y * speed;
    const vz = dir.z * speed;

    const positions = this._arcGeo.attributes.position.array;
    const step = 0.05; // time step per segment
    let hit = false;
    let hitPos = null;
    let hitNormal = null;
    let prevPoint = new THREE.Vector3();
    let currPoint = new THREE.Vector3();

    prevPoint.copy(origin);
    let segCount = 0;

    for (let i = 0; i < ARC_SEGMENTS; i++) {
      const t = (i + 1) * step;
      currPoint.set(
        origin.x + vx * t,
        origin.y + vy * t - 0.5 * GRAVITY * t * t,
        origin.z + vz * t,
      );

      // Check segment against floor meshes
      if (this._floorMeshes.length > 0 && !hit) {
        const segDir = new THREE.Vector3().subVectors(currPoint, prevPoint);
        const segLen = segDir.length();
        this._raycaster.set(prevPoint, segDir.normalize());
        this._raycaster.far = segLen + 0.01;
        const hits = this._raycaster.intersectObjects(this._floorMeshes, false);
        if (hits.length > 0) {
          hit = true;
          hitPos = hits[0].point.clone();
          hitNormal = hits[0].face ? hits[0].face.normal.clone() : new THREE.Vector3(0, 1, 0);
          currPoint.copy(hitPos);
        }
      }

      positions[i * 3]     = currPoint.x;
      positions[i * 3 + 1] = currPoint.y;
      positions[i * 3 + 2] = currPoint.z;
      segCount = i + 1;
      prevPoint.copy(currPoint);
      if (hit) break;
    }

    // Zero-fill remaining segments at last point
    for (let i = segCount; i < ARC_SEGMENTS; i++) {
      positions[i * 3]     = prevPoint.x;
      positions[i * 3 + 1] = prevPoint.y;
      positions[i * 3 + 2] = prevPoint.z;
    }

    this._arcGeo.attributes.position.needsUpdate = true;
    this._arcGeo.setDrawRange(0, segCount);

    if (hit && hitPos) {
      this._hasTarget = true;
      this._target.copy(hitPos);
      this._marker.visible = true;
      this._marker.position.copy(hitPos);
      // Align marker to surface normal
      if (hitNormal) {
        const worldNormal = hitNormal.clone().transformDirection(
          this._floorMeshes[0].matrixWorld,
        );
        this._marker.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          worldNormal,
        );
      }
    } else {
      this._hasTarget = false;
      this._marker.visible = false;
    }
  }

  get isActive() {
    return this._active;
  }

  get hasTarget() {
    return this._hasTarget;
  }

  get target() {
    return this._target.clone();
  }

  dispose() {
    this.disable();
    this._app.scene.remove(this._arcLine);
    this._app.scene.remove(this._marker);
    this._arcGeo.dispose();
    this._arcLine.material.dispose();
    this._marker.geometry.dispose();
    this._marker.material.dispose();
  }
}
