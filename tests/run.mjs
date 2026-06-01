// Build-free test harness.
//
//   node tests/run.mjs
//
// What it does (no browser, no WebGL, no network):
//   1. Syntax-checks every .js/.mjs module with `node --check`.
//   2. Validates every JSON file under data/ parses.
//   3. Statically checks scene registry integrity (unique ids, required meta).
//   4. Runs the pure-utility unit tests (which import the real util modules).
//
// Exits non-zero on the first failing group so CI / the generator dry-run can
// gate on it.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tests } from './harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

let failures = 0;
const group = (name, fn) => {
  process.stdout.write(`\n• ${name}\n`);
  try {
    fn();
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${err.message}`);
  }
};

const files = walk(ROOT);

// 1. Syntax-check all JS.
group('syntax', () => {
  const js = files.filter((f) => ['.js', '.mjs'].includes(extname(f)));
  for (const f of js) {
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (err) {
      failures += 1;
      console.error(`  ✗ ${f}\n${err.stderr?.toString() || err.message}`);
    }
  }
  console.log(`  ✓ ${js.length} modules parse`);
});

// 2. JSON validity.
group('data json', () => {
  const json = files.filter((f) => extname(f) === '.json');
  for (const f of json) JSON.parse(readFileSync(f, 'utf8'));
  console.log(`  ✓ ${json.length} JSON files valid`);
});

// 3. Scene registry integrity (static — does not import three).
group('scene integrity', () => {
  const scenesDir = join(ROOT, 'src', 'scenes');
  const sceneFiles = walk(scenesDir).filter(
    (f) => extname(f) === '.js' && !/(registry|base|index)\.js$/.test(f),
  );
  const ids = new Map();
  for (const f of sceneFiles) {
    const src = readFileSync(f, 'utf8');
    if (!/register\s*\(/.test(src)) throw new Error(`${f} does not call register()`);
    const m = src.match(/id:\s*['"]([^'"]+)['"]/);
    if (!m) throw new Error(`${f} has no id in register()`);
    if (ids.has(m[1])) throw new Error(`duplicate scene id "${m[1]}" in ${f} and ${ids.get(m[1])}`);
    ids.set(m[1], f);
    for (const key of ['title', 'category', 'factory']) {
      if (!new RegExp(`${key}\\s*:`).test(src)) throw new Error(`${f} missing "${key}"`);
    }
  }
  console.log(`  ✓ ${ids.size} scenes, unique ids, required meta present`);
});

// 4. Pure-utility unit tests (registered into ./harness.mjs).
const testFiles = files.filter((f) => f.endsWith('.test.mjs'));
for (const f of testFiles) await import(pathToFileURL(f).href);

group('unit', () => {
  let pass = 0;
  for (const [name, fn] of tests) {
    try {
      fn();
      pass += 1;
    } catch (err) {
      failures += 1;
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }
  console.log(`  ✓ ${pass}/${tests.length} unit assertions`);
});

console.log(failures === 0 ? '\nALL GREEN ✓' : `\n${failures} FAILURE(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
