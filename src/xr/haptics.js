// Haptic feedback helper.
// Guards against missing gamepad or actuator support so it's always safe to call.

/**
 * Fire a haptic pulse on a controller if the hardware supports it.
 *
 * @param {THREE.XRTargetRaySpace} controller - a controller from renderer.xr.getController(i)
 * @param {number} [intensity=0.5] - 0.0 – 1.0
 * @param {number} [ms=100] - duration in milliseconds
 * @returns {Promise<void>}
 */
export async function pulse(controller, intensity = 0.5, ms = 100) {
  try {
    const src = controller?.userData?.inputSource;
    const actuators = src?.gamepad?.hapticActuators;
    if (!actuators || actuators.length === 0) return;
    const actuator = actuators[0];
    if (typeof actuator.pulse === 'function') {
      await actuator.pulse(Math.max(0, Math.min(1, intensity)), Math.max(0, ms));
    } else if (typeof actuator.playEffect === 'function') {
      // GamepadHapticActuator (non-XR path, fallback)
      await actuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: ms,
        weakMagnitude: intensity,
        strongMagnitude: intensity,
      });
    }
  } catch {
    // Silently ignore — haptics are non-critical
  }
}
