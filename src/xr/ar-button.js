// A DOM button that enters/exits an immersive-ar session. Mirrors vr-button.js
// but requests AR-specific optional features.
import { detectCapabilities } from './capabilities.js';

export async function createARButton(
  sessionManager,
  {
    optionalFeatures = [
      'hit-test',
      'dom-overlay',
      'light-estimation',
      'anchors',
      'plane-detection',
      'local-floor',
    ],
    domOverlay,
  } = {},
) {
  const btn = document.createElement('button');
  btn.className = 'btn xr-button';

  const caps = await detectCapabilities();
  if (!caps.ar) {
    btn.textContent = caps.webxr ? 'AR not supported' : 'WebXR unavailable';
    btn.disabled = true;
    return btn;
  }

  btn.textContent = 'Enter AR';
  btn.addEventListener('click', async () => {
    try {
      if (sessionManager.active) {
        await sessionManager.end();
      } else {
        const feats = [...optionalFeatures];
        const extra = {};
        if (domOverlay) {
          extra.domOverlay = domOverlay;
        }
        await sessionManager.start('immersive-ar', {
          optionalFeatures: feats,
          ...extra,
        });
      }
    } catch (err) {
      btn.textContent = 'AR error';
      console.error('[ar-button]', err);
    }
  });

  sessionManager.events.on('start', () => {
    btn.textContent = 'Exit AR';
  });
  sessionManager.events.on('end', () => {
    btn.textContent = 'Enter AR';
  });

  return btn;
}
