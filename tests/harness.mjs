// Tiny test registry shared by the runner and the *.test.mjs files. Keeping it
// separate from run.mjs avoids a circular import (run.mjs uses top-level await
// to load the test files, which would deadlock if they imported run.mjs back).

export const tests = [];

export const test = (name, fn) => tests.push([name, fn]);

export const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || 'assertion failed');
};

export const near = (a, b, eps = 1e-6) => assert(Math.abs(a - b) <= eps, `${a} !~= ${b}`);
