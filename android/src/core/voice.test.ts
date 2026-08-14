import { MAX_SPEECH_TEXT, normalizeSpeechText } from "./voice";

describe("mobile voice text", () => {
  it("bounds speech text and rejects empty values", () => {
    expect(normalizeSpeechText("  hello  ")).toBe("hello");
    expect(normalizeSpeechText("x".repeat(MAX_SPEECH_TEXT + 10))).toHaveLength(
      MAX_SPEECH_TEXT,
    );
    expect(normalizeSpeechText("  ")).toBeNull();
  });
});
