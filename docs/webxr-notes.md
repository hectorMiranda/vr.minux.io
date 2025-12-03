# WebXR Notes

Practical notes on the WebXR Device API as used in this project.

## Session modes

| Mode | `navigator.xr.requestSession` string | Description |
|------|--------------------------------------|-------------|
| Immersive VR | `'immersive-vr'` | Full headset display, stereo, 6DOF. The primary mode for this lab. |
| Immersive AR | `'immersive-ar'` | Pass-through or optical see-through. Overlays 3D content on the real world. |
| Inline | `'inline'` | Renders in the page (no headset required). Limited to device-motion orientation. |

`src/xr/capabilities.js` checks all three with `xr.isSessionSupported(mode)`
and surfaces the results as badges in the launcher UI.

`src/xr/vr-button.js` requests `'immersive-vr'` with optional features
`['local-floor', 'bounded-floor', 'hand-tracking']`.

## Reference spaces

Reference spaces define the coordinate frame for poses.

| Type | Origin | When to use |
|------|--------|-------------|
| `'local'` | User's initial head position | Always supported. Good for seated or stationary content. |
| `'local-floor'` | Floor level below the user | Use for standing experiences. Requested as an optional feature. |
| `'bounded-floor'` | Centre of the play area | Has a defined boundary polygon. Only on room-scale systems. |
| `'unbounded'` | Arbitrary world anchor | Large-scale AR (ARCore / ARKit integration). Rarely available. |
| `'viewer'` | Head pose every frame | Hit-test ray origin, inline sessions. |

Three.js sets the reference space on `renderer.xr` after session start. The
active reference space is available via `renderer.xr.getReferenceSpace()`.

## Session features

Pass features as `requiredFeatures` or `optionalFeatures` when calling
`session.start(mode, { optionalFeatures, requiredFeatures })`.

| Feature string | Description | Availability |
|----------------|-------------|--------------|
| `'local-floor'` | Provides a floor-level reference space | Very common |
| `'bounded-floor'` | Provides a bounded play-area | Room-scale headsets |
| `'hand-tracking'` | `XRHand` joint poses | Quest 2/3, some others |
| `'hit-test'` | Ray-cast against real-world surfaces | AR only (ARCore/ARKit) |
| `'anchors'` | Persist world-locked positions across sessions | AR only |
| `'plane-detection'` | Returns detected floor/wall/table polygons | AR only |
| `'dom-overlay'` | Renders a DOM element over the AR view | AR on Android |
| `'light-estimation'` | Ambient/directional light from the real scene | AR, Quest Pro |
| `'depth-sensing'` | Per-pixel depth for occlusion | AR, Quest 3 |
| `'mesh-detection'` | Scene mesh reconstruction | Quest 3 |

Requesting a feature as `required` will cause `requestSession` to reject if the
device does not support it. Prefer `optional` unless the scene is useless
without it.

## Common gotchas

**"Enter VR" is disabled on an http page.**  
WebXR requires a secure context. Use `localhost`, an https URL, or `adb reverse`
to forward a localhost port to the headset. See [getting-started.md](./getting-started.md).

**AR scenes show a black overlay on Quest.**  
The AR mode on Quest needs `local-floor` as an optional feature, otherwise the
reference space falls back to `local` and the camera offset may be wrong. The
scene should also call `app.setFloorVisible(false)` in `init()`.

**Hit-test returns nothing on desktop.**  
`hit-test` is only granted in an actual AR session on a device with ARCore or
ARKit. AR scenes that use it should provide a desktop fallback (e.g.
`ar-hit-test.js` animates a mock reticle on a faux ground plane when
`!renderer.xr.isPresenting`).

**Hand tracking joints are null between frames.**  
`XRFrame.getJointPose()` can return `null` even mid-session if tracking is lost.
Always null-check pose before reading transform values. `src/xr/hands.js`
handles this safely.

**`XRFrame` is null on desktop.**  
`update(dt, frame)` receives `null` for `frame` when not in an XR session.
Guard frame-dependent code:

```js
update(dt, frame) {
  if (!frame) return;
  // safe to call frame.getPose(), frame.getJointPose(), etc.
}
```

**Renderer pixel ratio is capped at 2.**  
`src/core/renderer.js` calls `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
On headsets the native framebuffer resolution is managed by the XR compositor;
`setPixelRatio` mainly affects the desktop canvas.
