// Human-friendly formatting helpers. Pure, Node-testable.

/** Format a per-second rate (e.g. frames) with one decimal. */
export const fps = (value) => `${Math.round(value * 10) / 10} fps`;

/** Milliseconds with sensible precision. */
export const ms = (value) =>
  value < 10 ? `${Math.round(value * 100) / 100} ms` : `${Math.round(value)} ms`;

/** Bytes -> human string. */
export const bytes = (n) => {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${Math.round(v * 10) / 10} ${units[i]}`;
};

/** Seconds -> m:ss. */
export const duration = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** A 3-component vector-ish object -> "(x, y, z)" with fixed precision. */
export const vec3 = (v, p = 2) =>
  `(${v.x.toFixed(p)}, ${v.y.toFixed(p)}, ${v.z.toFixed(p)})`;

/** Truncate with an ellipsis. */
export const truncate = (s, max = 40) =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`;
