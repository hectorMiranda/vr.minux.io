# Build spec for contributors (and sub-agents)

This file is the contract. Read `src/core/app.js`, `src/scenes/base.js`, and
`src/scenes/registry.js` for the exact, authoritative API before writing code.

## Hard rules

- **No build step.** Plain ES modules. `import * as THREE from 'three';` and
  `import { X } from 'three/addons/...';` (resolved by the import map in
  `index.html`). Local imports use **relative paths with the `.js` extension**.
- **2-space indent, semicolons, single quotes.** Match the existing files.
- **`src/util/*` must stay pure** — no Three.js import — so Node can unit-test
  them. Everything else may import three.
- Every file must pass `node --check <file>`. Run it on each file you write.
- No network calls, no external assets. Build geometry/materials in code. If you
  need a texture, generate it on a `<canvas>` or use a `THREE.DataTexture`.

## The scene contract

Each scene is one file under `src/scenes/<id>.js`:

```js
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class FooScene extends Scene {
  async init() {
    // build meshes; add them with this.add(mesh) so they get disposed.
    // standing eye height is ~1.6m; place content ~1–2m in front at y≈1.2–1.7,
    // z≈ -1 to -2 so it is visible both on desktop and in a headset.
  }
  update(dt, frame) { /* per-frame; dt is seconds */ }
  // optional: onSessionStart(session) {}  onSessionEnd() {}
  dispose() { super.dispose(); /* extra cleanup if needed */ }
}

register({
  id: 'foo',                 // unique kebab-case, matches the file name
  title: 'Foo',
  category: 'Basics',        // use the category you were assigned
  tags: ['mesh'],
  description: 'One sentence describing what this test verifies.',
  xr: 'vr',                  // 'vr' | 'ar' | 'both' | 'none'
  factory: (app) => new FooScene(app),
});
```

### What a scene receives (`this.app`)

| Property | Type | Use |
|----------|------|-----|
| `app.scene` | `THREE.Scene` | the root scene graph |
| `app.camera` | `THREE.PerspectiveCamera` | the camera (inside the rig) |
| `app.rig` | `CameraRig` | `app.rig.group`, `.moveTo`, `.translate`, `.rotateY` |
| `app.renderer` | `THREE.WebGLRenderer` | `renderer.xr` for XR work |
| `app.controllers` | `Controllers` | `.controllers[i]`, `.grips[i]`, `.events`, `.getRay(i)` |
| `app.session` | `SessionManager` | `.start(mode, opts)`, `.events` ('start'/'end') |
| `app.loop` | `RenderLoop` | `.onFrame(cb)` (usually unnecessary — `update()` is enough) |
| `app.setFloorVisible(bool)` | fn | AR scenes call `app.setFloorVisible(false)` in `init()` |

`this.add(obj)` adds to the scene's group **and** tracks it for automatic GPU
disposal. Use it for everything you create. Use `this.onDispose(fn)` to register
extra cleanup (e.g. removing event listeners).

### Controller events

```js
this.app.controllers.events.on('selectstart', ({ index, controller }) => { ... });
// also: selectend, select, squeezestart, squeezeend, squeeze, connected
```
Register them in `init()` and they are cleaned up when the scene is disposed
only if you wrap removal in `this.onDispose(...)`. Prefer storing the returned
unsubscribe: `this.onDispose(this.app.controllers.events.on('select', fn));`

## Shared modules you may import

- `../util/math.js` — clamp, lerp, remap, smoothstep, damp, degToRad, wrapAngle…
- `../util/easing.js` — EASINGS + named easings
- `../util/colors.js` — hexToRgb, mix, toCss, contrastText…
- `../util/events.js` — Emitter
- `../interaction/*` — raycaster/grab/hover/gaze (see those files' exports)
- `../locomotion/*` — teleport/smooth-move/snap-turn
- `../ui/*` — panel/button3d/slider3d/label/hud

Keep scenes self-contained: it's fine to build small meshes inline rather than
pull in a system, unless the scene's whole point is to test that system.

## Don't

- Don't add a bundler, framework, or npm dependency.
- Don't fetch remote files or use `import` from a URL inside modules.
- Don't leave a scene that throws on `init()` with no XR session — scenes must
  render fine on a desktop browser too (mouse-look not required, just no crash).
