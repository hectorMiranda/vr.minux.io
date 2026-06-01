// blink-move — teleport with a blink fade overlay (BlinkTransition).
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { TeleportControls } from '../locomotion/teleport.js';
import { BlinkTransition } from '../locomotion/blink.js';

class BlinkMoveScene extends Scene {
  async init() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(24, 24);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x223344,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.add(floor);

    // Grid lines on floor
    const grid = new THREE.GridHelper(24, 24, 0x334455, 0x334455);
    grid.position.y = 0.002;
    this.add(grid);

    // Landmark objects to give spatial reference
    const landmarkDefs = [
      { pos: [-4, 0, -5], color: 0xff6644 },
      { pos: [4, 0, -5],  color: 0x44ccff },
      { pos: [-4, 0, -10], color: 0x88ff44 },
      { pos: [4, 0, -10],  color: 0xff44aa },
      { pos: [0, 0, -7],   color: 0xffcc22 },
    ];

    const totemGeo  = new THREE.CylinderGeometry(0.08, 0.12, 3, 8);
    const sphereGeo = new THREE.SphereGeometry(0.22, 10, 8);

    for (const { pos, color } of landmarkDefs) {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });
      const totem = new THREE.Mesh(totemGeo, mat);
      totem.position.set(pos[0], 1.5, pos[2]);
      totem.castShadow = true;
      this.add(totem);
      const sphere = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({
        color,
        roughness: 0.2,
        metalness: 0.8,
        emissive: color,
        emissiveIntensity: 0.3,
      }));
      sphere.position.set(pos[0], 3.1, pos[2]);
      this.add(sphere);
    }

    // Blink transition overlay
    this._blink = new BlinkTransition(this.app.camera);
    this.onDispose(() => this._blink.dispose());

    // Teleport system — wraps confirm with blink
    this._teleport = new TeleportControls(this.app, 0);
    this._teleport.setFloor(floor);

    // We need to intercept the confirm: disable default and wire manually
    // TeleportControls uses controller events; we re-wire onRelease to blink
    this._teleport.enable();

    // Override: listen to squeezeend to do blink instead of instant move
    const { events } = this.app.controllers;
    this.onDispose(
      events.on('squeezeend', ({ index }) => {
        if (index !== 0) return;
        if (!this._teleport.hasTarget) return;
        const dest = this._teleport.target;
        const rigPos = this.app.rig.group.position;
        this._blink.blink(() => {
          this.app.rig.moveTo(dest.x, rigPos.y, dest.z);
        });
      }),
    );

    this.onDispose(
      events.on('selectend', ({ index }) => {
        if (index !== 0) return;
        if (!this._teleport.hasTarget) return;
        const dest = this._teleport.target;
        const rigPos = this.app.rig.group.position;
        this._blink.blink(() => {
          this.app.rig.moveTo(dest.x, rigPos.y, dest.z);
        });
      }),
    );

    // Desktop sweep
    this._sweepAngle = 0;
    this._autoBlinkTimer = 0;
    this._floorRef = floor;
  }

  update(dt) {
    this._blink.update(dt);
    this._teleport.update(dt);

    // Desktop: animate sweeping arc and auto-blink
    if (!this.app.renderer.xr.isPresenting) {
      this._sweepAngle += dt * 0.55;
      this._autoBlinkTimer += dt;

      const yaw   = Math.sin(this._sweepAngle * 0.7) * 0.7;
      const pitch = -0.5 + Math.sin(this._sweepAngle * 0.3) * 0.1;
      const origin = new THREE.Vector3(0, 1.5, 0);
      const dir = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch),
      );
      this._teleport.castArcFromRay(origin, dir);

      // Auto blink every 4s to showcase the overlay
      if (this._autoBlinkTimer > 4 && !this._blink.isActive) {
        this._autoBlinkTimer = 0;
        if (this._teleport.hasTarget) {
          const dest = this._teleport.target;
          const rigPos = this.app.rig.group.position;
          this._blink.blink(() => {
            this.app.rig.moveTo(dest.x, rigPos.y, dest.z);
          });
        }
      }
    }
  }

  dispose() {
    this._teleport.dispose();
    super.dispose();
  }
}

register({
  id: 'blink-move',
  title: 'Blink Move',
  category: 'Locomotion',
  tags: ['teleport', 'locomotion', 'blink', 'fade'],
  description: 'Teleport with a fade-to-black blink overlay masking the position change.',
  xr: 'vr',
  factory: (app) => new BlinkMoveScene(app),
});
