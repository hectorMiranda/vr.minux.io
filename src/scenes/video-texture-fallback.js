// Video Texture Fallback — canvas stream VideoTexture if available, else animated CanvasTexture.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const W = 320, H = 180;

/** Attempt to get a MediaStream from an offscreen canvas. */
function tryCanvasStream(canvas) {
  try {
    if (typeof canvas.captureStream === 'function') {
      return canvas.captureStream(30);
    }
  } catch (_e) {
    // not available
  }
  return null;
}

class VideoTextureFallbackScene extends Scene {
  async init() {
    this._canvas = document.createElement('canvas');
    this._canvas.width = W;
    this._canvas.height = H;
    this._ctx = this._canvas.getContext('2d');

    this._usingVideo = false;
    let screenTex;

    const stream = tryCanvasStream(this._canvas);
    if (stream) {
      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        screenTex = new THREE.VideoTexture(video);
        screenTex.colorSpace = THREE.SRGBColorSpace;
        this._video = video;
        this._usingVideo = true;
        this.onDispose(() => {
          video.pause();
          video.srcObject = null;
          stream.getTracks().forEach((t) => t.stop());
          screenTex.dispose();
        });
      } catch (_e) {
        // fall through to canvas texture
      }
    }

    if (!this._usingVideo) {
      screenTex = new THREE.CanvasTexture(this._canvas);
      this._canvasTex = screenTex;
      this.onDispose(() => screenTex.dispose());
    }

    // Screen panel
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.9),
      new THREE.MeshBasicMaterial({ map: screenTex }),
    );
    panel.position.set(0, 1.5, -1.6);
    this.add(panel);

    // Small indicator
    const indicatorColor = this._usingVideo ? 0x44ff44 : 0xff8844;
    const indicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 4),
      new THREE.MeshBasicMaterial({ color: indicatorColor }),
    );
    indicator.position.set(0.9, 2.1, -1.6);
    this.add(indicator);

    // TV frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.72, 1.02, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }),
    );
    frame.position.set(0, 1.5, -1.63);
    this.add(frame);

    const ambient = new THREE.AmbientLight(0x334455, 1.2);
    this.add(ambient);

    this._screenTex = screenTex;
    this._time = 0;
  }

  _drawFrame(t) {
    const ctx = this._ctx;
    const w = W, h = H;

    // Background gradient that shifts with time
    const hue1 = (t * 20) % 360;
    const hue2 = (hue1 + 120) % 360;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `hsl(${hue1},80%,30%)`);
    grad.addColorStop(1, `hsl(${hue2},80%,20%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }

    // Bouncing ball
    const bx = w / 2 + Math.cos(t * 1.3) * (w * 0.35);
    const by = h / 2 + Math.sin(t * 1.7) * (h * 0.35);
    const ballGrad = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, 22);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(1, `hsl(${(hue1 + 60) % 360},100%,60%)`);
    ctx.beginPath();
    ctx.arc(bx, by, 22, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(
      this._usingVideo ? 'VideoTexture (canvas stream)' : 'CanvasTexture (fallback)',
      10, 20,
    );
    ctx.fillText(`t=${t.toFixed(1)}`, 10, h - 10);
  }

  update(dt) {
    this._time += dt;
    this._drawFrame(this._time);
    if (!this._usingVideo && this._canvasTex) {
      this._canvasTex.needsUpdate = true;
    }
  }

  dispose() { super.dispose(); }
}

register({
  id: 'video-texture-fallback',
  title: 'Video Texture Fallback',
  category: 'Rendering',
  tags: ['video', 'canvas-texture', 'streaming'],
  description: 'Uses VideoTexture via captureStream if available; falls back to an animated CanvasTexture — never requires a real video file.',
  xr: 'vr',
  factory: (app) => new VideoTextureFallbackScene(app),
});
