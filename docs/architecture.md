# Architecture

## Layer diagram

```
index.html  (import map, DOM shell)
    |
src/main.js  (launcher UI — discovers scenes, wires controls)
    |
src/core/app.js  ←  App  (the single assembly point)
    |
    ├── core/renderer.js     WebGLRenderer, XR-enabled, ACES tone-mapping
    ├── core/scene.js        THREE.Scene + floor mesh factory
    ├── core/camera-rig.js   PerspectiveCamera inside a CameraRig group
    ├── core/lights.js       Ambient + directional with shadow
    ├── core/loop.js         RenderLoop  (renderer.setAnimationLoop)
    |
    ├── xr/session.js        SessionManager  (request / end XR sessions)
    ├── xr/controllers.js    Controllers  (getController, getControllerGrip, events)
    ├── xr/hands.js          Hands  (hand-joint spheres, pinch value)
    ├── xr/haptics.js        pulse()  helper
    ├── xr/vr-button.js      DOM Enter-VR button
    ├── xr/ar-button.js      DOM Enter-AR button
    ├── xr/capabilities.js   detectCapabilities(), capBadges()
    |
    ├── locomotion/teleport.js    TeleportControls  (parabolic arc)
    ├── locomotion/smooth-move.js SmoothLocomotion  (thumbstick glide)
    ├── locomotion/snap-turn.js   SnapTurn          (fixed-angle rotation)
    ├── locomotion/blink.js       BlinkTransition   (fade overlay)
    |
    ├── interaction/   raycaster, grab, hover, gaze, drag
    ├── ui/            panel, button3d, slider3d, label, hud
    |
    ├── util/  math, easing, colors, events (Emitter), store, format, uuid
    |           ↑ no Three.js imports — Node-testable
    |
    └── scenes/  *.js  — one file per test scene
         ├── base.js       Scene base class
         ├── registry.js   register() / all() / byId() / search()
         └── index.js      barrel that imports every scene file
```

## How App owns the active scene

`App` (in `src/core/app.js`) is constructed once per stage view. It owns:

- **`app.renderer`** — `THREE.WebGLRenderer` with `xr.enabled = true`
- **`app.scene`** — the root `THREE.Scene`
- **`app.camera`** — `THREE.PerspectiveCamera` nested inside `app.rig.group`
- **`app.rig`** — `CameraRig`: a `THREE.Group` that locomotion moves
- **`app.lights`** — ambient + directional lights added to `app.scene`
- **`app.floor`** — a flat `THREE.Mesh` (hidden by AR scenes)
- **`app.loop`** — `RenderLoop`, drives `renderer.setAnimationLoop`
- **`app.session`** — `SessionManager`, handles `navigator.xr.requestSession`
- **`app.controllers`** — `Controllers`, wraps both XR controller spaces

`app.setScene(factory)` is the only public entry point for swapping scenes:

1. Calls `clearScene()` — disposes the old scene, unsubscribes its frame callback.
2. Calls `factory(app)` to construct the new scene instance.
3. Calls `await scene.init()`.
4. Adds `scene.group` to `app.scene`.
5. Registers a frame callback: `controllers.update(dt, frame)` then
   `scene.update(dt, frame)`.
6. Calls `loop.start()` if not already running.

The `RenderLoop` calls `renderer.setAnimationLoop`, which the browser replaces
with a headset-rate loop when an XR session is active. Each tick delivers a
`THREE.Clock`-derived `dt` (capped at 100 ms) and the raw `XRFrame` (or `null`
on desktop).

## Source layout quick-reference

| Path | Role |
|------|------|
| `src/core/` | Engine primitives — no game logic |
| `src/xr/` | WebXR session, input, buttons |
| `src/locomotion/` | Player movement systems |
| `src/interaction/` | Object picking and manipulation |
| `src/ui/` | Spatial 3D UI widgets |
| `src/util/` | Pure JS helpers (no Three.js) |
| `src/scenes/` | Test scenes + registry |
| `data/` | Static JSON reference data |
| `tests/` | Node harness and unit tests |
