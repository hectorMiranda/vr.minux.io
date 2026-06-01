// Pure scalar/vector math helpers. No Three.js dependency so these can be
// unit-tested under Node and reused anywhere.

export const TAU = Math.PI * 2;
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const lerp = (a, b, t) => a + (b - a) * t;

/** Inverse lerp: where does v sit between a and b, as 0..1? */
export const invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));

/** Remap v from [inMin,inMax] onto [outMin,outMax]. */
export const remap = (v, inMin, inMax, outMin, outMax) =>
  lerp(outMin, outMax, invLerp(inMin, inMax, v));

export const degToRad = (d) => d * DEG2RAD;
export const radToDeg = (r) => r * RAD2DEG;

/** Round to a fixed number of decimal places. */
export const round = (x, places = 0) => {
  const f = 10 ** places;
  return Math.round(x * f) / f;
};

/** Smoothstep easing of t in [0,1]. */
export const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Frame-rate independent damping factor for exponential smoothing. */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Wrap an angle (radians) into (-PI, PI]. */
export const wrapAngle = (a) => {
  let x = a % TAU;
  if (x > Math.PI) x -= TAU;
  if (x <= -Math.PI) x += TAU;
  return x;
};
