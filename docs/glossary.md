# Glossary

This page is a prose introduction to the XR terms used throughout this project.
The machine-readable definition list lives in [`data/glossary.json`](../data/glossary.json).

---

**WebXR** — the browser API (`navigator.xr`) that provides access to VR and AR
hardware. It handles session lifecycle, device poses, controller input, and
hand-tracking. Specified by the W3C Immersive Web Working Group.

**Immersive VR** — a session mode (`'immersive-vr'`) in which the browser takes
over the display and renders to the headset at the device's native refresh rate.
The page is no longer visible; the user is fully inside the 3D scene.

**Immersive AR** — a session mode (`'immersive-ar'`) in which 3D content is
composited over a camera feed or optical see-through display. The real world
remains visible.

**Reference space** — the coordinate frame used to interpret XR poses.
`local-floor` puts the origin at floor level under the user. `bounded-floor`
adds a guardian boundary polygon. `viewer` tracks the head pose frame by frame.

**XRFrame** — the object passed to each iteration of the XR render loop. It
provides pose queries (`getPose`, `getViewerPose`, `getJointPose`,
`getHitTestResults`). It is only valid for the duration of the callback.

**Target-ray space** — the coordinate space of a controller's pointing ray.
Three.js exposes this as `renderer.xr.getController(i)`, a `THREE.Group`
whose `-Z` axis is the ray direction.

**Grip space** — the coordinate space of the physical controller body, used for
rendering controller model geometry. Three.js exposes this as
`renderer.xr.getControllerGrip(i)`.

**XRHand** — the hand-tracking interface. Provides 25 joint spaces per hand
(wrist + 4 joints × 5 fingers + tips). Available when `hand-tracking` is
granted as a session feature.

**Pinch** — the gesture of bringing the thumb tip and index finger tip close
together. Detected in this project by measuring the distance between those two
joints; pinch = 1 when they are touching (within 0.02 m).

**Hit-test** — an AR session feature that ray-casts against real-world surfaces
detected by the device's depth system. Returns a list of `XRHitTestResult`
poses on surfaces the ray intersects.

**Plane detection** — an AR session feature that exposes detected horizontal
and vertical surfaces as `XRPlane` objects with polygon outlines and semantic
labels (floor, wall, table, etc.).

**Foveation** — fixed foveated rendering. The headset compositor renders the
central area of the lens at full resolution and the periphery at lower
resolution, exploiting the eye's reduced acuity in the periphery to save GPU
work. Controlled in Three.js with `renderer.xr.setFoveation(0–1)`.

**Teleport** — a locomotion technique that moves the player's position
instantaneously to a target point, typically shown by aiming an arc and releasing
a button. Avoids simulator sickness caused by continuous movement.

**Snap turn** — rotating the view by a fixed angle (e.g. 30°) on a thumbstick
flick, as opposed to smooth continuous rotation. Better tolerated by users
prone to motion sickness.

**Camera rig** — a `THREE.Group` that acts as the player's root transform.
Locomotion moves the rig rather than the camera directly, because the headset
poses the camera relative to the rig in an XR session.

**Import map** — a `<script type="importmap">` block in HTML that maps bare
module specifiers (`'three'`) to URLs. Allows `import * as THREE from 'three'`
to resolve to a CDN URL without a build step.

---

For a structured list of feature strings, device support flags, and reference
space properties, see [`data/glossary.json`](../data/glossary.json).
