// A DOM button that enters/exits an immersive-vr session. Standalone (does not
// depend on three's VRButton) so we control features and styling.
import { detectCapabilities } from './capabilities.js';

export async function createVRButton(sessionManager, { optionalFeatures = ['local-floor', 'bounded-floor', 'hand-tracking'] } = {}) {
  const btn = document.createElement('button');
  btn.className = 'btn xr-button';

  const caps = await detectCapabilities();
  if (!caps.vr) {
    btn.textContent = caps.webxr ? 'VR not supported' : 'WebXR unavailable';
    btn.disabled = true;
    return btn;
  }

  btn.textContent = 'Enter VR';
  btn.addEventListener('click', async () => {
    try {
      if (sessionManager.active) {
        await sessionManager.end();
      } else {
        await sessionManager.start('immersive-vr', { optionalFeatures });
      }
    } catch (err) {
      btn.textContent = `VR error`;
      console.error('[vr-button]', err);
    }
  });

  sessionManager.events.on('start', () => {
    btn.textContent = 'Exit VR';
  });
  sessionManager.events.on('end', () => {
    btn.textContent = 'Enter VR';
  });

  return btn;
}
