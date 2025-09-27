// drag-plane — drag a puck around a table-top plane.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { PlaneDragger } from '../interaction/drag.js';

class DragPlaneScene extends Scene {
  async init() {
    // Table surface.
    const TABLE_Y = 1.0;
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.04, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.7, metalness: 0.05 }),
    );
    table.position.set(0, TABLE_Y, -1.3);
    table.receiveShadow = true;
    this.add(table);

    // Puck.
    const puck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.03, 32),
      new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3, metalness: 0.5 }),
    );
    const PUCK_Y = TABLE_Y + 0.04;
    puck.position.set(0, PUCK_Y, -1.3);
    puck.castShadow = true;
    this.add(puck);
    this._puck = puck;

    // Socket circles for visual targets.
    const socketPositions = [
      [-0.45, -0.3], [0, -0.3], [0.45, -0.3],
      [-0.45, 0.3], [0.45, 0.3],
    ];
    for (const [dx, dz] of socketPositions) {
      const sock = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }),
      );
      sock.rotation.x = -Math.PI / 2;
      sock.position.set(dx, PUCK_Y + 0.002, -1.3 + dz);
      this.add(sock);
    }

    // PlaneDragger for the puck.
    this._dragger = new PlaneDragger({
      mesh: puck,
      planeNormal: new THREE.Vector3(0, 1, 0),
      planePoint: new THREE.Vector3(0, PUCK_Y, -1.3),
      constrainY: true,
    });
    this.onDispose(() => this._dragger.dispose());

    // Wire controllers.
    if (this.app.controllers) {
      this.onDispose(
        this.app.controllers.events.on('selectstart', ({ index }) => {
          const ray = this.app.controllers.getRay(index);
          this._dragger.startDrag(index, ray);
        }),
      );
      this.onDispose(
        this.app.controllers.events.on('selectend', ({ index }) => {
          this._dragger.endDrag(index);
        }),
      );
    }

    // Desktop auto-move for preview.
    this._autoAngle = 0;
    this._autoDragging = false;
    this._t = 0;
  }

  update(dt) {
    this._t += dt;

    // Provide ray if controller active.
    const ctrl = this.app.controllers?.controllers?.[0];
    if (ctrl && ctrl.visible && this._dragger.isDragging) {
      const ray = this.app.controllers.getRay(0);
      this._dragger.update(ray);
    } else if (!this._dragger.isDragging) {
      // Desktop: auto-animate the puck in a figure-8.
      this._autoAngle += dt * 0.7;
      this._puck.position.x = Math.sin(this._autoAngle) * 0.35;
      this._puck.position.z = -1.3 + Math.sin(this._autoAngle * 2) * 0.18;
    }

    // Slight puck tilt based on velocity direction (cosmetic).
    this._puck.rotation.y += dt * 0.3;
  }
}

register({
  id: 'drag-plane',
  title: 'Drag Plane',
  category: 'Interaction',
  tags: ['drag', 'plane', 'select', 'controller'],
  description: 'Drag a puck around a table-top plane using the select trigger.',
  xr: 'vr',
  factory: (app) => new DragPlaneScene(app),
});
