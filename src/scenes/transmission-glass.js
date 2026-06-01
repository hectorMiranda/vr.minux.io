// Transmission Glass — a glass sphere over a colourful backdrop.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class TransmissionGlassScene extends Scene {
  async init() {
    // Colourful backdrop panel
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#e84393');
    grad.addColorStop(0.33, '#f5a623');
    grad.addColorStop(0.66, '#4a90e2');
    grad.addColorStop(1, '#7ed321');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    // Polka dots
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(
        (Math.random() * 200 + 28),
        (Math.random() * 200 + 28),
        12 + Math.random() * 12,
        0, Math.PI * 2,
      );
      ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.3})`;
      ctx.fill();
    }

    const backdropTex = new THREE.CanvasTexture(canvas);
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.6),
      new THREE.MeshBasicMaterial({ map: backdropTex }),
    );
    backdrop.position.set(0, 1.4, -2.2);
    this.add(backdrop);

    // Small coloured spheres behind the glass
    const colours = [0xff4444, 0x44ff88, 0x4488ff, 0xffee44];
    const positions = [[-0.5, 1.55, -1.9], [0.5, 1.55, -1.9], [-0.5, 1.2, -1.9], [0.5, 1.2, -1.9]];
    colours.forEach((c, i) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 8),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0 }),
      );
      m.position.set(...positions[i]);
      this.add(m);
    });

    // Glass sphere
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1.0,
      ior: 1.5,
      thickness: 0.4,
      roughness: 0,
      metalness: 0,
      transparent: true,
      envMapIntensity: 1,
    });
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.25, 64, 32), glassMat);
    glass.position.set(0, 1.4, -1.4);
    this.add(glass);

    // Subtle interior caustic tint sphere (slightly smaller, transparent)
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 32, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0x88ddff,
        transparent: true,
        opacity: 0.08,
        roughness: 0,
        metalness: 0,
        side: THREE.BackSide,
      }),
    );
    inner.position.copy(glass.position);
    this.add(inner);

    const light = new THREE.PointLight(0xffffff, 2, 6);
    light.position.set(1, 2.5, -0.5);
    this.add(light);

    const ambient = new THREE.AmbientLight(0x334455, 1.2);
    this.add(ambient);

    this._glass = glass;
    this._light = light;
    this._time = 0;
  }

  update(dt) {
    this._time += dt;
    this._glass.rotation.y += dt * 0.2;
    this._light.position.x = Math.sin(this._time * 0.5) * 1.5;
    this._light.position.z = Math.cos(this._time * 0.5) * 1.5 - 0.5;
  }

  dispose() { super.dispose(); }
}

register({
  id: 'transmission-glass',
  title: 'Transmission Glass',
  category: 'Rendering',
  tags: ['glass', 'transmission', 'ior', 'physical'],
  description: 'A MeshPhysicalMaterial glass sphere with transmission/IOR/thickness over a colourful procedural backdrop.',
  xr: 'vr',
  factory: (app) => new TransmissionGlassScene(app),
});
