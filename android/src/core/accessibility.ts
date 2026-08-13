export type AccessibilityProbe = {
  reduceMotion?: unknown;
  fontScale?: unknown;
  screenReaderEnabled?: unknown;
};

export type AccessibilityProfile = {
  reduceMotion?: boolean;
  fontScale?: number;
  screenReaderEnabled?: boolean;
};

export function normalizeAccessibilityProfile(
  probe: AccessibilityProbe = {},
): AccessibilityProfile {
  return {
    reduceMotion:
      typeof probe.reduceMotion === "boolean" ? probe.reduceMotion : undefined,
    fontScale:
      typeof probe.fontScale === "number" &&
      Number.isFinite(probe.fontScale) &&
      probe.fontScale > 0
        ? probe.fontScale
        : undefined,
    screenReaderEnabled:
      typeof probe.screenReaderEnabled === "boolean"
        ? probe.screenReaderEnabled
        : undefined,
  };
}

export function accessibilityDiagnostics(profile: AccessibilityProfile) {
  const diagnostics: string[] = [];
  if (profile.reduceMotion === true)
    diagnostics.push(
      "Reduced motion is enabled; animated transitions are avoided.",
    );
  if (profile.fontScale !== undefined && profile.fontScale >= 1.3)
    diagnostics.push(
      "Large text is enabled; controls preserve system font scaling.",
    );
  if (profile.screenReaderEnabled === true)
    diagnostics.push(
      "Screen reader is enabled; core actions expose native labels.",
    );
  if (!diagnostics.length)
    diagnostics.push(
      "System accessibility preferences are not requesting changes.",
    );
  return diagnostics;
}
