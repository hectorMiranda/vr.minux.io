// Procedural controller model and hand-ray line builder.
// No external assets — all geometry is created in code.
import * as THREE from 'three';

/**
 * Build a simple procedural controller model as a THREE.Group.
 * Consists of a body (box), a ring around the front, and a trigger lever.
 *
 * @param {number} [color=0x888888] - body tint
 * @returns {THREE.Group}
 */
export function buildControllerModel(color = 0x888888) {
  const group = new THREE.Group();
  group.name = 'controller-model';

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.04, 0.025, 0.11);
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.4,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = 'body';
  group.add(body);

  // Ring (torus around the front)
  const ringGeo = new THREE.TorusGeometry(0.025, 0.004, 8, 24);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.3,
    metalness: 0.7,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.name = 'ring';
  ring.position.set(0, 0, -0.045);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Trigger lever
  const triggerGeo = new THREE.BoxGeometry(0.015, 0.02, 0.015);
  const triggerMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.2,
  });
  const trigger = new THREE.Mesh(triggerGeo, triggerMat);
  trigger.name = 'trigger';
  trigger.position.set(0, -0.018, -0.02);
  trigger.rotation.x = Math.PI / 8;
  group.add(trigger);

  // Store reference for animation
  group.userData.trigger = trigger;
  group.userData.ring = ring;

  /**
   * Animate the trigger press (0 = released, 1 = fully pressed).
   * @param {number} t
   */
  group.setTriggerPress = (t) => {
    trigger.rotation.x = Math.PI / 8 + t * (Math.PI / 6);
    triggerMat.emissive.setScalar(t * 0.3);
  };

  return group;
}

/**
 * Build a thin ray line emanating from a controller target-ray space.
 * The line starts at origin and extends 5 m along -Z.
 *
 * @param {number} [color=0x44aaff]
 * @returns {THREE.Line}
 */
export function buildHandRayLine(color = 0x44aaff) {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    depthTest: false,
  });
  const line = new THREE.Line(geo, mat);
  line.name = 'hand-ray-line';
  line.frustumCulled = false;
  return line;
}
