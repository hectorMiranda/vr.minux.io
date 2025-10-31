// Mirror Portal — Reflector mirror panel; fallback to shiny material if addon fails.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class MirrorPortalScene extends Scene {
  async init() {
    // Scene dressing: a few coloured objects to see reflected
    const objects = [
      { geo: new THREE.BoxGeometry(0.25, 0.25, 0.25), color: 0xe05050, pos: [-0.7, 1.2, -1.0] },
      { geo: new THREE.SphereGeometry(0.14, 24, 12), color: 0x50c0e0, pos: [0.7, 1.5, -1.1] },
      { geo: new THREE.ConeGeometry(0.12, 0.3, 12), color: 0xf0c030, pos: [0.3, 1.1, -0.9] },
      { geo: new THREE.TorusGeometry(0.12, 0.04, 10, 28), color: 0x88ee88, pos: [-0.3, 1.65, -0.95] },
    ];
    objects.forEach(({ geo, color, pos }) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.3 }));
      m.position.set(...pos);
      m.castShadow = true;
      this.add(m);
    });
    this._dressing = this.group.children.slice();

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.8 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.add(floor);

    // Try Reflector
    let mirrorMesh;
    let reflector = null;
    try {
      const { Reflector } = await import('three/addons/objects/Reflector.js');
      const mirrorGeo = new THREE.PlaneGeometry(1.4, 1.8);
      reflector = new Reflector(mirrorGeo, {
        clipBias: 0.003,
        textureWidth: 512,
        textureHeight: 512,
        color: 0x889999,
      });
      reflector.position.set(0, 1.4, -2.1);
      mirrorMesh = reflector;
      this.onDispose(() => {
        reflector.getRenderTarget?.()?.dispose();
        reflector.geometry?.dispose();
        reflector.material?.dispose();
      });
    } catch (e) {
      console.warn('mirror-portal: Reflector unavailable, using shiny fallback', e);
      // Fallback: very shiny standard material
      const mat = new THREE.MeshStandardMaterial({
        color: 0xbbdddd,
        roughness: 0,
        metalness: 1.0,
        envMapIntensity: 1.5,
      });
      mirrorMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), mat);
      mirrorMesh.position.set(0, 1.4, -2.1);
    }
    this.add(mirrorMesh);

    // Frame around the mirror
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.5, metalness: 0.6 });
    const frameGeo = new THREE.BoxGeometry(1.52, 1.92, 0.05);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 1.4, -2.14);
    this.add(frame);

    // Ornamental corner spheres
    [[-0.75, 0.95], [0.75, 0.95], [-0.75, -0.95], [0.75, -0.95]].forEach(([x, y]) => {
      const corner = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0xd4a030, roughness: 0.2, metalness: 0.8 }),
      );
      corner.position.set(x, 1.4 + y, -2.13);
      this.add(corner);
    });

    const key = new THREE.DirectionalLight(0xfff8ee, 2);
    key.position.set(2, 3, 1);
    key.castShadow = true;
    this.add(key);

    const fill = new THREE.AmbientLight(0x334466, 0.8);
    this.add(fill);

    this._time = 0;
    this._reflector = reflector;
  }

  update(dt) {
    this._time += dt;
    // Slowly rotate the dressing objects
    this._dressing.forEach((m, i) => {
      if (m.isMesh) {
        m.rotation.y += dt * (0.3 + i * 0.08);
        m.position.y = m.position.y + Math.sin(this._time * 0.5 + i) * dt * 0.05;
      }
    });
  }

  dispose() { super.dispose(); }
}

register({
  id: 'mirror-portal',
  title: 'Mirror Portal',
  category: 'Rendering',
  tags: ['reflector', 'mirror', 'portal', 'addons'],
  description: 'A Reflector (three/addons) mirror panel in a decorated frame; falls back to a shiny MeshStandardMaterial if the addon is unavailable.',
  xr: 'vr',
  factory: (app) => new MirrorPortalScene(app),
});
