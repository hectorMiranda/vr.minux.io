// Wraps requesting/ending an XR session and wiring it to the renderer.
import { Emitter } from '../util/events.js';

export class SessionManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.events = new Emitter();
    this.session = null;
    this.mode = null;
  }

  get active() {
    return this.session !== null;
  }

  /** mode: 'immersive-vr' | 'immersive-ar'. features: optional/required. */
  async start(mode, { optionalFeatures = [], requiredFeatures = [] } = {}) {
    if (!navigator.xr) throw new Error('WebXR not available');
    if (this.session) await this.end();

    const init = { optionalFeatures, requiredFeatures };
    const session = await navigator.xr.requestSession(mode, init);
    await this.renderer.xr.setSession(session);
    this.session = session;
    this.mode = mode;

    session.addEventListener('end', () => {
      this.session = null;
      this.mode = null;
      this.events.emit('end');
    });

    this.events.emit('start', session);
    return session;
  }

  async end() {
    if (this.session) await this.session.end();
  }
}
