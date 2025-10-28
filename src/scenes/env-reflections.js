// Env Reflections — PMREM environment from a procedural equirect canvas.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

/** Build a 512×256 equirectangular canvas gradient and return a DataTexture. */
function makeEquirectTexture() {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a1a3a');
  sky.addColorStop(0.4, '#1a3a6a');
  sky.addColorStop(0.5, '#e87a30');
  sky.addColorStop(0.6, '#5a8ad0');
  sky.addColorStop(1, '#234060');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Sun disc
  ctx.save();
  const sunGrad = ctx.createRadialGradient(W * 0.62, H * 0.5, 0, W * 0.62, H * 0.5, 20);
  sunGrad.addColorStop(0, 'rgba(255,240,180,1)');
  sunGrad.addColorStop(0.4, 'rgba(255,180,60,0.8)');
  sunGrad.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(W * 0.62, H * 0.5, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Stars (upper half)
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H * 0.42;
    const r = 0.5 + Math.random() * 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

class EnvReflectionsScene extends Scene {
  async init() {
    const equirect = makeEquirectTexture();
    this.onDispose(() => equirect.dispose());

    let envMap = equirect; // fallback: use equirect directly
    try {
      const { PMREMGenerator } = THREE;
      const pmrem = new PMREMGenerator(this.app.renderer);
      pmrem.compileEquirectangularShader();
      const rt = pmrem.fromEquirectangular(equirect);
      envMap = rt.texture;
      this.onDispose(() => { rt.dispose(); pmrem.dispose(); });
    } catch (e) {
      console.warn('env-reflections: PMREM failed, using equirect fallback', e);
    }

    this.app.scene.background = equirect;
    this.app.scene.environment = envMap;
    this.onDispose(() => {
      this.app.scene.background = null;
      this.app.scene.environment = null;
    });

    // Row of reflective spheres: vary roughness
    const geo = new THREE.SphereGeometry(0.14, 64, 32);
    const N = 6;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: t * 0.8,
        metalness: 1.0,
        envMap,
        envMapIntensity: 1.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((i - (N - 1) / 2) * 0.35, 1.4, -1.6);
      this.add(mesh);
    }

    // Non-metal dielectric row
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x88aaff,
        roughness: t * 0.9,
        metalness: 0,
        envMap,
        envMapIntensity: 1.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((i - (N - 1) / 2) * 0.35, 1.05, -1.6);
      this.add(mesh);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.add(ambient);

    this._time = 0;
    this._meshes = this.group.children.filter((c) => c.isMesh);
  }

  update(dt) {
    this._time += dt;
    this._meshes.forEach((m, i) => {
      m.rotation.y += dt * (0.2 + i * 0.03);
    });
  }

  dispose() {
    this.app.scene.background = null;
    this.app.scene.environment = null;
    super.dispose();
  }
}

register({
  id: 'env-reflections',
  title: 'Env Reflections',
  category: 'Rendering',
  tags: ['pmrem', 'envmap', 'reflections', 'ibl'],
  description: 'PMREM environment generated from a procedural equirect gradient canvas; two rows of spheres vary roughness and metalness.',
  xr: 'vr',
  factory: (app) => new EnvReflectionsScene(app),
});
