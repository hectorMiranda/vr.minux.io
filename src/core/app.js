// The App ties the engine together and owns the active scene. Scenes receive
// the App instance and reach the renderer, scene graph, camera rig, loop,
// controllers, and the XR session manager through it.
import * as THREE from 'three';
import { createRenderer, attachResize } from './renderer.js';
import { createScene, createFloor } from './scene.js';
import { createCamera, CameraRig } from './camera-rig.js';
import { createLights } from './lights.js';
import { RenderLoop } from './loop.js';
import { SessionManager } from '../xr/session.js';
import { Controllers } from '../xr/controllers.js';
import { Emitter } from '../util/events.js';

export class App {
  constructor(host) {
    this.host = host;
    this.events = new Emitter();

    this.renderer = createRenderer(host);
    this.scene = createScene();
    this.camera = createCamera(host);
    this.rig = new CameraRig(this.camera);
    this.scene.add(this.rig.group);

    this.lights = createLights();
    this.scene.add(this.lights);

    this.floor = createFloor();
    this.scene.add(this.floor);

    this.loop = new RenderLoop(this.renderer, this.scene, this.camera);
    this.session = new SessionManager(this.renderer);
    this.controllers = new Controllers(this.renderer, this.rig.group);

    this._detachResize = attachResize(this.renderer, this.camera, host);
    this._activeScene = null;
    this._sceneUnsub = null;

    this.session.events.on('start', (s) => {
      this._activeScene?.onSessionStart?.(s);
      this.events.emit('session-start', s);
    });
    this.session.events.on('end', () => {
      this._activeScene?.onSessionEnd?.();
      this.events.emit('session-end');
    });
  }

  /** Swap in a scene built by a registry factory. */
  async setScene(factory) {
    this.clearScene();
    const scene = factory(this);
    this._activeScene = scene;
    await scene.init();
    this.scene.add(scene.group);
    this._sceneUnsub = this.loop.onFrame((dt, frame) => {
      this.controllers.update(dt, frame);
      scene.update(dt, frame);
    });
    this.loop.start();
    return scene;
  }

  clearScene() {
    this._sceneUnsub?.();
    this._sceneUnsub = null;
    if (this._activeScene) {
      this.scene.remove(this._activeScene.group);
      this._activeScene.dispose();
      this._activeScene = null;
    }
  }

  /** Convenience: expose floor visibility (AR scenes hide it). */
  setFloorVisible(visible) {
    this.floor.visible = visible;
  }

  dispose() {
    this.loop.stop();
    this.clearScene();
    this.controllers.dispose();
    this._detachResize?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
