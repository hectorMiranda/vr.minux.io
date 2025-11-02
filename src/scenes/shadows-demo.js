// Shadows Demo — objects casting/receiving shadows from a moving directional light.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class ShadowsDemoScene extends Scene {
  async init() {
    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.9 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.add(ground);

    // Back wall
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 3),
      new THREE.MeshStandardMaterial({ color: 0xaaaacc, roughness: 0.8 }),
    );
    wall.position.set(0, 1.5, -2.8);
    wall.receiveShadow = true;
    this.add(wall);

    // Objects
    const shapes = [
      new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xe05050, roughness: 0.5 })),
      new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 16),
        new THREE.MeshStandardMaterial({ color: 0x50c0e0, roughness: 0.3 })),
      new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0xf0c030, roughness: 0.6 })),
      new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x88ee88, roughness: 0.4 })),
      new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 12, 32),
        new THREE.MeshStandardMaterial({ color: 0xee88ff, roughness: 0.45 })),
    ];
    shapes.forEach((s, i) => {
      s.position.set((i - 2) * 0.55, 0.2, -1.5);
      s.castShadow = true;
      s.receiveShadow = true;
      this.add(s);
    });
    this._shapes = shapes;

    // Moving directional light
    const dir = new THREE.DirectionalLight(0xfffde8, 2.5);
    dir.position.set(2, 3, 2);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 12;
    dir.shadow.camera.left = -3;
    dir.shadow.camera.right = 3;
    dir.shadow.camera.top = 3;
    dir.shadow.camera.bottom = -3;
    dir.shadow.bias = -0.001;
    this.add(dir);
    this._dir = dir;

    // Shadow camera helper (visible initially, toggles)
    const helper = new THREE.CameraHelper(dir.shadow.camera);
    this.add(helper);
    this._helper = helper;
    this._helperTimer = 0;

    // Ambient fill
    const ambient = new THREE.AmbientLight(0x334466, 0.8);
    this.add(ambient);

    this._time = 0;
    this.app.renderer.shadowMap.enabled = true;
    this.app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.onDispose(() => {
      // Leave shadowMap enabled for other scenes; just tidy references
    });
  }

  update(dt) {
    this._time += dt;
    // Orbit the light
    const r = 3;
    this._dir.position.set(
      Math.cos(this._time * 0.4) * r,
      2.5 + Math.sin(this._time * 0.25) * 0.5,
      Math.sin(this._time * 0.4) * r,
    );
    this._dir.shadow.camera.updateProjectionMatrix();

    // Gently rotate each shape
    this._shapes.forEach((s, i) => {
      s.rotation.y += dt * (0.4 + i * 0.1);
      s.rotation.x += dt * 0.2;
    });

    // Toggle helper every 4 s
    this._helperTimer += dt;
    if (this._helperTimer > 4) {
      this._helperTimer = 0;
      this._helper.visible = !this._helper.visible;
    }
    if (this._helper.visible) this._helper.update();
  }

  dispose() { super.dispose(); }
}

register({
  id: 'shadows-demo',
  title: 'Shadows Demo',
  category: 'Rendering',
  tags: ['shadows', 'directional-light', 'pcf', 'shadow-camera'],
  description: 'Multiple objects cast and receive PCFSoft shadows from an orbiting directional light; the shadow-camera helper toggles on/off every 4 s.',
  xr: 'vr',
  factory: (app) => new ShadowsDemoScene(app),
});
