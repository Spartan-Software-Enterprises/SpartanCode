const XR_MODES = ["immersive-vr", "immersive-ar"];

function normalizeMode(mode) {
  return XR_MODES.includes(mode) ? mode : null;
}

async function probeXrCapabilities(xr) {
  if (!xr || typeof xr.isSessionSupported !== "function")
    return {
      available: false,
      modes: Object.fromEntries(XR_MODES.map((mode) => [mode, false])),
      reason: "WebXR is unavailable in this runtime",
    };
  const modes = {};
  for (const mode of XR_MODES) {
    try {
      modes[mode] = (await xr.isSessionSupported(mode)) === true;
    } catch {
      modes[mode] = false;
    }
  }
  return {
    available: Object.values(modes).some(Boolean),
    modes,
    reason: Object.values(modes).some(Boolean)
      ? null
      : "No requested WebXR mode is supported",
  };
}

function validateXrSessionRequest({ mode, userInitiated = false } = {}) {
  const normalizedMode = normalizeMode(mode);
  if (!normalizedMode) throw new Error("XR mode is invalid");
  if (userInitiated !== true)
    throw new Error("XR sessions require an explicit user gesture");
  return { mode: normalizedMode, userInitiated: true };
}

async function requestXrSession(xr, request) {
  const validated = validateXrSessionRequest(request);
  if (!xr || typeof xr.requestSession !== "function")
    throw new Error("WebXR is unavailable in this runtime");
  return xr.requestSession(validated.mode);
}

module.exports = {
  XR_MODES,
  normalizeMode,
  probeXrCapabilities,
  requestXrSession,
  validateXrSessionRequest,
};
