// ui-panel.js — a panel with a title and a few static text rows.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { Panel } from '../ui/panel.js';
import { makeLabel } from '../ui/canvas-label.js';

class UIPanelScene extends Scene {
  async init() {
    const panel = new Panel({ width: 0.7, height: 0.5, cols: 1 });
    panel.group.position.set(0, 1.5, -1.2);

    // Title
    const title = makeLabel('Spatial UI Panel', {
      width: 320, height: 52, fontSize: 28,
      color: '#ffe0a0', background: 'rgba(0,0,0,0)',
      scale: 0.65 / 320,
    });
    panel.add(title, { row: 0, col: 0 });

    const rows = [
      'Row 1 — static content here',
      'Row 2 — another line of text',
      'Row 3 — and a third row below',
    ];
    rows.forEach((text, i) => {
      const lbl = makeLabel(text, {
        width: 320, height: 40, fontSize: 20,
        color: '#ccddff', background: 'rgba(0,0,0,0)',
        scale: 0.60 / 320,
      });
      panel.add(lbl, { row: i + 1, col: 0 });
    });

    this.add(panel.group);
    this.onDispose(() => panel.dispose());
  }
}

register({
  id: 'ui-panel',
  title: 'UI Panel',
  category: 'UI',
  tags: ['ui', 'panel', 'text'],
  description: 'A rounded backing panel displaying a title and several static text rows.',
  xr: 'vr',
  factory: (app) => new UIPanelScene(app),
});
