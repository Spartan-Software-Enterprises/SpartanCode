const assert = require("assert");
const test = require("node:test");
const {
  getEmotionAwarenessStatus,
  normalizeSignal,
  resolveInteractionStyle,
} = require("./emotion-awareness");

test("emotion-aware interaction only accepts explicit bounded signals", () => {
  assert.equal(normalizeSignal("  FrUsTrAtEd "), "frustrated");
  assert.equal(normalizeSignal("angry-face-camera-result"), null);
  assert.deepEqual(resolveInteractionStyle({ signal: "uncertain" }), {
    mode: "explicit",
    signal: "uncertain",
    label: "Uncertain",
    guidance:
      "State assumptions, distinguish facts from guesses, and present bounded choices.",
  });
});

test("emotion inference and biometric collection remain disabled", () => {
  assert.deepEqual(getEmotionAwarenessStatus(), {
    available: true,
    mode: "explicit",
    signals: ["calm", "focused", "frustrated", "uncertain", "excited", "tired"],
    inference: "disabled",
    biometricCollection: false,
  });
  assert.equal(
    resolveInteractionStyle({ mode: "off", signal: "excited" }).signal,
    null,
  );
});
