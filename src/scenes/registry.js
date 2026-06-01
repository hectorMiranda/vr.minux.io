// Central registry of test scenes. Every scene module calls register(meta)
// at import time; the launcher then lists and instantiates them.
//
// meta = {
//   id:          string  unique kebab-case id (used in the URL hash)
//   title:       string  human label
//   category:    string  group in the sidebar (e.g. "Basics", "Input")
//   tags:        string[] free-form filter tags
//   description: string  one or two sentences
//   xr:          'vr' | 'ar' | 'both' | 'none'   (default 'vr')
//   factory:     (app) => Scene                  constructs the scene
// }

const _scenes = [];
const _byId = new Map();

export function register(meta) {
  if (!meta || !meta.id || typeof meta.factory !== 'function') {
    throw new Error(`registry: invalid scene meta: ${JSON.stringify(meta)}`);
  }
  if (_byId.has(meta.id)) {
    throw new Error(`registry: duplicate scene id "${meta.id}"`);
  }
  const normalized = {
    xr: 'vr',
    tags: [],
    category: 'Misc',
    description: '',
    ...meta,
  };
  _scenes.push(normalized);
  _byId.set(meta.id, normalized);
  return normalized;
}

export const all = () => _scenes.slice();

export const byId = (id) => _byId.get(id) || null;

export const categories = () => {
  const set = new Set(_scenes.map((s) => s.category));
  return [...set].sort();
};

export const inCategory = (cat) => _scenes.filter((s) => s.category === cat);

/** Substring filter across title, description, tags, and id. */
export const search = (query) => {
  const q = query.trim().toLowerCase();
  if (!q) return all();
  return _scenes.filter((s) =>
    [s.title, s.description, s.id, ...(s.tags || [])]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
};

export const count = () => _scenes.length;
