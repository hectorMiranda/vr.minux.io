// Small id helpers. Pure, Node-testable (falls back when crypto is absent).

/** RFC4122-ish v4 id. Uses crypto when available, else a deterministic-ish
 *  fallback that is still collision-resistant enough for in-memory keys. */
export const uuid = () => {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  let out = '';
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
};

/** Short slug-friendly id of N base36 chars. */
export const shortId = (len = 8) => {
  let out = '';
  while (out.length < len) out += Math.random().toString(36).slice(2);
  return out.slice(0, len);
};

/** Turn an arbitrary label into a kebab-case slug. */
export const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
