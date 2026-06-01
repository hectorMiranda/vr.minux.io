// Decals — DecalGeometry splats on a mesh; try/catch fallback to textured patches.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

/** Build a procedural decal canvas texture. */
function makeDecalTexture(color) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);

  // Outer glow
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color + 'ff');
  grad.addColorStop(0.5, color + '88');
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Star shape
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outer = size / 2 * 0.7;
    const inner = size / 2 * 0.3;
    const ao = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const ai = ao + Math.PI / 5;
    if (i === 0) ctx.moveTo(size / 2 + Math.cos(ao) * outer, size / 2 + Math.sin(ao) * outer);
    else ctx.lineTo(size / 2 + Math.cos(ao) * outer, size / 2 + Math.sin(ao) * outer);
    ctx.lineTo(size / 2 + Math.cos(ai) * inner, size / 2 + Math.sin(ai) * inner);
  }
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const DECAL_POSITIONS = [
  { pos: new THREE.Vector3(0, 0, 0.51), normal: new THREE.Vector3(0, 0, 1), color: '#ff4444' },
  { pos: new THREE.Vector3(0.51, 0, 0), normal: new THREE.Vector3(1, 0, 0), color: '#44ffaa' },
  { pos: new THREE.Vector3(-0.51, 0, 0), normal: new THREE.Vector3(-1, 0, 0), color: '#4488ff' },
  { pos: new THREE.Vector3(0, 0.51, 0), normal: new THREE.Vector3(0, 1, 0), color: '#ffee44' },
  { pos: new THREE.Vector3(0, -0.51, 0), normal: new THREE.Vector3(0, -1, 0), color: '#ff44ee' },
];

class DecalsScene extends Scene {
  async init() {
    // Base box to receive decals
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.6 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 1.4, -1.5);
    this.add(box);
    this._box = box;

    this._decalTextures = [];

    let useDecalGeo = false;
    let DecalGeometry;

    try {
      const mod = await import('three/addons/geometries/DecalGeometry.js');
      DecalGeometry = mod.DecalGeometry;
      useDecalGeo = true;
    } catch (e) {
      console.warn('decals: DecalGeometry unavailable, using textured patch fallback', e);
    }

    DECAL_POSITIONS.forEach(({ pos, normal, color }) => {
      const tex = makeDecalTexture(color);
      this._decalTextures.push(tex);
      this.onDispose(() => tex.dispose());

      if (useDecalGeo && DecalGeometry) {
        try {
          const worldPos = pos.clone().add(box.position);
          const size = new THREE.Vector3(0.35, 0.35, 0.35);
          // Orient the decal: quaternion from normal
          const orient = new THREE.Euler();
          const quat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), normal,
          );
          orient.setFromQuaternion(quat);

          const decalGeo = new DecalGeometry(box, worldPos, orient, size);
          const decalMat = new THREE.MeshStandardMaterial({
            map: tex,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
          });
          const decal = new THREE.Mesh(decalGeo, decalMat);
          this.add(decal);
          this.onDispose(() => { decalGeo.dispose(); decalMat.dispose(); });
        } catch (err) {
          console.warn('decals: DecalGeometry instance failed', err);
          this._addFallbackPatch(pos, normal, tex, box.position);
        }
      } else {
        this._addFallbackPatch(pos, normal, tex, box.position);
      }
    });

    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(3, 4, 2);
    this.add(key);

    const ambient = new THREE.AmbientLight(0x334466, 0.8);
    this.add(ambient);

    this._time = 0;
  }

  _addFallbackPatch(localPos, normal, tex, basePos) {
    const patchMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), patchMat);
    // Place slightly outside the face
    const worldPos = localPos.clone().multiplyScalar(1.01).add(basePos);
    patch.position.copy(worldPos);
    // Align plane normal to face normal
    patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    this.add(patch);
    this.onDispose(() => { patch.geometry.dispose(); patchMat.dispose(); });
  }

  update(dt) {
    this._time += dt;
    this._box.rotation.y += dt * 0.25;
    this._box.rotation.x = Math.sin(this._time * 0.3) * 0.1;
  }

  dispose() { super.dispose(); }
}

register({
  id: 'decals',
  title: 'Decals',
  category: 'Rendering',
  tags: ['decals', 'decal-geometry', 'addons', 'stickers'],
  description: 'DecalGeometry star splats projected onto a rotating box; falls back to flat textured patches if the addon is unavailable.',
  xr: 'vr',
  factory: (app) => new DecalsScene(app),
});
