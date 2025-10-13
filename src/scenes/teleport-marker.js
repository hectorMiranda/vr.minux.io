// teleport-marker — landing marker styles (ring + normal alignment) on uneven blocks.
// Focuses on the visual feedback of where the teleport will land.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

// Build a ring+arrow marker that aligns to surface normals
function makeMarker(color) {
  const group = new THREE.Group();

  // Outer ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.38, 32),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthTest: false }),
  );
  ring.renderOrder = 2;
  group.add(ring);

  // Inner filled disc
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthTest: false,
    }),
  );
  disc.renderOrder = 2;
  group.add(disc);

  // Forward arrow
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.28);
  arrowShape.lineTo(-0.1, 0.1);
  arrowShape.lineTo(0.1, 0.1);
  arrowShape.closePath();
  const arrow = new THREE.Mesh(
    new THREE.ShapeGeometry(arrowShape),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthTest: false }),
  );
  arrow.renderOrder = 3;
  group.add(arrow);

  return group;
}

class TeleportMarkerScene extends Scene {
  async init() {
    // Main flat floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.85 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.add(floor);

    // Uneven blocks for interesting surface normals
    const blockDefs = [
      { pos: [-2, 0.2, -3], size: [1.5, 0.4, 1.5], rot: 0 },
      { pos: [2, 0.35, -4], size: [1.2, 0.7, 1.2], rot: 0.15 },
      { pos: [0, 0.5, -6], size: [2, 1.0, 2], rot: 0 },
      { pos: [-4, 0.15, -5], size: [1.8, 0.3, 1.8], rot: -0.1 },
      { pos: [4.5, 0.25, -3], size: [1.0, 0.5, 1.0], rot: 0.2 },
      { pos: [-1, 0.4, -8], size: [2.5, 0.8, 1.5], rot: 0.05 },
    ];

    this._blocks = [];
    const colors = [0x6688aa, 0x7799bb, 0x558899, 0x667788, 0x889977, 0x997766];
    for (let i = 0; i < blockDefs.length; i++) {
      const { pos, size, rot } = blockDefs[i];
      const geo = new THREE.BoxGeometry(...size);
      const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.y = rot;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.add(mesh);
      this._blocks.push(mesh);
    }

    // Landing markers: one on each block top surface
    this._markers = [];
    const markerColors = [0x00ffcc, 0xffcc00, 0xff66aa, 0x66aaff, 0xaaff66, 0xff9944];

    for (let i = 0; i < blockDefs.length; i++) {
      const { pos, size, rot } = blockDefs[i];
      const marker = makeMarker(markerColors[i % markerColors.length]);
      const topY = pos[1] + size[1] / 2 + 0.01;
      marker.position.set(pos[0], topY, pos[2]);
      // Tilt the marker to match the block's Y rotation (blocks are axis-aligned so normal is up)
      // For visual variety, slightly tilt some markers to show normal alignment concept
      if (Math.abs(rot) > 0.05) {
        marker.rotateZ(rot * 0.5);
      }
      marker.rotation.x = -Math.PI / 2;
      this.add(marker);
      this._markers.push({ marker, baseY: topY });
    }

    // Raycaster for sweep
    this._raycaster = new THREE.Raycaster();

    // Single arc indicator line
    const arcGeo = new THREE.BufferGeometry();
    const pts = new Float32Array(32 * 3);
    arcGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    this._arcLine = new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({ color: 0x00ffcc, depthTest: false }),
    );
    this._arcLine.renderOrder = 1;
    this._arcLine.frustumCulled = false;
    this.add(this._arcLine);
    this._arcGeo = arcGeo;

    // Sweep state
    this._sweepAngle = 0;
    this._time = 0;
    this._allMeshes = [floor, ...this._blocks];
  }

  update(dt) {
    this._time += dt;
    this._sweepAngle += dt * 0.5;

    // Animate markers: gentle bob
    for (const { marker, baseY } of this._markers) {
      marker.position.y = baseY + Math.sin(this._time * 1.5) * 0.03;
    }

    // Sweep the arc indicator
    const yaw = Math.sin(this._sweepAngle * 0.8) * 1.2;
    const pitch = -0.5 + Math.sin(this._sweepAngle * 0.3) * 0.18;
    const origin = new THREE.Vector3(0, 1.6, 0);
    const dir = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    ).normalize();

    this._updateArcLine(origin, dir);
  }

  _updateArcLine(origin, dir) {
    const SEGS = 32;
    const G = 9.8;
    const speed = 7;
    const vx = dir.x * speed;
    const vy = dir.y * speed;
    const vz = dir.z * speed;
    const step = 0.05;

    const pos = this._arcGeo.attributes.position.array;
    let prev = origin.clone();
    let count = 0;

    for (let i = 0; i < SEGS; i++) {
      const t = (i + 1) * step;
      const curr = new THREE.Vector3(
        origin.x + vx * t,
        origin.y + vy * t - 0.5 * G * t * t,
        origin.z + vz * t,
      );

      if (!this._hitDone) {
        const segDir = curr.clone().sub(prev).normalize();
        this._raycaster.set(prev, segDir);
        this._raycaster.far = prev.distanceTo(curr) + 0.05;
        const hits = this._raycaster.intersectObjects(this._allMeshes, false);
        if (hits.length > 0) {
          curr.copy(hits[0].point);
          pos[i * 3]     = curr.x;
          pos[i * 3 + 1] = curr.y;
          pos[i * 3 + 2] = curr.z;
          count = i + 1;
          this._hitDone = true;
          break;
        }
      }

      pos[i * 3]     = curr.x;
      pos[i * 3 + 1] = curr.y;
      pos[i * 3 + 2] = curr.z;
      count = i + 1;
      prev = curr;
    }

    this._hitDone = false;
    this._arcGeo.attributes.position.needsUpdate = true;
    this._arcGeo.setDrawRange(0, count);
  }

  dispose() {
    this._arcGeo.dispose();
    super.dispose();
  }
}

register({
  id: 'teleport-marker',
  title: 'Teleport Marker',
  category: 'Locomotion',
  tags: ['teleport', 'locomotion', 'marker', 'normal'],
  description: 'Landing marker styles (ring + normal alignment) on uneven blocks with a sweeping arc indicator.',
  xr: 'vr',
  factory: (app) => new TeleportMarkerScene(app),
});
