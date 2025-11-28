# Getting Started

## Prerequisites

- A modern browser (Chrome 90+, Edge 90+, Firefox 98+, or a headset browser)
- Python 3, Node.js, or any static file server
- For VR/AR entry: a WebXR-capable browser **and** an https or localhost origin

## Clone and serve

```bash
git clone https://github.com/hectorMiranda/vr.minux.io
cd vr.minux.io

# Serve with Python (simplest)
python3 -m http.server 5173

# Or with Node
npx serve -l 5173
```

Then open **http://localhost:5173** in your browser.

There is **no build step**. Three.js r0.160.0 is loaded from jsDelivr via an
`importmap` in `index.html`:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
</script>
```

All scene modules use bare `import * as THREE from 'three'` which the browser
resolves through that map at runtime.

## Why https is required for XR

The WebXR Device API is only available in a **secure context**
(`window.isSecureContext === true`). A page served over plain http from a remote
host will get `navigator.xr === undefined` and the Enter VR / Enter AR buttons
will be disabled. The two exceptions are:

- `localhost` — treated as secure by every WebXR-capable browser
- `127.0.0.1` — also treated as secure on most browsers

So for local development the Python/Node server on port 5173 is sufficient.
If you need to test on a phone or headset on your local network you will need
either an https reverse proxy (e.g. `npx local-ssl-proxy`) or to expose the
machine via a tunneling service (e.g. ngrok).

## Opening on a Quest or other headset browser

1. Connect the headset to the same network as your dev machine, **or** use a
   tunnel to get an https URL.
2. Open the Meta Quest Browser (or the browser built into your device).
3. Navigate to your https URL or to `http://localhost:5173` if you forwarded the
   port with `adb reverse tcp:5173 tcp:5173`.
4. The launcher's capability badges will show **VR** and/or **AR** green if the
   device supports them.
5. Pick a scene from the grid, then tap **Enter VR** in the stage bar.

### adb reverse shortcut (Quest via USB link)

```bash
adb reverse tcp:5173 tcp:5173
```

After this the headset browser can reach `http://localhost:5173` and the
localhost secure-context exemption applies, so WebXR works without https.

## Launcher overview

The launcher page lists every registered scene grouped by category. Capability
badges at the top right report whether `immersive-vr`, `immersive-ar`, and the
`inline` mode are available. Use the search box to filter by title, description,
tags, or id.

Click a card to open the stage view. The stage bar shows the scene title and an
**Enter VR** or **Enter AR** button (whichever the scene requests). Click
**← Back** to dispose the scene and return to the grid.
