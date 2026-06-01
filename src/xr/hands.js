// Wraps WebXR hand-tracking (renderer.xr.getHand) for both hands.
// Builds small spheres at each of the 25 joints and exposes a pinch value.
// Safe no-op when hands are absent (desktop / no hand-tracking).
import * as THREE from 'three';

// XRHand joint names in spec order (25 joints).
const JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
];

const PINCH_JOINT_A = 'thumb-tip';
const PINCH_JOINT_B = 'index-finger-tip';
const PINCH_THRESHOLD = 0.02; // metres

class HandTracker {
  constructor(xrHand, parent, color) {
    this.xrHand = xrHand; // THREE.XRHandSpace
    this.parent = parent;
    this.joints = {}; // name -> { mesh, position }
    this.pinch = 0;
    this.active = false;

    const geo = new THREE.SphereGeometry(0.006, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.0,
    });

    for (const name of JOINT_NAMES) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `joint-${name}`;
      mesh.visible = false;
      parent.add(mesh);
      this.joints[name] = { mesh, position: new THREE.Vector3() };
    }

    this._geo = geo;
    this._mat = mat;
  }

  /**
   * Update joint positions from the XRFrame.
   * @param {XRFrame|null} frame
   * @param {XRReferenceSpace|null} refSpace
   */
  update(frame, refSpace) {
    if (!frame || !refSpace || !this.xrHand) {
      this._setVisible(false);
      this.active = false;
      this.pinch = 0;
      return;
    }

    // xrHand is a THREE.XRHandSpace; the underlying XRHand lives in userData
    const xrHandSpace = this.xrHand;
    // Three.js r152+ exposes hand joints via xrHandSpace.joints
    const handJoints = xrHandSpace.joints;
    if (!handJoints) {
      this._setVisible(false);
      this.active = false;
      this.pinch = 0;
      return;
    }

    let hasData = false;
    for (const name of JOINT_NAMES) {
      const jointSpace = handJoints[name];
      if (!jointSpace) continue;
      const pose = frame.getJointPose ? frame.getJointPose(jointSpace, refSpace) : null;
      if (pose && pose.transform) {
        const p = pose.transform.position;
        const entry = this.joints[name];
        entry.position.set(p.x, p.y, p.z);
        entry.mesh.position.copy(entry.position);
        entry.mesh.visible = true;
        hasData = true;
      }
    }

    this.active = hasData;
    if (!hasData) {
      this._setVisible(false);
      this.pinch = 0;
      return;
    }

    // Compute pinch: distance between thumb-tip and index-finger-tip.
    const a = this.joints[PINCH_JOINT_A]?.position;
    const b = this.joints[PINCH_JOINT_B]?.position;
    if (a && b) {
      const dist = a.distanceTo(b);
      // Remap: 0 = threshold or beyond, 1 = touching
      this.pinch = Math.max(0, 1 - dist / PINCH_THRESHOLD);
    }
  }

  _setVisible(v) {
    for (const name of JOINT_NAMES) {
      this.joints[name].mesh.visible = v;
    }
  }

  dispose() {
    for (const name of JOINT_NAMES) {
      this.parent.remove(this.joints[name].mesh);
    }
    this._geo.dispose();
    this._mat.dispose();
  }
}

/**
 * Manages both hands (index 0 = left, 1 = right).
 * Add `hands.group` to the scene; call `hands.update(frame, refSpace)` per frame.
 */
export class Hands {
  constructor(renderer, parent) {
    this.renderer = renderer;
    this.group = new THREE.Group();
    this.group.name = 'hands-root';
    parent.add(this.group);

    const colors = [0x88ccff, 0xff8844];
    this.trackers = [];
    for (let i = 0; i < 2; i++) {
      const xrHand = renderer.xr.getHand(i);
      this.group.add(xrHand);
      const tracker = new HandTracker(xrHand, this.group, colors[i]);
      this.trackers.push(tracker);
    }
  }

  /** @param {XRFrame|null} frame */
  update(frame) {
    const refSpace = this.renderer.xr.getReferenceSpace?.() ?? null;
    for (const tracker of this.trackers) {
      tracker.update(frame, refSpace);
    }
  }

  /** Per-hand pinch value [0,1]. index 0=left, 1=right. */
  getPinch(index) {
    return this.trackers[index]?.pinch ?? 0;
  }

  /** Whether the hand has active joint data. */
  isActive(index) {
    return this.trackers[index]?.active ?? false;
  }

  /** World position of a named joint, or null. */
  getJointPosition(handIndex, jointName) {
    const entry = this.trackers[handIndex]?.joints[jointName];
    return entry ? entry.position : null;
  }

  dispose() {
    for (const tracker of this.trackers) {
      tracker.dispose();
    }
    this.group.clear();
  }
}
