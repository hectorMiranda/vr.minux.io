# Controllers and Hands

## Controllers (`src/xr/controllers.js`)

`Controllers` is constructed by `App` and lives at `app.controllers`. It wraps
both XR controller spaces for indices 0 and 1.

### Exposed members

| Member | Type | Description |
|--------|------|-------------|
| `controllers.controllers[i]` | `THREE.XRTargetRaySpace` | The pointing ray space (index 0 = left, 1 = right) |
| `controllers.grips[i]` | `THREE.XRControllerGrip` | The grip space, used for rendering controller models |
| `controllers.events` | `Emitter` | Forwards all XR input events from both controllers |
| `controllers.getRay(i)` | `THREE.Ray` | World-space ray from controller `i`'s target-ray space |

### Events

All events are emitted on `controllers.events` with payload
`{ index, controller, data }`.

| Event | Trigger |
|-------|---------|
| `'selectstart'` | Trigger starts being pressed |
| `'selectend'` | Trigger released |
| `'select'` | Trigger press completed |
| `'squeezestart'` | Grip button pressed |
| `'squeezeend'` | Grip button released |
| `'squeeze'` | Grip press completed |
| `'connected'` | Input source assigned to controller slot |
| `'disconnected'` | Input source removed |

```js
this.onDispose(
  this.app.controllers.events.on('selectstart', ({ index, controller }) => {
    console.log(`controller ${index} trigger down`);
  })
);
```

### Reading gamepad axes and buttons (`src/xr/input-sources.js`)

For analog values beyond select/squeeze, import from `src/xr/input-sources.js`:

```js
import {
  getThumbstick,   // { x, y } — axes 2 and 3 per OpenXR layout
  getTrigger,      // analog trigger, 0–1 (button index 0)
  getSqueeze,      // analog grip, 0–1 (button index 1)
  getAxis,         // getAxis(controller, axisIndex)
  getButtonValue,  // getButtonValue(controller, buttonIndex) → 0–1
  getButtonPressed,// getButtonPressed(controller, buttonIndex) → bool
  getButtonTouched,// getButtonTouched(controller, buttonIndex) → bool
  getAllButtons,    // [{value, pressed, touched}]
  getAllAxes,       // number[]
} from '../xr/input-sources.js';
```

All helpers are null-safe — they return `0` or `false` when the gamepad or
axis/button is absent, so they work on desktop without throwing.

Standard OpenXR gamepad layout (Oculus/Meta controllers):

| Index | Type | Mapping |
|-------|------|---------|
| Axis 0 | Touchpad X | Not used on Quest controllers |
| Axis 1 | Touchpad Y | Not used on Quest controllers |
| Axis 2 | Thumbstick X | Left (-1) / Right (+1) |
| Axis 3 | Thumbstick Y | Up (-1) / Down (+1) |
| Button 0 | Trigger | Analog value + pressed |
| Button 1 | Grip (squeeze) | Analog value + pressed |
| Button 3 | Thumbstick click | Pressed bool |
| Button 4 | A / X button | Pressed bool |
| Button 5 | B / Y button | Pressed bool |

### Haptics (`src/xr/haptics.js`)

```js
import { pulse } from '../xr/haptics.js';

// Fire a 100 ms medium-strength pulse on controller 0
const controller = this.app.controllers.controllers[0];
pulse(controller, 0.5, 100);  // intensity 0–1, duration ms
```

`pulse()` is async and silently no-ops when haptic actuators are unavailable.
It tries `actuator.pulse()` first (XR standard) and falls back to
`actuator.playEffect('dual-rumble', ...)` for non-XR gamepads.

See `src/scenes/controller-haptics.js` for a demo scene with light / medium /
strong / buzz presets.

---

## Hands (`src/xr/hands.js`)

`Hands` builds small sphere meshes at each of the 25 XRHand joints (per the
WebXR Hand Input spec). It is a separate system, not wired into `App` by
default; AR/hand-tracking scenes instantiate it themselves.

### Usage

```js
import { Hands } from '../xr/hands.js';

async init() {
  this._hands = new Hands(this.app.renderer, this.group);
  this.onDispose(() => this._hands.dispose());
}

update(_dt, frame) {
  this._hands.update(frame);  // pass XRFrame directly
}
```

### API

| Method / Property | Description |
|-------------------|-------------|
| `hands.trackers[i]` | Per-hand `HandTracker` (0 = left, 1 = right) |
| `hands.isActive(i)` | `true` if hand `i` has live joint data this frame |
| `hands.getPinch(i)` | Pinch value `[0, 1]` — distance between thumb-tip and index-finger-tip, remapped to 0.02 m threshold |
| `hands.getJointPosition(i, name)` | `THREE.Vector3` (world space) for a named joint, or `null` |
| `hands.update(frame)` | Must be called every frame with the current `XRFrame` |
| `hands.dispose()` | Removes joint meshes, frees geometry/material |

### Joint names

The 25 joint names follow the WebXR Hand Input spec:
`wrist`, `thumb-metacarpal`, `thumb-phalanx-proximal`, `thumb-phalanx-distal`,
`thumb-tip`, `index-finger-metacarpal`, `index-finger-phalanx-proximal`,
`index-finger-phalanx-intermediate`, `index-finger-phalanx-distal`,
`index-finger-tip`, and analogously for middle, ring, and pinky fingers.

See `src/scenes/hand-joints.js` and `src/scenes/pinch-detect.js` for demo scenes.
