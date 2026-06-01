# Writing a Scene

Every test in the launcher is a single ES module under `src/scenes/`. The module
extends the `Scene` base class and calls `register()` at import time so the
launcher discovers it automatically through `src/scenes/index.js`.

## The minimal scene: hello-cube

Below is `src/scenes/hello-cube.js` — the reference implementation:

```js
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

class HelloCubeScene extends Scene {
  async init() {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x44aa88, roughness: 0.4, metalness: 0.1 }),
    );
    cube.position.set(0, 1.5, -1);
    cube.castShadow = true;
    this.add(cube);      // track for auto-disposal
    this.cube = cube;
  }

  update(dt) {
    this.cube.rotation.x += dt * 0.5;
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

### What each part does

**`class HelloCubeScene extends Scene`**  
Inherits a `THREE.Group` (`this.group`), the `this.add()` tracker, the
`this.onDispose()` callback registry, and the default `dispose()` that frees
all GPU resources automatically.

**`async init()`**  
Called by `App.setScene()` after construction. Build all geometry here. Use
`this.add(obj)` — not `this.group.add(obj)` — so every added object is
traversed and its geometry/materials are disposed when the scene unloads.

**Position convention**  
Standing eye height is approximately 1.6 m. Place objects at `y ≈ 1.2–1.7` and
`z ≈ -1` to `-2` so they are visible both on desktop (camera at `y=1.6,z=0`)
and inside a headset.

**`update(dt)`**  
Called every frame by the render loop. `dt` is seconds since the last frame,
capped at 0.1 s to prevent large jumps after tab switches. The second argument
`frame` is the raw `XRFrame` (or `null` on desktop) — needed only for hit-test,
plane-detection, or hand-joint poses.

**`register({ ... })`**  
Run once at module import time. Adds the scene to the global registry under its
`id`. See [scene-contract.md](./scene-contract.md) for all fields.

## Using app surface

Inside `init()` and `update()` use `this.app` to reach the engine:

```js
async init() {
  // Hide the default floor for an AR scene
  this.app.setFloorVisible(false);

  // Listen to controller input
  this.onDispose(
    this.app.controllers.events.on('select', ({ index }) => {
      console.log(`controller ${index} select`);
    })
  );
}
```

Wrapping the `events.on(...)` return value in `this.onDispose(...)` ensures the
listener is removed when the scene is swapped out.

## Custom cleanup

If you allocate resources outside `this.add()` (canvas textures, timers, extra
event listeners), register cleanup with `this.onDispose`:

```js
const tex = new THREE.CanvasTexture(canvas);
this.onDispose(() => tex.dispose());
```

You can also override `dispose()` and call `super.dispose()` first:

```js
dispose() {
  super.dispose();   // frees everything added via this.add()
  this._mySystem?.dispose();
}
```

## Session lifecycle hooks

Two optional methods are called by `App` around XR session boundaries:

```js
onSessionStart(session) {
  // session is the raw XRSession
  this.app.setFloorVisible(false);
}

onSessionEnd() {
  this.app.setFloorVisible(true);
}
```

## Registering the scene in index.js

Add one import line to `src/scenes/index.js`:

```js
import './hello-cube.js';
```

The `register()` call inside that file runs as a side effect. The launcher
discovers the scene through `registry.all()`.
