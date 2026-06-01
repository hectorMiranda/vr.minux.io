// Color helpers operating on 0xRRGGBB integers and {h,s,l}. Pure, Node-testable.

export const hexToRgb = (hex) => ({
  r: (hex >> 16) & 0xff,
  g: (hex >> 8) & 0xff,
  b: hex & 0xff,
});

export const rgbToHex = (r, g, b) =>
  ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);

/** Linear blend between two 0xRRGGBB colors. t in [0,1]. */
export const mix = (a, b, t) => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(
    Math.round(ca.r + (cb.r - ca.r) * t),
    Math.round(ca.g + (cb.g - ca.g) * t),
    Math.round(ca.b + (cb.b - ca.b) * t),
  );
};

export const toCss = (hex) => `#${(hex & 0xffffff).toString(16).padStart(6, '0')}`;

/** Relative luminance (sRGB, 0..1) — handy for picking readable text colors. */
export const luminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** Pick black or white for legible text on a given background. */
export const contrastText = (bg) => (luminance(bg) > 0.4 ? 0x000000 : 0xffffff);
