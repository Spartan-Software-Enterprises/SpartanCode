import {
  accessibilityDiagnostics,
  normalizeAccessibilityProfile,
} from "./accessibility";

describe("Android accessibility preferences", () => {
  it("normalizes valid system preferences", () => {
    const profile = normalizeAccessibilityProfile({
      reduceMotion: true,
      fontScale: 1.5,
      screenReaderEnabled: true,
    });
    expect(profile).toEqual({
      reduceMotion: true,
      fontScale: 1.5,
      screenReaderEnabled: true,
    });
    expect(accessibilityDiagnostics(profile)).toHaveLength(3);
  });

  it("does not guess absent preferences", () => {
    expect(normalizeAccessibilityProfile()).toEqual({});
  });
});
