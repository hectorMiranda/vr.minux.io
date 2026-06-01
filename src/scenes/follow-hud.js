// follow-hud.js — a HUD anchored to the camera showing position + frame counter.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { HUD } from '../ui/hud.js';

class FollowHUDScene extends Scene {
  async init() {
    // A reference cube in the world
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x44aacc, roughness: 0.4, metalness: 0.1 }),
    );
    cube.position.set(0, 1.5, -1.5);
    cube.castShadow = true;
    this.add(cube);
    this._cube = cube;

    // HUD attached to camera
    this._hud = new HUD({
      offset: new THREE.Vector3(0.28, -0.18, -0.5),
      width: 256,
      height: 80,
      fontSize: 14,
      background: 'rgba(0,10,20,0.75)',
      color: '#99ffcc',
    });

    // We attach the HUD group to the camera directly
    this.app.camera.add(this._hud.group);
    this.onDispose(() => {
      this.app.camera.remove(this._hud.group);
      this._hud.dispose();
    });

    this._frame = 0;
    this._elapsed = 0;
  }

  update(dt) {
    this._cube.rotation.y += dt * 0.7;
    this._frame++;
    this._elapsed += dt;

    const cam = this.app.camera;
    const p = new THREE.Vector3();
    cam.getWorldPosition(p);

    this._hud.setLines([
      `Pos  ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}`,
      `Time ${this._elapsed.toFixed(1)}s`,
      `Frame ${this._frame}`,
    ]);
  }
}

register({
  id: 'follow-hud',
  title: 'Follow HUD',
  category: 'UI',
  tags: ['ui', 'hud', 'camera', 'overlay'],
  description: 'A camera-attached HUD panel that displays live position and frame counter.',
  xr: 'vr',
  factory: (app) => new FollowHUDScene(app),
});
