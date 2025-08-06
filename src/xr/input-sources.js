// Safe helpers for reading gamepad axes and buttons from a WebXR controller.
// All functions are guarded — they return neutral values when XR is absent.

/**
 * Read a single gamepad axis value safely.
 *
 * @param {THREE.XRTargetRaySpace} controller
 * @param {number} axisIndex
 * @returns {number} axis value in [-1, 1], 0 if unavailable
 */
export function getAxis(controller, axisIndex) {
  const gp = controller?.userData?.inputSource?.gamepad;
  if (!gp || !gp.axes || axisIndex >= gp.axes.length) return 0;
  return gp.axes[axisIndex] ?? 0;
}

/**
 * Read a gamepad button's current value (analog, 0–1).
 *
 * @param {THREE.XRTargetRaySpace} controller
 * @param {number} buttonIndex
 * @returns {number} 0 if unavailable
 */
export function getButtonValue(controller, buttonIndex) {
  const gp = controller?.userData?.inputSource?.gamepad;
  if (!gp || !gp.buttons || buttonIndex >= gp.buttons.length) return 0;
  return gp.buttons[buttonIndex]?.value ?? 0;
}

/**
 * Read whether a gamepad button is currently pressed (digital).
 *
 * @param {THREE.XRTargetRaySpace} controller
 * @param {number} buttonIndex
 * @returns {boolean}
 */
export function getButtonPressed(controller, buttonIndex) {
  const gp = controller?.userData?.inputSource?.gamepad;
  if (!gp || !gp.buttons || buttonIndex >= gp.buttons.length) return false;
  return gp.buttons[buttonIndex]?.pressed ?? false;
}

/**
 * Read whether a gamepad button is touched.
 *
 * @param {THREE.XRTargetRaySpace} controller
 * @param {number} buttonIndex
 * @returns {boolean}
 */
export function getButtonTouched(controller, buttonIndex) {
  const gp = controller?.userData?.inputSource?.gamepad;
  if (!gp || !gp.buttons || buttonIndex >= gp.buttons.length) return false;
  return gp.buttons[buttonIndex]?.touched ?? false;
}

/**
 * Return a snapshot of all buttons [{value, pressed, touched}].
 * Returns an empty array when no gamepad is available.
 *
 * @param {THREE.XRTargetRaySpace} controller
 * @returns {Array<{value: number, pressed: boolean, touched: boolean}>}
 */
export function getAllButtons(controller) {
  const gp = controller?.userData?.inputSource?.gamepad;
  if (!gp || !gp.buttons) return [];
  return Array.from(gp.buttons).map((b) => ({
    value: b?.value ?? 0,
    pressed: b?.pressed ?? false,
    touched: b?.touched ?? false,
  }));
}

/**
 * Return all axes as a plain array of numbers.
 *
 * @param {THREE.XRTargetRaySpace} controller
 * @returns {number[]}
 */
export function getAllAxes(controller) {
  const gp = controller?.userData?.inputSource?.gamepad;
  if (!gp || !gp.axes) return [];
  return Array.from(gp.axes).map((v) => v ?? 0);
}

/**
 * Thumbstick axes: returns {x, y} for a standard XR gamepad layout.
 * Axis 2 = thumbstick X, axis 3 = thumbstick Y (per OpenXR spec).
 *
 * @param {THREE.XRTargetRaySpace} controller
 * @returns {{x: number, y: number}}
 */
export function getThumbstick(controller) {
  return {
    x: getAxis(controller, 2),
    y: getAxis(controller, 3),
  };
}

/**
 * Analog trigger value (button index 0 on most XR gamepads).
 *
 * @param {THREE.XRTargetRaySpace} controller
 * @returns {number} 0–1
 */
export function getTrigger(controller) {
  return getButtonValue(controller, 0);
}

/**
 * Analog squeeze / grip value (button index 1 on most XR gamepads).
 *
 * @param {THREE.XRTargetRaySpace} controller
 * @returns {number} 0–1
 */
export function getSqueeze(controller) {
  return getButtonValue(controller, 1);
}
