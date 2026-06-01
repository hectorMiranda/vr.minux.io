// Fog Demo — linear vs exponential fog over a corridor of pillars; animated density.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { lerp } from '../util/math.js';

const FOG_COLOR = 0xaabbcc;

class FogDemoScene extends Scene {
  async init() {
    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 30),
      new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -8);
    this.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 30),
      new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.9 }),
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 2.8, -8);
    this.add(ceil);

    // Corridor walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.8 });
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 3), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-3, 1.4, -8);
    this.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 3), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(3, 1.4, -8);
    this.add(rightWall);

    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.5, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x889966, roughness: 0.6 });
    this._pillars = [];
    for (let i = 0; i < 12; i++) {
      const z = -1 - i * 2.2;
      [-1.6, 1.6].forEach((x) => {
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(x, 1.25, z);
        this.add(p);
        this._pillars.push(p);
      });
    }

    // Lamp spheres between pillars
    for (let i = 0; i < 6; i++) {
      const lamp = new THREE.PointLight(0xffeedd, 0.8, 3.5);
      lamp.position.set(0, 2.4, -1 - i * 4.4);
      this.add(lamp);
      const proxy = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 4),
        new THREE.MeshBasicMaterial({ color: 0xffeedd }),
      );
      lamp.add(proxy);
    }

    const ambient = new THREE.AmbientLight(0x223344, 0.6);
    this.add(ambient);

    // Mode label (simple visible sphere as marker at split point)
    const markerGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const linearLabel = new THREE.Mesh(markerGeo,
      new THREE.MeshBasicMaterial({ color: 0x88ff88 }));
    linearLabel.position.set(-0.25, 1.8, -0.8);
    this.add(linearLabel);

    const expLabel = new THREE.Mesh(markerGeo.clone(),
      new THREE.MeshBasicMaterial({ color: 0xff8844 }));
    expLabel.position.set(0.25, 1.8, -0.8);
    this.add(expLabel);

    // Store original scene fog so we restore it
    this._prevFog = this.app.scene.fog;

    // Start with linear fog
    this.app.scene.fog = new THREE.Fog(FOG_COLOR, 3, 14);
    this.app.scene.background = new THREE.Color(FOG_COLOR);
    this._fogMode = 'linear'; // 'linear' | 'exp'
    this._fogTimer = 0;
    this._switchInterval = 5; // seconds between mode switches

    this.onDispose(() => {
      this.app.scene.fog = this._prevFog;
      this.app.scene.background = null;
    });

    this._time = 0;
  }

  update(dt) {
    this._time += dt;
    this._fogTimer += dt;

    // Switch fog mode every _switchInterval seconds
    if (this._fogTimer >= this._switchInterval) {
      this._fogTimer = 0;
      this._fogMode = this._fogMode === 'linear' ? 'exp' : 'linear';
      if (this._fogMode === 'linear') {
        this.app.scene.fog = new THREE.Fog(FOG_COLOR, 3, 14);
      } else {
        this.app.scene.fog = new THREE.FogExp2(FOG_COLOR, 0.09);
      }
    }

    // Animate density / far for breathing effect
    const pulse = 0.5 + 0.5 * Math.sin(this._time * 0.4);
    if (this.app.scene.fog) {
      if (this._fogMode === 'linear') {
        this.app.scene.fog.far = lerp(10, 18, pulse);
      } else {
        this.app.scene.fog.density = lerp(0.06, 0.14, pulse);
      }
    }

    // Gently bob the pillars
    this._pillars.forEach((p, i) => {
      p.rotation.y = Math.sin(this._time * 0.3 + i * 0.5) * 0.02;
    });
  }

  dispose() {
    this.app.scene.fog = this._prevFog;
    this.app.scene.background = null;
    super.dispose();
  }
}

register({
  id: 'fog-demo',
  title: 'Fog Demo',
  category: 'Rendering',
  tags: ['fog', 'linear-fog', 'exp-fog', 'atmosphere'],
  description: 'A corridor of pillars under animated linear and exponential fog; the mode switches every 5 s and density breathes continuously.',
  xr: 'vr',
  factory: (app) => new FogDemoScene(app),
});
