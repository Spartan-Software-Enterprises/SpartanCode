const assert = require("node:assert/strict");
const test = require("node:test");
const {
  probeXrCapabilities,
  requestXrSession,
  validateXrSessionRequest,
} = require("./xr-integration");

test("XR capability probe reports supported modes and unavailable runtimes honestly", async () => {
  assert.deepEqual(await probeXrCapabilities(null), {
    available: false,
    modes: { "immersive-vr": false, "immersive-ar": false },
    reason: "WebXR is unavailable in this runtime",
  });
  assert.deepEqual(
    await probeXrCapabilities({
      isSessionSupported: async (mode) => mode === "immersive-vr",
    }),
    {
      available: true,
      modes: { "immersive-vr": true, "immersive-ar": false },
      reason: null,
    },
  );
});

test("XR sessions require explicit user initiation and bounded modes", async () => {
  assert.throws(
    () => validateXrSessionRequest({ mode: "immersive-vr" }),
    /explicit user gesture/,
  );
  assert.throws(
    () => validateXrSessionRequest({ mode: "camera", userInitiated: true }),
    /mode is invalid/,
  );
  let requested;
  const session = await requestXrSession(
    {
      requestSession: async (mode) => {
        requested = mode;
        return { mode };
      },
    },
    { mode: "immersive-ar", userInitiated: true },
  );
  assert.equal(requested, "immersive-ar");
  assert.deepEqual(session, { mode: "immersive-ar" });
});
