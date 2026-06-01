// Pinch Detect — detects thumb-index pinch and spawns a marker / changes color.
// Desktop: auto-pinch cycles a color change and spawns markers.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Hands } from '../xr/hands.js';

const PINCH_THRESHOLD = 0.8;
const MAX_MARKERS = 12;

class PinchDetectScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 1.0, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    this._hands = new Hands(this.app.renderer, this.app.rig.group);
    this.onDispose(() => this._hands.dispose());

    // Pinch indicator spheres (one per hand)
    this._indicators = [];
    const colors = [0x44aaff, 0xff8844];
    for (let h = 0; h < 2; h++) {
      const geo = new THREE.SphereGeometry(0.025, 16, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[h],
        emissive: colors[h],
        emissiveIntensity: 0.1,
        roughness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.app.rig.group.add(mesh);
      this.onDispose(() => {
        this.app.rig.group.remove(mesh);
        geo.dispose();
        mat.dispose();
      });
      this._indicators.push({ mesh, mat, wasPinching: false });
    }

    // Marker pool
    this._markers = [];
    const markerGeo = new THREE.OctahedronGeometry(0.015, 0);
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.5,
    });
    for (let i = 0; i < MAX_MARKERS; i++) {
      const m = new THREE.Mesh(markerGeo, markerMat);
      m.visible = false;
      this.add(m);
      this._markers.push(m);
    }
    this.onDispose(() => { markerGeo.dispose(); markerMat.dispose(); });
    this._nextMarker = 0;

    // Desktop placeholder
    this._placeholder = this._makePlaceholder();
    this._placeholder.position.set(0, 1.7, -1.2);
    this.add(this._placeholder);

    this._t = 0;
    this._demoPhase = 0;
  }

  _makePlaceholder() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(20,20,40,0.8)';
    ctx.roundRect(4, 4, 504, 88, 12);
    ctx.fill();
    ctx.fillStyle = '#88ccff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Pinch Detect', 256, 30);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '20px sans-serif';
    ctx.fillText('Pinch thumb + index finger to spawn markers', 256, 66);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.1, 0.21);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  _spawnMarker(pos, color) {
    const m = this._markers[this._nextMarker % MAX_MARKERS];
    this._nextMarker++;
    m.visible = true;
    m.position.copy(pos);
    m.material.color.setHex(color);
    m.material.emissive.setHex(color);
    m.material.emissiveIntensity = 0.5;
    m.scale.set(1, 1, 1);
  }

  update(dt, frame) {
    this._t += dt;
    this._hands.update(frame);

    const anyActive = this._hands.isActive(0) || this._hands.isActive(1);
    this._placeholder.visible = !anyActive;

    const handColors = [0x44aaff, 0xff8844];

    for (let h = 0; h < 2; h++) {
      const entry = this._indicators[h];
      let pinch, tipPos;

      if (this._hands.isActive(h)) {
        pinch = this._hands.getPinch(h);
        tipPos = this._hands.getJointPosition(h, 'thumb-tip');
        if (tipPos) {
          entry.mesh.visible = true;
          entry.mesh.position.copy(tipPos);
        }
      } else {
        // Desktop: auto-pinch every 2.5 s per hand
        const phase = this._t * 0.4 + h * Math.PI;
        pinch = Math.max(0, Math.sin(phase * 2) * 1.2);
        entry.mesh.visible = true;
        entry.mesh.position.set(
          (h === 0 ? -0.15 : 0.15) + Math.cos(this._t * 0.7) * 0.08,
          1.4 + Math.sin(this._t * 0.9) * 0.05,
          -1.1,
        );
        tipPos = entry.mesh.position;
      }

      const isPinching = pinch >= PINCH_THRESHOLD;
      entry.mat.emissiveIntensity = 0.1 + pinch * 0.7;
      entry.mat.color.setHex(isPinching ? 0xffffff : handColors[h]);

      if (isPinching && !entry.wasPinching) {
        this._spawnMarker(entry.mesh.position, handColors[h]);
      }
      entry.wasPinching = isPinching;
    }

    // Fade markers
    for (const m of this._markers) {
      if (m.visible && m.material.emissiveIntensity > 0) {
        m.material.emissiveIntensity = Math.max(0, m.material.emissiveIntensity - dt * 0.3);
        const s = 1 + (1 - m.material.emissiveIntensity / 0.5) * 0.3;
        m.scale.setScalar(Math.max(0.1, 2 - s));
      }
    }
  }
}

register({
  id: 'pinch-detect',
  title: 'Pinch Detect',
  category: 'Hands',
  tags: ['hands', 'pinch', 'gesture', 'hand-tracking'],
  description: 'Detects thumb-index pinch and spawns a marker at the pinch point; auto-demos on desktop.',
  xr: 'vr',
  factory: (app) => new PinchDetectScene(app),
});
