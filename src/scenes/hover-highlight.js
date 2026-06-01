// hover-highlight — cubes that highlight when the ray points at them.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { PointerRaycaster } from '../interaction/raycaster.js';
import { applyHover } from '../interaction/hover.js';

const BASE_COLORS = [0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71, 0x3498db, 0x9b59b6, 0x1abc9c];

class HoverHighlightScene extends Scene {
  async init() {
    this._cubes = [];
    this._hovers = [];

    for (let i = 0; i < 7; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        new THREE.MeshStandardMaterial({ color: BASE_COLORS[i], roughness: 0.4, metalness: 0.1 }),
      );
      mesh.position.set((i - 3) * 0.22, 1.4, -1.5);
      mesh.castShadow = true;
      this.add(mesh);
      this._cubes.push(mesh);

      const h = applyHover(mesh, { color: 0xffffff, scaleUp: 1.3, speed: 12 });
      this._hovers.push(h);
    }

    // Raycaster wired to controller 0 (or camera sweep on desktop).
    this._rc = new PointerRaycaster({
      source: this.app.camera,
      isCamera: false,
      rayLength: 4,
      rayColor: 0xffffff,
    });
    this._rc.setTargets(this._cubes);

    this._sweepAngle = 0;
    this._t = 0;
  }

  update(dt) {
    this._t += dt;
    this._sweepAngle += dt * 0.9;

    // Build ray: use controller 0 if active, otherwise sweep camera.
    const ctrl = this.app.controllers?.controllers?.[0];
    let ray;
    if (ctrl && ctrl.visible) {
      ray = this.app.controllers.getRay(0);
    } else {
      const cam = this.app.camera;
      const origin = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
      const sweepX = Math.sin(this._sweepAngle) * 0.5;
      const dir = new THREE.Vector3(sweepX, 0, -1).normalize();
      dir.applyQuaternion(cam.quaternion);
      ray = new THREE.Ray(origin, dir);
    }

    const hit = this._rc.update(ray);
    const hoveredMesh = hit ? hit.object : null;

    this._cubes.forEach((cube, i) => {
      const isHovered = cube === hoveredMesh;
      this._hovers[i].enter(isHovered ? cube : null);
      this._hovers[i].leave(isHovered ? null : cube);
      this._hovers[i].update(dt);
      // Idle bob.
      cube.position.y = 1.4 + Math.sin(this._t * 0.7 + i * 0.9) * 0.04;
      cube.rotation.y += dt * 0.4;
    });
  }

  dispose() {
    this._hovers.forEach((h) => h.dispose());
    this._rc.dispose();
    super.dispose();
  }
}

register({
  id: 'hover-highlight',
  title: 'Hover Highlight',
  category: 'Interaction',
  tags: ['hover', 'ray', 'highlight', 'controller'],
  description: 'Cubes that scale and tint when the controller ray (or auto-sweep on desktop) points at them.',
  xr: 'vr',
  factory: (app) => new HoverHighlightScene(app),
});
