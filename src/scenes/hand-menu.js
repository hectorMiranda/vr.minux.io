// Hand Menu — shows a small radial menu above the left palm when it faces the user.
// Desktop: menu is always visible with auto-animation.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Hands } from '../xr/hands.js';

const MENU_ITEMS = [
  { label: 'Reset', color: 0x44aaff },
  { label: 'Color', color: 0xffaa22 },
  { label: 'Scale', color: 0x44ff88 },
  { label: 'Help', color: 0xee44ee },
];
const MENU_RADIUS = 0.1;
const FACE_THRESHOLD = 0.3; // dot product threshold for palm-facing-camera

class HandMenuScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 1.0, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    this._hands = new Hands(this.app.renderer, this.app.rig.group);
    this.onDispose(() => this._hands.dispose());

    // Menu group — will be repositioned each frame
    this._menuGroup = new THREE.Group();
    this._menuGroup.visible = false;
    this.app.rig.group.add(this._menuGroup);
    this.onDispose(() => this.app.rig.group.remove(this._menuGroup));

    // Menu background disc
    const discGeo = new THREE.CircleGeometry(MENU_RADIUS * 1.3, 32);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x112233,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.z = -0.002;
    this._menuGroup.add(disc);
    this.onDispose(() => { discGeo.dispose(); discMat.dispose(); });

    // Menu item buttons
    this._menuItems = [];
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const angle = (i / MENU_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
      const itemGroup = new THREE.Group();
      itemGroup.position.set(
        Math.cos(angle) * MENU_RADIUS,
        Math.sin(angle) * MENU_RADIUS,
        0,
      );
      this._menuGroup.add(itemGroup);

      const btnGeo = new THREE.CircleGeometry(0.022, 16);
      const btnMat = new THREE.MeshStandardMaterial({
        color: MENU_ITEMS[i].color,
        emissive: MENU_ITEMS[i].color,
        emissiveIntensity: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide,
      });
      const btn = new THREE.Mesh(btnGeo, btnMat);
      itemGroup.add(btn);
      this.onDispose(() => { btnGeo.dispose(); btnMat.dispose(); });

      const labelMesh = this._makeLabel(MENU_ITEMS[i].label, MENU_ITEMS[i].color);
      labelMesh.position.set(0, -0.036, 0.002);
      itemGroup.add(labelMesh);

      this._menuItems.push({ itemGroup, btnMat });
    }

    // Desktop placeholder
    this._placeholder = this._makePlaceholder();
    this._placeholder.position.set(0, 1.85, -1.2);
    this.add(this._placeholder);

    // Desktop static menu position
    this._desktopMenuPos = new THREE.Vector3(0, 1.55, -1.2);

    this._t = 0;
    this._menuVisible = false;
    this._palmUp = new THREE.Vector3();
  }

  _makeLabel(text, color) {
    const hex = color.toString(16).padStart(6, '0');
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 40);
    ctx.fillStyle = `#${hex}`;
    ctx.font = 'bold 18px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 64, 20);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.055, 0.017);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
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
    ctx.font = 'bold 22px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Hand Menu — turn left palm up to open menu', 256, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.1, 0.14);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  _isPalmFacingCamera(handIndex) {
    // Use wrist → middle-finger-metacarpal to estimate palm normal
    const wrist = this._hands.getJointPosition(handIndex, 'wrist');
    const mid = this._hands.getJointPosition(handIndex, 'middle-finger-metacarpal');
    const index = this._hands.getJointPosition(handIndex, 'index-finger-metacarpal');
    if (!wrist || !mid || !index) return false;

    const toMid = new THREE.Vector3().subVectors(mid, wrist).normalize();
    const toIdx = new THREE.Vector3().subVectors(index, wrist).normalize();
    const normal = new THREE.Vector3().crossVectors(toIdx, toMid).normalize();

    // Camera forward in world space (looking down -Z from camera)
    const camDir = new THREE.Vector3(0, 0, -1);
    this.app.camera.getWorldDirection(camDir);

    // Palm facing camera: normal dot (-camDir) > threshold
    const dot = normal.dot(camDir.negate());
    return dot > FACE_THRESHOLD;
  }

  update(dt, frame) {
    this._t += dt;
    this._hands.update(frame);

    const anyActive = this._hands.isActive(0) || this._hands.isActive(1);
    this._placeholder.visible = !anyActive;

    if (anyActive) {
      // Check left hand (index 0) palm facing camera
      const showMenu = this._hands.isActive(0) && this._isPalmFacingCamera(0);
      this._menuGroup.visible = showMenu;

      if (showMenu) {
        const palmPos = this._hands.getJointPosition(0, 'wrist');
        if (palmPos) {
          this._menuGroup.position.copy(palmPos).y += 0.12;
          // Billboard: face camera
          this._menuGroup.lookAt(this.app.camera.getWorldPosition(new THREE.Vector3()));
        }
      }
    } else {
      // Desktop: always show menu, animate
      this._menuGroup.visible = true;
      this._menuGroup.position.copy(this._desktopMenuPos);
      this._menuGroup.rotation.y = Math.sin(this._t * 0.4) * 0.2;
    }

    // Animate menu items
    for (let i = 0; i < this._menuItems.length; i++) {
      const item = this._menuItems[i];
      const pulse = (Math.sin(this._t * 2 + i * 0.8) + 1) / 2;
      item.btnMat.emissiveIntensity = 0.2 + pulse * 0.3;
    }
  }
}

register({
  id: 'hand-menu',
  title: 'Hand Menu',
  category: 'Hands',
  tags: ['hands', 'menu', 'palm', 'ui', 'hand-tracking'],
  description: 'Shows a radial menu above the left palm when it faces the user; auto-shows on desktop.',
  xr: 'vr',
  factory: (app) => new HandMenuScene(app),
});
