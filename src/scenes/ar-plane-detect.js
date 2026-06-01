// AR Plane Detection: when plane-detection is available, visualize detected
// planes as translucent coloured polygons. Desktop shows mock planes.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const PLANE_COLORS = {
  floor:   0x80cbc4,
  wall:    0xb39ddb,
  ceiling: 0xffcc02,
  table:   0xef9a9a,
  seat:    0xa5d6a7,
  default: 0x90a4ae,
};

function colorForPlane(plane) {
  const label = plane.semanticLabel?.toLowerCase?.() ?? 'default';
  for (const key of Object.keys(PLANE_COLORS)) {
    if (label.includes(key)) return PLANE_COLORS[key];
  }
  return PLANE_COLORS.default;
}

function buildPlaneGeometry(polygon) {
  // polygon is an XRPlane.polygon array of DOMPointReadOnly
  const verts = [];
  for (const pt of polygon) {
    verts.push(pt.x, pt.y, pt.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  // Triangulate as fan
  const indices = [];
  for (let i = 1; i < polygon.length - 1; i++) {
    indices.push(0, i, i + 1);
  }
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Desktop mock planes
function makeMockPlanes() {
  return [
    {
      id: 'mock-floor',
      orientation: 'horizontal',
      semanticLabel: 'floor',
      polygon: [
        { x: -0.8, y: 0, z: -0.4 },
        { x:  0.8, y: 0, z: -0.4 },
        { x:  0.8, y: 0, z: -1.8 },
        { x: -0.8, y: 0, z: -1.8 },
      ],
    },
    {
      id: 'mock-table',
      orientation: 'horizontal',
      semanticLabel: 'table',
      polygon: [
        { x: -0.35, y: 0.72, z: -0.9  },
        { x:  0.35, y: 0.72, z: -0.9  },
        { x:  0.35, y: 0.72, z: -1.35 },
        { x: -0.35, y: 0.72, z: -1.35 },
      ],
    },
    {
      id: 'mock-wall',
      orientation: 'vertical',
      semanticLabel: 'wall',
      polygon: [
        { x: -0.9, y: 0.0,  z: -2.0 },
        { x:  0.9, y: 0.0,  z: -2.0 },
        { x:  0.9, y: 2.0,  z: -2.0 },
        { x: -0.9, y: 2.0,  z: -2.0 },
      ],
    },
  ];
}

class ArPlaneDetectScene extends Scene {
  async init() {
    this.app.setFloorVisible(false);

    this._planeMeshes = new Map(); // plane id -> { mesh, lastChanged }
    this._planeGroup = new THREE.Group();
    this.add(this._planeGroup);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(1, 3, 1);
    this.add(dir);

    this._time = 0;
    this._desktopInitDone = false;
  }

  _getMeshForPlane(plane, refSpace, frame) {
    const planeId = plane;
    if (!this._planeMeshes.has(planeId)) {
      this._createPlaneMesh(plane, refSpace, frame);
    } else {
      this._updatePlaneMesh(plane, refSpace, frame);
    }
  }

  _createPlaneMesh(plane, refSpace, frame) {
    if (!plane.polygon) return;
    const geo = buildPlaneGeometry(plane.polygon);
    const color = colorForPlane(plane);
    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.8,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Edge wireframe
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });
    const lines = new THREE.LineSegments(edges, lineMat);
    mesh.add(lines);

    // Position via plane pose
    if (refSpace && frame) {
      const pose = frame.getPose?.(plane.planeSpace, refSpace);
      if (pose) {
        const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
        mesh.position.setFromMatrixPosition(m);
        mesh.quaternion.setFromRotationMatrix(m);
      }
    }

    this._planeGroup.add(mesh);
    this._planeMeshes.set(plane, { mesh, lastChanged: plane.lastChangedTime });
    this._disposables.push(mesh);
  }

  _updatePlaneMesh(plane, refSpace, frame) {
    const entry = this._planeMeshes.get(plane);
    if (!entry) return;
    if (plane.lastChangedTime === entry.lastChanged) return; // no change

    // Rebuild geometry
    if (plane.polygon) {
      const newGeo = buildPlaneGeometry(plane.polygon);
      entry.mesh.geometry.dispose();
      entry.mesh.geometry = newGeo;
      entry.lastChanged = plane.lastChangedTime;
    }

    if (refSpace && frame) {
      const pose = frame.getPose?.(plane.planeSpace, refSpace);
      if (pose) {
        const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
        entry.mesh.position.setFromMatrixPosition(m);
        entry.mesh.quaternion.setFromRotationMatrix(m);
      }
    }
  }

  _buildDesktopPlanes() {
    for (const plane of makeMockPlanes()) {
      const geo = buildPlaneGeometry(plane.polygon);
      const color = colorForPlane(plane);
      const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
      mesh.add(new THREE.LineSegments(edges, lineMat));

      this._planeGroup.add(mesh);
      this._planeMeshes.set(plane.id, { mesh, lastChanged: 0 });
      this._disposables.push(mesh);
    }
  }

  onSessionStart() {
    this.app.scene.background = null;
  }

  onSessionEnd() {
    // Clear live plane meshes
    for (const { mesh } of this._planeMeshes.values()) {
      this._planeGroup.remove(mesh);
    }
    this._planeMeshes.clear();
  }

  update(dt, frame) {
    this._time += dt;

    // Desktop mode
    if (!frame) {
      if (!this._desktopInitDone) {
        this._desktopInitDone = true;
        this._buildDesktopPlanes();
      }
      // Gentle pulse opacity
      let i = 0;
      for (const { mesh } of this._planeMeshes.values()) {
        mesh.material.opacity = 0.25 + 0.15 * Math.sin(this._time * 0.8 + i * 1.2);
        i++;
      }
      return;
    }

    // AR: use detectedPlanes from XRFrame
    const xr = this.app.renderer.xr;
    const refSpace = xr.getReferenceSpace?.();
    if (!refSpace) return;

    const detectedPlanes = frame.detectedPlanes;
    if (!detectedPlanes) return;

    // Remove meshes for planes no longer detected
    for (const [plane, { mesh }] of this._planeMeshes) {
      if (!detectedPlanes.has(plane)) {
        this._planeGroup.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this._planeMeshes.delete(plane);
      }
    }

    for (const plane of detectedPlanes) {
      this._getMeshForPlane(plane, refSpace, frame);
    }

    // Pulse
    let i = 0;
    for (const { mesh } of this._planeMeshes.values()) {
      mesh.material.opacity = 0.25 + 0.15 * Math.sin(this._time * 0.8 + i * 1.2);
      i++;
    }
  }

  dispose() {
    for (const { mesh } of this._planeMeshes.values()) {
      this._planeGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this._planeMeshes.clear();
    super.dispose();
  }
}

register({
  id: 'ar-plane-detect',
  title: 'AR Plane Detection',
  category: 'AR',
  tags: ['ar', 'plane-detection', 'surfaces', 'mesh'],
  description: 'Visualizes WebXR-detected planes as translucent coloured polygons; shows mock planes on desktop.',
  xr: 'ar',
  factory: (app) => new ArPlaneDetectScene(app),
});
