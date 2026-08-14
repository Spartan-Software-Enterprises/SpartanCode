const EXPLICIT_SIGNALS = [
  "calm",
  "focused",
  "frustrated",
  "uncertain",
  "excited",
  "tired",
];

const INTERACTION_STYLES = {
  calm: { label: "Calm", guidance: "Use a steady, concise, reassuring tone." },
  focused: {
    label: "Focused",
    guidance: "Lead with the next concrete action and keep context compact.",
  },
  frustrated: {
    label: "Frustrated",
    guidance:
      "Acknowledge the friction, explain the blocker plainly, and offer one recovery path.",
  },
  uncertain: {
    label: "Uncertain",
    guidance:
      "State assumptions, distinguish facts from guesses, and present bounded choices.",
  },
  excited: {
    label: "Excited",
    guidance:
      "Match positive momentum while preserving verification and safety boundaries.",
  },
  tired: {
    label: "Tired",
    guidance:
      "Prefer short steps, defer nonessential work, and summarize the current state.",
  },
};

function normalizeSignal(signal) {
  const value = String(signal || "")
    .trim()
    .toLowerCase();
  return EXPLICIT_SIGNALS.includes(value) ? value : null;
}

function resolveInteractionStyle({ mode = "explicit", signal } = {}) {
  const safeMode = mode === "off" ? "off" : "explicit";
  if (safeMode === "off") {
    return {
      mode: safeMode,
      signal: null,
      ...INTERACTION_STYLES.calm,
      guidance:
        "Use the configured assistant persona without adaptive tone guidance.",
    };
  }
  const normalized = normalizeSignal(signal) || "calm";
  return {
    mode: safeMode,
    signal: normalized,
    ...INTERACTION_STYLES[normalized],
  };
}

function getEmotionAwarenessStatus() {
  return {
    available: true,
    mode: "explicit",
    signals: [...EXPLICIT_SIGNALS],
    inference: "disabled",
    biometricCollection: false,
  };
}

module.exports = {
  EXPLICIT_SIGNALS,
  getEmotionAwarenessStatus,
  normalizeSignal,
  resolveInteractionStyle,
};
