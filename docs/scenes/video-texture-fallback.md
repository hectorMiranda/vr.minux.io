# Video Texture Fallback

**Category:** Rendering &middot; **XR:** vr &middot; **Tags:** `video`, `canvas-texture`, `streaming`

Uses VideoTexture via captureStream if available; falls back to an animated CanvasTexture — never requires a real video file.

## Run it

Open the launcher and pick **Video Texture Fallback**, or deep-link straight to it:

```
http://localhost:5173/#video-texture-fallback
```

## What this verifies

Exercises a rendering feature (PBR, shadows, reflections, fog) and how it holds up at stereo XR framerates.

## Source

[`src/scenes/video-texture-fallback.js`](../../src/scenes/video-texture-fallback.js)
