export const MAX_SPEECH_TEXT = 2000;

export function normalizeSpeechText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, MAX_SPEECH_TEXT);
}
