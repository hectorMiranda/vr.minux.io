# vr.minux.io

**`vr.minux.io`** is the browser-based **WebXR test lab** for the
[Minux](https://minux.io) ecosystem. It is a Three.js application that lets you
exercise, debug, and demonstrate every part of the WebXR stack — VR and AR
sessions, controllers, hand tracking, locomotion, interaction, spatial UI, and
rendering — directly in the browser, with no build step.

> Open it on a headset's browser, pick a test from the launcher, and verify that
> a given WebXR capability works on that device. Each test is a small, isolated
> scene that targets exactly one feature.

This repository is designed to drop in as a sub-module of the larger
[`my.minux.io`](https://my.minux.io) project, but it also runs perfectly well on
its own.

---

## Run it

There is **no build step**. Three.js is loaded from a CDN via an
[import map](https://developer.mozilla.org/docs/Web/HTML/Element/script/type/importmap),
so any static file server works:

```bash
# Python
python3 -m http.server 5173

# or Node
npx serve -l 5173

# then open http://localhost:5173
```

To enter VR/AR you need an **https** origin (or `localhost`) and a WebXR-capable
browser/headset. The launcher reports whether `immersive-vr` and `immersive-ar`
are available on the current device.

---

## What's inside

| Area | Path | What it does |
|------|------|--------------|
| Launcher | `index.html`, `src/main.js` | Lists every test, shows device capabilities, boots a scene |
| Core | `src/core/` | Renderer, scene, camera rig, lights, render loop |
| WebXR | `src/xr/` | Session management, VR/AR buttons, controllers, hands, haptics |
| Locomotion | `src/locomotion/` | Teleport, smooth move, snap turn, blink |
| Interaction | `src/interaction/` | Raycaster, grab, hover, gaze, drag |
| Spatial UI | `src/ui/` | 3D panels, buttons, sliders, toggles, labels, HUD |
| Utilities | `src/util/` | Pure helpers — math, easing, colors, formatting, events, store |
| Tests | `src/scenes/` | One self-contained scene per WebXR capability |
| Reference | `data/` | WebXR feature catalog, device matrix, XR glossary |
| Docs | `docs/` | Guides, capability notes, dev log |

---

## Authoring a test scene

Every scene is an ES module under `src/scenes/` that registers itself:

```js
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class HelloCubeScene extends Scene {
  async init() {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x44aa88 }),
    );
    cube.position.set(0, 1.5, -1);
    this.add(cube);
    this.cube = cube;
  }
  update(dt) {
    this.cube.rotation.y += dt;
  }
}

register({
  id: 'hello-cube',
  title: 'Hello Cube',
  category: 'Basics',
  tags: ['mesh', 'basics'],
  description: 'A single rotating cube — the smallest possible scene.',
  factory: (app) => new HelloCubeScene(app),
});
```

The launcher discovers it automatically through `src/scenes/index.js`.

---

## Tests

A small Node harness syntax-checks every module, validates the reference data,
and runs unit tests for the pure utilities:

```bash
node tests/run.mjs
```

---

## License

MIT — see [`LICENSE`](LICENSE). Made with ❤️ by
[Hector Miranda](https://github.com/hectorMiranda).
