// BlinkTransition — a quick fade-to-black overlay that masks teleport pops.
// Uses a fullscreen quad placed just in front of the camera.
import * as THREE from 'three';

const FADE_OUT_TIME = 0.08; // seconds to go black
const FADE_IN_TIME  = 0.12; // seconds to clear

export class BlinkTransition {
  /**
   * @param {THREE.Camera} camera - the scene camera (mesh is added as a child)
   */
  constructor(camera) {
    this._camera = camera;
    this._alpha = 0;
    this._phase = 'idle'; // 'idle' | 'out' | 'in'
    this._t = 0;
    this._onBlack = null;

    // A flat quad that exactly fills the view at z = -0.1
    const geo = new THREE.PlaneGeometry(2, 2);
    // Use a custom vertex shader that ignores projection so it always covers NDC
    const mat = new THREE.ShaderMaterial({
      uniforms: { opacity: { value: 0 } },
      vertexShader: `
        void main() {
          gl_Position = vec4(position.xy, -1.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, opacity);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this._mesh = new THREE.Mesh(geo, mat);
    this._mesh.name = 'blink-overlay';
    this._mesh.renderOrder = 9999;
    this._mesh.frustumCulled = false;
    this._mat = mat;

    camera.add(this._mesh);
  }

  /**
   * Trigger a blink: fade out → call onBlack() → fade in.
   * @param {() => void} onBlack  called at maximum darkness
   */
  blink(onBlack) {
    this._onBlack = onBlack;
    this._phase = 'out';
    this._t = 0;
  }

  /** Call every frame. */
  update(dt) {
    if (this._phase === 'idle') return;

    this._t += dt;

    if (this._phase === 'out') {
      this._alpha = Math.min(1, this._t / FADE_OUT_TIME);
      if (this._alpha >= 1) {
        if (typeof this._onBlack === 'function') {
          this._onBlack();
          this._onBlack = null;
        }
        this._phase = 'in';
        this._t = 0;
      }
    } else if (this._phase === 'in') {
      this._alpha = 1 - Math.min(1, this._t / FADE_IN_TIME);
      if (this._alpha <= 0) {
        this._alpha = 0;
        this._phase = 'idle';
      }
    }

    this._mat.uniforms.opacity.value = this._alpha;
  }

  get isActive() {
    return this._phase !== 'idle';
  }

  dispose() {
    this._camera.remove(this._mesh);
    this._mesh.geometry.dispose();
    this._mat.dispose();
  }
}
