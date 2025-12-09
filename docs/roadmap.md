# Roadmap

This roadmap is forward-looking but grounded in the current codebase and the
direction of the WebXR ecosystem.

## Near-term (scene coverage)

The test lab is only as useful as the scenarios it covers. Priority additions:

- **More AR scenes** — `ar-anchors` (persist placed objects across sessions),
  `ar-depth-occlusion` (Quest 3 depth API), `ar-mesh-detection` (scene mesh
  on Quest 3).
- **Hand interaction scenes** — gesture recognition (fist, pinch-hold,
  two-hand spread), hand-based menu, hand ray pointer.
- **Spatial audio** — `THREE.PositionalAudio` with a `AudioListener` on the
  camera. Demonstrate attenuation falloff and panning.
- **Multiplayer stub** — a scene that opens a `BroadcastChannel` and mirrors
  a simple avatar position to other tabs on the same machine, as a foundation
  for real networking.

## Medium-term (rendering and XR features)

- **WebXR Layers API** — `XRQuadLayer`, `XRCylinderLayer`, and `XREquirectLayer`
  allow UI panels and video to be composited at full display resolution by the
  XR compositor, bypassing the main framebuffer. Three.js r160 does not yet
  provide a clean abstraction; a thin wrapper will be needed.
- **Passthrough mesh scene** — use `plane-detection` + `mesh-detection`
  (Quest 3) to paint semantic labels over detected surfaces.
- **Scene recording / playback** — record controller and head poses to JSON,
  play back for automated screenshot-based regression tests.
- **Light estimation demo** — `ar-light-estimation.js` already exists in the
  scene list. Wire `XRLightEstimate` to a Three.js `DirectionalLight` and
  `PMREMGenerator` to match real-world illumination.

## Long-term (ecosystem integration)

- **WebRTC multiplayer** — extend the `BroadcastChannel` stub to a signalling
  server + peer-to-peer data channels. Shared scene state: head + hand poses,
  grabbed object transforms.
- **Integration into my.minux.io** — this repository is designed to drop in as
  a git sub-module under a `/xr` route. The launcher UI will be wrapped in the
  parent app's navigation shell. A `postMessage` bridge will let the parent app
  request a specific scene by id.
- **Device capability matrix** — populate `data/` with real test results from
  a range of devices (Quest 2, Quest 3, Quest Pro, Pico 4, Vision Pro via
  compatible browser). Surface pass/fail per feature in the launcher.
- **CI screenshot diffing** — headless Puppeteer with the WebXR emulator to
  render each scene and compare against a baseline PNG on every PR.

## Maintenance

- Keep the Three.js pin current. The import map in `index.html` pins
  `three@0.160.0`. Upgrade by bumping the version string (both the `three` and
  `three/addons/` entries) and verifying `node tests/run.mjs` passes.
- Monitor the WebXR spec and Chrome/Firefox release notes for new features
  (`depth-sensing`, `real-world-geometry`, `hit-test` improvements).
