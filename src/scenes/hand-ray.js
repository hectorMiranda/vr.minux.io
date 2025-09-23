// Hand Ray — casts a ray from the hand and highlights target objects.
// Desktop: auto-swings a fake ray and lights targets.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Hands } from '../xr/hands.js';
import { buildHandRayLine } from '../xr/controller-models.js';

const TARGET_COUNT = 5;
const RAY_LENGTH = 3.5;

class HandRayScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 1.0, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    this._hands = new Hands(this.app.renderer, this.app.rig.group);
    this.onDispose(() => this._hands.dispose());

    // Ray lines per hand (attached to rig so they stay in world space)
    this._rayLines = [];
    const lineColors = [0x88ccff, 0xff8844];
    for (let h = 0; h < 2; h++) {
      const line = buildHandRayLine(lineColors[h]);
      line.visible = false;
      this.app.rig.group.add(line);
      this.onDispose(() => {
        this.app.rig.group.remove(line);
        line.geometry?.dispose();
        line.material?.dispose();
      });
      this._rayLines.push(line);
    }

    // Target spheres arranged in an arc
    this._targets = [];
    for (let i = 0; i < TARGET_COUNT; i++) {
      const angle = ((i / (TARGET_COUNT - 1)) - 0.5) * Math.PI * 0.7;
      const geo = new THREE.SphereGeometry(0.07, 16, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x446688,
        roughness: 0.4,
        metalness: 0.2,
        emissive: 0x000000,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.sin(angle) * 1.2, 1.5, -1.4 - Math.abs(Math.cos(angle)) * 0.2);
      this.add(mesh);
      this.onDispose(() => { geo.dispose(); mat.dispose(); });
      this._targets.push({ mesh, mat, hit: false });
    }

    // Ray object for raycasting
    this._raycaster = new THREE.Raycaster();
    this._rayOrigin = new THREE.Vector3();
    this._rayDir = new THREE.Vector3();
    this._rayEnd = new THREE.Vector3();

    // Desktop placeholder
    this._placeholder = this._makePlaceholder();
    this._placeholder.position.set(0, 1.9, -1.2);
    this.add(this._placeholder);

    // Desktop fake ray object
    this._fakeRayGroup = new THREE.Group();
    this._fakeRayGroup.position.set(0, 1.5, -1.2);
    this.add(this._fakeRayGroup);
    const fakeLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -RAY_LENGTH),
    ]);
    const fakeLineMat = new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 });
    const fakeLine = new THREE.Line(fakeLineGeo, fakeLineMat);
    this._fakeRayGroup.add(fakeLine);
    this.onDispose(() => { fakeLineGeo.dispose(); fakeLineMat.dispose(); });

    this._t = 0;
  }

  _makePlaceholder() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(20,20,40,0.7)';
    ctx.roundRect(4, 4, 504, 56, 10);
    ctx.fill();
    ctx.fillStyle = '#88ccff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Hand Ray — point your hand at the spheres', 256, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.1, 0.14);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  _testRayAgainstTargets(origin, dir) {
    this._raycaster.set(origin, dir);
    const objs = this._targets.map((t) => t.mesh);
    return this._raycaster.intersectObjects(objs);
  }

  update(dt, frame) {
    this._t += dt;
    this._hands.update(frame);

    // Reset target hit state
    for (const target of this._targets) {
      target.hit = false;
    }

    const anyActive = this._hands.isActive(0) || this._hands.isActive(1);
    this._placeholder.visible = !anyActive;
    this._fakeRayGroup.visible = !anyActive;

    if (anyActive) {
      for (let h = 0; h < 2; h++) {
        if (!this._hands.isActive(h)) {
          this._rayLines[h].visible = false;
          continue;
        }
        const wrist = this._hands.getJointPosition(h, 'wrist');
        const mid = this._hands.getJointPosition(h, 'middle-finger-phalanx-proximal');
        if (!wrist || !mid) { this._rayLines[h].visible = false; continue; }

        this._rayDir.subVectors(mid, wrist).normalize();
        this._rayOrigin.copy(wrist);
        this._rayEnd.copy(wrist).addScaledVector(this._rayDir, RAY_LENGTH);

        const line = this._rayLines[h];
        line.visible = true;
        line.position.copy(wrist);
        const pts = line.geometry.attributes.position;
        pts.setXYZ(0, 0, 0, 0);
        pts.setXYZ(1, this._rayDir.x * RAY_LENGTH, this._rayDir.y * RAY_LENGTH, this._rayDir.z * RAY_LENGTH);
        pts.needsUpdate = true;

        const hits = this._testRayAgainstTargets(wrist, this._rayDir);
        if (hits.length > 0) {
          const hitObj = hits[0].object;
          const target = this._targets.find((t) => t.mesh === hitObj);
          if (target) target.hit = true;
        }
      }
    } else {
      // Desktop auto-swing fake ray
      const angle = Math.sin(this._t * 0.8) * 0.5;
      this._fakeRayGroup.rotation.y = angle;

      // Cast from fake origin
      const origin = new THREE.Vector3(0, 1.5, -1.2);
      const dir = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle)).normalize();
      const hits = this._testRayAgainstTargets(origin, dir);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const target = this._targets.find((t) => t.mesh === hitObj);
        if (target) target.hit = true;
      }
    }

    // Update target visuals
    for (const target of this._targets) {
      target.mat.emissive.setHex(target.hit ? 0xffee44 : 0x000000);
      target.mat.emissiveIntensity = target.hit ? 0.6 : 0;
      target.mat.color.setHex(target.hit ? 0xffee44 : 0x446688);
      const scale = target.hit ? 1.1 : 1.0;
      target.mesh.scale.setScalar(scale);
    }
  }
}

register({
  id: 'hand-ray',
  title: 'Hand Ray',
  category: 'Hands',
  tags: ['hands', 'ray', 'pointing', 'hand-tracking'],
  description: 'Casts a ray from the hand and highlights target spheres when the ray intersects them.',
  xr: 'vr',
  factory: (app) => new HandRayScene(app),
});
