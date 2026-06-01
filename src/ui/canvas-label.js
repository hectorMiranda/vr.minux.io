// canvas-label.js — CanvasTexture-backed text label plane.
// makeLabel(text, opts) -> THREE.Mesh
// setText(mesh, str)    -> updates the texture in place
import * as THREE from 'three';

const DEFAULTS = {
  fontSize: 32,
  fontFamily: 'sans-serif',
  color: '#ffffff',
  background: 'rgba(0,0,0,0)',
  padding: 12,
  width: 256,   // canvas px
  height: 64,   // canvas px
  scale: 0.004, // world-units per canvas px
};

function _draw(ctx, text, opts) {
  const { fontSize, fontFamily, color, background, padding, width, height } = opts;
  ctx.clearRect(0, 0, width, height);
  if (background && background !== 'transparent' && background !== 'rgba(0,0,0,0)') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  // word-wrap naively
  const words = String(text).split(' ');
  const maxW = width - padding * 2;
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const lineH = fontSize * 1.25;
  const startY = height / 2 - ((lines.length - 1) * lineH) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, startY + i * lineH);
  }
}

/**
 * Create a plane mesh with a CanvasTexture showing `text`.
 * opts: { fontSize, fontFamily, color, background, padding, width, height, scale }
 */
export function makeLabel(text, opts = {}) {
  const o = { ...DEFAULTS, ...opts };

  const canvas = document.createElement('canvas');
  canvas.width = o.width;
  canvas.height = o.height;
  const ctx = canvas.getContext('2d');

  _draw(ctx, text, o);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const geo = new THREE.PlaneGeometry(o.width * o.scale, o.height * o.scale);
  const mesh = new THREE.Mesh(geo, mat);

  // store refs for setText
  mesh.userData._labelCanvas = canvas;
  mesh.userData._labelCtx = ctx;
  mesh.userData._labelOpts = o;

  return mesh;
}

/**
 * Update the text drawn on an existing label mesh (created by makeLabel).
 */
export function setText(mesh, str) {
  const { _labelCtx: ctx, _labelOpts: opts } = mesh.userData;
  if (!ctx) return;
  _draw(ctx, str, opts);
  mesh.material.map.needsUpdate = true;
}
