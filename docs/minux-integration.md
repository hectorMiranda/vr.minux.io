# Minux Integration

## Overview

`vr.minux.io` is designed to run as a standalone site **and** to embed cleanly
as a sub-module inside [`my.minux.io`](https://my.minux.io), the broader Minux
platform. The integration follows an open, file-based philosophy: no compiled
bundle, no proprietary framework coupling, just plain ES modules and a clean
URL boundary.

## Sub-module setup

Add this repository as a git sub-module under the parent project:

```bash
# from the my.minux.io repo root
git submodule add https://github.com/hectorMiranda/vr.minux.io packages/vr
git submodule update --init --recursive
```

The sub-module lives under `packages/vr/`. The parent's static file server
(or CDN) can then serve `packages/vr/` at the `/xr` path prefix.

## Embedded route

In the parent application, mount the VR lab at `/xr`:

```
GET /xr           → serves packages/vr/index.html
GET /xr/*         → static files from packages/vr/
```

The `index.html` import map uses absolute CDN URLs for Three.js, so it works
under any path prefix without modification.

If the parent app uses a router (e.g. a SPA with client-side routing), add a
catch-all rule for `/xr/**` that serves `packages/vr/index.html` directly and
lets the VR launcher handle the URL hash for scene routing.

## postMessage bridge

The VR launcher exposes a lightweight `postMessage` interface for parent-frame
control. To open a specific scene programmatically:

```js
// from the parent frame
vrIframe.contentWindow.postMessage({ type: 'open-scene', id: 'hello-cube' }, '*');
```

The launcher in `src/main.js` listens for `message` events on `window` and
calls `app.setScene(registry.byId(id).factory)` when a valid `open-scene`
message arrives.

Similarly, the launcher emits `postMessage` to `window.parent` on scene load /
session start / session end, so the parent app can update navigation or
analytics:

```js
window.addEventListener('message', (e) => {
  if (e.data?.type === 'xr-session-start') { /* update parent UI */ }
});
```

## URL hash routing

The launcher reads `location.hash` on load to start a specific scene directly:

```
https://vr.minux.io/#hello-cube
https://my.minux.io/xr#teleport-arc
```

The parent app can link directly to a scene by constructing the hash URL.

## Open file-based philosophy

No build step means:

- The parent project does not need to install Node build tooling to serve the
  VR sub-module.
- Updating the sub-module is `git submodule update --remote`.
- Any scene can be read, understood, and modified with nothing more than a text
  editor and a static file server.
- The same `index.html` that works locally works in production — there is no
  environment-variable injection or build-time configuration.

All reference data in `data/` is plain JSON, readable by any tool. The glossary,
feature catalog, and device matrix can be consumed by the parent app or by
external tooling without a special parser.
