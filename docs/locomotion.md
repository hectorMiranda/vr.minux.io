# Locomotion

The `src/locomotion/` directory provides four movement systems. Each is an
independent class; scenes pick the one(s) they need.

## TeleportControls (`src/locomotion/teleport.js`)

A parabolic arc raycaster. The player aims at the floor, releases, and the rig
teleports to that position.

```js
import { TeleportControls } from '../locomotion/teleport.js';

async init() {
  this._tp = new TeleportControls(this.app, 0);  // controller index 0
  this._tp.setFloor(floorMesh);
  this._tp.enable();
  this.onDispose(() => this._tp.dispose());
}

update(dt) {
  this._tp.update(dt);
}
```

The arc is drawn with a `THREE.Line` (cyan, `depthTest: false`) and a landing
ring marker. The arc launches at 8 m/s along the controller ray with 9.8 m/s²
gravity over 32 segments. Both are added directly to `app.scene` (not
`this.group`) so they persist during the press.

`TeleportControls.castArcFromRay(origin, direction)` is also available for
desktop preview (used by `src/scenes/teleport-arc.js`).

**Demo scene:** `src/scenes/teleport-arc.js` (`id: 'teleport-arc'`)

---

## BlinkTransition (`src/locomotion/blink.js`)

A fullscreen fade-to-black overlay that masks the position jump of a teleport.
It is not a locomotion system itself — it wraps `TeleportControls` or any
teleport event.

```js
import { BlinkTransition } from '../locomotion/blink.js';

async init() {
  this._blink = new BlinkTransition(this.app.camera);
  // call this._blink.trigger(callback) where callback moves the rig
}
```

The overlay fades out in 80 ms, fires the callback at peak black, then fades
back in over 120 ms. It uses a fullscreen NDC quad with a custom shader so it
covers the entire view regardless of camera orientation — important in a headset.

**Demo scene:** `src/scenes/blink-move.js` (`id: 'blink-move'`)

---

## SmoothLocomotion (`src/locomotion/smooth-move.js`)

Thumbstick glide — translates the rig every frame based on thumbstick axis input.

```js
import { SmoothLocomotion } from '../locomotion/smooth-move.js';

async init() {
  this._loco = new SmoothLocomotion(this.app, { speed: 4, controllerIndex: 0 });
  this._loco.enable();
  this.onDispose(() => this._loco.dispose());
}

update(dt) {
  const moved = this._loco.update(dt);  // returns delta vector or null
}
```

Movement direction is relative to the camera's horizontal facing so the player
always moves in the direction they are looking. Speed defaults to 4 m/s.

**Comfort note:** continuous locomotion can cause simulator sickness. Consider
pairing with a vignette effect that narrows the FOV during movement, or prefer
teleport for comfort-sensitive experiences.

**Demo scene:** `src/scenes/smooth-locomotion.js` (`id: 'smooth-locomotion'`)

---

## SnapTurn (`src/locomotion/snap-turn.js`)

Rotates the rig by a fixed angle on a thumbstick flick. Avoids the disorienting
continuous rotation of smooth turning.

```js
import { SnapTurn } from '../locomotion/snap-turn.js';

async init() {
  this._snap = new SnapTurn(this.app, { angleDeg: 30, controllerIndex: 1 });
  this._snap.enable();
  this._snap.onSnap = () => console.log('snapped');
  this.onDispose(() => this._snap.dispose());
}

update(dt) {
  this._snap.update(dt);
}
```

The default snap angle is 30°. A deadzone prevents repeated firing from a
held thumbstick; the turn fires once per discrete flick. `onSnap` fires after
each rotation.

**Comfort note:** snap turning is generally better tolerated than smooth turning.
30° is a common default; some users prefer 45°. Always provide the option.

**Demo scene:** `src/scenes/snap-turn-demo.js` (`id: 'snap-turn-demo'`)

---

## Comfort considerations

- **Vignette during smooth movement** — narrowing the peripheral FOV during
  locomotion reduces perceived veil motion and lowers nausea risk. Not yet
  implemented as a shared utility; scenes can add a fullscreen ring overlay.
- **Snap turning** — universally recommended over smooth rotation. Use snap
  for turning even when smooth locomotion is used for translation.
- **Blink teleport** — the 80/120 ms fade masks the position discontinuity and
  is well tolerated.
- **Arc teleport** — gives the player full control over destination; zero nausea.
- **Content placement** — position objects 1–2 m in front of the player and at
  eye height (y ≈ 1.2–1.7). Avoid placing interactive content behind the player
  or requiring large head tilts.
