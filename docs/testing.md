# Testing

The test harness runs entirely in Node — no browser, no WebGL, no network. It
validates the codebase statically and exercises pure utility logic.

## Running the tests

```bash
node tests/run.mjs
```

Exits `0` on success, non-zero on the first failing group.

## What the harness checks

### 1. Syntax (`node --check`)

`tests/run.mjs` walks the entire project tree (excluding `node_modules` and
dotfiles) and runs `node --check <file>` on every `.js` and `.mjs` file.
This catches parse errors and basic ES module issues without actually executing
the code.

### 2. JSON validity

Every `.json` file is parsed with `JSON.parse`. Malformed data files fail here.

### 3. Scene registry integrity (static)

For every `.js` file under `src/scenes/` that is not `registry.js`, `base.js`,
or `index.js`, the harness checks:

- The file calls `register(`.
- The file contains an `id:` field.
- The `id` is unique across all scene files.
- The file contains `title:`, `category:`, and `factory:` fields.

This check is purely textual (regexp on source) — it does not import Three.js —
so it runs fast in Node.

### 4. Unit tests

Any file ending in `.test.mjs` is dynamically imported. The tests register
themselves against `tests/harness.mjs` via:

```js
import { test, assert, near } from './harness.mjs';
test('name', () => { ... });
```

The runner then iterates `harness.tests` and calls each function.

Currently `tests/util.test.mjs` covers:

| Module | Functions tested |
|--------|-----------------|
| `src/util/math.js` | `clamp`, `lerp`, `invLerp`, `remap`, `smoothstep`, `wrapAngle`, `round` |
| `src/util/colors.js` | `hexToRgb`, `rgbToHex`, `mix`, `toCss`, `contrastText` |
| `src/util/format.js` | `bytes`, `duration`, `truncate` |
| `src/util/easing.js` | All `EASINGS` map-endpoint bounds |
| `src/util/events.js` | `Emitter.on`, `off`, `once` |
| `src/util/store.js` | `Store.get`, `set`, `subscribe` |
| `src/util/uuid.js` | `slugify` |

## Adding a unit test

1. Open (or create) a `.test.mjs` file under `tests/`. The runner discovers
   any file matching `*.test.mjs` recursively.

2. Import the harness helpers and the module under test:

   ```js
   import { test, assert, near } from './harness.mjs';
   import { myFunction } from '../src/util/my-module.js';
   ```

3. Write test cases:

   ```js
   test('myFunction basic', () => {
     assert(myFunction(2) === 4, 'expected 4');
   });

   test('myFunction float', () => {
     near(myFunction(1.5), 2.25);   // near(a, b, epsilon=1e-6)
   });
   ```

4. Run `node tests/run.mjs` — the new tests appear in the `unit` group.

**Note:** Only modules under `src/util/` are eligible for unit testing without
a browser environment, because `src/util/*` is intentionally kept free of
Three.js imports (enforced by the hard rule in `SPEC.md`).

## Continuous integration

The generator's dry-run gate calls `node tests/run.mjs` and blocks on non-zero
exit. Run it before committing any scene or utility change.
