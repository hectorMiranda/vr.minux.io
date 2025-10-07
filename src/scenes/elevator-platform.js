// elevator-platform — stand on a platform that rises/lowers between levels; rig follows.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const LEVELS      = [0, 4, 8, 12];  // platform Y positions (floor surface)
const TRAVEL_SPEED = 1.8;            // m/s
const PLATFORM_DWELL = 2.5;          // seconds to stay at each level
const PLATFORM_W = 2.5;
const PLATFORM_D = 2.5;
const PLATFORM_H = 0.15;

// Build a floor-level landing area and walls for each level
function makeLevelGeometry(y, color) {
  const group = new THREE.Group();
  group.position.y = y;

  // Landing pad
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.12, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
  );
  pad.position.set(4, 0.06, 0);
  pad.receiveShadow = true;
  group.add(pad);

  // Some scenery on the pad
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
  for (let i = 0; i < 3; i++) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.4 + i * 0.2, 0.6 + i * 0.4, 0.4),
      boxMat,
    );
    box.position.set(2 + i * 2, 0.5 + i * 0.2, -2.5);
    box.castShadow = true;
    group.add(box);
  }

  return group;
}

class ElevatorPlatformScene extends Scene {
  async init() {
    // Central shaft (visual)
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 16, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.9, side: THREE.BackSide }),
    );
    shaft.position.set(0, 7, 0);
    this.add(shaft);

    // Shaft guide rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6, metalness: 0.5 });
    for (const xOff of [-1.4, 1.4]) {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 16, 6),
        railMat,
      );
      rail.position.set(xOff, 7, 0);
      this.add(rail);
    }

    // Level landing areas
    const levelColors = [0x3a5a3a, 0x3a3a5a, 0x5a3a3a, 0x5a5a2a];
    for (let i = 0; i < LEVELS.length; i++) {
      const levelGroup = makeLevelGeometry(LEVELS[i], levelColors[i % levelColors.length]);
      this.add(levelGroup);

      // Floor indicator label
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1a2233';
      ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`L${i + 1}`, 64, 44);
      const tex = new THREE.CanvasTexture(canvas);
      this.onDispose(() => tex.dispose());
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.3),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
      );
      label.position.set(-1.3, LEVELS[i] + 1.4, 0);
      label.rotation.y = Math.PI / 2;
      this.add(label);
    }

    // The elevator platform itself
    const platGeo = new THREE.BoxGeometry(PLATFORM_W, PLATFORM_H, PLATFORM_D);
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      roughness: 0.4,
      metalness: 0.5,
    });
    this._platform = new THREE.Mesh(platGeo, platMat);
    this._platform.castShadow = true;
    this._platform.receiveShadow = true;
    this.add(this._platform);

    // Platform guard rails
    const grMat = new THREE.MeshStandardMaterial({ color: 0xaaccee, roughness: 0.5, metalness: 0.8 });
    for (const [ox, oz] of [[-1.15, 0], [1.15, 0], [0, -1.15], [0, 1.15]]) {
      const grail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6),
        grMat,
      );
      grail.position.set(ox, 0.575, oz);
      this._platform.add(grail);
    }

    // Platform current and target positions
    this._levelIndex  = 0;
    this._targetLevel = 1;
    this._state       = 'dwell'; // 'dwell' | 'moving'
    this._dwellTimer  = 0;
    this._platformY   = LEVELS[0]; // the top surface Y

    this._movePlatform(LEVELS[0]);

    // Whether the player is "on" the platform (always true for this demo)
    this._playerOnPlatform = true;

    // Start on the platform
    this.app.rig.moveTo(0, LEVELS[0] + PLATFORM_H, 0);
  }

  _movePlatform(y) {
    this._platformY = y;
    // position center of platform: top surface at y
    this._platform.position.set(0, y + PLATFORM_H / 2, 0);
  }

  update(dt) {
    if (this._state === 'dwell') {
      this._dwellTimer += dt;
      if (this._dwellTimer >= PLATFORM_DWELL) {
        this._dwellTimer = 0;
        // Move to next level
        this._targetLevel = (this._levelIndex + 1) % LEVELS.length;
        this._state = 'moving';
      }
    } else if (this._state === 'moving') {
      const targetY   = LEVELS[this._targetLevel];
      const currentY  = this._platformY;
      const diff      = targetY - currentY;
      const step      = Math.sign(diff) * TRAVEL_SPEED * dt;
      const newY      = Math.abs(step) >= Math.abs(diff)
        ? targetY
        : currentY + step;

      this._movePlatform(newY);

      // Rig follows the platform
      if (this._playerOnPlatform) {
        const rigPos = this.app.rig.group.position;
        this.app.rig.moveTo(rigPos.x, newY + PLATFORM_H, rigPos.z);
      }

      if (newY === targetY) {
        this._levelIndex = this._targetLevel;
        this._state = 'dwell';
      }
    }
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'elevator-platform',
  title: 'Elevator Platform',
  category: 'Locomotion',
  tags: ['locomotion', 'platform', 'elevator', 'vertical'],
  description: 'Stand on a platform that automatically rises and lowers between floors; the rig tracks the platform.',
  xr: 'vr',
  factory: (app) => new ElevatorPlatformScene(app),
});
