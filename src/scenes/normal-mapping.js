// Normal Mapping — a sphere with a procedurally generated normal map lit by a moving light.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

/** Build a tileable bump/normal map via canvas (embossed grid pattern). */
function makeNormalMap(size = 256) {
  // First draw a height map
  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const hCtx = hCanvas.getContext('2d');
  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, size, size);

  // Grid of bumps
  const cellSize = size / 8;
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const cx = (gx + 0.5) * cellSize;
      const cy = (gy + 0.5) * cellSize;
      const r = cellSize * 0.38;
      const g = hCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#808080');
      hCtx.fillStyle = g;
      hCtx.beginPath();
      hCtx.arc(cx, cy, r, 0, Math.PI * 2);
      hCtx.fill();
    }
  }

  // Derive normal map from height map
  const hData = hCtx.getImageData(0, 0, size, size).data;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');
  const nImg = nCtx.createImageData(size, size);

  const h = (x, y) => {
    const xi = ((x % size) + size) % size;
    const yi = ((y % size) + size) % size;
    return hData[(yi * size + xi) * 4] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = 4.0; // strength
      const dx = (h(x + 1, y) - h(x - 1, y)) * s;
      const dy = (h(x, y + 1) - h(x, y - 1)) * s;
      // Normal in tangent space
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const nx = (-dx / len) * 0.5 + 0.5;
      const ny = (-dy / len) * 0.5 + 0.5;
      const nz = (1 / len) * 0.5 + 0.5;
      const idx = (y * size + x) * 4;
      nImg.data[idx] = Math.round(nx * 255);
      nImg.data[idx + 1] = Math.round(ny * 255);
      nImg.data[idx + 2] = Math.round(nz * 255);
      nImg.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const tex = new THREE.CanvasTexture(nCanvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

class NormalMappingScene extends Scene {
  async init() {
    const normalMap = makeNormalMap(256);
    this.onDispose(() => normalMap.dispose());

    // Sphere
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6688bb,
      roughness: 0.55,
      metalness: 0.2,
      normalMap,
      normalScale: new THREE.Vector2(1.5, 1.5),
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 64, 32), mat);
    sphere.position.set(0, 1.4, -1.4);
    this.add(sphere);
    this._sphere = sphere;

    // Plane (shows wrapping pattern)
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0xccbbaa,
      roughness: 0.7,
      metalness: 0.1,
      normalMap: normalMap.clone(),
      normalScale: new THREE.Vector2(1.2, 1.2),
    });
    planeMat.normalMap.repeat.set(4, 4);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2, 32, 32), planeMat);
    plane.position.set(-0.9, 1.4, -1.5);
    this.add(plane);

    // Moving point light
    const light = new THREE.PointLight(0xffd880, 4, 5);
    light.position.set(0.5, 2, -0.8);
    this.add(light);
    this._light = light;

    // Light proxy sphere (tiny, emissive)
    const proxy = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd880 }),
    );
    light.add(proxy);

    const ambient = new THREE.AmbientLight(0x112233, 0.5);
    this.add(ambient);

    this._time = 0;
  }

  update(dt) {
    this._time += dt;
    const r = 0.8;
    this._light.position.set(
      Math.cos(this._time * 0.7) * r,
      1.6 + Math.sin(this._time * 0.4) * 0.4,
      -1.2 + Math.sin(this._time * 0.7) * r,
    );
    this._sphere.rotation.y += dt * 0.15;
  }

  dispose() { super.dispose(); }
}

register({
  id: 'normal-mapping',
  title: 'Normal Mapping',
  category: 'Rendering',
  tags: ['normals', 'bump', 'tangent', 'lighting'],
  description: 'A procedurally generated normal map (canvas → per-pixel normals) applied to a sphere and plane, lit by an orbiting point light.',
  xr: 'vr',
  factory: (app) => new NormalMappingScene(app),
});
