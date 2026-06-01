// Audio: generate a tone with AudioContext analyser and drive object scale/color
// from frequency data. Falls back to synthesized fake spectrum so it always animates.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';
import { clamp, lerp } from '../util/math.js';

const BAR_COUNT = 32;
const BAR_WIDTH = 0.055;
const BAR_GAP = 0.01;
const TOTAL_WIDTH = BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP;

class AudioReactiveScene extends Scene {
  async init() {
    this._time = 0;
    this._audioCtx = null;
    this._analyser = null;
    this._freqData = null;
    this._audioOk = false;
    this._started = false;

    // Frequency bars.
    this._bars = [];
    this._barMeshes = [];
    this._smoothed = new Float32Array(BAR_COUNT).fill(0);

    const baseGeo = new THREE.BoxGeometry(BAR_WIDTH, 1.0, BAR_WIDTH);
    for (let i = 0; i < BAR_COUNT; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / BAR_COUNT, 0.9, 0.5),
        roughness: 0.4,
        emissive: new THREE.Color(0, 0, 0),
      });
      const mesh = new THREE.Mesh(baseGeo, mat);
      const x = -TOTAL_WIDTH / 2 + i * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2;
      mesh.position.set(x, 1.5, -2.0);
      mesh.scale.y = 0.05;
      this.add(mesh);
      this._barMeshes.push(mesh);
    }

    // Central reactive sphere.
    const sphereGeo = new THREE.SphereGeometry(0.12, 24, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x0000ff,
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });
    this._sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this._sphere.position.set(0, 2.0, -2.0);
    this.add(this._sphere);

    // Floor line for reference.
    const lineGeo = new THREE.PlaneGeometry(TOTAL_WIDTH + 0.1, 0.01);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(0, 1.01, -2.0);
    this.add(line);

    // Status label.
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 56;
    const ctx = canvas.getContext('2d');
    this._labelCanvas = canvas;
    this._labelCtx = ctx;
    const tex = new THREE.CanvasTexture(canvas);
    this._labelTex = tex;
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.11),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    labelMesh.position.set(0, 2.6, -2.0);
    this.add(labelMesh);

    this._updateLabel('Click/tap to enable audio');

    // Try starting audio on gesture.
    this._gestureHandler = () => { this._startAudio(); };
    document.addEventListener('click', this._gestureHandler, { once: true });
    document.addEventListener('touchend', this._gestureHandler, { once: true });
    document.addEventListener('keydown', this._gestureHandler, { once: true });
    this.onDispose(() => {
      document.removeEventListener('click', this._gestureHandler);
      document.removeEventListener('touchend', this._gestureHandler);
      document.removeEventListener('keydown', this._gestureHandler);
    });

    // Try eagerly.
    this._tryInitAudio();
  }

  _updateLabel(text) {
    const canvas = this._labelCanvas;
    const ctx = this._labelCtx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(text, 12, 34);
    this._labelTex.needsUpdate = true;
  }

  _tryInitAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this._audioCtx = new AudioContext();
      if (this._audioCtx.state === 'running') {
        this._buildGraph(this._audioCtx);
      }
    } catch (_e) {
      // Unavailable — will use fake spectrum.
    }
  }

  _startAudio() {
    if (this._started) return;
    try {
      if (!this._audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this._audioCtx = new AudioContext();
      }
      const ctx = this._audioCtx;
      const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
      resume.then(() => this._buildGraph(ctx)).catch(() => {});
    } catch (_e) {}
  }

  _buildGraph(ctx) {
    if (this._started) return;
    this._started = true;
    try {
      // Multi-oscillator synth.
      const freqs = [110, 220, 330, 440, 660];
      const oscNodes = [];
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.15;

      for (const freq of freqs) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.3 + freq * 0.001;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = freq * 0.2;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        const g = ctx.createGain();
        g.gain.value = 1 / freqs.length;
        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        lfo.start();
        oscNodes.push(osc, lfo);
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = BAR_COUNT * 2;
      analyser.smoothingTimeConstant = 0.75;
      masterGain.connect(analyser);
      masterGain.connect(ctx.destination);

      this._analyser = analyser;
      this._freqData = new Uint8Array(analyser.frequencyBinCount);
      this._audioOk = true;
      this._updateLabel('Audio reactive: live');

      this.onDispose(() => {
        for (const n of oscNodes) { try { n.stop(); } catch (_e) {} }
        try { ctx.close(); } catch (_e) {}
      });
    } catch (_e) {
      this._audioOk = false;
      this._updateLabel('Audio blocked — using fake spectrum');
    }
  }

  _fakeSpectrum(t) {
    // Synthesize a plausible spectrum without WebAudio.
    const out = new Float32Array(BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i++) {
      const f = i / BAR_COUNT;
      out[i] =
        0.5 * Math.abs(Math.sin(t * 2.3 + f * 8)) +
        0.3 * Math.abs(Math.sin(t * 1.1 + f * 15)) +
        0.2 * Math.abs(Math.sin(t * 3.7 * (1 - f)));
    }
    return out;
  }

  update(dt) {
    this._time += dt;
    const t = this._time;

    // Get spectrum values (0..1 per bar).
    let spectrum;
    if (this._audioOk && this._analyser) {
      this._analyser.getByteFrequencyData(this._freqData);
      spectrum = new Float32Array(BAR_COUNT);
      for (let i = 0; i < BAR_COUNT; i++) {
        spectrum[i] = this._freqData[i] / 255;
      }
    } else {
      spectrum = this._fakeSpectrum(t);
    }

    // Smooth + apply to bars.
    let avgEnergy = 0;
    for (let i = 0; i < BAR_COUNT; i++) {
      this._smoothed[i] = lerp(this._smoothed[i], spectrum[i], 0.25);
      const v = this._smoothed[i];
      avgEnergy += v;
      const mesh = this._barMeshes[i];
      const targetH = clamp(v, 0.01, 1) * 1.5;
      mesh.scale.y = lerp(mesh.scale.y, targetH, 0.3);
      mesh.position.y = 1.0 + mesh.scale.y * 0.5;

      // Color: hue tracks bar index, brightness tracks amplitude.
      const hue = (i / BAR_COUNT + t * 0.05) % 1;
      mesh.material.color.setHSL(hue, 0.9, 0.3 + v * 0.5);
      mesh.material.emissive.setHSL(hue, 1.0, v * 0.4);
      mesh.material.emissiveIntensity = v;
    }

    avgEnergy /= BAR_COUNT;

    // Drive central sphere.
    const sScale = 1 + avgEnergy * 2;
    this._sphere.scale.setScalar(lerp(this._sphere.scale.x, sScale, 0.15));
    const hue = (t * 0.1) % 1;
    this._sphere.material.emissive.setHSL(hue, 1.0, 0.5);
    this._sphere.material.emissiveIntensity = 0.3 + avgEnergy * 1.5;
    this._sphere.rotation.y = t * 0.8;
    this._sphere.rotation.x = Math.sin(t * 0.5) * 0.3;
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'audio-reactive',
  title: 'Audio Reactive',
  category: 'Audio',
  tags: ['audio', 'analyser', 'frequency', 'reactive', 'webaudio'],
  description: `${BAR_COUNT} frequency bars and a central sphere driven by WebAudio analyser data; falls back to a synthesized fake spectrum if audio is blocked.`,
  xr: 'vr',
  factory: (app) => new AudioReactiveScene(app),
});
