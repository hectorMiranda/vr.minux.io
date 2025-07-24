// Feature-detect WebXR support without throwing on browsers that lack it.

export async function detectCapabilities() {
  const caps = {
    webxr: 'xr' in navigator,
    secureContext: globalThis.isSecureContext === true,
    vr: false,
    ar: false,
    inline: false,
  };
  if (!caps.webxr) return caps;
  const xr = navigator.xr;
  const check = async (mode) => {
    try {
      return await xr.isSessionSupported(mode);
    } catch {
      return false;
    }
  };
  caps.vr = await check('immersive-vr');
  caps.ar = await check('immersive-ar');
  caps.inline = await check('inline');
  return caps;
}

/** Map a capability set to a list of {label, ok} badges for the UI. */
export function capBadges(caps) {
  return [
    { label: 'WebXR', ok: caps.webxr },
    { label: 'VR', ok: caps.vr },
    { label: 'AR', ok: caps.ar },
    { label: 'Secure', ok: caps.secureContext },
  ];
}
