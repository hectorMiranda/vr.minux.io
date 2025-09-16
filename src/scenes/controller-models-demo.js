// Controller Models Demo — shows the procedural controller model on each grip space.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { buildControllerModel } from '../xr/controller-models.js';

class ControllerModelsDemoScene extends Scene {
  async init() {
    const pl = new THREE.PointLight(0xffffff, 1.0, 8);
    pl.position.set(0, 2.5, -1);
    this.add(pl);

    // Build one model per grip and attach to grip spaces
    this._models = [];
    const colors = [0x4488ff, 0xff8844];
    for (let i = 0; i < 2; i++) {
      const model = buildControllerModel(colors[i]);
      this.app.controllers.grips[i].add(model);
      this._models.push(model);
    }

    // Desktop stand-in: show the two models in front of the camera
    this._desktopLeft = buildControllerModel(colors[0]);
    this._desktopLeft.position.set(-0.25, 1.4, -0.9);
    this.add(this._desktopLeft);

    this._desktopRight = buildControllerModel(colors[1]);
    this._desktopRight.position.set(0.25, 1.4, -0.9);
    this.add(this._desktopRight);

    // Label
    const label = this._makeTextMesh('Procedural Controller Models');
    label.position.set(0, 1.9, -1.2);
    this.add(label);

    this._t = 0;
  }

  _makeTextMesh(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 10, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1.1, 0.14);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    this.onDispose(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
    return mesh;
  }

  update(dt) {
    this._t += dt;
    // Animate desktop stand-ins
    if (this._desktopLeft) {
      this._desktopLeft.rotation.y = Math.sin(this._t * 0.8) * 0.4;
      const press = (Math.sin(this._t * 2) + 1) / 2;
      this._desktopLeft.setTriggerPress(press);
    }
    if (this._desktopRight) {
      this._desktopRight.rotation.y = -Math.sin(this._t * 0.8) * 0.4;
      const press = (Math.cos(this._t * 2) + 1) / 2;
      this._desktopRight.setTriggerPress(press);
    }
  }

  dispose() {
    for (let i = 0; i < 2; i++) {
      const model = this._models[i];
      if (model) {
        this.app.controllers.grips[i].remove(model);
        model.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
      }
    }
    super.dispose();
  }
}

register({
  id: 'controller-models-demo',
  title: 'Controller Models Demo',
  category: 'Input',
  tags: ['controller', 'model', 'procedural'],
  description: 'Shows a procedural controller model (body + ring + trigger) attached to each grip space.',
  xr: 'vr',
  factory: (app) => new ControllerModelsDemoScene(app),
});
