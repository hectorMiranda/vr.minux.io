# Scene Contract Reference

This is the machine-readable contract for every scene in `src/scenes/`. The
authoritative source code is `src/scenes/base.js`, `src/scenes/registry.js`,
and `src/core/app.js`.

## register() meta fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string` | yes | — | Unique kebab-case identifier. Must match the file name (`src/scenes/<id>.js`). Used in the URL hash. |
| `title` | `string` | yes | — | Human-readable label shown in the launcher. |
| `category` | `string` | yes | `'Misc'` | Group heading in the sidebar (e.g. `'Basics'`, `'Locomotion'`, `'Input'`, `'AR'`). |
| `tags` | `string[]` | no | `[]` | Free-form filter tags (e.g. `['mesh', 'basics']`). Searched by the launcher's text filter. |
| `description` | `string` | no | `''` | One or two sentences describing what the scene tests. |
| `xr` | `'vr' \| 'ar' \| 'both' \| 'none'` | no | `'vr'` | Determines which XR button (if any) is shown in the stage bar. |
| `factory` | `(app: App) => Scene` | yes | — | Constructor function; called with the live `App` instance each time the scene is loaded. |

The registry validates that `id` is unique and that `id`, `title`, `category`,
and `factory` are present. Duplicate ids throw immediately at import time.

## App surface available to scenes (via `this.app`)

| Member | Type | Notes |
|--------|------|-------|
| `app.scene` | `THREE.Scene` | Root scene graph. Prefer `this.add()` over `app.scene.add()`. |
| `app.camera` | `THREE.PerspectiveCamera` | The scene camera (70° FOV, near 0.01, far 100). Nested inside `app.rig.group`. |
| `app.rig` | `CameraRig` | Player position. See rig methods below. |
| `app.renderer` | `THREE.WebGLRenderer` | `renderer.xr` for XR introspection. `renderer.xr.isPresenting` is `true` in session. |
| `app.controllers` | `Controllers` | `.controllers[i]` (target-ray spaces), `.grips[i]`, `.events` (Emitter), `.getRay(i)` |
| `app.session` | `SessionManager` | `.start(mode, opts)`, `.end()`, `.active`, `.events` ('start'/'end') |
| `app.loop` | `RenderLoop` | `.onFrame(cb)` — usually unnecessary since `update()` is sufficient |
| `app.events` | `Emitter` | App-level events: `'session-start'`, `'session-end'` |
| `app.setFloorVisible(bool)` | `fn` | AR scenes call `app.setFloorVisible(false)` in `init()` |

### CameraRig methods

| Method | Description |
|--------|-------------|
| `rig.moveTo(x, y, z)` | Teleport the rig to an absolute world position |
| `rig.translate(dx, dy, dz)` | Move the rig by a delta |
| `rig.rotateY(radians)` | Rotate the rig around its vertical axis (snap-turn) |
| `rig.position` | `THREE.Vector3` — current world position of the rig group |
| `rig.group` | The underlying `THREE.Group` |

## Scene base class API

| Member | Description |
|--------|-------------|
| `this.app` | The `App` instance passed to the constructor |
| `this.group` | `THREE.Group` named `'scene-root'`; added to / removed from `app.scene` by `App.setScene` |
| `this.add(...objects)` | Add objects to `this.group` **and** track them for auto-disposal. Returns the first argument. |
| `this.onDispose(fn)` | Register an arbitrary cleanup callback run during `dispose()`. Use for textures, event listeners, subsystem teardown. |
| `async init()` | Override: build scene content. May be `async`. |
| `update(dt, frame)` | Override: per-frame callback. `dt` in seconds (max 0.1). `frame` is `XRFrame` or `null`. |
| `onSessionStart(session)` | Optional override: called when an XR session begins. |
| `onSessionEnd()` | Optional override: called when the XR session ends. |
| `dispose()` | Default implementation traverses all tracked objects and calls `.geometry.dispose()` / `.material.dispose()`, then runs `onDispose` callbacks. Call `super.dispose()` when overriding. |

## Controller events

Events are emitted on `app.controllers.events` (an `Emitter`). Each payload is
`{ index, controller, data }`.

| Event | When |
|-------|------|
| `'selectstart'` | Trigger begins to be pressed |
| `'selectend'` | Trigger released |
| `'select'` | Trigger press completed (down + up) |
| `'squeezestart'` | Grip button pressed |
| `'squeezeend'` | Grip button released |
| `'squeeze'` | Grip press completed |
| `'connected'` | Controller connected / input source assigned |
| `'disconnected'` | Controller disconnected |

Preferred pattern (the returned unsubscribe is passed to `onDispose` for
automatic cleanup):

```js
this.onDispose(
  this.app.controllers.events.on('select', ({ index, controller }) => { ... })
);
```
