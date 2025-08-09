// Hoverable — scales and tints a mesh while a pointer is over it.
// Usage:
//   const h = applyHover(mesh, { color: 0xff8844 });
//   raycaster.events.on('enter', ({ mesh }) => h.enter(mesh));
//   raycaster.events.on('leave', ({ mesh }) => h.leave(mesh));
import * as THREE from 'three';

/**
 * Attach hover visual feedback to a mesh.
 *
 * @param {THREE.Mesh} mesh
 * @param {object} [opts]
 * @param {number} [opts.color]        Tint color while hovered (hex, default 0xffffff*1.4 = white-ish)
 * @param {number} [opts.scaleUp]      Scale multiplier on hover (default 1.15)
 * @param {number} [opts.speed]        Lerp speed (default 10, units per second)
 * @returns {{ enter, leave, update, dispose }}
 */
export function applyHover(mesh, { color = 0xff9933, scaleUp = 1.15, speed = 10 } = {}) {
  const baseScale = mesh.scale.clone();
  const hoverScale = baseScale.clone().multiplyScalar(scaleUp);

  // Store the original color so we can restore it.
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const origColor = mat.color ? mat.color.clone() : new THREE.Color(0xffffff);
  const hoverColor = new THREE.Color(color);

  let _hovered = false;
  let _currentScale = baseScale.clone();
  let _currentColor = origColor.clone();

  function enter(m) {
    if (m === mesh) _hovered = true;
  }

  function leave(m) {
    if (m === mesh) _hovered = false;
  }

  /**
   * Call every frame with dt (seconds).
   */
  function update(dt) {
    const t = Math.min(1, speed * dt);
    const targetScale = _hovered ? hoverScale : baseScale;
    const targetColor = _hovered ? hoverColor : origColor;

    _currentScale.lerp(targetScale, t);
    mesh.scale.copy(_currentScale);

    if (mat.color) {
      _currentColor.lerp(targetColor, t);
      mat.color.copy(_currentColor);
    }
  }

  function dispose() {
    mesh.scale.copy(baseScale);
    if (mat.color) mat.color.copy(origColor);
  }

  return { enter, leave, update, dispose };
}

/**
 * Convenience class that wraps applyHover for use with a PointerRaycaster.
 *
 * @example
 *   const h = new Hoverable(mesh, { color: 0xff4400 });
 *   raycaster.events.on('enter', h.onEnter);
 *   raycaster.events.on('leave', h.onLeave);
 *   // in update(dt): h.update(dt);
 */
export class Hoverable {
  constructor(mesh, opts) {
    this._impl = applyHover(mesh, opts);
    this.onEnter = ({ mesh: m }) => this._impl.enter(m);
    this.onLeave = ({ mesh: m }) => this._impl.leave(m);
  }

  update(dt) {
    this._impl.update(dt);
  }

  dispose() {
    this._impl.dispose();
  }
}
