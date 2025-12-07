# Troubleshooting

## "Enter VR" button is disabled / shows "WebXR unavailable"

**Cause:** The page is not in a secure context, or the browser does not support
WebXR.

**Fix:**
- Use `http://localhost:5173` (localhost is always treated as secure).
- On a remote device, serve over https. Use a reverse proxy or tunnel.
- Verify `window.isSecureContext === true` in the browser console.
- Verify `'xr' in navigator` is `true`. If not, the browser does not support
  WebXR at all.

## "VR not supported" button (WebXR present but VR unavailable)

**Cause:** The browser has WebXR but the current device does not support
`immersive-vr`.

**Fix:**
- On a desktop without a headset this is expected. Connect a VR headset or open
  the page in the headset's own browser.
- On Chrome desktop you can install the
  [WebXR API Emulator](https://chrome.google.com/webstore/detail/immersive-web-emulator/nooeiigebohokpgpjhehgmfimendkahn)
  extension to emulate a headset.

## Black screen in the headset

**Possible causes and fixes:**

1. **Wrong reference space** — the scene placed objects at world coordinates
   that don't match the XR reference space origin. AR scenes should call
   `app.setFloorVisible(false)` and position content relative to the user.

2. **Three.js `xr.enabled` not set** — `src/core/renderer.js` sets
   `renderer.xr.enabled = true` in the factory. If you construct your own
   renderer, add this line.

3. **Scene `init()` threw** — open browser devtools (on Meta Quest: use Remote
   Debugging via `chrome://inspect`) and check the console for errors.

4. **Content placed behind the camera** — objects at `z > 0` are behind the
   default camera position. Place objects at `z = -1` to `-2`.

## No controllers visible on desktop

Controllers (`src/xr/controllers.js`) are XR input sources attached to the
renderer's XR controller spaces. They only have poses inside an active XR
session. On a desktop without a headset they will be present in the scene graph
but invisible / at the origin.

Scenes designed for desktop interaction should handle `!renderer.xr.isPresenting`
and provide a mouse or keyboard fallback. Many scenes auto-animate on desktop
(e.g. the teleport arc sweeps automatically, smooth-locomotion auto-drifts).

## CORS errors loading Three.js from CDN

If the browser console shows `Cross-Origin Request Blocked` for the Three.js
CDN import, the CDN is either blocked by a firewall or offline.

**Fix:** Download Three.js locally:

```bash
npx download-cli https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js \
  -o vendor/three.module.js
```

Then update the import map in `index.html`:

```json
{
  "imports": {
    "three": "/vendor/three.module.js"
  }
}
```

## AR not available / "AR not supported"

`immersive-ar` requires:
- Android device with ARCore, or iOS with WebXR AR support (limited), or a
  headset with pass-through (e.g. Quest 3, Quest Pro).
- Chrome on Android ≥ 7 with ARCore installed.

On unsupported devices the AR button will be disabled. Use a supported device
or the WebXR Emulator extension for desktop testing.

## `node tests/run.mjs` fails with syntax errors

Run `node --check src/scenes/<your-file>.js` to isolate the file. Common causes:

- Missing `.js` extension on a local import.
- Top-level `await` outside an `async` function.
- Using a browser global (`document`, `window`, `navigator`) in a `src/util/`
  file (util modules must stay Node-compatible).

## Scene throws on init with "THREE is not defined"

All scene modules must import Three.js explicitly:

```js
import * as THREE from 'three';
```

Do not rely on a global `THREE` — there is no UMD build; the import map
provides the ESM build only.
