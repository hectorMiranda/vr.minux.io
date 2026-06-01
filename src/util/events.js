// A tiny synchronous event emitter. Pure, Node-testable.

export class Emitter {
  constructor() {
    this._map = new Map();
  }

  /** Subscribe. Returns an unsubscribe function. */
  on(type, fn) {
    if (!this._map.has(type)) this._map.set(type, new Set());
    this._map.get(type).add(fn);
    return () => this.off(type, fn);
  }

  /** Subscribe once. */
  once(type, fn) {
    const off = this.on(type, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }

  off(type, fn) {
    this._map.get(type)?.delete(fn);
  }

  emit(type, payload) {
    const set = this._map.get(type);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }

  clear(type) {
    if (type) this._map.delete(type);
    else this._map.clear();
  }
}
