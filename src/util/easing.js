// Easing functions, all mapping t in [0,1] -> [0,1]. Pure, Node-testable.

export const linear = (t) => t;

export const easeInQuad = (t) => t * t;
export const easeOutQuad = (t) => t * (2 - t);
export const easeInOutQuad = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

export const easeInCubic = (t) => t * t * t;
export const easeOutCubic = (t) => 1 + --t * t * t;
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 + (t - 1) * (2 * t - 2) * (2 * t - 2);

export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export const easeOutElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0 || t === 1) return t;
  return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export const EASINGS = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutElastic,
  easeInOutSine,
};
