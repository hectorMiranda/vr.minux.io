# Performance

WebXR targets 72–120 Hz with a strict frame budget (8–14 ms). Missing a frame
causes visible reprojection artifacts. These tips apply to scenes in this lab
and to any Three.js WebXR project.

## Instancing

Replace N separate `Mesh` objects with a single `THREE.InstancedMesh` when
drawing many identical geometries. One draw call replaces N.

```js
const mesh = new THREE.InstancedMesh(geometry, material, count);
const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
  dummy.position.set(...);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;
this.add(mesh);
```

**Demo scene:** `src/scenes/instanced-forest.js` — 300 low-poly trees in two
`InstancedMesh` objects (trunks + crowns).

## Geometry merging

Merge static meshes that share a material into a single `BufferGeometry` using
`THREE.BufferGeometryUtils.mergeGeometries()` (from `three/addons/`). Reduces
draw calls to one at the cost of losing per-mesh visibility culling.

## LOD

Use `THREE.LOD` to swap higher-detail geometry for lower-detail at distance.

```js
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);
lod.addLevel(lowDetailMesh, 5);
lod.addLevel(veryLowMesh, 15);
this.add(lod);
```

**Demo scene:** `src/scenes/subdivision-lod.js` — five icosahedron detail levels
side by side.

## Draw calls

- Keep draw calls below ~100 for a comfortable headset frame budget.
- `renderer.info.render.calls` gives the count for the last frame (check in
  browser devtools or log it in `update()`).
- One `InstancedMesh` with 10,000 instances = 1 draw call.
- Shadow maps double draw calls for every shadow-casting object that is visible.
  Limit `castShadow` to objects that meaningfully contribute.

## Foveation

Fixed foveated rendering renders the periphery at lower resolution, which is
invisible to the user but cuts fill-rate significantly on headsets.

```js
// Set once after renderer is created; 0 = off, 1 = maximum
renderer.xr.setFoveation(0.5);
```

`src/core/renderer.js` does not set foveation by default. Scenes that are
fill-rate bound (particle systems, transparent overlays) can enable it in
`onSessionStart`:

```js
onSessionStart() {
  this.app.renderer.xr.setFoveation(0.8);
}
```

## Pixel ratio

`src/core/renderer.js` caps the device pixel ratio at 2:

```js
renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
```

On a 3x display this cuts the pixel count by 56%. In XR the compositor
manages the framebuffer; on desktop reducing pixel ratio helps heavy scenes.

## Texture and material tips

- Avoid creating new `THREE.Material` or `THREE.Texture` objects every frame.
  Cache them on the scene instance.
- Call `texture.needsUpdate = true` only when the canvas data has actually
  changed (e.g. the canvas-based HUD in `src/scenes/smooth-locomotion.js`).
- Use `MeshBasicMaterial` for UI quads, labels, and overlays — it skips
  lighting calculations entirely.
- Share materials between meshes when possible. `mesh.material = sharedMat`
  with `dispose: false` on the shared instance.

## Dispose discipline

GPU memory leaks accumulate across scene switches if geometry and materials are
not freed. `Scene.dispose()` traverses every object added via `this.add()` and
calls `.geometry.dispose()` and `.material.dispose()` automatically. For
anything created outside that path, register cleanup:

```js
const tex = new THREE.CanvasTexture(canvas);
this.onDispose(() => tex.dispose());
```

## Points clouds

`THREE.Points` with `THREE.BufferGeometry` renders thousands of points in one
draw call. See `src/scenes/points-cloud.js`.
