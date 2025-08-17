// panel.js — rounded backing plane that lays out child UI elements.
// Panel({ width, height, color, radius, padding, cols })
// panel.add(child, { row, col })  — places child in a grid cell
import * as THREE from 'three';

function _makeRoundedRect(w, h, r, segs) {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return new THREE.ShapeGeometry(shape, segs);
}

export class Panel {
  constructor(opts = {}) {
    const {
      width = 0.8,
      height = 0.6,
      color = 0x222244,
      opacity = 0.92,
      radius = 0.04,
      padding = 0.04,
      cols = 1,
      rows = null,
    } = opts;

    this.width = width;
    this.height = height;
    this.padding = padding;
    this.cols = cols;
    this.rows = rows;

    const geo = _makeRoundedRect(width, height, radius, 4);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
      transparent: opacity < 1,
      opacity,
      side: THREE.FrontSide,
    });

    this.group = new THREE.Group();
    this.backing = new THREE.Mesh(geo, mat);
    this.backing.position.z = -0.001;
    this.group.add(this.backing);

    this._children = [];
    this._cellMap = new Map(); // "r,c" -> child
  }

  /**
   * Add a child mesh/group at a grid cell.
   * If row/col are omitted, appends to the next slot in a single-column flow.
   */
  add(child, { row, col = 0 } = {}) {
    if (row === undefined) {
      const occupied = this._children.length;
      row = Math.floor(occupied / this.cols);
      col = occupied % this.cols;
    }

    this._children.push(child);
    this._cellMap.set(`${row},${col}`, child);
    this.group.add(child);
    this._layout();
    return child;
  }

  _layout() {
    const rows = this.rows || Math.ceil(this._children.length / this.cols);
    const pad = this.padding;
    const cellW = (this.width - pad * 2) / this.cols;
    const cellH = (this.height - pad * 2) / Math.max(rows, 1);
    const startX = -this.width / 2 + pad + cellW / 2;
    const startY = this.height / 2 - pad - cellH / 2;

    for (const [key, child] of this._cellMap) {
      const [r, c] = key.split(',').map(Number);
      child.position.set(
        startX + c * cellW,
        startY - r * cellH,
        0.002,
      );
    }
  }

  /** Convenience: dispose backing geometry & material. */
  dispose() {
    this.backing.geometry.dispose();
    this.backing.material.dispose();
  }
}
