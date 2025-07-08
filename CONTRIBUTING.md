# Contributing

## Coding style

- **2-space indent, semicolons, single quotes.** Match every existing file.
- **Plain ES modules only.** No CommonJS, no bundler, no `npm` dependencies.
- **Relative imports with `.js` extension** for local modules:
  `import { Scene } from './base.js';`
- **`src/util/*` must have no Three.js import.** These modules are unit-tested
  in Node. Everything else may import Three.js freely.
- Every file must pass `node --check <file>`. Run it on each file you write
  or modify before committing.
- No network calls inside modules. No `import` from a URL inside a module
  (CDN access belongs only in the `importmap` in `index.html`).
- No external assets. Build geometry and textures in code. For a texture, use
  `<canvas>` + `THREE.CanvasTexture` or `THREE.DataTexture`.

## Adding a scene

1. Create `src/scenes/<id>.js` where `<id>` is a unique kebab-case string
   that matches the `id` field in `register()`.

2. Write the scene following the contract in [docs/writing-a-scene.md](docs/writing-a-scene.md):

   ```js
   import * as THREE from 'three';
   import { register } from './registry.js';
   import { Scene } from './base.js';

   class MyScene extends Scene {
     async init() { /* build content; use this.add() */ }
     update(dt, frame) { /* per-frame */ }
   }

   register({
     id: 'my-scene',
     title: 'My Scene',
     category: 'Basics',
     tags: ['example'],
     description: 'One sentence.',
     xr: 'vr',
     factory: (app) => new MyScene(app),
   });
   ```

3. Add one import line to `src/scenes/index.js`:

   ```js
   import './my-scene.js';
   ```

4. Run the tests to confirm registry integrity and syntax:

   ```bash
   node tests/run.mjs
   ```

5. Open `http://localhost:5173` and verify the scene appears in the launcher
   and runs without console errors — both on desktop and (if possible) in a
   headset.

## Running tests before committing

```bash
node tests/run.mjs
```

All four groups must pass (syntax, data json, scene integrity, unit). The CI
gate runs the same command and blocks on non-zero exit.

See [docs/testing.md](docs/testing.md) for details and for how to add unit
tests for `src/util/` modules.

## Commit message style

Use the imperative mood in the subject line. Keep it under 72 characters. Add
a blank line and a body if the change needs explanation.

```
add teleport-arc scene with parabolic arc raycaster

Uses TeleportControls from locomotion/teleport.js. Desktop shows an
animated arc sweep so the scene is not static without a headset.
```

Prefixes that work well for this project:

| Prefix | Use |
|--------|-----|
| `add` | New scene, new utility function, new doc |
| `fix` | Bug fix |
| `update` | Enhancement to an existing scene or module |
| `refactor` | Code restructuring with no behaviour change |
| `test` | New or updated test |
| `docs` | Documentation only |
| `chore` | Dependency bump, config change, cleanup |

## Pull requests

- One scene (or one coherent feature) per PR.
- Include a description of what the scene tests and what WebXR feature it
  exercises.
- If the scene requires a headset feature (hit-test, hand-tracking, etc.),
  describe the desktop fallback behaviour.
- Screenshots or a short screen-recording are welcome but not required.
