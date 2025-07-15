// Minimal observable key/value store with subscribe + localStorage backing.
// Pure logic (storage is optional and feature-detected), Node-testable.

import { Emitter } from './events.js';

export class Store {
  constructor(initial = {}, { persistKey = null } = {}) {
    this._emitter = new Emitter();
    this._persistKey = persistKey;
    this._state = { ...initial, ...this._load() };
  }

  get(key) {
    return key === undefined ? { ...this._state } : this._state[key];
  }

  set(key, value) {
    if (this._state[key] === value) return;
    this._state[key] = value;
    this._emitter.emit(key, value);
    this._emitter.emit('*', { key, value });
    this._save();
  }

  update(patch) {
    for (const [k, v] of Object.entries(patch)) this.set(k, v);
  }

  subscribe(key, fn) {
    return this._emitter.on(key, fn);
  }

  _load() {
    if (!this._persistKey) return {};
    try {
      const raw = globalThis.localStorage?.getItem(this._persistKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _save() {
    if (!this._persistKey) return;
    try {
      globalThis.localStorage?.setItem(this._persistKey, JSON.stringify(this._state));
    } catch {
      /* storage unavailable — ignore */
    }
  }
}
