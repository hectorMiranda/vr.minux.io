// Unit tests for the pure utility modules. Registered against the harness in
// tests/run.mjs (which provides test/assert/near).
import { test, assert, near } from './harness.mjs';
import { clamp, lerp, invLerp, remap, smoothstep, wrapAngle, round } from '../src/util/math.js';
import { hexToRgb, rgbToHex, mix, toCss, contrastText } from '../src/util/colors.js';
import { bytes, duration, truncate } from '../src/util/format.js';
import { EASINGS } from '../src/util/easing.js';
import { Emitter } from '../src/util/events.js';
import { Store } from '../src/util/store.js';
import { slugify } from '../src/util/uuid.js';

test('math.clamp', () => {
  assert(clamp(5, 0, 10) === 5);
  assert(clamp(-1, 0, 10) === 0);
  assert(clamp(99, 0, 10) === 10);
});

test('math.lerp/invLerp/remap', () => {
  near(lerp(0, 10, 0.5), 5);
  near(invLerp(0, 10, 5), 0.5);
  near(remap(5, 0, 10, 0, 100), 50);
});

test('math.smoothstep bounds', () => {
  near(smoothstep(0), 0);
  near(smoothstep(1), 1);
  assert(smoothstep(0.5) > 0.49 && smoothstep(0.5) < 0.51);
});

test('math.wrapAngle', () => {
  near(wrapAngle(Math.PI * 3), Math.PI);
  near(wrapAngle(0), 0);
});

test('math.round places', () => {
  near(round(3.14159, 2), 3.14);
});

test('colors roundtrip', () => {
  const c = rgbToHex(255, 128, 0);
  const { r, g, b } = hexToRgb(c);
  assert(r === 255 && g === 128 && b === 0);
  assert(toCss(0xff8000) === '#ff8000');
});

test('colors mix + contrast', () => {
  assert(mix(0x000000, 0xffffff, 0.5) === 0x808080);
  assert(contrastText(0xffffff) === 0x000000);
  assert(contrastText(0x000000) === 0xffffff);
});

test('format helpers', () => {
  assert(bytes(512) === '512 B');
  assert(bytes(2048) === '2 KB');
  assert(duration(75) === '1:15');
  assert(truncate('abcdefghij', 5) === 'abcd…');
});

test('easings map endpoints', () => {
  for (const [name, fn] of Object.entries(EASINGS)) {
    near(fn(0), 0, 1e-6);
    near(fn(1), 1, 1e-6);
  }
});

test('emitter on/off/once', () => {
  const e = new Emitter();
  let n = 0;
  const off = e.on('x', () => (n += 1));
  e.emit('x');
  off();
  e.emit('x');
  assert(n === 1, `expected 1 got ${n}`);
  let m = 0;
  e.once('y', () => (m += 1));
  e.emit('y');
  e.emit('y');
  assert(m === 1);
});

test('store get/set/subscribe', () => {
  const s = new Store({ a: 1 });
  let seen = null;
  s.subscribe('a', (v) => (seen = v));
  s.set('a', 2);
  assert(s.get('a') === 2 && seen === 2);
});

test('slugify', () => {
  assert(slugify('Hello, World!') === 'hello-world');
});
