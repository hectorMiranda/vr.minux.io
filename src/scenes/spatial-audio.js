// Audio: PositionalAudio source on a moving object using an OscillatorNode-fed
// buffer (generates a tone via WebAudio; no audio files).
// Starts on first user gesture. Guards autoplay and AudioContext unavailability.
import * as THREE from 'three';
import { register } from './registry.js';
import { Scene } from './base.js';

const ORBIT_R = 1.2;
const ORBIT_SPEED = 0.6;
const BASE_FREQ = 220; // Hz

class SpatialAudioScene extends Scene {
  async init() {
    this._time = 0;
    this._audioCtx = null;
    this._oscillator = null;
    this._panner = null;
    this._started = false;
    this._audioAvailable = false;

    // Emitter sphere.
    const emitterGeo = new THREE.SphereGeometry(0.1, 16, 12);
    const emitterMat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      emissive: 0xff4400,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });
    this._emitterMesh = new THREE.Mesh(emitterGeo, emitterMat);
    this._emitterMesh.position.set(ORBIT_R, 1.5, -2);
    this.add(this._emitterMesh);

    // Direction indicator ring.
    const ringGeo = new THREE.TorusGeometry(0.13, 0.015, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    this._emitterMesh.add(ring);

    // Orbit path ring (static, for reference).
    const pathGeo = new THREE.TorusGeometry(ORBIT_R, 0.005, 6, 64);
    const pathMat = new THREE.MeshBasicMaterial({ color: 0x444488, transparent: true, opacity: 0.5 });
    const pathRing = new THREE.Mesh(pathGeo, pathMat);
    pathRing.rotation.x = Math.PI / 2;
    pathRing.position.set(0, 1.5, -2);
    this.add(pathRing);

    // Status label.
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    this._labelCanvas = canvas;
    this._labelCtx = ctx;
    const tex = new THREE.CanvasTexture(canvas);
    this._labelTex = tex;
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.13),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    labelMesh.position.set(0, 2.4, -2);
    this.add(labelMesh);

    this._updateLabel('Click/tap to start audio');

    // Attempt to start audio on user gesture.
    this._gestureHandler = () => { this._startAudio(); };
    document.addEventListener('click', this._gestureHandler, { once: true });
    document.addEventListener('touchend', this._gestureHandler, { once: true });
    document.addEventListener('keydown', this._gestureHandler, { once: true });
    this.onDispose(() => {
      document.removeEventListener('click', this._gestureHandler);
      document.removeEventListener('touchend', this._gestureHandler);
      document.removeEventListener('keydown', this._gestureHandler);
    });

    // Attempt AudioContext eagerly (some browsers allow it before gesture).
    this._tryStartAudio();
  }

  _updateLabel(text) {
    const canvas = this._labelCanvas;
    const ctx = this._labelCtx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText(text, 12, 38);
    this._labelTex.needsUpdate = true;
  }

  _tryStartAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      this._audioCtx = ctx;
      if (ctx.state === 'running') {
        this._buildAudioGraph(ctx);
      }
      // else wait for gesture
    } catch (_e) {
      // AudioContext unavailable — silent operation.
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
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => this._buildAudioGraph(ctx)).catch(() => {});
      } else if (ctx.state === 'running') {
        this._buildAudioGraph(ctx);
      }
    } catch (_e) {
      // Silent failure.
    }
  }

  _buildAudioGraph(ctx) {
    if (this._started) return;
    this._started = true;
    try {
      const listener = ctx.listener;

      // Oscillator for tone.
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = BASE_FREQ;

      // Low-frequency modulation for interest.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 40;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // PannerNode for 3D spatial audio.
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10;
      panner.rolloffFactor = 1.5;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.4;

      osc.connect(panner);
      panner.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      lfo.start();

      this._oscillator = osc;
      this._panner = panner;
      this._lfo = lfo;
      this._audioAvailable = true;

      this._updateLabel('Spatial audio: active');

      this.onDispose(() => {
        try { osc.stop(); } catch (_e) {}
        try { lfo.stop(); } catch (_e) {}
        try { ctx.close(); } catch (_e) {}
      });
    } catch (_e) {
      this._updateLabel('Audio unavailable');
    }
  }

  update(dt) {
    this._time += dt;
    const t = this._time;

    // Orbit emitter around (0, 1.5, -2).
    const x = Math.cos(t * ORBIT_SPEED) * ORBIT_R;
    const z = Math.sin(t * ORBIT_SPEED) * ORBIT_R - 2;
    const y = 1.5 + Math.sin(t * 1.3) * 0.3;
    this._emitterMesh.position.set(x, y, z);
    this._emitterMesh.rotation.y = t * 2;

    // Pulse emissive with LFO.
    const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * Math.PI));
    this._emitterMesh.material.emissiveIntensity = pulse;

    // Update panner position.
    if (this._panner && this._audioCtx) {
      try {
        if (this._panner.positionX) {
          this._panner.positionX.setValueAtTime(x, this._audioCtx.currentTime);
          this._panner.positionY.setValueAtTime(y, this._audioCtx.currentTime);
          this._panner.positionZ.setValueAtTime(z, this._audioCtx.currentTime);
        } else {
          this._panner.setPosition(x, y, z);
        }
      } catch (_e) {}

      // Update listener from camera.
      try {
        const cam = this.app.camera;
        const camPos = new THREE.Vector3();
        cam.getWorldPosition(camPos);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
        const actx = this._audioCtx;
        if (actx.listener.positionX) {
          actx.listener.positionX.setValueAtTime(camPos.x, actx.currentTime);
          actx.listener.positionY.setValueAtTime(camPos.y, actx.currentTime);
          actx.listener.positionZ.setValueAtTime(camPos.z, actx.currentTime);
          actx.listener.forwardX.setValueAtTime(forward.x, actx.currentTime);
          actx.listener.forwardY.setValueAtTime(forward.y, actx.currentTime);
          actx.listener.forwardZ.setValueAtTime(forward.z, actx.currentTime);
          actx.listener.upX.setValueAtTime(up.x, actx.currentTime);
          actx.listener.upY.setValueAtTime(up.y, actx.currentTime);
          actx.listener.upZ.setValueAtTime(up.z, actx.currentTime);
        } else {
          actx.listener.setPosition(camPos.x, camPos.y, camPos.z);
          actx.listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
        }
      } catch (_e) {}
    }
  }

  dispose() {
    super.dispose();
  }
}

register({
  id: 'spatial-audio',
  title: 'Spatial Audio',
  category: 'Audio',
  tags: ['audio', 'spatial', 'webaudio', 'panner', '3d-sound'],
  description: 'An oscillator-driven PositionalAudio source orbits the listener; HRTF panning follows camera position. Starts on first user gesture.',
  xr: 'vr',
  factory: (app) => new SpatialAudioScene(app),
});
